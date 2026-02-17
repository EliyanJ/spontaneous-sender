import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ===== ORTOFLEX =====
function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function ortoflexVariants(word: string): string[] {
  const n = normalize(word);
  const variants = new Set<string>();
  variants.add(n);
  if (n.endsWith('s')) variants.add(n.slice(0, -1));
  else variants.add(n + 's');
  if (n.endsWith('es')) variants.add(n.slice(0, -2));
  else variants.add(n + 'es');
  if (n.endsWith('e')) variants.add(n.slice(0, -1));
  else variants.add(n + 'e');
  return [...variants];
}

function ortoflexFind(keyword: string, normalizedText: string): boolean {
  const variants = ortoflexVariants(keyword);
  for (const v of variants) {
    const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s,;.!?()\\[\\]/\\-'])${escaped}(?:$|[\\s,;.!?()\\[\\]/\\-'])`, 'i');
    if (regex.test(normalizedText)) return true;
  }
  return false;
}

function countOccurrences(keyword: string, normalizedText: string): number {
  const variants = ortoflexVariants(keyword);
  let maxCount = 0;
  for (const v of variants) {
    const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s,;.!?()\\[\\]/\\-'])${escaped}(?:$|[\\s,;.!?()\\[\\]/\\-'])`, 'gi');
    const matches = normalizedText.match(regex);
    if (matches && matches.length > maxCount) maxCount = matches.length;
  }
  return maxCount;
}

function findPosition(keyword: string, normalizedText: string): number {
  const variants = ortoflexVariants(keyword);
  for (const v of variants) {
    const idx = normalizedText.indexOf(v);
    if (idx !== -1) return idx;
  }
  return -1;
}

const SHORT_WORD_EXCEPTIONS = new Set(['ia', 'rh', 'it', 'qa', 'ux', 'ui', 'bi', 'si', 'rn', 'pm', 'po', 'vp', 'dg', 'dsi', 'dpo', 'cto', 'cfo', 'ceo']);
const CONTRACT_TYPES = ['Stage', 'CDI', 'CDD', 'Alternance', 'Apprentissage', 'Professionnalisation'];

// French stop words to filter out when extracting keywords from job description
const FRENCH_STOP_WORDS = new Set([
  'dans', 'avec', 'pour', 'plus', 'nous', 'vous', 'leur', 'sont', 'sera', 'etre', 'avoir', 'fait', 'faire',
  'comme', 'tout', 'tous', 'toute', 'toutes', 'quel', 'quelle', 'quels', 'quelles', 'mais', 'donc', 'puis',
  'aussi', 'bien', 'tres', 'cette', 'cela', 'ceci', 'chez', 'entre', 'vers', 'sous', 'avant', 'apres',
  'depuis', 'lors', 'notre', 'votre', 'leurs', 'elle', 'elles', 'dont', 'auquel', 'auxquels', 'autre',
  'autres', 'meme', 'memes', 'sans', 'sous', 'encore', 'ainsi', 'tant', 'moins', 'peut', 'doit',
  'etant', 'ayant', 'quelques', 'chaque', 'plusieurs', 'certains', 'certaines', 'devra', 'devrez',
  'serez', 'mission', 'missions', 'poste', 'profil', 'entreprise', 'societe', 'equipe', 'candidat',
  'experience', 'annee', 'annees', 'minimum', 'maximum', 'environ', 'recherche', 'recherchons',
  'competences', 'competence', 'formation', 'niveau', 'connaissance', 'connaissances', 'capacite',
  'capacites', 'bonne', 'bonnes', 'premiere', 'premier', 'travail', 'activite', 'activites',
  'type', 'temps', 'plein', 'lieu', 'date', 'debut', 'contrat', 'salaire', 'remuneration',
  'avantages', 'avantage', 'offre', 'description', 'responsabilites', 'responsabilite',
  'charge', 'projet', 'projets', 'mise', 'place', 'cadre', 'sein', 'rattache',
]);

