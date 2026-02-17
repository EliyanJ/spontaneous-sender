import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ===== ORTOFLEX =====
// Normalize: lowercase + remove accents
function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Generate ORTOFLEX variants (plural/singular tolerance)
function ortoflexVariants(word: string): string[] {
  const n = normalize(word);
  const variants = new Set<string>();
  variants.add(n);
  // Add/remove trailing 's'
  if (n.endsWith('s')) variants.add(n.slice(0, -1));
  else variants.add(n + 's');
  // Add/remove trailing 'es'
  if (n.endsWith('es')) variants.add(n.slice(0, -2));
  else variants.add(n + 'es');
  // feminine 'e'
  if (n.endsWith('e')) variants.add(n.slice(0, -1));
  else variants.add(n + 'e');
  return [...variants];
}

// Check if a word/phrase is found in normalized text using ORTOFLEX
function ortoflexFind(keyword: string, normalizedText: string): boolean {
  const variants = ortoflexVariants(keyword);
  for (const v of variants) {
    // Use word boundary-ish matching
    const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s,;.!?()\\[\\]/\\-'])${escaped}(?:$|[\\s,;.!?()\\[\\]/\\-'])`, 'i');
    if (regex.test(normalizedText)) return true;
  }
  return false;
}

// Count occurrences of a keyword in text (case-insensitive, accent-insensitive)
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

// Find position of keyword in text for proximity check
function findPosition(keyword: string, normalizedText: string): number {
  const variants = ortoflexVariants(keyword);
  for (const v of variants) {
    const idx = normalizedText.indexOf(v);
    if (idx !== -1) return idx;
  }
  return -1;
}

// Short-word exceptions for job title filtering
const SHORT_WORD_EXCEPTIONS = new Set(['ia', 'rh', 'it', 'qa', 'ux', 'ui', 'bi', 'si', 'rn', 'pm', 'po', 'vp', 'dg', 'dsi', 'dpo', 'cto', 'cfo', 'ceo']);

// Contract type keywords
const CONTRACT_TYPES = ['Stage', 'CDI', 'CDD', 'Alternance', 'Apprentissage', 'Professionnalisation'];

// Required sections
const REQUIRED_SECTIONS = ['Expériences', 'Compétences', 'Formation'];

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

    // ===== ETAPE 10: Quality check =====
    const charCountNoSpaces = cvText.replace(/\s/g, '').length;
    const extractionWarning = charCountNoSpaces < 100;

    // ===== ETAPE 1: Required sections check =====
    const sectionsCheck = REQUIRED_SECTIONS.map(section => {
      const found = ortoflexFind(section, normalizedCV);
      return { section, found, penalty: found ? 0 : -5 };
    });
    const sectionsPenalty = sectionsCheck.reduce((sum, s) => sum + s.penalty, 0);

    // ===== ETAPE 2: Identify profession =====
    const { data: professions } = await supabase.from('ats_professions').select('*');
    if (!professions || professions.length === 0) {
      return new Response(JSON.stringify({ error: 'No professions in database' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1st check: count keyword matches in job description for each profession
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

    // 2nd check: cross-check with job title
    const topScore = professionScores[0].score;
    const topCandidates = professionScores.filter(p => p.score >= topScore * 0.8 && p.score > 0);
    
    let selectedProfession = topCandidates[0];
    let isPartialMatch = false;

    // Check if job title contains profession name
    for (const candidate of topCandidates) {
      const profNameNorm = normalize(candidate.profession.name);
      if (normalizedTitle.includes(profNameNorm) || profNameNorm.includes(normalizedTitle)) {
        selectedProfession = candidate;
        break;
      }
    }

    if (topCandidates.length > 1 && selectedProfession === topCandidates[0]) {
      // Ambiguity - pick random among top candidates
      selectedProfession = topCandidates[Math.floor(Math.random() * Math.min(topCandidates.length, 3))];
      isPartialMatch = true;
    }

    const profession = selectedProfession.profession;
    const primaryKeywords: string[] = (profession.primary_keywords as string[]) || [];
    const secondaryKeywords: string[] = (profession.secondary_keywords as string[]) || [];
    const softSkills: string[] = (profession.soft_skills as string[]) || [];

    // ===== ETAPE 3: Primary keywords scoring (50 points) =====
    // Rank primary keywords by occurrences in job description
    const primaryRanked = primaryKeywords
      .map(kw => ({ keyword: kw, jobCount: countOccurrences(kw, normalizedJob), cvCount: countOccurrences(kw, normalizedCV) }))
      .filter(k => k.jobCount > 0)
      .sort((a, b) => b.jobCount - a.jobCount);

    const top10Primary = primaryRanked.slice(0, 10);
    const bonusPrimary = primaryRanked.slice(10);

    const primaryScores = top10Primary.map(k => {
      const ratio = k.jobCount > 0 ? Math.min(1, k.cvCount / k.jobCount) : 0;
      const points = Math.round(ratio * 5 * 10) / 10; // 1 decimal
      return { keyword: k.keyword, jobCount: k.jobCount, cvCount: k.cvCount, ratio, points, maxPoints: 5 };
    });

    // Fill up to 10 with 0-score entries
    while (primaryScores.length < 10) {
      const nextKw = primaryKeywords.find(kw => !primaryScores.some(p => normalize(p.keyword) === normalize(kw)) && !bonusPrimary.some(b => normalize(b.keyword) === normalize(kw)));
      if (nextKw) {
        primaryScores.push({ keyword: nextKw, jobCount: 0, cvCount: 0, ratio: 0, points: 0, maxPoints: 5 });
      } else break;
    }

    const primaryTotal = primaryScores.reduce((sum, k) => sum + k.points, 0);

    // Bonus for keywords beyond top 10
    let primaryBonus = 0;
    const primaryBonusDetails: Array<{ keyword: string; bonus: number }> = [];
    for (const k of bonusPrimary) {
      if (k.cvCount >= 1 && k.jobCount >= 1) {
        primaryBonus += 1.5;
        primaryBonusDetails.push({ keyword: k.keyword, bonus: 1.5 });
      }
    }

    // ===== ETAPE 4: Secondary keywords scoring (25 points) =====
    const secondaryRanked = secondaryKeywords
      .map(kw => ({ keyword: kw, jobCount: countOccurrences(kw, normalizedJob), cvCount: countOccurrences(kw, normalizedCV) }))
      .filter(k => k.jobCount > 0)
      .sort((a, b) => b.jobCount - a.jobCount);

    const top5Secondary = secondaryRanked.slice(0, 5);
    const bonusSecondary = secondaryRanked.slice(5);

    const secondaryScores = top5Secondary.map(k => {
      const ratio = k.jobCount > 0 ? Math.min(1, k.cvCount / k.jobCount) : 0;
      const points = Math.round(ratio * 5 * 10) / 10;
      return { keyword: k.keyword, jobCount: k.jobCount, cvCount: k.cvCount, ratio, points, maxPoints: 5 };
    });

    while (secondaryScores.length < 5) {
      const nextKw = secondaryKeywords.find(kw => !secondaryScores.some(p => normalize(p.keyword) === normalize(kw)) && !bonusSecondary.some(b => normalize(b.keyword) === normalize(kw)));
      if (nextKw) {
        secondaryScores.push({ keyword: nextKw, jobCount: 0, cvCount: 0, ratio: 0, points: 0, maxPoints: 5 });
      } else break;
    }

    const secondaryTotal = secondaryScores.reduce((sum, k) => sum + k.points, 0);

    let secondaryBonus = 0;
    const secondaryBonusDetails: Array<{ keyword: string; bonus: number }> = [];
    for (const k of bonusSecondary) {
      if (k.cvCount >= 1 && k.jobCount >= 1) {
        secondaryBonus += 1.5;
        secondaryBonusDetails.push({ keyword: k.keyword, bonus: 1.5 });
      }
    }

    // ===== ETAPE 5: Soft skills scoring (14 points) =====
    const softSkillsInJob = softSkills.filter(sk => ortoflexFind(sk, normalizedJob));
    const softSkillsFound = softSkills.filter(sk => ortoflexFind(sk, normalizedCV));
    
    // Distribute 14 points across soft skills found in both job and CV
    const relevantSoftSkills = softSkillsInJob.length > 0 ? softSkillsInJob : softSkills;
    const pointsPerSoftSkill = relevantSoftSkills.length > 0 ? 14 / relevantSoftSkills.length : 0;
    
    const softSkillScores = relevantSoftSkills.map(sk => {
      const found = ortoflexFind(sk, normalizedCV);
      return { skill: sk, found, points: found ? Math.round(pointsPerSoftSkill * 10) / 10 : 0 };
    });
    const softSkillTotal = Math.min(14, softSkillScores.reduce((sum, s) => sum + s.points, 0));

    // ===== ETAPE 6: Image check (5 points) =====
    const imageRegex = /\.(png|jpg|jpeg|gif|svg|bmp|webp|tiff)/gi;
    const imageMatches = cvText.match(imageRegex) || [];
    const imageCount = imageMatches.length;
    const imagePenalty = imageCount > 5 ? -5 : 0;

    // ===== ETAPE 7: Proximity bonus (max +6) =====
    let proximityBonus = 0;
    const proximityDetails: Array<{ primary: string; secondary: string }> = [];
    let proxCount = 0;
    
    for (const sec of secondaryKeywords) {
      if (proxCount >= 3) break;
      const secPos = findPosition(sec, normalizedCV);
      if (secPos === -1) continue;
      
      for (const pri of primaryKeywords) {
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

    // ===== ETAPE 8: Job title check (-8 points) =====
    const titleWords = jobTitle.split(/[\s,;.!?()[\]/\-']+/).filter((w: string) => {
      const wNorm = normalize(w);
      if (wNorm.length < 3 && !SHORT_WORD_EXCEPTIONS.has(wNorm)) return false;
      // Filter out H/F, M/F patterns
      if (/^[hfm]$/i.test(w)) return false;
      return true;
    });
    
    const filteredTitle = titleWords.map((w: string) => normalize(w)).join(' ');
    const titleFoundInCV = filteredTitle.length > 0 && normalizedCV.includes(filteredTitle);
    const titlePenalty = titleFoundInCV ? 0 : -8;

    // ===== ETAPE 9: Contract type check (-6 points) =====
    let contractTypeFound = '';
    for (const ct of CONTRACT_TYPES) {
      if (ortoflexFind(ct, normalizedCV)) {
        contractTypeFound = ct;
        break;
      }
    }
    const contractPenalty = contractTypeFound ? 0 : -6;

    // ===== COMPUTE TOTAL SCORE =====
    const baseScore = primaryTotal + secondaryTotal + softSkillTotal;
    const bonuses = primaryBonus + secondaryBonus + proximityBonus;
    const penalties = sectionsPenalty + imagePenalty + titlePenalty + contractPenalty;
    
    let totalScore = Math.round((baseScore + bonuses + penalties) * 10) / 10;
    totalScore = Math.max(0, Math.min(100, totalScore));

    const result = {
      totalScore,
      extractionWarning,
      sections: {
        checks: sectionsCheck,
        penalty: sectionsPenalty,
      },
      profession: {
        name: profession.name,
        isPartialMatch,
        confidence: selectedProfession.score,
      },
      primaryKeywords: {
        scores: primaryScores,
        total: primaryTotal,
        maxTotal: 50,
        bonusKeywords: primaryBonusDetails,
        bonus: primaryBonus,
      },
      secondaryKeywords: {
        scores: secondaryScores,
        total: secondaryTotal,
        maxTotal: 25,
        bonusKeywords: secondaryBonusDetails,
        bonus: secondaryBonus,
      },
      softSkills: {
        scores: softSkillScores,
        total: Math.round(softSkillTotal * 10) / 10,
        maxTotal: 14,
      },
      images: {
        count: imageCount,
        penalty: imagePenalty,
        maxPoints: 5,
      },
      proximity: {
        bonus: proximityBonus,
        maxBonus: 6,
        details: proximityDetails,
      },
      titleCheck: {
        filteredTitle: titleWords.join(' '),
        found: titleFoundInCV,
        penalty: titlePenalty,
      },
      contractType: {
        found: contractTypeFound,
        penalty: contractPenalty,
      },
      breakdown: {
        primaryKeywords: primaryTotal,
        primaryBonus,
        secondaryKeywords: secondaryTotal,
        secondaryBonus,
        softSkills: Math.round(softSkillTotal * 10) / 10,
        imagePenalty,
        proximityBonus,
        sectionsPenalty,
        titlePenalty,
        contractPenalty,
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
