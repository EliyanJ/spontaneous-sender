import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const BRAVE_SEARCH_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');

interface SearchResult {
  url: string;
  title: string;
  description: string;
}

interface EmailResult {
  website: string | null;
  emails: string[];
  source: string | null;
  pagesChecked: number;
}

// ============ RECHERCHE WEB ============

async function searchWeb(query: string): Promise<SearchResult[]> {
  if (!BRAVE_SEARCH_API_KEY) {
    console.error('❌ BRAVE_SEARCH_API_KEY non configurée');
    return [];
  }

  console.log(`🔍 Recherche web: "${query}"`);

  const maxAttempts = 4;
  let delayMs = 1200;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=6`,
        {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': BRAVE_SEARCH_API_KEY
          }
        }
      );

      if (response.status === 429 || response.status === 402 || response.status === 503) {
        const errorText = await response.text();
        console.error(`❌ Brave Search API error ${response.status} (attempt ${attempt}/${maxAttempts}):`, errorText);
        if (attempt < maxAttempts) {
          await delay(delayMs);
          delayMs *= 2;
          continue;
        }
        return [];
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Brave Search API error ${response.status}:`, errorText);
        console.error(`❌ Query was: "${query}"`);
        return [];
      }

      const data = await response.json();
      const results = (data.web?.results || []).map((r: any) => ({
        url: r.url,
        title: r.title,
        description: r.description
      }));

      console.log(`   ✅ ${results.length} résultats trouvés`);
      return results;
    } catch (error) {
      console.error(`❌ Erreur recherche web (attempt ${attempt}/${maxAttempts}):`, error);
      if (attempt < maxAttempts) {
        await delay(delayMs);
        delayMs *= 2;
        continue;
      }
      return [];
    }
  }

  return [];
}

// ============ FETCH PAGE CONTENT ============

async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CompanySearchBot/1.0)'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Extraire le texte visible (supprimer scripts, styles, tags HTML)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return textContent.substring(0, 15000); // Limiter à 15k caractères
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log(`⏱️ Timeout pour ${url}`);
    }
    return null;
  }
}

// ============ FETCH RAW HTML (pour mailto et emails obfusqués) ============
async function fetchRawHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CompanySearchBot/1.0)'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);
    if (!response.ok) return null;
    return await response.text();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log(`⏱️ Timeout pour ${url}`);
    }
    return null;
  }
}

// ============ VALIDATION SOURCES ============

function isPrimarySource(url: string, officialDomain: string | null): boolean {
  const ignoredDomains = [
    // Prospecting/people databases
    'rocketreach.co', 'zoominfo.com', 'apollo.io', 'leadiq.com', 'crunchbase.com', 'pitchbook.com',
    // Social & review sites
    'linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com', 'trustpilot.com', 'glassdoor', 'indeed',
    // French company directories / aggregators
    'societe.com', 'verif.com', 'pagesjaunes.fr', 'kompass.com', 'infogreffe.fr', 'pappers.fr',
    'societeinfo.com', 'manageo.fr', 'b-reputation.com', 'corporama.com', 'rubypayeur.com',
    'annuaire-entreprises.data.gouv.fr', 'data.gouv.fr',
    // News / media / wiki
    'consultancy.eu', 'wikipedia.org', 'bloomberg.com', 'reuters.com', 'lefigaro.fr', 'journaldunet.com'
  ];

  const urlLower = url.toLowerCase();

  // Reject obvious non-corporate paths
  const badPathHints = ['/news/', '/article/', '/annuaire', '/directory'];
  if (badPathHints.some(h => urlLower.includes(h))) return false;
  
  // Reject if domain is in the ignore list
  if (ignoredDomains.some(domain => urlLower.includes(domain))) return false;

  // If an official domain is known, enforce it
  if (officialDomain && !urlLower.includes(officialDomain.toLowerCase())) return false;

  return true;
}

// ============ TROUVER LE SITE OFFICIEL ============

