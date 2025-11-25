import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  maxCompanies: z.number().int().min(1).max(150).optional().default(10)
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
    return;
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

// Scrape une page avec Axios + Cheerio (via DOMParser)
async function scrapePage(url: string): Promise<{ emails: string[]; text: string; hasContactForm: boolean }> {
  try {
    console.log(`[Scraping] ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0;)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.log(`[Scraping] HTTP ${response.status} for ${url}`);
      return { emails: [], text: '', hasContactForm: false };
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    if (!doc) {
      return { emails: [], text: '', hasContactForm: false };
    }

    // Supprime les éléments non pertinents
    const removeSelectors = ['script', 'style', 'nav', 'header', 'footer', 'iframe', 'noscript'];
    removeSelectors.forEach(selector => {
      doc.querySelectorAll(selector).forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    });

    // Extrait le texte propre
    const bodyText = doc.querySelector('body')?.textContent || '';
    const cleanText = bodyText
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 3000);

    // Cherche les emails par regex
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailsFound: string[] = [];
    const emailMatches = html.match(emailRegex) || [];
    emailsFound.push(...emailMatches);
    
    // Cherche les mailto:
    const mailtoRegex = /mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi;
    const mailtoMatches = [...html.matchAll(mailtoRegex)];
    mailtoMatches.forEach(match => {
      if (match[1]) emailsFound.push(match[1]);
    });

    // Détecte les formulaires de contact
    const hasContactForm = doc.querySelectorAll('form').length > 0 && 
                          (cleanText.toLowerCase().includes('contact') || 
                           cleanText.toLowerCase().includes('message'));

    // Filtre les emails invalides
    const validEmails = emailsFound.filter((email: string) => {
      const lower = email.toLowerCase();
      return !lower.includes('noreply') &&
             !lower.includes('no-reply') &&
             !lower.includes('example') &&
             !lower.includes('.png') &&
             !lower.includes('.jpg') &&
             !lower.includes('.gif');
    });

    console.log(`[Scraping] Found ${validEmails.length} emails on ${url}`);
    
    return {
      emails: [...new Set(validEmails)], // Déduplique
      text: cleanText,
      hasContactForm
    };

  } catch (error) {
    console.error(`[Scraping] Error on ${url}:`, error);
    return { emails: [], text: '', hasContactForm: false };
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

  // Cherche un email avec mot-clé prioritaire
  for (const priority of priorities) {
    const found = emails.find((email: string) => email.toLowerCase().includes(priority));
    if (found) return found;
  }

  // Cherche un email du domaine de l'entreprise
  const companyWords = lowerCompany.split(/\s+/).filter(w => w.length > 3);
  for (const word of companyWords) {
    const found = emails.find((email: string) => email.toLowerCase().includes(word));
    if (found) return found;
  }

  // Retourne le premier email
  return emails[0];
}

// Étape 2: Trouver le site officiel avec SerpAPI
async function findOfficialWebsite(company: CompanyRow): Promise<string | null> {
  if (!SERPAPI_KEY) {
    console.error("[SerpAPI] API key not configured");
    return null;
  }

  const searchQuery = company.ville 
    ? `${company.nom} ${company.ville} site officiel`
    : `${company.nom} site officiel`;
  
  console.log(`[SerpAPI] Searching: "${searchQuery}"`);

  try {
    const url = `https://serpapi.com/search?q=${encodeURIComponent(searchQuery)}&api_key=${SERPAPI_KEY}&num=5`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[SerpAPI] Error ${response.status}`);
      return null;
    }

    const data = await response.json();
    const organicResults = data.organic_results || [];

    if (organicResults.length === 0) {
      console.log(`[SerpAPI] No results found`);
      return null;
    }

    // Filtrer les résultats indésirables
    const filteredResults = organicResults
      .slice(0, 3)
      .filter((result: any) => {
        const link = result.link?.toLowerCase() || "";
        // Exclure les annuaires et réseaux sociaux
        const blacklist = [
          'linkedin.com',
          'facebook.com',
          'instagram.com',
          'twitter.com',
          'pagesjaunes.fr',
          'societe.com',
          'verif.com',
          'pappers.fr',
          'infogreffe.fr',
          'data.gouv.fr',
          'wikipedia.org'
        ];
        return !blacklist.some(domain => link.includes(domain));
      });

    if (filteredResults.length === 0) {
      console.log(`[SerpAPI] No valid results after filtering`);
      return null;
    }

    // Si un seul candidat, on le retourne directement
    if (filteredResults.length === 1) {
      const url = filteredResults[0].link;
      console.log(`[SerpAPI] ✅ Single candidate: ${url}`);
      return url;
    }

    // Si plusieurs candidats, utiliser l'IA pour valider
    console.log(`[SerpAPI] Multiple candidates (${filteredResults.length}), using AI validation`);
    const validatedUrl = await validateWebsiteWithAI(company, filteredResults);
    
    return validatedUrl || filteredResults[0].link;

  } catch (error) {
    console.error(`[SerpAPI] Error:`, error);
    return null;
  }
}

