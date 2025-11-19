import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  maxCompanies: z.number().int().min(1).max(50).optional().default(25)
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

const HUNTER_API_KEY = Deno.env.get("HUNTER_IO_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function guessCompanyDomain(company: CompanyRow): Promise<string | null> {
  if (!LOVABLE_API_KEY) {
    console.error("[AI] LOVABLE_API_KEY not configured");
    return null;
  }

  const prompt = `Tu es un expert en identification de noms de domaine d'entreprises françaises.

ENTREPRISE:
Nom légal: ${company.nom}
Ville: ${company.ville || "N/A"}
Code APE: ${company.code_ape || "N/A"} - ${company.libelle_ape || "N/A"}

MISSION:
Devine le nom de domaine le plus probable de cette entreprise (sans http://, juste le domaine).

RÈGLES STRICTES:
1. Si c'est une grande entreprise connue → utilise le nom de marque (ex: "THALES LAS FRANCE" → "thalesgroup.com")
2. Si c'est une PME/TPE → essaie des variantes logiques:
   - Nom simplifié + .fr (ex: "SARL DUPONT" → "dupont.fr")
   - Acronyme + .fr (ex: "SA J.C.E." → "jce.fr" ou "sacje.fr")
   - Nom-ville + .fr (ex: "GARAGE MARTIN Lyon" → "garagemartin-lyon.fr")
3. Si tu n'es vraiment PAS SÛR → réponds exactement "UNKNOWN"
4. TOUJOURS privilégier .fr pour les entreprises françaises sauf grandes marques internationales

EXEMPLES:
- "DEICHMANN CHAUSSURES" → "deichmann.fr"
- "BNP PARIBAS ANTILLES GUYANE" → "bnpparibas.com"
- "ASSOCIATION LES AMITIES D'ARMOR" → "UNKNOWN" (trop incertain)
- "VC TECHNOLOGY" → "vctechnology.fr" (tentative raisonnable)

RÉPONSE ATTENDUE:
Juste le domaine (exemple: "thalesgroup.com") ou "UNKNOWN"`;

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
            content: "Tu réponds UNIQUEMENT avec le nom de domaine ou 'UNKNOWN'. Aucun texte supplémentaire.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error("[AI] Domain guess error:", response.status);
      return null;
    }

    const data = await response.json();
    const guess = data.choices?.[0]?.message?.content?.trim().toLowerCase() || "";
    
    if (guess === "unknown" || !guess || guess.includes(" ")) {
      console.log(`[AI] No confident guess for ${company.nom}`);
      return null;
    }

    // Nettoyer le domaine
    const cleanDomain = guess.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
    console.log(`[AI] Guessed domain for ${company.nom}: ${cleanDomain}`);
    
    return cleanDomain;
  } catch (error) {
    console.error(`[AI] Error guessing domain for ${company.nom}:`, error);
    return null;
  }
}

function selectBestEmail(emails: Array<{ value: string; type: string }>): string {
  if (emails.length === 0) return "";
  if (emails.length === 1) return emails[0].value;

  // Priorité : rh/recrutement > contact > info > autres
  const priorities = ['rh', 'recrutement', 'recruitment', 'hr', 'jobs', 'careers', 'contact', 'info'];
  
  for (const priority of priorities) {
    const found = emails.find(e => 
      e.value.toLowerCase().includes(priority) || 
      e.type?.toLowerCase().includes(priority)
    );
    if (found) return found.value;
  }
  
  return emails[0].value;
}

