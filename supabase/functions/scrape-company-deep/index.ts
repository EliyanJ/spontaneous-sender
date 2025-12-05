import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pages à scraper pour chaque entreprise
const PAGES_TO_SCRAPE = [
  { path: "", name: "homepage" },
  { path: "/about", name: "about" },
  { path: "/a-propos", name: "about_fr" },
  { path: "/qui-sommes-nous", name: "who_we_are" },
  { path: "/notre-histoire", name: "our_story" },
  { path: "/equipe", name: "team" },
  { path: "/team", name: "team_en" },
  { path: "/actualites", name: "news" },
  { path: "/news", name: "news_en" },
  { path: "/blog", name: "blog" },
  { path: "/carrieres", name: "careers" },
  { path: "/careers", name: "careers_en" },
  { path: "/recrutement", name: "recruitment" },
  { path: "/jobs", name: "jobs" },
  { path: "/rejoignez-nous", name: "join_us" },
  { path: "/nos-metiers", name: "our_jobs" },
  { path: "/services", name: "services" },
  { path: "/solutions", name: "solutions" },
  { path: "/produits", name: "products" },
  { path: "/contact", name: "contact" },
];

// Nettoyer le HTML et extraire le texte pertinent
function cleanHtml(html: string): string {
  // Supprimer scripts, styles, comments
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " [HEADER] ")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "");

  // Garder les titres et paragraphes importants
  text = text
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n[H1] $1 [/H1]\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n[H2] $1 [/H2]\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n[H3] $1 [/H3]\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n• $1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  // Limiter à 4000 caractères par page
  return text.substring(0, 4000);
}

// Scraper une page
async function scrapePage(url: string, timeout: number = 5000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const html = await response.text();
    return cleanHtml(html);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.log(`[Scrape] Failed to scrape ${url}: ${errorMessage}`);
    return null;
  }
}

// Normaliser l'URL de base
function normalizeBaseUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith("http")) {
    normalized = "https://" + normalized;
  }
  // Enlever le slash final
  return normalized.replace(/\/+$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { companyId, websiteUrl } = await req.json();

    if (!companyId || !websiteUrl) {
      return new Response(JSON.stringify({ error: "companyId and websiteUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Scrape Deep] Starting for company ${companyId}, URL: ${websiteUrl}`);

    const baseUrl = normalizeBaseUrl(websiteUrl);
    const scrapedContent: Record<string, string> = {};
    let totalChars = 0;
    const maxTotalChars = 20000; // Limite totale pour l'IA

    // Scraper les pages en parallèle (par batches de 5)
    for (let i = 0; i < PAGES_TO_SCRAPE.length && totalChars < maxTotalChars; i += 5) {
      const batch = PAGES_TO_SCRAPE.slice(i, i + 5);
      const results = await Promise.all(
        batch.map(async (page) => {
          const url = baseUrl + page.path;
          const content = await scrapePage(url);
          return { name: page.name, content };
        })
      );

      for (const result of results) {
        if (result.content && result.content.length > 100) {
          scrapedContent[result.name] = result.content;
          totalChars += result.content.length;
          console.log(`[Scrape Deep] Got ${result.content.length} chars from ${result.name}`);
        }
      }

      // Petit délai entre les batches
      if (i + 5 < PAGES_TO_SCRAPE.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    const pagesFound = Object.keys(scrapedContent).length;
    console.log(`[Scrape Deep] Scraped ${pagesFound} pages, ${totalChars} total chars`);

    if (pagesFound === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No content found on website",
        pagesScraped: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sauvegarder les insights dans la base
    const { error: updateError } = await supabase
      .from("companies")
      .update({
        company_insights: {
          scraped_at: new Date().toISOString(),
          pages_scraped: pagesFound,
          total_chars: totalChars,
          content: scrapedContent,
        },
      })
      .eq("id", companyId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[Scrape Deep] Update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to save insights" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      pagesScraped: pagesFound,
      totalChars,
      pages: Object.keys(scrapedContent),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[Scrape Deep] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