// Validation IA si plusieurs candidats
async function validateWebsiteWithAI(
  company: CompanyRow, 
  candidates: Array<{ link: string; title: string; snippet?: string }>
): Promise<string | null> {
  if (!LOVABLE_API_KEY) {
    console.log("[AI] No API key, returning first candidate");
    return candidates[0].link;
  }

  const prompt = `Tu es un expert en identification de sites web officiels d'entreprises françaises.

ENTREPRISE:
Nom: ${company.nom}
Ville: ${company.ville || "N/A"}
Activité: ${company.libelle_ape || "N/A"}

CANDIDATS TROUVÉS:
${candidates.map((c, i) => `${i + 1}. ${c.link}\n   Titre: ${c.title}\n   Description: ${c.snippet || "N/A"}`).join('\n\n')}

MISSION:
Identifie quel candidat est le SITE OFFICIEL de l'entreprise (pas un annuaire, pas un réseau social).

RÈGLES:
1. Le site doit appartenir à l'entreprise elle-même
2. Privilégier les domaines qui contiennent le nom de l'entreprise
3. Si aucun n'est sûr, réponds "NONE"

RÉPONSE:
Réponds UNIQUEMENT avec le numéro du candidat (1, 2, 3...) ou "NONE".`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Tu réponds UNIQUEMENT avec un chiffre ou 'NONE'. Aucun texte supplémentaire.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      console.error("[AI] Validation error:", response.status);
      return candidates[0].link;
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.trim() || "";
    
    const candidateNum = parseInt(answer);
    if (!isNaN(candidateNum) && candidateNum >= 1 && candidateNum <= candidates.length) {
      console.log(`[AI] Selected candidate ${candidateNum}: ${candidates[candidateNum - 1].link}`);
      return candidates[candidateNum - 1].link;
    }

    console.log(`[AI] No confident choice, using first candidate`);
    return candidates[0].link;

  } catch (error) {
    console.error("[AI] Error validating:", error);
    return candidates[0].link;
  }
}

