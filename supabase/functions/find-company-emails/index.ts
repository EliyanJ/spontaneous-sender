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

interface SearchResult { url: string; title: string; description?: string }

const BRAVE_SEARCH_API_KEY = Deno.env.get("BRAVE_SEARCH_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function searchWeb(query: string): Promise<SearchResult[]> {
  if (!BRAVE_SEARCH_API_KEY) return [];

  const maxAttempts = 3;
  let backoff = 800;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=6`,
        { headers: { Accept: "application/json", "X-Subscription-Token": BRAVE_SEARCH_API_KEY } }
      );

      if (res.status === 429 || res.status === 402 || res.status === 503) {
        console.error(`[BRAVE_API] Attempt ${attempt}/${maxAttempts}: ${res.status}`);
        if (attempt < maxAttempts) {
          await delay(backoff);
          backoff *= 2;
          continue;
        }
        return [];
      }

      if (!res.ok) {
        console.error(`[BRAVE_API] error ${res.status}`);
        return [];
      }

      const data = await res.json();
      const results = (data.web?.results || []).map((r: any) => ({
        url: r.url as string,
        title: r.title as string,
        description: r.description as string,
      }));
      return results as SearchResult[];
    } catch (e) {
      console.error("[SEARCH_ERROR]", e instanceof Error ? e.message : String(e));
      if (attempt < maxAttempts) {
        await delay(backoff);
        backoff *= 2;
        continue;
      }
      return [];
    }
  }
  return [];
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EmailFinder/1.0)" },
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
    return text.slice(0, 20000);
  } catch (_) {
    return null;
  }
}

function isPrimarySource(url: string, officialDomain: string | null) {
  const blocked = [
    "linkedin.com",
    "facebook.com",
    "twitter.com",
    "instagram.com",
    "pappers.fr",
    "societe.com",
    "verif.com",
    "pagesjaunes.fr",
    "b-reputation.com",
    "manageo.fr",
    "annuaire-entreprises.data.gouv.fr",
    "wikipedia.org",
    "crunchbase.com",
    "zoominfo.com",
    "apollo.io",
  ];
  const u = url.toLowerCase();
  if (blocked.some((d) => u.includes(d))) return false;
  if (officialDomain && !u.includes(officialDomain.toLowerCase())) return false;
  return true;
}

async function findOfficialWebsite(name: string, city: string | null): Promise<{ url: string | null; domain: string | null }>{
  const cleaned = name
    .replace(/\b(SAS|SASU|SARL|SA|EURL|HOLDING|FRANCE|SOCIETE|SOCIÉTÉ)\b/gi, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-zA-Z0-9&\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const queries = Array.from(new Set([
    `"${name}" ${city ?? ""} site officiel`,
    `"${cleaned}" ${city ?? ""} site officiel`,
    `"${name}" contact`,
    `"${cleaned}" contact`,
  ]));

  const seen = new Set<string>();
  const agg: SearchResult[] = [];

  for (const q of queries) {
    const r = await searchWeb(q);
    for (const it of r) {
      if (!seen.has(it.url)) {
        seen.add(it.url);
        agg.push(it);
      }
    }
    if (agg.length >= 8) break;
  }

  if (agg.length === 0) return { url: null, domain: null };

  // score by token match in hostname
  const tokens = cleaned.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const scored = agg
    .filter((r) => isPrimarySource(r.url, null))
    .map((r) => {
      try {
        const h = new URL(r.url).hostname.replace(/^www\./, "").toLowerCase();
        const s = tokens.reduce((acc, t) => acc + (h.includes(t) ? 1 : 0), 0);
        return { r, s };
      } catch {
        return { r, s: 0 };
      }
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .map((x) => x.r);

  for (const cand of scored) {
    const text = await fetchText(cand.url);
    if (text && text.length > 100) {
      try {
        const u = new URL(cand.url);
        const root = `${u.protocol}//${u.hostname}`;
        const domain = u.hostname.replace(/^www\./, "");
        return { url: root, domain };
      } catch {}
    }
  }
  return { url: null, domain: null };
}

