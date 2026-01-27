import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  maxCompanies: z.number().int().min(1).max(25).optional().default(25),
  batchSize: z.number().int().min(5).max(25).optional().default(20),
  batchIds: z.array(z.string().uuid()).optional() // Filter by specific search batch IDs
});

async function checkRateLimit(supabase: any, userId: string, action: string, limit: number = 10) {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  
  const { count, error } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', oneHourAgo);
    
  if (error) {
    console.error('Rate limit check error:', error);
    throw new Error('Rate limiting unavailable - please try again later');
  }
  
  if (count && count >= limit) {
    throw new Error(`Rate limit exceeded. Maximum ${limit} requests per hour for ${action}`);
  }
  
  await supabase.from('rate_limits').insert({
    user_id: userId,
    action,
    count: 1
  });
}

interface CompanyRow {
  id: string;
  nom: string;
  ville: string | null;
  siren: string;
  code_ape: string | null;
  libelle_ape: string | null;
  adresse: string | null;
  notes: string | null;
}

const SERPAPI_KEY = Deno.env.get("SERPAPI_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const HUNTER_API_KEY = Deno.env.get("HUNTER_IO_API_KEY");

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Scrape une page - OPTIMISÉ pour réduire la mémoire
async function scrapePage(url: string): Promise<{ emails: string[]; hasContactForm: boolean }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0;)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(2000), // Réduit à 2s
    });

    if (!response.ok) return { emails: [], hasContactForm: false };

    const html = await response.text();
    
    // Extraction emails par regex
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailsFound: string[] = html.match(emailRegex) || [];
    
    // mailto:
    const mailtoRegex = /mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi;
    const mailtoMatches = [...html.matchAll(mailtoRegex)];
    mailtoMatches.forEach(match => {
      if (match[1]) emailsFound.push(match[1]);
    });

    // Détecte formulaire de contact
    const hasContactForm = html.includes('<form') && 
                          (html.toLowerCase().includes('contact') || html.toLowerCase().includes('message'));

    // Filtre emails invalides - AMÉLIORÉ pour éviter faux positifs
    const invalidDomains = [
      'sentry.io', 'sentry-next.wixpress.com', 'wixpress.com',
      'societeinfo.com', 'infonet.fr', 'linkedin.com', 'facebook.com',
      'twitter.com', 'instagram.com', 'pappers.fr', 'kompass.com',
      'verif.com', 'manageo.fr', 'societe.com', 'annuaire-entreprises.fr'
    ];
    
    const validEmails = emailsFound.filter((email: string) => {
      const lower = email.toLowerCase();
      const domain = lower.split('@')[1] || '';
      
      // Rejeter extensions de fichiers
      if (lower.includes('.png') || lower.includes('.jpg') || 
          lower.includes('.webp') || lower.includes('.gif') ||
          lower.includes('.svg') || lower.includes('.jpeg')) {
        console.log(`[Email Filter] Rejected file extension: ${email}`);
        return false;
      }
      
      // Rejeter noreply
      if (lower.includes('noreply') || lower.includes('no-reply') || lower.includes('example')) {
        return false;
      }
      
      // Rejeter domaines d'annuaires/techniques
      if (invalidDomains.some(d => domain.includes(d))) {
        console.log(`[Email Filter] Rejected invalid domain: ${email}`);
        return false;
      }
      
      // Rejeter emails avec UUID/hash (pattern technique)
      const localPart = lower.split('@')[0] || '';
      if (/^[a-f0-9]{20,}$/.test(localPart)) {
        console.log(`[Email Filter] Rejected hash-like email: ${email}`);
        return false;
      }
      
      return true;
    });

    return {
      emails: [...new Set(validEmails)] as string[],
      hasContactForm
    };

  } catch {
    return { emails: [], hasContactForm: false };
  }
}

