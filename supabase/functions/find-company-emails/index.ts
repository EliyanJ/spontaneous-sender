import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  maxCompanies: z.number().int().min(1).max(150).optional().default(25)
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
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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
  if (!OPENAI_API_KEY) {
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
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini-2025-08-07",
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
        max_completion_tokens: 10,
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

// Étape 3: Extraire l'email avec scraping amélioré
async function extractEmailFromWebsite(
  websiteUrl: string,
  companyName: string
): Promise<{
  emails: string[];
  careerPageUrl?: string;
  pageContent: string;
}> {
  const emails: Set<string> = new Set();
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  let careerPageUrl: string | undefined;
  let fullPageContent = '';

  const pagesToCheck = [
    websiteUrl,
    new URL('/contact', websiteUrl).toString(),
    new URL('/nous-contacter', websiteUrl).toString(),
    new URL('/recrutement', websiteUrl).toString(),
    new URL('/jobs', websiteUrl).toString(),
    new URL('/carrieres', websiteUrl).toString(),
    new URL('/careers', websiteUrl).toString(),
    new URL('/rejoignez-nous', websiteUrl).toString(),
    new URL('/about', websiteUrl).toString(),
  ];

  for (const pageUrl of pagesToCheck) {
    try {
      console.log(`[Scraper] Checking ${pageUrl}`);
      const response = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) continue;

      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Extraire le texte de la page
      const text = $('body').text();
      fullPageContent += text + '\n\n';
      
      // Détecter si c'est une page carrière
      const lowerText = text.toLowerCase();
      if (!careerPageUrl && (
        (lowerText.includes('offre') && lowerText.includes('emploi')) ||
        lowerText.includes('recrutement') ||
        lowerText.includes('rejoignez') ||
        lowerText.includes('careers') ||
        lowerText.includes('jobs')
      )) {
        careerPageUrl = pageUrl;
        console.log(`[Scraper] Found career page: ${pageUrl}`);
      }
      
      // Trouver tous les emails
      const found = text.match(emailRegex) || [];
      
      found.forEach(email => {
        const lowerEmail = email.toLowerCase();
        // Filtrer les emails indésirables
        if (
          !lowerEmail.includes('noreply') &&
          !lowerEmail.includes('no-reply') &&
          !lowerEmail.includes('newsletter') &&
          !lowerEmail.includes('example') &&
          !lowerEmail.includes('test') &&
          !lowerEmail.includes('wix') &&
          !lowerEmail.includes('google') &&
          !lowerEmail.includes('facebook') &&
          !lowerEmail.includes('.png') &&
          !lowerEmail.includes('.jpg')
        ) {
          emails.add(email);
        }
      });

      await delay(300);

    } catch (error) {
      console.log(`[Scraper] Failed to fetch ${pageUrl}`);
    }
  }

  return {
    emails: Array.from(emails),
    careerPageUrl,
    pageContent: fullPageContent.substring(0, 8000), // Limiter pour l'IA
  };
}