// Extract significant keywords directly from text
function extractKeywordsFromText(text: string): Map<string, number> {
  const normalized = normalize(text);
  const words = normalized.split(/[\s,;.!?()[\]/\-'"]+/).filter(w => w.length >= 4);
  const wordCounts = new Map<string, number>();
  
  for (const word of words) {
    if (FRENCH_STOP_WORDS.has(word)) continue;
    if (/^\d+$/.test(word)) continue;
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }
  
  return wordCounts;
}

// Generous scoring formula: present >= 1 time = min 50% of points
function generousScore(cvCount: number, jobCount: number, maxPoints: number): number {
  if (cvCount === 0) return 0;
  if (jobCount === 0) return maxPoints * 0.5;
  return Math.round((0.5 + 0.5 * Math.min(1, cvCount / jobCount)) * maxPoints * 10) / 10;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { cvText, jobDescription, jobTitle } = await req.json();

    if (!cvText || !jobDescription || !jobTitle) {
      return new Response(JSON.stringify({ error: 'Missing required fields: cvText, jobDescription, jobTitle' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const normalizedCV = normalize(cvText);
    const normalizedJob = normalize(jobDescription);
    const normalizedTitle = normalize(jobTitle);

    // ===== ETAPE 0: Quality check =====
    const charCountNoSpaces = cvText.replace(/\s/g, '').length;
    const extractionWarning = charCountNoSpaces < 100;

    // ===== ETAPE 1: Contact Information (10 pts) =====
    const emailFound = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(cvText);
    const phoneFound = /(?:0[67]\s?(?:\d{2}\s?){4}|\+33\s?[67]\s?(?:\d{2}\s?){4}|(?:\d{2}[\s.-]){4}\d{2})/.test(cvText);
    const addressFound = /\b\d{5}\b/.test(cvText); // French postal code
    const webFound = /(?:linkedin\.com|github\.com|https?:\/\/[^\s]+|www\.[^\s]+)/i.test(cvText);
    
    const contactScore = (emailFound ? 3 : 0) + (phoneFound ? 3 : 0) + (addressFound ? 2 : 0) + (webFound ? 2 : 0);
    const contactDetails = { email: emailFound, phone: phoneFound, address: addressFound, web: webFound, score: contactScore, maxScore: 10 };

    // ===== ETAPE 2: Resume/Profile section (5 pts) =====
    const profileSectionKeywords = ['profil', 'resume', 'a propos', 'objectif', 'presentation', 'synthese', 'about me', 'summary'];
    const profileFound = profileSectionKeywords.some(kw => ortoflexFind(kw, normalizedCV));
    const profileScore = profileFound ? 5 : 0;

    // ===== ETAPE 3: Required sections (10 pts = 2.5 x 4) =====
    const sectionChecks = [
      { section: 'Expériences', keywords: ['experience', 'experiences', 'experience professionnelle', 'parcours professionnel', 'postes occupes'] },
      { section: 'Compétences', keywords: ['competence', 'competences', 'skills', 'savoir-faire', 'savoir faire', 'aptitudes'] },
      { section: 'Formation', keywords: ['formation', 'formations', 'education', 'diplome', 'diplomes', 'cursus', 'etudes'] },
      { section: 'Langues / Certifications', keywords: ['langue', 'langues', 'certification', 'certifications', 'certificat', 'habilitation'] },
    ];

    const sectionsResult = sectionChecks.map(s => {
      const found = s.keywords.some(kw => ortoflexFind(kw, normalizedCV));
      return { section: s.section, found, points: found ? 2.5 : 0 };
    });
    const sectionsScore = sectionsResult.reduce((sum, s) => sum + s.points, 0);

    // ===== ETAPE 4: Identify profession =====
    const { data: professions } = await supabase.from('ats_professions').select('*');
    
    let profession = null;
    let isPartialMatch = false;
    let professionConfidence = 0;
    let dbPrimaryKeywords: string[] = [];
    let dbSecondaryKeywords: string[] = [];
    let dbSoftSkills: string[] = [];

    if (professions && professions.length > 0) {
      const professionScores = professions.map(prof => {
        const primaryKws = (prof.primary_keywords as string[]) || [];
        const secondaryKws = (prof.secondary_keywords as string[]) || [];
        let score = 0;
        for (const kw of primaryKws) {
          if (ortoflexFind(kw, normalizedJob)) score += 2;
        }
        for (const kw of secondaryKws) {
          if (ortoflexFind(kw, normalizedJob)) score += 1;
        }
        return { profession: prof, score };
      });

      professionScores.sort((a, b) => b.score - a.score);
      const topScore = professionScores[0].score;
      const topCandidates = professionScores.filter(p => p.score >= topScore * 0.8 && p.score > 0);
      
      if (topCandidates.length > 0) {
        let selected = topCandidates[0];
        for (const candidate of topCandidates) {
          const profNameNorm = normalize(candidate.profession.name);
          if (normalizedTitle.includes(profNameNorm) || profNameNorm.includes(normalizedTitle)) {
            selected = candidate;
            break;
          }
        }
        if (topCandidates.length > 1 && selected === topCandidates[0]) {
          isPartialMatch = true;
        }
        profession = selected.profession;
        professionConfidence = selected.score;
        dbPrimaryKeywords = (profession.primary_keywords as string[]) || [];
        dbSecondaryKeywords = (profession.secondary_keywords as string[]) || [];
        dbSoftSkills = (profession.soft_skills as string[]) || [];
      }
    }

    // ===== ETAPE 5: HYBRID Hard skills extraction (30 pts) =====
    // Extract keywords directly from job description
    const jobKeywords = extractKeywordsFromText(jobDescription);
    
    // Combine with DB keywords - DB keywords that appear in job get priority
    const hybridPrimaryMap = new Map<string, { jobCount: number; fromDb: boolean }>();
    
    // Add DB primary keywords found in job
    for (const kw of dbPrimaryKeywords) {
      const jc = countOccurrences(kw, normalizedJob);
      if (jc > 0) {
        hybridPrimaryMap.set(normalize(kw), { jobCount: jc * 2, fromDb: true }); // double weight for DB matches
      }
    }
    
    // Add top extracted keywords from job description (not already in DB set)
    const sortedJobKw = [...jobKeywords.entries()].sort((a, b) => b[1] - a[1]);
    for (const [word, count] of sortedJobKw) {
      if (hybridPrimaryMap.size >= 20) break;
      if (!hybridPrimaryMap.has(word) && count >= 2) {
        hybridPrimaryMap.set(word, { jobCount: count, fromDb: false });
      }
    }

    // Rank and score top 10
    const hybridPrimaryRanked = [...hybridPrimaryMap.entries()]
      .map(([kw, data]) => ({
        keyword: kw,
        jobCount: data.jobCount,
        cvCount: countOccurrences(kw, normalizedCV),
        fromDb: data.fromDb,
      }))
      .sort((a, b) => b.jobCount - a.jobCount);

    const top10Primary = hybridPrimaryRanked.slice(0, 10);
    const bonusPrimary = hybridPrimaryRanked.slice(10);

    const primaryScores = top10Primary.map(k => {
      const points = generousScore(k.cvCount, k.jobCount, 3); // 3 pts each, 10 x 3 = 30
      return { keyword: k.keyword, jobCount: k.jobCount, cvCount: k.cvCount, points, maxPoints: 3 };
    });

    const primaryTotal = primaryScores.reduce((sum, k) => sum + k.points, 0);

    let primaryBonus = 0;
    const primaryBonusDetails: Array<{ keyword: string; bonus: number }> = [];
    for (const k of bonusPrimary) {
      if (k.cvCount >= 1) {
        primaryBonus += 1.5;
        primaryBonusDetails.push({ keyword: k.keyword, bonus: 1.5 });
      }
    }

    // ===== ETAPE 6: Secondary keywords (15 pts) =====
    const hybridSecondaryMap = new Map<string, number>();
    
    for (const kw of dbSecondaryKeywords) {
      const jc = countOccurrences(kw, normalizedJob);
      if (jc > 0) {
        hybridSecondaryMap.set(normalize(kw), jc);
      }
    }
    
    // Also add some extracted keywords not already used
    for (const [word, count] of sortedJobKw) {
      if (hybridSecondaryMap.size >= 10) break;
      if (!hybridPrimaryMap.has(word) && !hybridSecondaryMap.has(word) && count >= 1) {
        hybridSecondaryMap.set(word, count);
      }
    }

    const secondaryRanked = [...hybridSecondaryMap.entries()]
      .map(([kw, jobCount]) => ({
        keyword: kw,
        jobCount,
        cvCount: countOccurrences(kw, normalizedCV),
      }))
      .sort((a, b) => b.jobCount - a.jobCount);

    const top5Secondary = secondaryRanked.slice(0, 5);
    const bonusSecondary = secondaryRanked.slice(5);

    const secondaryScores = top5Secondary.map(k => {
      const points = generousScore(k.cvCount, k.jobCount, 3); // 3 pts each, 5 x 3 = 15
      return { keyword: k.keyword, jobCount: k.jobCount, cvCount: k.cvCount, points, maxPoints: 3 };
    });

    const secondaryTotal = secondaryScores.reduce((sum, k) => sum + k.points, 0);

    let secondaryBonus = 0;
    const secondaryBonusDetails: Array<{ keyword: string; bonus: number }> = [];
    for (const k of bonusSecondary) {
      if (k.cvCount >= 1) {
        secondaryBonus += 1.5;
        secondaryBonusDetails.push({ keyword: k.keyword, bonus: 1.5 });
      }
    }

    // ===== ETAPE 7: Soft skills (10 pts) =====
    // Combine DB soft skills with common ones
    const commonSoftSkills = [
      'communication', 'autonomie', 'rigueur', 'organisation', 'adaptabilite', 'creativite',
      'esprit equipe', 'leadership', 'motivation', 'proactivite', 'gestion stress',
      'resolution problemes', 'collaboration', 'ecoute', 'initiative', 'polyvalence',
    ];
    const allSoftSkills = [...new Set([...dbSoftSkills, ...commonSoftSkills])];
    const relevantSoftSkills = allSoftSkills.filter(sk => ortoflexFind(sk, normalizedJob));
    const softSkillsToCheck = relevantSoftSkills.length > 0 ? relevantSoftSkills : allSoftSkills.slice(0, 8);
    
    const pointsPerSoftSkill = softSkillsToCheck.length > 0 ? 10 / softSkillsToCheck.length : 0;
    const softSkillScores = softSkillsToCheck.map(sk => {
      const found = ortoflexFind(sk, normalizedCV);
      return { skill: sk, found, points: found ? Math.round(pointsPerSoftSkill * 10) / 10 : 0 };
    });
    const softSkillTotal = Math.min(10, softSkillScores.reduce((sum, s) => sum + s.points, 0));

    // ===== ETAPE 8: Measurable results (5 pts) =====
    const measurablePatterns = /(?:\d+\s*%|\d+\s*€|\d+\s*k€|\d+\s*M€|\+\s*\d+|x\s*\d+|\d+\s*(?:clients|utilisateurs|projets|personnes|collaborateurs|membres))/gi;
    const measurableMatches = cvText.match(measurablePatterns) || [];
    const measurableCount = measurableMatches.length;
    let measurableScore = 0;
    if (measurableCount >= 5) measurableScore = 5;
    else if (measurableCount >= 3) measurableScore = 3;
    else if (measurableCount >= 1) measurableScore = 2;

    // ===== ETAPE 9: Word count (5 pts) =====
    const wordCount = cvText.split(/\s+/).filter(w => w.length > 0).length;
    let wordCountScore = 0;
    if (wordCount >= 400 && wordCount <= 1200) wordCountScore = 5;
    else if (wordCount >= 200) wordCountScore = 3;
    else if (wordCount > 0) wordCountScore = 1;
    if (wordCount > 1200) wordCountScore = 3;

    // ===== ETAPE 10: Job title check (5 pts / -5 malus) =====
    const titleWords = jobTitle.split(/[\s,;.!?()[\]/\-']+/).filter((w: string) => {
      const wNorm = normalize(w);
      if (wNorm.length < 3 && !SHORT_WORD_EXCEPTIONS.has(wNorm)) return false;
      if (/^[hfm]$/i.test(w)) return false;
      return true;
    });
    
    const filteredTitle = titleWords.map((w: string) => normalize(w)).join(' ');
    const titleFoundInCV = filteredTitle.length > 0 && normalizedCV.includes(filteredTitle);
    const titleScore = titleFoundInCV ? 5 : -5;

    // ===== ETAPE 11: Contract type check (5 pts / -5 malus) =====
    let contractTypeFound = '';
    for (const ct of CONTRACT_TYPES) {
      if (ortoflexFind(ct, normalizedCV)) {
        contractTypeFound = ct;
        break;
      }
    }
    const contractScore = contractTypeFound ? 5 : -5;

    // ===== ETAPE 12: Image check (-5 penalty) =====
    const imageRegex = /\.(png|jpg|jpeg|gif|svg|bmp|webp|tiff)/gi;
    const imageMatches = cvText.match(imageRegex) || [];
    const imageCount = imageMatches.length;
    const imagePenalty = imageCount > 5 ? -5 : 0;

    // ===== ETAPE 13: Proximity bonus (max +6) =====
    let proximityBonus = 0;
    const proximityDetails: Array<{ primary: string; secondary: string }> = [];
    let proxCount = 0;
    
    const allSecondaryKws = secondaryScores.map(s => s.keyword);
    const allPrimaryKws = primaryScores.map(s => s.keyword);
    
    for (const sec of allSecondaryKws) {
      if (proxCount >= 3) break;
      const secPos = findPosition(sec, normalizedCV);
      if (secPos === -1) continue;
      for (const pri of allPrimaryKws) {
        if (proxCount >= 3) break;
        const priPos = findPosition(pri, normalizedCV);
        if (priPos === -1) continue;
        if (Math.abs(secPos - priPos) <= 50) {
          proximityBonus += 2;
          proximityDetails.push({ primary: pri, secondary: sec });
          proxCount++;
          break;
        }
      }
    }

    // ===== COMPUTE TOTAL SCORE =====
    const baseScore = contactScore + profileScore + sectionsScore + primaryTotal + secondaryTotal + softSkillTotal + measurableScore + wordCountScore;
    const bonuses = primaryBonus + secondaryBonus + proximityBonus;
    const titleAndContract = titleScore + contractScore;
    
    let totalScore = Math.round((baseScore + bonuses + titleAndContract + imagePenalty) * 10) / 10;
    totalScore = Math.max(0, Math.min(100, totalScore));

    const result = {
      totalScore,
      extractionWarning,
      contactInfo: contactDetails,
      profileSection: { found: profileFound, score: profileScore, maxScore: 5 },
      sections: {
        checks: sectionsResult,
        score: sectionsScore,
        maxScore: 10,
      },
      profession: {
        name: profession?.name || 'Non identifié',
        isPartialMatch,
        confidence: professionConfidence,
      },
      primaryKeywords: {
        scores: primaryScores,
        total: primaryTotal,
        maxTotal: 30,
        bonusKeywords: primaryBonusDetails,
        bonus: primaryBonus,
      },
      secondaryKeywords: {
        scores: secondaryScores,
        total: secondaryTotal,
        maxTotal: 15,
        bonusKeywords: secondaryBonusDetails,
        bonus: secondaryBonus,
      },
      softSkills: {
        scores: softSkillScores,
        total: Math.round(softSkillTotal * 10) / 10,
        maxTotal: 10,
      },
      measurableResults: {
        count: measurableCount,
        score: measurableScore,
        maxScore: 5,
        examples: measurableMatches.slice(0, 5),
      },
      wordCount: {
        count: wordCount,
        score: wordCountScore,
        maxScore: 5,
      },
      images: {
        count: imageCount,
        penalty: imagePenalty,
      },
      proximity: {
        bonus: proximityBonus,
        maxBonus: 6,
        details: proximityDetails,
      },
      titleCheck: {
        filteredTitle: titleWords.join(' '),
        found: titleFoundInCV,
        score: titleScore,
      },
      contractType: {
        found: contractTypeFound,
        score: contractScore,
      },
      breakdown: {
        contactInfo: contactScore,
        profileSection: profileScore,
        sections: sectionsScore,
        primaryKeywords: primaryTotal,
        primaryBonus,
        secondaryKeywords: secondaryTotal,
        secondaryBonus,
        softSkills: Math.round(softSkillTotal * 10) / 10,
        measurableResults: measurableScore,
        wordCount: wordCountScore,
        titleCheck: titleScore,
        contractType: contractScore,
        imagePenalty,
        proximityBonus,
      }
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in analyze-cv-ats:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
