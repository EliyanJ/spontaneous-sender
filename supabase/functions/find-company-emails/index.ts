import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helpers for domain guessing and fetch timing
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const STOP_WORDS = new Set([
  "paris","studio","groupe","holding","sas","sasu","sarl","sa","eurl","ei","eirl","snc","sci","scea","earl","asso","association","societe",
  "the","and","de","du","des","la","le","les","d","l"
]);

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function guessDomainsFromName(name: string): string[] {
  let n = normalizeName(name);
  n = n.replace(/\(.*?\)/g, ' ');
  const tokens = n.split(/[^a-z0-9]+/).filter(Boolean).filter(t => !STOP_WORDS.has(t));
  if (tokens.length === 0) return [];
  const base = tokens[0];
  const joined = tokens.join('');
  const firstTwoHyphen = tokens.slice(0, 2).join('-');
  const plusStudio = base.includes('studio') ? base : `${base}studio`;
  const combos = Array.from(new Set([base, joined, firstTwoHyphen, plusStudio])).filter(Boolean) as string[];
  const tlds = ['.fr', '.com', '.io', '.org', '.net'];
  const candidates: string[] = [];
  for (const c of combos) {
    for (const t of tlds) candidates.push(`${c}${t}`);
  }
  return Array.from(new Set(candidates)).slice(0, 12);
}

async function resolveDomain(candidate: string): Promise<string | null> {
  const tryFetch = async (url: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(url, { redirect: 'follow', signal: controller.signal } as RequestInit);
      return res;
    } catch (_e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await tryFetch(`https://${candidate}`);
  if (!res || !(res.status >= 200 && res.status < 400)) {
    res = await tryFetch(`http://${candidate}`);
  }
  if (res && res.status >= 200 && res.status < 400) {
    return res.url;
  }
  return null;
}

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

        // 1) Domain Search en utilisant le nom de l'entreprise (avec filtre de localisation FR si disponible)
        const city = typeof company.ville === "string" ? company.ville.replace(/\d+/g, "").trim() : undefined;
        const dsUrl = `https://api.hunter.io/v2/domain-search?company=${encodeURIComponent(company.nom)}&api_key=${HUNTER_API_KEY}`;

        const usePost = !!city; // Filtre location -> POST only
        const dsResponse = await fetch(dsUrl, {
          method: usePost ? "POST" : "GET",
          headers: usePost ? { "Content-Type": "application/json" } : undefined,
          body: usePost
            ? JSON.stringify({
                location: {
                  include: [
                    { city: city, country: "FR" },
                  ],
                },
              })
            : undefined,
        });

        if (!dsResponse.ok) {
          const errTxt = await dsResponse.text();
          console.error(`Domain Search error (${dsResponse.status}) for ${company.nom}:`, errTxt);
        }

        const dsData = dsResponse.ok ? await dsResponse.json() : undefined;
        if (dsData?.errors) {
          console.error(`Domain Search API returned errors for ${company.nom}:`, dsData.errors);
        }

        let domain: string | undefined = dsData?.data?.domain || dsData?.meta?.params?.domain;
        let emails = (dsData?.data?.emails || []) as Array<{ value: string }>;

        // Fallback heuristique: deviner le domaine si non trouvé par Hunter
        if (!domain) {
          const candidates = guessDomainsFromName(company.nom);
          for (const cand of candidates) {
            const resolved = await resolveDomain(cand);
            if (resolved) {
              try {
                domain = new URL(resolved).hostname;
              } catch (_) {
                domain = cand;
              }
              console.log(`Heuristic domain for ${company.nom}: ${domain} (from ${cand})`);
              break;
            }
            await delay(200);
          }
        }

        // Sauvegarder domaine si présent
        if (domain) {
          await supabaseClient
            .from("companies")
            .update({ website_url: `https://${domain}` })
            .eq("id", company.id);
          console.log(`Domain found for ${company.nom}: ${domain}`);
        }

        // Si pas d'emails, tenter une 2e passe Hunter avec le domaine
        if (domain && (!emails || emails.length === 0)) {
          const byDomainUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER_API_KEY}`;
          const byDomainRes = await fetch(byDomainUrl);
          if (byDomainRes.ok) {
            const byDomainData = await byDomainRes.json();
            if (!byDomainData.errors) {
              emails = (byDomainData?.data?.emails || []) as Array<{ value: string }>;
              console.log(`Domain-search by domain returned ${emails.length} emails for ${domain}`);
            } else {
              console.error(`Domain-search by domain errors for ${domain}:`, byDomainData.errors);
            }
          } else {
            const t = await byDomainRes.text();
            console.error(`Domain-search by domain HTTP ${byDomainRes.status} for ${domain}:`, t);
          }
        }

        if (!domain && (!emails || emails.length === 0)) {
          console.log(`No domain/emails found for ${company.nom}`);
          continue;
        }

        if (!emails || emails.length === 0) {
          console.log(`No emails found for ${company.nom}${domain ? ` (${domain})` : ""}`);
          continue;
        }

        // 2) Vérifier les 3 premiers emails (optionnel) puis stocker tous
        const verifiedEmails: string[] = [];
        for (let i = 0; i < Math.min(emails.length, 3); i++) {
          const email = emails[i]?.value;
          if (!email) continue;
          try {
            const verifyUrl = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${HUNTER_API_KEY}`;
            const verifyRes = await fetch(verifyUrl);
            if (verifyRes.ok) {
              const verifyData = await verifyRes.json();
              if (!verifyData.errors && (verifyData?.data?.status === "valid" || verifyData?.data?.status === "accept_all")) {
                verifiedEmails.push(email);
              } else {
                verifiedEmails.push(email);
              }
            } else {
              verifiedEmails.push(email);
            }
          } catch (e) {
            console.log(`Verification failed for ${email}:`, e);
            verifiedEmails.push(email);
          }
        }

        for (let i = 3; i < emails.length; i++) {
          const e = emails[i]?.value;
          if (e) verifiedEmails.push(e);
        }

        if (verifiedEmails.length > 0) {
          await supabaseClient
            .from("companies")
            .update({ emails: verifiedEmails })
            .eq("id", company.id);
          totalEmailsFound += verifiedEmails.length;
          companiesUpdated++;
          console.log(`Stored ${verifiedEmails.length} emails for ${company.nom}`);
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