// Priorise les emails selon leur pertinence
function prioritizeEmails(emails: string[], companyName: string): string | null {
  if (emails.length === 0) return null;
  if (emails.length === 1) return emails[0];

  const lowerCompany = companyName.toLowerCase();
  const priorities = [
    'recrutement', 'rh', 'recruitment', 'hr', 'jobs', 'careers', 'carrieres',
    'contact', 'info'
  ];

  for (const priority of priorities) {
    const found = emails.find((email: string) => email.toLowerCase().includes(priority));
    if (found) return found;
  }

  const companyWords = lowerCompany.split(/\s+/).filter(w => w.length > 3);
  for (const word of companyWords) {
    const found = emails.find((email: string) => email.toLowerCase().includes(word));
    if (found) return found;
  }

  return emails[0];
}

// Étape 2: Trouver le site officiel avec SerpAPI - CORRIGÉ pour utiliser knowledge_graph
async function findOfficialWebsite(company: CompanyRow): Promise<string | null> {
  if (!SERPAPI_KEY) {
    console.error("[SerpAPI] API key not configured");
    return null;
  }

  // Recherche simple avec le nom de l'entreprise
  const searchQuery = company.ville 
    ? `${company.nom} ${company.ville}`
    : company.nom;
  
  console.log(`[SerpAPI] Searching: "${searchQuery}"`);

  try {
    const url = `https://serpapi.com/search?q=${encodeURIComponent(searchQuery)}&api_key=${SERPAPI_KEY}&num=10&gl=fr&hl=fr`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[SerpAPI] Error ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    // ✅ PRIORITÉ 1: Vérifier le knowledge_graph (comme dans ta capture!)
    const knowledgeGraph = data.knowledge_graph;
    if (knowledgeGraph) {
      const kgWebsite = knowledgeGraph.site_web || knowledgeGraph.website || knowledgeGraph.site;
      if (kgWebsite) {
        console.log(`[SerpAPI] ✅ Found website in knowledge_graph: ${kgWebsite}`);
        return kgWebsite;
      }
    }

    const organicResults = data.organic_results || [];
    console.log(`[SerpAPI] Got ${organicResults.length} organic results`);

    if (organicResults.length === 0) {
      console.log(`[SerpAPI] No results found`);
      return null;
    }

    // Blacklist des annuaires et réseaux sociaux
    const blacklist = [
      'linkedin.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
      'pagesjaunes.fr', 'societe.com', 'verif.com', 'pappers.fr', 'infogreffe.fr',
      'data.gouv.fr', 'wikipedia.org', 'youtube.com', 'tiktok.com', 'pinterest.com',
      'annuaire-entreprises.data.gouv.fr', 'google.com', 'bing.com', 'indeed.com',
      'glassdoor.com', 'welcometothejungle.com', 'kompass.com', 'mappy.com',
      'francetravail.fr', 'pole-emploi.fr', 'cci.fr', 'manageo.fr', 'entreprises.lefigaro.fr'
    ];

    const filteredResults = organicResults.filter((result: any) => {
      const link = result.link?.toLowerCase() || "";
      return !blacklist.some(domain => link.includes(domain));
    });

    console.log(`[SerpAPI] ${filteredResults.length} results after filtering`);

    if (filteredResults.length === 0) {
      console.log(`[SerpAPI] No valid results after filtering`);
      return null;
    }

    // ✅ PRIORITÉ 2: Vérifier si le 1er résultat contient le nom de l'entreprise dans le domaine
    const normalizedName = company.nom.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/sas|sarl|sa|eurl|sasu|sci|auto|entreprise|france|paris|groupe/g, '');
    
    // Chercher un domaine qui ressemble au nom de l'entreprise
    for (const result of filteredResults) {
      try {
        const domain = new URL(result.link).hostname.toLowerCase().replace('www.', '');
        const domainBase = domain.split('.')[0].replace(/-/g, '');
        
        // Si le domaine contient une partie significative du nom (min 4 caractères)
        if (normalizedName.length >= 4 && domainBase.includes(normalizedName.substring(0, Math.min(6, normalizedName.length)))) {
          console.log(`[SerpAPI] ✅ Domain match found: ${result.link}`);
          return result.link;
        }
      } catch { /* ignore invalid URLs */ }
    }

    // ✅ PRIORITÉ 3: Utiliser l'IA uniquement si pas de match évident
    if (filteredResults.length >= 1) {
      console.log(`[SerpAPI] Using AI to validate ${filteredResults.length} candidates`);
      const validatedUrl = await validateWebsiteWithAI(company, filteredResults);
      
      // Si l'IA ne trouve rien, utiliser le premier résultat filtré (mieux que rien!)
      if (!validatedUrl && filteredResults.length > 0) {
        console.log(`[SerpAPI] ⚠️ AI couldn't decide, using first filtered result: ${filteredResults[0].link}`);
        return filteredResults[0].link;
      }
      
      return validatedUrl;
    }

    return null;

  } catch (error) {
    console.error(`[SerpAPI] Error:`, error);
    return null;
  }
}