// Utiliser l'IA pour enrichir et valider les emails
async function extractEmailWithAI(
  pageContent: string,
  companyName: string,
  domain: string,
  scrapedEmails: string[],
  scrapedCareerUrl?: string
): Promise<{
  emails: string[];
  careerPageUrl?: string;
}> {
  if (!OPENAI_API_KEY) {
    console.log("[AI] No API key for email extraction");
    return { emails: scrapedEmails, careerPageUrl: scrapedCareerUrl };
  }

  try {
    console.log(`[AI] Analyzing content for ${companyName}...`);

    const systemPrompt = `Tu es un agent d'extraction d'informations à partir de pages web. 
Ton rôle : analyser une URL fournie, récupérer uniquement les informations réellement présentes sur cette page ou sur les pages internes accessibles sans action humaine (mentions légales, contact, recrutement, etc.).

Règles :
1. NE DONNE AUCUNE INFORMATION si elle n'est pas explicitement trouvée dans la page. Pas d'invention.
2. Si aucune information n'est trouvée, renvoie : "Aucune information trouvée."
3. Toujours fournir la ou les sources exactes (URL(s) réellement analysée(s)).
4. Si l'email, le téléphone, le formulaire ou la page carrière existent → les extraire et les classifier.
5. Tu peux suivre des liens internes (contact, mentions légales, recrutement) mais jamais des sites externes.
6. Le format de sortie doit être strictement JSON.

Format JSON obligatoire :
{
  "company_name": "...",
  "emails_found": [...],
  "phones_found": [...],
  "career_page": "...",
  "other_contacts": [...],
  "pages_visited": [...]
}`;

    const userPrompt = `Analyse cette URL : https://${domain}

CONTENU DE LA PAGE :
${pageContent}

${scrapedEmails.length > 0 ? `EMAILS DÉJÀ TROUVÉS PAR SCRAPING: ${scrapedEmails.join(', ')}\n` : ''}
${scrapedCareerUrl ? `PAGE CARRIÈRE DÉJÀ TROUVÉE: ${scrapedCareerUrl}\n` : ''}

Extrait uniquement :
- les emails visibles (priorité: recrutement@, rh@, contact@, info@, jobs@, careers@, hr@)
- les numéros de téléphone
- le formulaire de contact / page contact
- le site carrière s'il existe
- toute autre page utile interne

RÈGLES CRITIQUES:
- NE JAMAIS INVENTER d'emails
- Exclure: noreply@, newsletter@, no-reply@
- Si aucun email trouvé, emails_found doit être un tableau vide []

Et renvoie uniquement le JSON spécifié dans les instructions.`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini-2025-08-07",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0,
        top_p: 1,
        max_completion_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      console.error("[AI] Error:", aiResponse.status);
      return { emails: scrapedEmails, careerPageUrl: scrapedCareerUrl };
    }

    const data = await aiResponse.json();
    const answer = data.choices?.[0]?.message?.content?.trim() || "";
    
    console.log("[AI] Response:", answer);

    // Parser le JSON (avec response_format json_object, pas besoin de chercher les backticks)
    try {
      const result = JSON.parse(answer);
      
      // Vérifier si aucune information n'a été trouvée
      if (answer.includes("Aucune information trouvée")) {
        console.log("[AI] No information found by AI");
        return { emails: scrapedEmails, careerPageUrl: scrapedCareerUrl };
      }
      
      // Combiner emails trouvés par scraping et IA
      const allEmails = new Set([...scrapedEmails]);
      
      // Utiliser le nouveau format JSON
      if (result.emails_found && Array.isArray(result.emails_found)) {
        result.emails_found.forEach((email: string) => {
          if (email && email.includes('@')) {
            const lowerEmail = email.toLowerCase().trim();
            // Filtrer les emails indésirables
            if (
              !lowerEmail.includes('noreply') &&
              !lowerEmail.includes('no-reply') &&
              !lowerEmail.includes('newsletter')
            ) {
              allEmails.add(lowerEmail);
            }
          }
        });
      }

      // Récupérer la career page
      let careerPage = scrapedCareerUrl;
      if (result.career_page && result.career_page !== "null" && result.career_page.startsWith('http')) {
        careerPage = result.career_page;
      }

      console.log(`[AI] Extracted ${allEmails.size - scrapedEmails.length} additional emails`);
      console.log(`[AI] Career page: ${careerPage || 'not found'}`);

      return {
        emails: Array.from(allEmails),
        careerPageUrl: careerPage,
      };
    } catch (parseError) {
      console.error("[AI] Failed to parse JSON:", parseError);
      console.error("[AI] Raw response:", answer);
      
      // Fallback: utiliser uniquement les emails scrapés
      return {
        emails: scrapedEmails,
        careerPageUrl: scrapedCareerUrl,
      };
    }

  } catch (error) {
    console.error("[AI] Error extracting email:", error);
    return { emails: scrapedEmails, careerPageUrl: scrapedCareerUrl };
  }
}

async function findCompanyEmailsNew(company: CompanyRow): Promise<{
  website: string | null;
  emails: string[];
  confidence: string;
  source: string;
  careerPageUrl?: string;
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

  // Étape 3: Scraping + IA (toujours utiliser l'IA pour enrichir)
  const scrapingResult = await extractEmailFromWebsite(website, company.nom);
  console.log(`[Scraping] Found ${scrapingResult.emails.length} emails`);

  const domain = new URL(website).hostname;
  const aiResult = await extractEmailWithAI(
    scrapingResult.pageContent,
    company.nom,
    domain,
    scrapingResult.emails,
    scrapingResult.careerPageUrl
  );

  const confidence = aiResult.emails.length > 0 ? "high" : "low";
  const source = aiResult.emails.length > scrapingResult.emails.length ? "ai+scraping" : 
                 scrapingResult.emails.length > 0 ? "scraping" : "ai";

  return {
    website,
    emails: aiResult.emails,
    confidence,
    source,
    careerPageUrl: aiResult.careerPageUrl,
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