async function findOfficialWebsite(companyName: string, city: string): Promise<{ url: string | null, domain: string | null }> {
  console.log(`🔍 Recherche du site officiel de "${companyName}"`);

  // Nettoyage du nom (retirer formes juridiques et mentions pays)
  const cleanName = (name: string) =>
    name
      .replace(/\b(SAS|SASU|SARL|SA|EURL|SOCIETE|SOCIÉTÉ|HOLDING|FRANCE)\b/gi, '')
      .replace(/\(.*?\)/g, '')
      .replace(/[^a-zA-Z0-9&\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const base = cleanName(companyName);
  const withAnd = base.includes('&') ? base.replace(/&/g, 'and') : base;

  // Construire plusieurs requêtes pour améliorer la découverte du site officiel
  const queries = Array.from(new Set([
    `"${companyName}" ${city} site officiel`,
    `"${companyName}" site officiel`,
    `"${base}" ${city} site officiel`,
    `"${base}" site officiel`,
    `"${withAnd}" ${city} site officiel`,
    `"${withAnd}" site officiel`,
  ]));

  const seen = new Set<string>();
  const aggregated: SearchResult[] = [];

  for (const q of queries) {
    const r = await searchWeb(q);
    for (const item of r) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        aggregated.push(item);
      }
    }
    // Stop tôt si on a assez de candidats
    if (aggregated.length >= 8) break;
  }

  if (aggregated.length === 0) {
    console.log('   ❌ Aucun résultat de recherche');
    return { url: null, domain: null };
  }

  // Prioriser les domaines dont l'hostname matche des tokens du nom nettoyé
  const tokens = base.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const score = (u: string) => {
    try {
      const h = new URL(u).hostname.toLowerCase();
      let s = 0;
      for (const t of tokens) if (h.includes(t)) s++;
      if (h.includes('consult')) s += 0.5;
      if (h.includes('strategy')) s += 0.5;
      return s;
    } catch {
      return 0;
    }
  };

  const candidates = aggregated
    .filter(r => isPrimarySource(r.url, null))
    .sort((a, b) => score(b.url) - score(a.url))
    .slice(0, 10);

  // Tester les meilleurs candidats trouvés
  for (const result of candidates) {
    console.log(`   🌐 Test: ${result.url}`);
    const content = await fetchPageContent(result.url);
    if (content && content.length > 100) {
      try {
        const urlObj = new URL(result.url);
        const domain = urlObj.hostname.replace('www.', '');
        const rootUrl = `${urlObj.protocol}//${urlObj.hostname}`;
        console.log(`   ✅ Site trouvé: ${rootUrl}`);
        return { url: rootUrl, domain };
      } catch {}
    } else {
      console.log(`   ❌ Site inaccessible ou vide`);
    }
  }

  console.log('   ❌ Aucun site officiel valide trouvé');
  return { url: null, domain: null };
}

// ============ TROUVER LES EMAILS ============

async function findContactEmails(companyName: string, websiteUrl: string, domain: string): Promise<EmailResult> {
  console.log(`📧 Recherche d'emails sur ${websiteUrl}`);
  
  const baseUrl = websiteUrl.replace(/\/$/, '');
  const contactPages = [
    `${baseUrl}`,
    `${baseUrl}/contact`,
    `${baseUrl}/contact-us`,
    `${baseUrl}/nous-contacter`,
    `${baseUrl}/contactez-nous`,
    `${baseUrl}/en/contact`,
    `${baseUrl}/fr/contact`,
  ];

  let pagesChecked = 0;
  const allContent: string[] = [];

  // Tester les pages de contact
  for (const pageUrl of contactPages) {
    const content = await fetchPageContent(pageUrl);
    if (content && content.length > 50) {
      allContent.push(`=== ${pageUrl} ===\n${content}\n`);
      pagesChecked++;
      console.log(`   ✅ Page récupérée: ${pageUrl}`);
    }
  }

  // Si pas assez de contenu, chercher via Google
  if (allContent.length < 2) {
    console.log('   🔍 Recherche alternative via web');
    const searchResults = await searchWeb(`"${companyName}" contact email`);
    
    for (const result of searchResults.slice(0, 3)) {
      if (isPrimarySource(result.url, domain)) {
        const content = await fetchPageContent(result.url);
        if (content && content.length > 50) {
          allContent.push(`=== ${result.url} ===\n${content}\n`);
          pagesChecked++;
          console.log(`   ✅ Page récupérée: ${result.url}`);
        }
      }
    }
  }

  // Extraire les emails avec l'IA
  if (allContent.length === 0) {
    console.log('   ❌ Aucun contenu trouvé');
    return {
      website: websiteUrl,
      emails: [],
      pagesChecked,
      source: null
    };
  }

  // Appeler l'IA pour extraire les emails du contenu réel
  const extractionPrompt = `ENTREPRISE : "${companyName}"
SITE WEB : ${websiteUrl}
DOMAINE : ${domain}

CONTENU DES PAGES (${pagesChecked} pages):
${allContent.join('\n').substring(0, 40000)}

MISSION : Extraire UNIQUEMENT les emails de contact présents dans ce contenu.

RÈGLES STRICTES :
1. N'extrais QUE les emails RÉELLEMENT présents dans le contenu ci-dessus
2. NE PAS inventer ou deviner des emails
3. Vérifie que les emails appartiennent bien au domaine ${domain} (ou sous-domaine proche)
4. Privilégier : info@, contact@, hello@, bonjour@, commercial@, support@
5. IGNORER : noreply@, no-reply@, donotreply@, privacy@, dpo@
6. Si AUCUN email n'est trouvé, retourne un tableau vide

Réponds UNIQUEMENT en JSON strict (rien d'autre):
{"emails": ["email1@domain.com", "email2@domain.com"]}`;

  try {
    console.log('   🤖 Extraction des emails avec Claude');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: extractionPrompt
        }]
      })
    });

    if (!response.ok) {
      console.error(`   ❌ Anthropic API error: ${response.status}`);
      return {
        website: websiteUrl,
        emails: [],
        pagesChecked,
        source: null
      };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '{}';

    // Parser la réponse JSON
    let parsedResponse: { emails: string[] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Pas de JSON trouvé');
      }
      parsedResponse = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('   ❌ Erreur parsing JSON:', parseError);
      return {
        website: websiteUrl,
        emails: [],
        pagesChecked,
        source: null
      };
    }

    const emails = Array.isArray(parsedResponse.emails) ? parsedResponse.emails : [];
    
    // Validation finale des emails
    const validEmails = emails.filter(email => {
      // Vérifier le format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
      
      // Vérifier que c'est pas un noreply
      if (/noreply|no-reply|donotreply/i.test(email)) return false;
      
      return true;
    });

    console.log(`   ✅ ${validEmails.length} emails trouvés`);
    console.log(`   📊 ${pagesChecked} pages consultées`);

    return {
      website: websiteUrl,
      emails: validEmails,
      pagesChecked,
      source: websiteUrl
    };

  } catch (error) {
    console.error('   ❌ Erreur extraction emails:', error);
    return {
      website: websiteUrl,
      emails: [],
      pagesChecked,
      source: null
    };
  }
}