// Validation IA - SIMPLIFIÉE et plus tolérante
async function validateWebsiteWithAI(
  company: CompanyRow, 
  candidates: Array<{ link: string; title: string; snippet?: string }>
): Promise<string | null> {
  if (!LOVABLE_API_KEY || candidates.length === 0) {
    console.log("[AI] No API key or no candidates, returning first");
    return candidates.length > 0 ? candidates[0].link : null;
  }

  const prompt = `Entreprise: "${company.nom}" (${company.ville || "France"})
Activité: ${company.libelle_ape || "N/A"}

Candidats:
${candidates.slice(0, 5).map((c, i) => `${i + 1}. ${c.link} - ${c.title}`).join('\n')}

Quel numéro correspond au site OFFICIEL de l'entreprise? Réponds avec un chiffre (1-5) ou "1" par défaut si incertain.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Tu identifies des sites web d'entreprises. Réponds UNIQUEMENT avec un chiffre (1-5)." },
          { role: "user", content: prompt },
        ],
        temperature: 0,
        max_tokens: 5,
      }),
    });

    if (!response.ok) {
      console.log("[AI] Error, using first candidate");
      return candidates[0].link;
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.trim() || "1";
    
    console.log(`[AI] Answer: "${answer}"`);
    
    const match = answer.match(/\d+/);
    const num = match ? parseInt(match[0]) : 1;
    
    if (num >= 1 && num <= candidates.length) {
      console.log(`[AI] ✅ Selected: ${candidates[num - 1].link}`);
      return candidates[num - 1].link;
    }

    // Fallback au premier résultat
    console.log(`[AI] Using first candidate as fallback`);
    return candidates[0].link;

  } catch (error) {
    console.error("[AI] Error:", error);
    return candidates[0].link;
  }
}

// Recherche d'emails avec Hunter.io
async function findEmailsWithHunter(websiteUrl: string, limit: number = 50): Promise<{
  emails: string[];
  source: string;
  confidence: string;
}> {
  if (!HUNTER_API_KEY) {
    console.log("[Hunter.io] ❌ API key not configured");
    return { emails: [], source: "hunter-disabled", confidence: "none" };
  }

  try {
    const domain = new URL(websiteUrl).hostname.replace('www.', '');
    console.log(`[Hunter.io] 🔍 Searching emails for domain: ${domain} (limit: ${limit})`);

    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER_API_KEY}&limit=${limit}`;
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Hunter.io] Error ${response.status}: ${errorText}`);
      return { emails: [], source: "hunter-error", confidence: "none" };
    }

    const data = await response.json();
    
    console.log(`[Hunter.io] Response for ${domain}:`, JSON.stringify({
      organization: data.data?.organization,
      total_emails: data.data?.emails?.length || 0,
    }));

    if (!data.data || !data.data.emails || data.data.emails.length === 0) {
      console.log(`[Hunter.io] ❌ No emails found for ${domain}`);
      return { emails: [], source: "hunter-no-results", confidence: "none" };
    }

    const allEmails = data.data.emails;
    console.log(`[Hunter.io] ✅ Found ${allEmails.length} total emails`);

    // Filtrer et prioriser
    const genericEmails = allEmails.filter((item: any) => item.type === "generic");
    const relevantPersonalEmails = allEmails.filter((item: any) => {
      if (item.type !== "personal") return false;
      const email = item.value?.toLowerCase() || '';
      const dept = item.department?.toLowerCase() || '';
      return dept.includes('hr') || dept.includes('management') || 
             email.includes('rh') || email.includes('recrutement') || 
             email.includes('recruitment') || email.includes('jobs');
    });
    
    const selectedEmails = [...genericEmails, ...relevantPersonalEmails];
    console.log(`[Hunter.io] ${genericEmails.length} generic + ${relevantPersonalEmails.length} relevant personal`);

    // Prioriser par keyword
    const keywordPriorities = ['recrutement', 'rh', 'recruitment', 'hr', 'jobs', 'careers', 'contact', 'info'];
    const sortedEmails = [...selectedEmails].sort((a: any, b: any) => {
      const aEmail = a.value?.toLowerCase() || '';
      const bEmail = b.value?.toLowerCase() || '';
      
      const aKeywordIndex = keywordPriorities.findIndex(kw => aEmail.includes(kw));
      const bKeywordIndex = keywordPriorities.findIndex(kw => bEmail.includes(kw));
      
      if (aKeywordIndex !== -1 && bKeywordIndex !== -1) return aKeywordIndex - bKeywordIndex;
      if (aKeywordIndex !== -1) return -1;
      if (bKeywordIndex !== -1) return 1;
      
      return (b.confidence || 0) - (a.confidence || 0);
    });

    const emails = sortedEmails
      .map((item: any) => item.value)
      .filter((email: string) => email && email.includes('@'));

    console.log(`[Hunter.io] Final prioritized emails:`, emails.slice(0, 3));

    return {
      emails,
      source: "hunter.io",
      confidence: emails.length > 0 ? "high" : "none"
    };

  } catch (error) {
    console.error("[Hunter.io] Error:", error);
    return { emails: [], source: "hunter-error", confidence: "none" };
  }
}

// Extraction d'emails multi-pages (scraping)
// Extraction d'emails simplifiée - OPTIMISÉE pour éviter WORKER_LIMIT
async function extractEmailFromWebsite(
  websiteUrl: string,
  companyName: string
): Promise<{
  emails: string[];
  careerPageUrl?: string;
  alternativeContact?: string;
}> {
  const emails: Set<string> = new Set();
  let hasContactForm = false;

  // Scraper seulement 2 pages max pour économiser les ressources
  const pagesToCheck = [websiteUrl, `${websiteUrl}/contact`];

  console.log(`[Scraping] Checking ${pagesToCheck.length} pages for ${companyName}`);

  for (const pageUrl of pagesToCheck) {
    const result = await scrapePage(pageUrl);
    
    if (result.hasContactForm) hasContactForm = true;
    result.emails.forEach((email: string) => emails.add(email));

    // Stop dès qu'on trouve un email
    if (emails.size > 0) {
      console.log(`[Scraping] ✅ Found ${emails.size} email(s)`);
      break;
    }

    await delay(300);
  }

  const emailList = Array.from(emails);

  if (emailList.length === 0 && hasContactForm) {
    return {
      emails: [],
      alternativeContact: "Formulaire de contact disponible"
    };
  }

  return {
    emails: emailList,
    alternativeContact: emailList.length === 0 ? "Aucun email trouvé" : undefined
  };
}

// Analyse IA pour détecter site carrière et formulaire quand aucun email trouvé
async function analyzeContactOptions(
  websiteUrl: string,
  companyName: string
): Promise<{
  careerSiteUrl?: string;
  hasContactForm: boolean;
}> {
  if (!LOVABLE_API_KEY) {
    return { hasContactForm: false };
  }

  try {
    console.log(`[AI Analysis] Analyzing contact options for ${companyName}...`);

    // Scraper la page d'accueil
    const response = await fetch(websiteUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0;)' },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) return { hasContactForm: false };

    const html = await response.text();
    const content = html.substring(0, 3000);

    const systemPrompt = `Tu es un expert en analyse de sites web d'entreprise pour identifier les moyens de contact.