// Nouvelle fonction: Recherche d'emails avec Hunter.io
async function findEmailsWithHunter(websiteUrl: string): Promise<{
  emails: string[];
  source: string;
  confidence: string;
}> {
  if (!HUNTER_API_KEY) {
    console.log("[Hunter.io] API key not configured");
    return { emails: [], source: "hunter-disabled", confidence: "none" };
  }

  try {
    // Extraire le domaine de l'URL
    const domain = new URL(websiteUrl).hostname.replace('www.', '');
    console.log(`[Hunter.io] Searching emails for domain: ${domain}`);

    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER_API_KEY}&type=generic&limit=50`;
    
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[Hunter.io] Error ${response.status}`);
      return { emails: [], source: "hunter-error", confidence: "none" };
    }

    const data = await response.json();
    console.log(`[Hunter.io] Response:`, JSON.stringify(data, null, 2));

    if (!data.data || !data.data.emails || data.data.emails.length === 0) {
      console.log(`[Hunter.io] No emails found for ${domain}`);
      return { emails: [], source: "hunter-no-results", confidence: "none" };
    }

    // Filtrer et prioriser les emails génériques
    const genericEmails = data.data.emails.filter((item: any) => item.type === "generic");
    
    console.log(`[Hunter.io] Found ${genericEmails.length} generic emails`);

    // Prioriser par department
    const priorityDepartments = ['hr', 'management', 'sales', 'support', 'communication'];
    const sortedEmails = [...genericEmails].sort((a: any, b: any) => {
      const aDept = a.department?.toLowerCase() || '';
      const bDept = b.department?.toLowerCase() || '';
      
      const aPriority = priorityDepartments.indexOf(aDept);
      const bPriority = priorityDepartments.indexOf(bDept);
      
      // Si les deux ont une priorité, comparer
      if (aPriority !== -1 && bPriority !== -1) {
        return aPriority - bPriority;
      }
      // Si seulement a a une priorité
      if (aPriority !== -1) return -1;
      // Si seulement b a une priorité
      if (bPriority !== -1) return 1;
      
      // Sinon, prioriser par confidence
      return (b.confidence || 0) - (a.confidence || 0);
    });

    // Prioriser aussi par mot-clé dans l'email
    const keywordPriorities = ['recrutement', 'rh', 'recruitment', 'hr', 'jobs', 'careers', 'contact', 'info'];
    const finalSorted = [...sortedEmails].sort((a: any, b: any) => {
      const aEmail = a.value?.toLowerCase() || '';
      const bEmail = b.value?.toLowerCase() || '';
      
      const aKeywordIndex = keywordPriorities.findIndex(kw => aEmail.includes(kw));
      const bKeywordIndex = keywordPriorities.findIndex(kw => bEmail.includes(kw));
      
      if (aKeywordIndex !== -1 && bKeywordIndex !== -1) {
        return aKeywordIndex - bKeywordIndex;
      }
      if (aKeywordIndex !== -1) return -1;
      if (bKeywordIndex !== -1) return 1;
      
      return 0;
    });

    const emails = finalSorted
      .map((item: any) => item.value)
      .filter((email: string) => email && email.includes('@'));

    console.log(`[Hunter.io] Prioritized emails:`, emails);

    const confidence = emails.length > 0 ? "high" : "none";

    return {
      emails,
      source: "hunter.io",
      confidence
    };

  } catch (error) {
    console.error("[Hunter.io] Error:", error);
    return { emails: [], source: "hunter-error", confidence: "none" };
  }
}

// Étape 3: Extraire les informations avec scraping multi-pages
async function extractEmailFromWebsite(
  websiteUrl: string,
  companyName: string
): Promise<{
  emails: string[];
  careerPageUrl?: string;
  alternativeContact?: string;
}> {
  const emails: Set<string> = new Set();
  let careerPageUrl: string | undefined;
  let allContent = '';
  let hasContactForm = false;

  // Pages à scraper (réduites à 4 pages principales)
  const pagesToCheck = [
    websiteUrl,
    `${websiteUrl}/contact`,
    `${websiteUrl}/recrutement`,
    `${websiteUrl}/careers`,
  ];

  console.log(`[Email Extraction] Starting for ${companyName}`);

  // Crawl chaque page
  for (const pageUrl of pagesToCheck) {
    const result = await scrapePage(pageUrl);
    
    if (result.text) {
      allContent += result.text + '\n\n';
    }
    
    if (result.hasContactForm) {
      hasContactForm = true;
    }
    
    // Ajoute les emails trouvés
    result.emails.forEach((email: string) => emails.add(email));
    
    // Détecte page carrière
    const lowerText = result.text.toLowerCase();
    if (!careerPageUrl && (
      (lowerText.includes('offre') && lowerText.includes('emploi')) ||
      lowerText.includes('recrutement') ||
      lowerText.includes('rejoignez') ||
      lowerText.includes('careers') ||
      lowerText.includes('jobs') ||
      lowerText.includes('welcomekit') ||
      lowerText.includes('welcome to the jungle')
    )) {
      careerPageUrl = pageUrl;
      console.log(`[Scraping] Found career page: ${pageUrl}`);
    }

    // Si on a trouvé un email, on arrête de scraper
    if (emails.size > 0) {
      console.log(`[Email Extraction] Found ${emails.size} email(s), stopping scraping`);
      break;
    }

    // Délai réduit entre les pages
    await delay(500);
  }

  const emailList = Array.from(emails);
  console.log(`[Email Extraction] Found ${emailList.length} emails by scraping`);

  // Si pas d'emails trouvés mais formulaire disponible
  if (emailList.length === 0 && hasContactForm) {
    return {
      emails: [],
      careerPageUrl,
      alternativeContact: "Formulaire de contact disponible"
    };
  }

  // Si pas d'emails trouvés → fallback sur IA
  if (emailList.length === 0 && allContent) {
    console.log(`[AI Fallback] No emails found, using AI to analyze content`);
    const aiResult = await extractEmailWithAI(allContent, companyName, new URL(websiteUrl).hostname);
    return {
      emails: aiResult.emails,
      careerPageUrl: aiResult.careerPageUrl || careerPageUrl,
      alternativeContact: aiResult.emails.length === 0 ? "Aucun email trouvé" : undefined
    };
  }

  return {
    emails: emailList,
    careerPageUrl,
  };
}

