import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const HUNTER_API_KEY = Deno.env.get("HUNTER_API_KEY");
    if (!HUNTER_API_KEY) {
      throw new Error("HUNTER_API_KEY not configured");
    }

    // Récupérer toutes les entreprises de l'utilisateur sans emails
    const { data: companies, error: companiesError } = await supabaseClient
      .from("companies")
      .select("*")
      .eq("user_id", user.id)
      .or("emails.is.null,emails.eq.[]");

    if (companiesError) throw companiesError;

    let totalEmailsFound = 0;
    let companiesUpdated = 0;

    console.log(`Processing ${companies?.length || 0} companies`);

    for (const company of companies || []) {
      try {
        console.log(`Searching emails for: ${company.nom}`);

        // Étape 1: Company Enrichment pour trouver le domaine
        const enrichmentUrl = `https://api.hunter.io/v2/company-enrichment?company=${encodeURIComponent(company.nom)}&api_key=${HUNTER_API_KEY}`;
        const enrichmentResponse = await fetch(enrichmentUrl);
        const enrichmentData = await enrichmentResponse.json();

        let domain = enrichmentData?.data?.domain;

        // Si pas de domaine trouvé, essayer avec ville
        if (!domain && company.ville) {
          const enrichmentUrl2 = `https://api.hunter.io/v2/company-enrichment?company=${encodeURIComponent(company.nom + " " + company.ville)}&api_key=${HUNTER_API_KEY}`;
          const enrichmentResponse2 = await fetch(enrichmentUrl2);
          const enrichmentData2 = await enrichmentResponse2.json();
          domain = enrichmentData2?.data?.domain;
        }

        if (!domain) {
          console.log(`No domain found for ${company.nom}`);
          continue;
        }

        console.log(`Domain found: ${domain}`);

        // Sauvegarder le domaine
        await supabaseClient
          .from("companies")
          .update({ website_url: `https://${domain}` })
          .eq("id", company.id);

        // Étape 2: Domain Search pour trouver les emails
        const domainSearchUrl = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${HUNTER_API_KEY}`;
        const domainResponse = await fetch(domainSearchUrl);
        const domainData = await domainResponse.json();

        const emails = domainData?.data?.emails || [];
        
        if (emails.length === 0) {
          console.log(`No emails found for ${domain}`);
          continue;
        }

        // Étape 3: Email Verification (optionnel, pour les premiers emails)
        const verifiedEmails = [];
        for (let i = 0; i < Math.min(emails.length, 3); i++) {
          const email = emails[i];
          try {
            const verifyUrl = `https://api.hunter.io/v2/email-verifier?email=${email.value}&api_key=${HUNTER_API_KEY}`;
            const verifyResponse = await fetch(verifyUrl);
            const verifyData = await verifyResponse.json();

            if (verifyData?.data?.status === "valid" || verifyData?.data?.status === "accept_all") {
              verifiedEmails.push(email.value);
            }
          } catch (error) {
            console.log(`Could not verify ${email.value}:`, error);
            // Si la vérification échoue, on garde l'email quand même
            verifiedEmails.push(email.value);
          }
        }

        // Ajouter le reste des emails sans vérification
        for (let i = 3; i < emails.length; i++) {
          verifiedEmails.push(emails[i].value);
        }

        if (verifiedEmails.length > 0) {
          // Sauvegarder les emails
          await supabaseClient
            .from("companies")
            .update({ emails: verifiedEmails })
            .eq("id", company.id);

          totalEmailsFound += verifiedEmails.length;
          companiesUpdated++;
          console.log(`Found ${verifiedEmails.length} emails for ${company.nom}`);
        }

        // Délai pour respecter les rate limits de Hunter.io
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing ${company.nom}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        companiesProcessed: companies?.length || 0,
        companiesUpdated,
        totalEmailsFound,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in find-company-emails:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