RÈGLES :
1. Détecte si l'entreprise utilise un site carrière externe (Welcome to the Jungle, LinkedIn Jobs, Indeed, etc.)
2. Détecte si un formulaire de contact est présent
3. Retourne UNIQUEMENT ce que tu trouves réellement

Format JSON strict :
{
  "career_site_url": "URL complète du site carrière externe" ou null,
  "has_contact_form": true ou false
}`;

    const userPrompt = `Analyse ce site web : ${websiteUrl}
ENTREPRISE : ${companyName}

CONTENU :
${content}

Cherche :
- Liens vers sites carrières (Welcome to the Jungle, LinkedIn Jobs, Indeed, etc.)
- Présence de formulaire de contact (balise <form> avec contact/message)`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
        max_tokens: 200,
      }),
    });

    if (!aiResponse.ok) {
      console.error("[AI Analysis] Error:", aiResponse.status);
      return { hasContactForm: false };
    }

    const data = await aiResponse.json();
    let answer = data.choices?.[0]?.message?.content?.trim() || "";
    
    if (answer.startsWith("```json")) {
      answer = answer.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (answer.startsWith("```")) {
      answer = answer.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const result = JSON.parse(answer);
    
    return {
      careerSiteUrl: result.career_site_url && result.career_site_url !== "null" ? result.career_site_url : undefined,
      hasContactForm: result.has_contact_form === true,
    };

  } catch (error) {
    console.error("[AI Analysis] Error:", error);
    return { hasContactForm: false };
  }
}

