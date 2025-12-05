import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Scrape a webpage and extract text content
async function scrapeWebsite(url: string): Promise<string> {
  try {
    console.log(`Scraping: ${url}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.log(`Failed to fetch ${url}: ${response.status}`);
      return '';
    }

    const html = await response.text();
    
    // Basic HTML to text conversion
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Limit content length
    return text.slice(0, 5000);
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return '';
  }
}

// Try to find additional pages to scrape
async function getAdditionalContent(baseUrl: string): Promise<string> {
  const additionalPages = ['/about', '/about-us', '/a-propos', '/qui-sommes-nous', '/entreprise', '/company', '/careers', '/carrieres', '/recrutement', '/jobs'];
  let combinedContent = '';

  for (const page of additionalPages.slice(0, 3)) { // Limit to 3 additional pages
    try {
      const url = new URL(page, baseUrl).toString();
      const content = await scrapeWebsite(url);
      if (content && content.length > 200) {
        combinedContent += '\n\n' + content;
      }
    } catch {
      // Ignore errors for additional pages
    }
  }

  return combinedContent.slice(0, 8000);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { companies, template, cvContent, userProfile } = await req.json();

    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      throw new Error('companies doit être un tableau non vide');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurée');
    }

    console.log(`Generating personalized emails for ${companies.length} companies`);

    const results = [];

    for (const company of companies) {
      try {
        console.log(`Processing: ${company.nom}`);

        // Step 1: Scrape company website if available
        let companyInfo = '';
        if (company.website_url) {
          const mainContent = await scrapeWebsite(company.website_url);
          const additionalContent = await getAdditionalContent(company.website_url);
          companyInfo = (mainContent + additionalContent).slice(0, 10000);
        }

        // Step 2: Generate personalized email using AI
        const systemPrompt = `Tu es un expert en rédaction d'emails de candidature spontanée personnalisés et professionnels.

RÈGLES STRICTES:
- Écris UNIQUEMENT l'email, sans introduction ni explication
- L'email doit être authentique, pas générique
- Mentionne des éléments SPÉCIFIQUES de l'entreprise trouvés dans les informations fournies
- Si aucune info spécifique n'est disponible, utilise le secteur d'activité (${company.libelle_ape || 'non spécifié'})
- L'email doit être concis (200-300 mots max)
- Utilise un ton professionnel mais chaleureux
- Ne commence JAMAIS par "Madame, Monsieur" - trouve une accroche originale
- Fais le lien entre les compétences du candidat et les besoins de l'entreprise
- Termine par une invitation à un échange

FORMAT DE SORTIE:
Sujet: [ligne d'objet percutante]

[corps de l'email]`;

        const userPrompt = `ENTREPRISE CIBLE:
- Nom: ${company.nom}
- Ville: ${company.ville || 'Non spécifiée'}
- Secteur: ${company.libelle_ape || 'Non spécifié'}
- Site web: ${company.website_url || 'Non disponible'}

INFORMATIONS SCRAPÉES DU SITE:
${companyInfo || 'Aucune information disponible - base-toi sur le nom et le secteur'}

${template ? `TEMPLATE DE RÉFÉRENCE (à adapter, pas copier):
${template}` : ''}

${cvContent ? `PROFIL DU CANDIDAT:
${cvContent}` : ''}

${userProfile ? `INFORMATIONS CANDIDAT:
- Nom: ${userProfile.fullName || 'Non spécifié'}
- Formation: ${userProfile.education || 'Non spécifiée'}
- LinkedIn: ${userProfile.linkedinUrl || 'Non spécifié'}
` : ''}

Génère un email de candidature spontanée PERSONNALISÉ pour cette entreprise.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1500,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI API error for ${company.nom}:`, aiResponse.status, errorText);
          
          if (aiResponse.status === 429) {
            results.push({
              company_id: company.id,
              company_name: company.nom,
              success: false,
              error: 'Rate limit - veuillez réessayer dans quelques instants'
            });
            // Wait before continuing
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          }
          
          throw new Error(`AI error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const generatedContent = aiData.choices?.[0]?.message?.content || '';

        // Parse subject and body
        let subject = '';
        let body = '';
        
        const subjectMatch = generatedContent.match(/Sujet:\s*(.+?)(?:\n|$)/i);
        if (subjectMatch) {
          subject = subjectMatch[1].trim();
          body = generatedContent.replace(/Sujet:\s*.+?\n/, '').trim();
        } else {
          subject = `Candidature spontanée - ${company.nom}`;
          body = generatedContent;
        }

        // Store company insights for future use
        if (companyInfo) {
          await supabaseClient
            .from('companies')
            .update({ 
              company_insights: { 
                scraped_at: new Date().toISOString(),
                content_preview: companyInfo.slice(0, 1000)
              }
            })
            .eq('id', company.id);
        }

        results.push({
          company_id: company.id,
          company_name: company.nom,
          company_email: company.selected_email,
          website_url: company.website_url,
          success: true,
          subject,
          body,
          scraped_info: companyInfo ? true : false
        });

        console.log(`✓ Generated email for ${company.nom}`);

        // Small delay between companies to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error processing ${company.nom}:`, error);
        results.push({
          company_id: company.id,
          company_name: company.nom,
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Completed: ${successCount}/${companies.length} emails generated`);

    return new Response(JSON.stringify({
      success: true,
      results,
      stats: {
        total: companies.length,
        generated: successCount,
        failed: companies.length - successCount
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-personalized-emails:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