// ============ FONCTION PRINCIPALE ============

async function findEmailsWithAI(companyName: string, city: string): Promise<EmailResult> {
  try {
    console.log(`\n=== Traitement: ${companyName} ===`);
    
    // ÉTAPE 1 : Trouver le site officiel
    const { url: websiteUrl, domain } = await findOfficialWebsite(companyName, city);
    
    if (!websiteUrl || !domain) {
      console.log(`❌ Site non trouvé pour ${companyName}`);
      return {
        website: null,
        emails: [],
        pagesChecked: 0,
        source: null
      };
    }

    // ÉTAPE 2 : Chercher les emails sur le site
    const result = await findContactEmails(companyName, websiteUrl, domain);
    
    return result;

  } catch (error) {
    console.error(`❌ Erreur globale pour ${companyName}:`, error);
    return {
      website: null,
      emails: [],
      pagesChecked: 0,
      source: null
    };
  }
}

// ============ MAIN HANDLER ============

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch recent companies for this user
    const { data: companies, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (fetchError) throw fetchError;
    if (!companies || companies.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No companies to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎯 Traitement de ${companies.length} entreprises pour l'utilisateur ${user.id}`);
    let processedCount = 0;
    let failedCount = 0;
    let totalEmailsFound = 0;

    for (const company of companies) {
      try {
        // Recherche via IA avec recherche web réelle
        const result = await findEmailsWithAI(company.nom, company.ville || '');
        
        if (result.website) {
          // Mise à jour de la base de données
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              website_url: result.website,
              emails: result.emails,
              updated_at: new Date().toISOString()
            })
            .eq('id', company.id);

          if (updateError) {
            console.error(`❌ Échec mise à jour ${company.nom}:`, updateError);
            failedCount++;
          } else {
            console.log(`✅ ${company.nom}: ${result.emails.length} emails trouvés`);
            totalEmailsFound += result.emails.length;
            processedCount++;
          }
        } else {
          // Site non trouvé, marquer comme traité
          console.log(`⚠️ ${company.nom}: Site non trouvé`);
          
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              website_url: null,
              emails: [],
              updated_at: new Date().toISOString()
            })
            .eq('id', company.id);
            
          if (!updateError) processedCount++;
          else failedCount++;
        }
        
        // Délai entre les appels (rate limiting Brave Search: 1 req/sec)
        await delay(3000);
        
      } catch (error: any) {
        console.error(`❌ Erreur traitement ${company.nom}:`, error);
        failedCount++;
      }
    }

    console.log(`\n📊 Résumé:`);
    console.log(`   ✅ Traités: ${processedCount}`);
    console.log(`   ❌ Échecs: ${failedCount}`);
    console.log(`   📧 Emails trouvés: ${totalEmailsFound}`);

    const message = processedCount === 0 && failedCount > 0 
      ? `⚠️ Échec: Aucune entreprise traitée. Vérifiez que la clé API Brave Search est configurée correctement.`
      : `✅ ${totalEmailsFound} emails trouvés pour ${processedCount} entreprises sur ${companies.length}`;

    return new Response(
      JSON.stringify({
        message,
        processed: processedCount,
        failed: failedCount,
        total: companies.length,
        totalEmailsFound
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erreur dans find-company-emails:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