// Extraction IA (fallback uniquement)
async function extractEmailWithAI(
  pageContent: string,
  companyName: string,
  domain: string
): Promise<{
  emails: string[];
  careerPageUrl?: string;
}> {
  if (!LOVABLE_API_KEY) {
    console.log("[AI] No API key for email extraction");
    return { emails: [] };
  }

  try {
    console.log(`[AI] Analyzing content for ${companyName}...`);

    const systemPrompt = `Tu es un expert en extraction d'emails de contact pour candidatures spontanées.

RÈGLES CRITIQUES :
1. Retourne UNIQUEMENT des emails réellement présents dans le contenu fourni
2. Priorise : recrutement@, rh@, hr@, jobs@, careers@, contact@, info@
3. Si AUCUN email trouvé → retourne un tableau vide []
4. Ne JAMAIS inventer d'email
5. Détecte les emails obfusqués (ex: "contact [at] company [dot] com" → "contact@company.com")
6. Exclus : noreply@, no-reply@, newsletter@

Format JSON strict :
{
  "emails_found": ["email1@domain.com", "email2@domain.com"] ou [],
  "career_page": "URL complète" ou null
}`;

    const userPrompt = `Analyse le site : ${domain}

ENTREPRISE : ${companyName}

CONTENU DE LA PAGE :
${pageContent.substring(0, 2500)}

Retourne le JSON avec les emails trouvés et la page carrière si elle existe.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
        max_tokens: 300,
      }),
    });

    if (!aiResponse.ok) {
      console.error("[AI] Error:", aiResponse.status);
      return { emails: [] };
    }

    const data = await aiResponse.json();
    let answer = data.choices?.[0]?.message?.content?.trim() || "";
    
    console.log("[AI] Response:", answer);

    if (answer.startsWith("```json")) {
      answer = answer.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (answer.startsWith("```")) {
      answer = answer.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    try {
      const result = JSON.parse(answer);
      
      const emails = new Set<string>();
      
      if (result.emails_found && Array.isArray(result.emails_found)) {
        result.emails_found.forEach((email: string) => {
          if (email && email.includes('@')) {
            const lowerEmail = email.toLowerCase().trim();
            if (
              !lowerEmail.includes('noreply') &&
              !lowerEmail.includes('no-reply') &&
              !lowerEmail.includes('newsletter')
            ) {
              emails.add(lowerEmail);
            }
          }
        });
      }

      let careerPage = undefined;
      if (result.career_page && result.career_page !== "null" && result.career_page.startsWith('http')) {
        careerPage = result.career_page;
      }

      console.log(`[AI] Extracted ${emails.size} emails`);

      return {
        emails: Array.from(emails),
        careerPageUrl: careerPage,
      };
    } catch (parseError) {
      console.error("[AI] Failed to parse JSON:", parseError);
      return { emails: [] };
    }

  } catch (error) {
    console.error("[AI] Error extracting email:", error);
    return { emails: [] };
  }
}

// FONCTION PRINCIPALE - CORRIGÉE pour utiliser Hunter.io correctement
async function findCompanyEmailsNew(company: CompanyRow): Promise<{
  website: string | null;
  emails: string[];
  confidence: string;
  source: string;
  careerPageUrl?: string;
  alternativeContact?: string;
  error?: string;
}> {
  console.log(`\n========================================`);
  console.log(`[Processing] ${company.nom} (${company.ville || 'N/A'})`);
  console.log(`========================================`);

  // Étape 1: Trouver le site officiel
  const website = await findOfficialWebsite(company);
  
  if (!website) {
    return {
      website: null,
      emails: [],
      confidence: "none",
      source: "serpapi",
      error: "No official website found"
    };
  }

  console.log(`[Website] ✅ Found: ${website}`);

  let finalEmails: string[] = [];
  let source = "none";
  let confidence = "none";
  let careerPageUrl: string | undefined;
  let alternativeContact: string | undefined;

  // ÉTAPE 2: Scraping d'abord (GRATUIT)
  console.log(`\n[Step 2] 🔍 Trying scraping first (free)...`);
  const scrapingResult = await extractEmailFromWebsite(website, company.nom);
  
  careerPageUrl = scrapingResult.careerPageUrl;
  alternativeContact = scrapingResult.alternativeContact;

  if (scrapingResult.emails.length > 0) {
    // Scraping a trouvé des emails → on les utilise
    console.log(`[Scraping] ✅ SUCCESS: Found ${scrapingResult.emails.length} email(s)`);
    finalEmails = scrapingResult.emails;
    source = "scraping";
    confidence = "medium";
  } else {
    // ÉTAPE 3: Fallback Hunter.io (PAYANT mais plus fiable)
    console.log(`\n[Step 3] 💰 Scraping found 0 emails, trying Hunter.io (paid fallback)...`);
    
    const hunterResult = await findEmailsWithHunter(website, 50); // Premium plan: 50 results
    
    if (hunterResult.emails.length > 0) {
      console.log(`[Hunter.io] ✅ SUCCESS: Found ${hunterResult.emails.length} email(s)`);
      finalEmails = hunterResult.emails;
      source = "hunter.io";
      confidence = "high";
    } else {
      console.log(`[Hunter.io] ❌ No emails found either`);
      source = "none";
      confidence = "low";
      
      if (!alternativeContact) {
        alternativeContact = "Aucun email trouvé (scraping + Hunter.io)";
      }
    }
  }
  
  // Prioriser les emails (sauf Hunter.io déjà priorisé)
  if (finalEmails.length > 1 && source !== "hunter.io") {
    const bestEmail = prioritizeEmails(finalEmails, company.nom);
    if (bestEmail) {
      finalEmails = [bestEmail, ...finalEmails.filter(e => e !== bestEmail)];
    }
  }

  console.log(`\n[Result] Source: ${source}, Emails: ${finalEmails.length}, Confidence: ${confidence}`);

  return {
    website,
    emails: finalEmails,
    confidence,
    source,
    careerPageUrl,
    alternativeContact,
  };
}

function selectBestEmail(emails: string[]): string {
  if (emails.length === 0) return "";
  if (emails.length === 1) return emails[0];

  const priorities = ['rh', 'recrutement', 'recruitment', 'hr', 'jobs', 'careers', 'contact', 'info'];
  
  for (const priority of priorities) {
    const found = emails.find(e => e.toLowerCase().includes(priority));
    if (found) return found;
  }
  
  return emails[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const requestData = await req.json();
    const { maxCompanies: requestedMax, batchIds } = requestSchema.parse(requestData);

    // Vérifier les crédits disponibles avant de lancer la recherche
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("sends_remaining, tokens_remaining, plan_type")
      .eq("user_id", user.id)
      .single();

    if (subError) {
      console.error("Error fetching subscription:", subError);
      throw new Error("Could not verify credits");
    }

    const totalCredits = (subscription?.sends_remaining || 0) + (subscription?.tokens_remaining || 0);
    
    if (totalCredits <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Crédits insuffisants",
          message: "Vous n'avez plus de crédits. Veuillez upgrader votre abonnement ou acheter des tokens.",
          creditsNeeded: true,
          creditsAvailable: 0,
          planType: subscription?.plan_type || 'free'
        }),
        { 
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // IMPORTANT: Limiter le nombre d'entreprises aux crédits disponibles
    // On ne peut pas traiter plus d'entreprises qu'on n'a de crédits
    const maxCompanies = Math.min(requestedMax, totalCredits);
    
    console.log(`[Credits] User has ${totalCredits} credits available (${subscription?.sends_remaining} sends + ${subscription?.tokens_remaining} tokens)`);
    console.log(`[Credits] Limiting maxCompanies to ${maxCompanies} (requested: ${requestedMax})`);

    // Fetch companies without selected_email, optionally filtered by batch

    // Fetch companies without selected_email, optionally filtered by batch
    let query = supabase
      .from("companies")
      .select("id, nom, ville, siren, code_ape, libelle_ape, adresse, notes")
      .eq("user_id", user.id)
      .is("selected_email", null);
    
    // If batchIds provided, filter to only those batches
    if (batchIds && batchIds.length > 0) {
      query = query.in("search_batch_id", batchIds);
      console.log(`[Batch Filter] Filtering to batch IDs: ${batchIds.join(', ')}`);
    }
    
    const { data: companies, error: fetchError } = await query.limit(maxCompanies);

    if (fetchError) {
      console.error("Error fetching companies:", fetchError);
      throw new Error(`Database error: ${fetchError.message}`);
    }

    if (!companies || companies.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          results: [],
          message: "No companies to process",
          hasMore: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`\n[Start] Processing ${companies.length} companies`);
    console.log(`[Config] SERPAPI_KEY: ${SERPAPI_KEY ? 'SET' : 'NOT SET'}`);
    console.log(`[Config] HUNTER_API_KEY: ${HUNTER_API_KEY ? 'SET' : 'NOT SET'}`);
    console.log(`[Config] LOVABLE_API_KEY: ${LOVABLE_API_KEY ? 'SET' : 'NOT SET'}`);

    const results = [];
    let processed = 0;

    for (const company of companies) {
      processed++;
      
      console.log(`\n[${processed}/${companies.length}] Processing: ${company.nom}`);

      const result = await findCompanyEmailsNew(company);

      const updateData: any = {
        website_url: result.website,
        emails: result.emails.length > 0 ? result.emails : null,
        updated_at: new Date().toISOString()
      };

      if (result.emails.length > 0) {
        updateData.selected_email = selectBestEmail(result.emails);
      } else {
        // IMPORTANT: Marquer comme traité même si aucun email trouvé
        // pour éviter de re-traiter les mêmes entreprises en boucle
        updateData.selected_email = 'NOT_FOUND';
        
        // Si aucun email trouvé, analyser avec l'IA pour détecter site carrière ou formulaire
        if (result.website) {
          console.log(`[AI] No email found, analyzing contact options...`);
          const analysis = await analyzeContactOptions(result.website, company.nom);
          
          if (analysis.careerSiteUrl) {
            updateData.career_site_url = analysis.careerSiteUrl;
            console.log(`[AI] ✅ Career site found: ${analysis.careerSiteUrl}`);
          }
          
          if (analysis.hasContactForm) {
            updateData.has_contact_form = true;
            console.log(`[AI] ✅ Contact form detected`);
          }
        }
      }

      if (result.careerPageUrl) {
        const notesPrefix = `Page carrière: ${result.careerPageUrl}\n`;
        updateData.notes = notesPrefix + (company.notes || '');
      }

      const { error: updateError } = await supabase
        .from("companies")
        .update(updateData)
        .eq("id", company.id);

      if (updateError) {
        console.error(`Error updating company ${company.id}:`, updateError);
      }

      results.push({
        company: company.nom,
        website: result.website,
        emails: result.emails,
        selected_email: updateData.selected_email || null,
        confidence: result.confidence,
        source: result.source,
        error: result.error
      });

      await delay(200); // Réduit à 200ms pour accélérer
    }

    // Compter les entreprises restantes (non traitées = selected_email IS NULL)
    const { count: remainingCount } = await supabase
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("selected_email", null);
    
    console.log(`[Remaining] ${remainingCount || 0} companies still need processing`);

    const summary = {
      processed: results.length,
      found: results.filter(r => r.emails && r.emails.length > 0).length,
      notFound: results.filter(r => !r.emails || r.emails.length === 0).length,
      sources: {
        scraping: results.filter(r => r.source === "scraping").length,
        hunterIo: results.filter(r => r.source === "hunter.io").length,
        none: results.filter(r => r.source === "none").length,
      }
    };

    // Débiter les crédits pour les emails trouvés (1 crédit par email trouvé)
    // IMPORTANT: On débite AVANT de retourner les résultats
    const emailsFound = summary.found;
    let creditsDebited = 0;
    
    if (emailsFound > 0) {
      console.log(`[Credits] Attempting to debit ${emailsFound} credits for found emails...`);
      
      // Utiliser la fonction use_send_credit pour débiter les crédits
      const { data: creditResult, error: creditError } = await supabase
        .rpc('use_send_credit', { 
          p_user_id: user.id, 
          p_count: emailsFound 
        });

      if (creditError) {
        console.error(`[Credits] Error debiting credits:`, creditError);
        // En cas d'erreur technique, on retourne une erreur
        return new Response(
          JSON.stringify({
            success: false,
            error: "Erreur lors du débit des crédits",
            message: "Une erreur est survenue lors du traitement. Veuillez réessayer.",
            processed: summary.processed,
            results: [] // Ne pas retourner les résultats si on n'a pas pu débiter
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      } else if (creditResult === false) {
        // Pas assez de crédits - ne devrait pas arriver car on a limité maxCompanies
        console.warn(`[Credits] Not enough credits to debit ${emailsFound}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Crédits insuffisants",
            message: "Vous n'avez pas assez de crédits pour cette recherche.",
            creditsNeeded: true,
            creditsAvailable: 0,
            emailsFound: emailsFound,
            planType: subscription?.plan_type || 'free'
          }),
          { 
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      } else {
        creditsDebited = emailsFound;
        console.log(`[Credits] ✅ Successfully debited ${emailsFound} credits`);
      }
    }

    console.log(`\n========================================`);
    console.log(`[Summary]`);
    console.log(`  Processed: ${summary.processed}`);
    console.log(`  Found: ${summary.found}`);
    console.log(`  Not found: ${summary.notFound}`);
    console.log(`  Credits debited: ${creditsDebited}`);
    console.log(`  Sources: Scraping=${summary.sources.scraping}, Hunter.io=${summary.sources.hunterIo}, None=${summary.sources.none}`);
    console.log(`========================================`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: summary.processed,
        results,
        summary: { ...summary, creditsDebited },
        hasMore: (remainingCount || 0) > 0,
        message: `${summary.found} emails trouvés sur ${summary.processed} entreprises (${creditsDebited} crédits utilisés)`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in find-company-emails:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: error instanceof Error && error.message.includes("Rate limit") ? 429 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