// Utiliser l'IA pour enrichir et valider les emails (FALLBACK UNIQUEMENT)
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

    // Clean markdown code blocks if present
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
      console.log(`[AI] Career page: ${careerPage || 'not found'}`);

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

async function findCompanyEmailsNew(company: CompanyRow): Promise<{
  website: string | null;
  emails: string[];
  confidence: string;
  source: string;
  careerPageUrl?: string;
  alternativeContact?: string;
  error?: string;
}> {
  console.log(`\n[Processing] ${company.nom} (${company.ville || 'N/A'})`);

  // Étape 2: Trouver le site officiel
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

  console.log(`[Website] Found: ${website}`);

  // Étape 3: Recherche avec Hunter.io en priorité
  const hunterResult = await findEmailsWithHunter(website);
  
  let finalEmails: string[] = [];
  let source = hunterResult.source;
  let confidence = hunterResult.confidence;
  let careerPageUrl: string | undefined;
  let alternativeContact: string | undefined;

  // Si Hunter.io a trouvé des emails, les utiliser
  if (hunterResult.emails.length > 0) {
    console.log(`[Hunter.io] ✅ Found ${hunterResult.emails.length} email(s)`);
    finalEmails = hunterResult.emails;
    source = "hunter.io";
    confidence = "high";
  } else {
    // Fallback: Scraping multi-pages + IA
    console.log(`[Hunter.io] ❌ No results, falling back to scraping`);
    const scrapingResult = await extractEmailFromWebsite(website, company.nom);
    finalEmails = scrapingResult.emails;
    careerPageUrl = scrapingResult.careerPageUrl;
    alternativeContact = scrapingResult.alternativeContact;
    source = scrapingResult.emails.length > 0 ? "scraping" : "none";
    confidence = scrapingResult.emails.length > 0 ? "medium" : "low";
  }
  
  // Si des emails trouvés, priorise-les (seulement si source n'est pas Hunter.io car déjà priorisés)
  if (finalEmails.length > 1 && source !== "hunter.io") {
    const bestEmail = prioritizeEmails(finalEmails, company.nom);
    if (bestEmail) {
      // Mettre le meilleur email en premier
      finalEmails = [bestEmail, ...finalEmails.filter(e => e !== bestEmail)];
    }
  }

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

  // Priorité : rh/recrutement > contact > info > autres
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
    const { maxCompanies } = requestSchema.parse(requestData);

    await checkRateLimit(supabase, user.id, "find-company-emails", 10);

    // Fetch companies without selected_email
    const { data: companies, error: fetchError } = await supabase
      .from("companies")
      .select("id, nom, ville, siren, code_ape, libelle_ape, adresse, notes")
      .eq("user_id", user.id)
      .is("selected_email", null)
      .limit(maxCompanies);

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

    console.log(`[Start] Processing ${companies.length} companies`);

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
      }

      // Stocker l'URL de la page carrière dans les notes
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

      // Délai pour éviter de surcharger les APIs
      await delay(1500);
    }

    const { count: remainingCount } = await supabase
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("selected_email", null);

    const summary = {
      processed: results.length,
      found: results.filter(r => r.emails && r.emails.length > 0).length,
      notFound: results.filter(r => !r.emails || r.emails.length === 0).length
    };

    console.log(`\n[Summary] Processed: ${summary.processed}, Found: ${summary.found}, Not found: ${summary.notFound}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: summary.processed,
        results,
        summary,
        hasMore: (remainingCount || 0) > 0,
        message: `${summary.found} emails trouvés sur ${summary.processed} entreprises`
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
