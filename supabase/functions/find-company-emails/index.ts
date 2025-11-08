import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompanyRow {
  id: string;
  nom: string;
  ville: string | null;
  siren: string;
}

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 30000);
  } catch (_) {
    return null;
  }
}

function generatePossibleUrls(companyName: string): string[] {
  const cleaned = companyName
    .toLowerCase()
    .replace(/\b(sas|sasu|sarl|sa|eurl|eirl|holding|france|group|groupe)\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

  const variations = [
    cleaned,
    cleaned.replace(/\s+/g, ""),
    cleaned.replace(/\s+/g, "-"),
  ].filter(v => v.length > 2);

  const domains = [".com", ".fr", ".net", ".eu"];
  const urls: string[] = [];

  for (const variant of [...new Set(variations)]) {
    for (const domain of domains) {
      urls.push(`https://www.${variant}${domain}`);
      urls.push(`https://${variant}${domain}`);
    }
  }

  return [...new Set(urls)].slice(0, 12);
}

async function aiSearchAndExtract({
  companyName,
  city,
  siren,
}: {
  companyName: string;
  city: string | null;
  siren: string;
}): Promise<{ website: string | null; emails: string[] }> {
  if (!OPENAI_API_KEY) {
    console.error("[AI] No OpenAI API key");
    return { website: null, emails: [] };
  }

  // Étape 1: Générer des URLs possibles
  const possibleUrls = generatePossibleUrls(companyName);
  console.log(`[AI] Testing ${possibleUrls.length} possible URLs for ${companyName}`);

  const scrapedData: { url: string; content: string }[] = [];

  for (const url of possibleUrls) {
    const content = await fetchText(url);
    if (content && content.length > 200) {
      scrapedData.push({ url, content: content.slice(0, 15000) });
      console.log(`[AI] ✓ Found content at ${url}`);
      if (scrapedData.length >= 4) break; // Limiter à 4 sites pour rester sous token limit
    }
    await delay(300);
  }

  if (scrapedData.length === 0) {
    console.log(`[AI] No accessible websites found for ${companyName}`);
    return { website: null, emails: [] };
  }

  // Étape 2: Demander à l'IA d'identifier le site officiel et extraire les emails
  const prompt = `ENTREPRISE: ${companyName}
VILLE: ${city || "Non spécifiée"}
SIREN: ${siren}

J'ai récupéré le contenu de plusieurs sites web possibles. Analyse-les et:
1. Identifie quel site est le SITE OFFICIEL de cette entreprise (celui qui correspond vraiment à l'entreprise)
2. Extrait TOUS les emails de contact professionnels trouvés sur ce site officiel

SITES SCRAPÉS:
${scrapedData.map((d, i) => `
=== SITE ${i + 1}: ${d.url} ===
${d.content}
`).join("\n\n")}

RÈGLES STRICTES:
- Si aucun site ne correspond à l'entreprise, réponds: {"website": null, "emails": []}
- Sinon, retourne l'URL du site officiel ET les emails trouvés
- Priorité aux emails: contact@, info@, commercial@, bonjour@, hello@, support@
- IGNORE: noreply@, no-reply@, newsletter@, unsubscribe@
- Vérifie que les emails sont valides (format email@domain.com)
- Réponds UNIQUEMENT en JSON strict

FORMAT RÉPONSE (JSON uniquement):
{"website": "https://site-officiel.fr", "emails": ["contact@example.fr", "info@example.fr"]}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${OPENAI_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "gpt-5-2025-08-07",
        messages: [
          { 
            role: "system", 
            content: "Tu es un expert en identification de sites web d'entreprises et extraction d'emails. Tu réponds UNIQUEMENT en JSON valide, sans texte supplémentaire." 
          },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[AI] OpenAI error:", response.status, error);
      return { website: null, emails: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    
    // Parse la réponse JSON
    const clean = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean);

    const website = parsed.website || null;
    const emails: string[] = Array.isArray(parsed.emails) ? parsed.emails : [];
    
    // Valider les emails
    const validEmails = emails.filter(
      (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !/no-?reply|newsletter|unsubscribe/i.test(e)
    );

    console.log(`[AI] Result for ${companyName}: site=${website}, emails=${validEmails.length}`);
    
    return { 
      website, 
      emails: [...new Set(validEmails)] 
    };

  } catch (error) {
    console.error("[AI] Error:", error instanceof Error ? error.message : String(error));
    return { website: null, emails: [] };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    // Récupérer les entreprises de l'utilisateur
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, nom, ville, siren")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20); // Limité à 20 pour éviter les timeouts

    if (companiesError) throw companiesError;
    if (!companies || companies.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "Aucune entreprise trouvée. Ajoutez des entreprises depuis l'onglet Recherche.", 
          processed: 0, 
          total: 0,
          emailsFound: 0,
          results: [] 
        }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[SEARCH] Starting email search for ${companies.length} companies`);

    let processed = 0;
    let emailsFound = 0;
    const results: any[] = [];

    for (const company of companies as CompanyRow[]) {
      try {
        console.log(`[SEARCH] Processing: ${company.nom}`);
        
        const { website, emails } = await aiSearchAndExtract({
          companyName: company.nom,
          city: company.ville,
          siren: company.siren,
        });

        if (!website) {
          results.push({ 
            company: company.nom, 
            status: "no-website",
            error: "Site web introuvable" 
          });
          processed++;
          await delay(2000);
          continue;
        }

        // Mettre à jour la base de données
        const updates: Record<string, any> = { website_url: website };
        if (emails.length > 0) {
          updates.emails = emails;
          emailsFound += emails.length;
        }

        const { error: updateError } = await supabase
          .from("companies")
          .update(updates)
          .eq("id", company.id);

        if (updateError) {
          console.error("[DB] Update error:", updateError.message);
        }

        results.push({
          company: company.nom,
          status: "success",
          website,
          emails,
          confidence: emails.length > 0 ? "high" : "medium",
        });

        processed++;
        await delay(2000); // Délai entre entreprises

      } catch (error) {
        console.error("[PROCESS] Error:", error instanceof Error ? error.message : String(error));
        results.push({ 
          company: company.nom, 
          status: "error", 
          error: error instanceof Error ? error.message : "Erreur inconnue" 
        });
        processed++;
      }
    }

    console.log(`[SEARCH] Completed: ${processed}/${companies.length}, ${emailsFound} emails found`);

    return new Response(
      JSON.stringify({ 
        message: "Recherche d'emails terminée", 
        processed, 
        total: companies.length, 
        emailsFound, 
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[MAIN]", error instanceof Error ? error.message : String(error));
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});