async function extractEmailsWithOpenAI({
  companyName,
  website,
  domain,
  contents,
}: {
  companyName: string;
  website: string;
  domain: string;
  contents: string[];
}): Promise<string[]> {
  if (!OPENAI_API_KEY) return [];

  const prompt = `ENTREPRISE: ${companyName}\nSITE: ${website}\nDOMAINE: ${domain}\n\nCONTENU DE PAGES (texte brut):\n${contents.join("\n\n").slice(0, 45000)}\n\nMISSION: Extrait UNIQUEMENT les emails réellement présents dans ce contenu.\nRègles:\n- Pas d'invention\n- Préfère contact@, info@, bonjour@, support@, commercial@\n- Ignore noreply@ / no-reply@\n- Les emails doivent être valides.\n\nRéponds EXCLUSIVEMENT en JSON strict: {"emails": ["a@b.com"]}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5-2025-08-07",
      messages: [
        { role: "system", content: "Tu es un extracteur JSON strict. Réponds uniquement en JSON valide." },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 800,
    }),
  });

  if (!res.ok) {
    console.error("[OPENAI]", res.status, await res.text());
    return [];
  }
  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "{}";
  try {
    const clean = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean);
    const emails: string[] = Array.isArray(parsed.emails) ? parsed.emails : [];
    const valid = emails.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !/no-?reply/i.test(e));
    return Array.from(new Set(valid));
  } catch (e) {
    console.error("[OPENAI_PARSE]", e instanceof Error ? e.message : String(e));
    return [];
  }
}

async function findEmails(companyName: string, website: string, domain: string) {
  const base = website.replace(/\/$/, "");
  const candidates = [
    `${base}/contact`,
    `${base}/nous-contacter`,
    `${base}/contactez-nous`,
    `${base}/en/contact`,
    `${base}/fr/contact`,
    base,
  ];

  const contents: string[] = [];
  for (const url of candidates) {
    const text = await fetchText(url);
    if (text && text.length > 80) contents.push(`=== ${url} ===\n${text}`);
  }

  // Fallback: recherche "nom + email"
  if (contents.length < 2) {
    const results = await searchWeb(`"${companyName}" email contact`);
    for (const r of results.slice(0, 3)) {
      if (isPrimarySource(r.url, domain)) {
        const text = await fetchText(r.url);
        if (text && text.length > 80) contents.push(`=== ${r.url} ===\n${text}`);
      }
    }
  }

  if (contents.length === 0) return { website, emails: [], pagesChecked: 0 };

  const emails = await extractEmailsWithOpenAI({ companyName, website, domain, contents });
  return { website, emails, pagesChecked: contents.length };
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
      .limit(50);

    if (companiesError) throw companiesError;
    if (!companies || companies.length === 0) {
      return new Response(JSON.stringify({ message: "No companies found", processed: 0, results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let emailsFound = 0;
    const results: any[] = [];

    for (const c of companies as CompanyRow[]) {
      try {
        const { url, domain } = await findOfficialWebsite(c.nom, c.ville ?? null);
        if (!url || !domain) {
          results.push({ company: c.nom, status: "no-website" });
          processed++;
          await delay(800);
          continue;
        }

        const found = await findEmails(c.nom, url, domain);

        const updates: Record<string, any> = { website_url: url };
        if (found.emails.length > 0) {
          updates.emails = found.emails;
          emailsFound += found.emails.length;
        }

        const { error: updateError } = await supabase
          .from("companies")
          .update(updates)
          .eq("id", c.id);
        if (updateError) console.error("[DB_UPDATE]", updateError.message);

        results.push({
          company: c.nom,
          status: "success",
          website: url,
          emails: found.emails,
          pagesChecked: found.pagesChecked,
        });
      } catch (e) {
        console.error("[PROCESS_ERROR]", e instanceof Error ? e.message : String(e));
        results.push({ company: c.nom, status: "error", error: e instanceof Error ? e.message : "Unknown" });
      }
      processed++;
      await delay(1000); // limiter les 429
    }

    return new Response(
      JSON.stringify({ message: "Email search completed", processed, total: companies.length, emailsFound, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[FIND_COMPANY_EMAILS]", error instanceof Error ? error.message : String(error));
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
