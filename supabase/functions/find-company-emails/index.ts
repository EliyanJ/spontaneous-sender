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
}

const SERPAPI_KEY = Deno.env.get("SERPAPI_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

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

// Étape 3: Extraire l'email avec scraping
async function extractEmailFromWebsite(websiteUrl: string): Promise<string[]> {
  const emails: Set<string> = new Set();
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

  const pagesToCheck = [
    websiteUrl,
    new URL('/contact', websiteUrl).toString(),
    new URL('/recrutement', websiteUrl).toString(),
    new URL('/jobs', websiteUrl).toString(),
    new URL('/carrieres', websiteUrl).toString(),
  ];

  for (const pageUrl of pagesToCheck) {
    try {
      console.log(`[Scraper] Checking ${pageUrl}`);
      const response = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (!response.ok) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extraire le texte de la page
      const text = $('body').text();
      
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
          (
            lowerEmail.includes('contact') ||
            lowerEmail.includes('info') ||
            lowerEmail.includes('rh') ||
            lowerEmail.includes('recrutement') ||
            lowerEmail.includes('jobs') ||
            lowerEmail.includes('careers') ||
            lowerEmail.includes('hr')
          )
        ) {
          emails.add(email);
        }
      });

      // Si on a trouvé des emails, pas besoin de continuer
      if (emails.size > 0) break;

    } catch (error) {
      console.log(`[Scraper] Failed to fetch ${pageUrl}`);
    }
  }

  return Array.from(emails);
}

// Si scraping échoue, utiliser l'IA pour analyser la page contact
async function extractEmailWithAI(websiteUrl: string): Promise<string[]> {
  if (!LOVABLE_API_KEY) {
    console.log("[AI] No API key for email extraction");
    return [];
  }

  try {
    const contactUrl = new URL('/contact', websiteUrl).toString();
    console.log(`[AI] Analyzing ${contactUrl}`);

    const response = await fetch(contactUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const text = $('body').text().substring(0, 5000); // Limiter pour l'IA

    const prompt = `Tu es un expert en extraction d'emails de sites web.

CONTENU DE LA PAGE CONTACT:
${text}

MISSION:
Extrais UNIQUEMENT les adresses email de contact professionnel (RH, recrutement, contact général).

RÈGLES:
- N'extrais QUE des emails valides
- Exclure: noreply@, newsletter@, no-reply@
- Privilégier: rh@, recrutement@, contact@, info@, jobs@, careers@, hr@
- Si aucun email trouvé, réponds "NONE"

RÉPONSE:
Liste les emails séparés par des virgules ou "NONE".`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "Tu réponds UNIQUEMENT avec des emails séparés par des virgules ou 'NONE'.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!aiResponse.ok) return [];

    const data = await aiResponse.json();
    const answer = data.choices?.[0]?.message?.content?.trim() || "";

    if (answer === "NONE" || !answer) return [];

    const emails = answer.split(',').map((e: string) => e.trim()).filter((e: string) => e.includes('@'));
    console.log(`[AI] Extracted ${emails.length} emails`);
    
    return emails;

  } catch (error) {
    console.error("[AI] Error extracting email:", error);
    return [];
  }
}

async function findCompanyEmailsNew(company: CompanyRow): Promise<{
  website: string | null;
  emails: string[];
  confidence: string;
  source: string;
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

  // Étape 3a: Scraping basique
  let emails = await extractEmailFromWebsite(website);

  // Étape 3b: Si pas d'emails, utiliser l'IA
  if (emails.length === 0) {
    console.log(`[Fallback] Using AI to extract emails`);
    emails = await extractEmailWithAI(website);
  }

  const confidence = emails.length > 0 ? "high" : "low";

  return {
    website,
    emails,
    confidence,
    source: emails.length > 0 ? "scraper-ai" : "serpapi"
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
      .select("id, nom, ville, siren, code_ape, libelle_ape, adresse")
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