async function findCompanyWithHunter(company: CompanyRow): Promise<{
  website: string | null;
  emails: string[];
  confidence: string;
  source: string;
  error?: string;
}> {
  if (!HUNTER_API_KEY) {
    console.error("[Hunter.io] API key not configured");
    return {
      website: null,
      emails: [],
      confidence: "none",
      source: "hunter-ai",
      error: "API key not configured"
    };
  }

  console.log(`[Hunter.io] Searching for: ${company.nom} (${company.ville || 'N/A'})`);

  try {
    // Step 1: Use AI to guess domain
    const guessedDomain = await guessCompanyDomain(company);
    
    let domain: string | null = null;

    if (guessedDomain) {
      // AI has a guess, verify with Hunter.io Domain Search directly
      console.log(`[Hunter.io] Testing AI guess: ${guessedDomain}`);
      
      const domainSearchUrl = `https://api.hunter.io/v2/domain-search?domain=${guessedDomain}&api_key=${HUNTER_API_KEY}&limit=20`;
      const domainResponse = await fetch(domainSearchUrl);
      
      if (domainResponse.ok) {
        const domainData = await domainResponse.json();
        
        if (domainData.data?.domain) {
          domain = domainData.data.domain;
          console.log(`[Hunter.io] ✅ AI guess verified: ${domain}`);
        } else {
          console.log(`[Hunter.io] ❌ AI guess incorrect, domain not found`);
        }
      } else {
        console.log(`[Hunter.io] ❌ AI guess incorrect or API error`);
      }
    }

    // Step 2: If AI didn't guess or guess was wrong, fallback to Company Search
    if (!domain) {
      console.log(`[Hunter.io] Falling back to Company Search`);
      
      const searchQuery = company.ville 
        ? `${company.nom} ${company.ville} France`
        : `${company.nom} France`;
      
      const companySearchUrl = `https://api.hunter.io/v2/domain-search?company=${encodeURIComponent(searchQuery)}&api_key=${HUNTER_API_KEY}&limit=1`;
      
      const companyResponse = await fetch(companySearchUrl);
      
      if (!companyResponse.ok) {
        const errorText = await companyResponse.text();
        console.error(`[Hunter.io] Company search error (${companyResponse.status}):`, errorText);
        
        if (companyResponse.status === 429) {
          return {
            website: null,
            emails: [],
            confidence: "none",
            source: "hunter-ai",
            error: "Rate limit exceeded"
          };
        }
        
        return {
          website: null,
          emails: [],
          confidence: "none",
          source: "hunter-ai",
          error: `API error: ${companyResponse.status}`
        };
      }

      const companyData = await companyResponse.json();
      
      if (!companyData.data?.domain) {
        console.log(`[Hunter.io] No domain found for ${company.nom}`);
        return {
          website: null,
          emails: [],
          confidence: "none",
          source: "hunter-ai",
          error: "No domain found"
        };
      }

      domain = companyData.data.domain;
      console.log(`[Hunter.io] Domain found via search: ${domain}`);
    }

    // Small delay to respect rate limits
    await delay(1000);

    // Step 3: Get emails from the domain
    const domainSearchUrl = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${HUNTER_API_KEY}&limit=20`;
    
    console.log(`[Hunter.io] Domain search for emails: ${domain}`);
    const emailResponse = await fetch(domainSearchUrl);
    
    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error(`[Hunter.io] Domain search error (${emailResponse.status}):`, errorText);
      
      return {
        website: `https://${domain}`,
        emails: [],
        confidence: "low",
        source: "hunter-ai",
        error: `Failed to get emails: ${emailResponse.status}`
      };
    }

    const emailData = await emailResponse.json();
    
    if (!emailData.data?.emails || emailData.data.emails.length === 0) {
      console.log(`[Hunter.io] No emails found for ${domain}`);
      return {
        website: `https://${domain}`,
        emails: [],
        confidence: "low",
        source: "hunter-ai",
        error: "No emails found"
      };
    }

    const emails = emailData.data.emails
      .filter((e: any) => e.value && e.confidence && e.confidence >= 50)
      .map((e: any) => e.value);

    console.log(`[Hunter.io] Found ${emails.length} emails for ${domain}`);

    const confidence = emails.length > 0 ? "high" : "low";
    
    return {
      website: `https://${domain}`,
      emails,
      confidence,
      source: "hunter-ai"
    };

  } catch (error) {
    console.error(`[Hunter.io] Error for ${company.nom}:`, error);
    return {
      website: null,
      emails: [],
      confidence: "none",
      source: "hunter-ai",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
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

    console.log(`[Hunter.io] Processing ${companies.length} companies`);

    const results = [];
    let processed = 0;

    for (const company of companies) {
      processed++;
      
      console.log(`\n[${processed}/${companies.length}] Processing: ${company.nom}`);

      const result = await findCompanyWithHunter(company);

      const updateData: any = {
        website_url: result.website,
        emails: result.emails.length > 0 ? result.emails : null,
        updated_at: new Date().toISOString()
      };

      if (result.emails.length > 0) {
        updateData.selected_email = selectBestEmail(
          result.emails.map(e => ({ value: e, type: 'generic' }))
        );
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

      // Respecter les limites de l'API gratuite (50 req/mois)
      await delay(2000);
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
