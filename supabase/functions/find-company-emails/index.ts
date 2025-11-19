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

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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
      source: "hunter",
      error: "API key not configured"
    };
  }

  console.log(`[Hunter.io] Searching for: ${company.nom} (${company.ville || 'N/A'})`);

  try {
    // Step 1: Company Search to find domain
    const searchQuery = company.ville 
      ? `${company.nom} ${company.ville} France`
      : `${company.nom} France`;
    
    const companySearchUrl = `https://api.hunter.io/v2/domain-search?company=${encodeURIComponent(searchQuery)}&api_key=${HUNTER_API_KEY}&limit=1`;
    
    console.log(`[Hunter.io] Company search for: ${searchQuery}`);
    const companyResponse = await fetch(companySearchUrl);
    
    if (!companyResponse.ok) {
      const errorText = await companyResponse.text();
      console.error(`[Hunter.io] Company search error (${companyResponse.status}):`, errorText);
      
      if (companyResponse.status === 429) {
        return {
          website: null,
          emails: [],
          confidence: "none",
          source: "hunter",
          error: "Rate limit exceeded"
        };
      }
      
      return {
        website: null,
        emails: [],
        confidence: "none",
        source: "hunter",
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
        source: "hunter",
        error: "No domain found"
      };
    }

    const domain = companyData.data.domain;
    console.log(`[Hunter.io] Domain found: ${domain}`);

    // Small delay to respect rate limits
    await delay(1000);

    // Step 2: Domain Search to get emails
    const domainSearchUrl = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${HUNTER_API_KEY}&limit=20`;
    
    console.log(`[Hunter.io] Domain search for: ${domain}`);
    const domainResponse = await fetch(domainSearchUrl);
    
    if (!domainResponse.ok) {
      const errorText = await domainResponse.text();
      console.error(`[Hunter.io] Domain search error (${domainResponse.status}):`, errorText);
      
      return {
        website: `https://${domain}`,
        emails: [],
        confidence: "low",
        source: "hunter",
        error: `Failed to get emails: ${domainResponse.status}`
      };
    }

    const domainData = await domainResponse.json();
    
    if (!domainData.data?.emails || domainData.data.emails.length === 0) {
      console.log(`[Hunter.io] No emails found for ${domain}`);
      return {
        website: `https://${domain}`,
        emails: [],
        confidence: "low",
        source: "hunter",
        error: "No emails found"
      };
    }

    const emails = domainData.data.emails
      .filter((e: any) => e.value && e.confidence && e.confidence >= 50)
      .map((e: any) => e.value);

    console.log(`[Hunter.io] Found ${emails.length} emails for ${domain}`);

    const confidence = emails.length > 0 ? "high" : "low";
    
    return {
      website: `https://${domain}`,
      emails,
      confidence,
      source: "hunter"
    };

  } catch (error) {
    console.error(`[Hunter.io] Error for ${company.nom}:`, error);
    return {
      website: null,
      emails: [],
      confidence: "none",
      source: "hunter",
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
