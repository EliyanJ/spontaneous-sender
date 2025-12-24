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

    if (!response.ok) return '';

    const html = await response.text();
    
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();

    return text.slice(0, 8000);
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return '';
  }
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

    const { company, cvContent, userProfile } = await req.json();

    if (!company) {
      throw new Error('Company is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Generating cover letter for: ${company.nom}`);

    // Scrape company website if available
    let companyInfo = '';
    if (company.website_url) {
      companyInfo = await scrapeWebsite(company.website_url);
      
      // Try additional pages
      const additionalPages = ['/about', '/a-propos', '/entreprise', '/company', '/rse', '/valeurs'];
      for (const page of additionalPages.slice(0, 2)) {
        try {
          const url = new URL(page, company.website_url).toString();
          const content = await scrapeWebsite(url);
          if (content && content.length > 200) {
            companyInfo += '\n\n' + content;
          }
        } catch {
          // Ignore errors
        }
      }
    }

    const systemPrompt = `Tu es un expert en rédaction de lettres de motivation professionnelles en français.

OBJECTIF:
Rédiger une lettre de motivation personnalisée qui fait le lien entre le profil du candidat et l'entreprise ciblée.

STRUCTURE:
1. Accroche percutante (pourquoi cette entreprise spécifiquement)
2. Présentation du candidat (parcours, compétences clés)
3. Mise en perspective compétences ↔ besoins de l'entreprise
4. Ce qui attire le candidat (croissance, valeurs, RSE, secteur, projets...)
5. Conclusion avec appel à l'action

RÈGLES:
- Ton professionnel mais authentique
- Maximum 400 mots
- Mentionner des éléments SPÉCIFIQUES de l'entreprise
- Faire ressortir la motivation RÉELLE du candidat
- Si informations RSE ou valeurs trouvées, les mentionner
- Éviter les formulations génériques
- Format lettre française classique (lieu, date, objet, etc.)`;

    const userPrompt = `ENTREPRISE CIBLE:
- Nom: ${company.nom}
- Ville: ${company.ville || 'Non spécifiée'}
- Secteur: ${company.libelle_ape || 'Non spécifié'}
- Site web: ${company.website_url || 'Non disponible'}

INFORMATIONS SCRAPÉES DU SITE WEB:
${companyInfo || 'Aucune information disponible - base-toi sur le nom et le secteur'}

${cvContent ? `CV / PROFIL DU CANDIDAT:
${cvContent}` : ''}

${userProfile ? `INFORMATIONS CANDIDAT:
- Nom complet: ${userProfile.fullName || 'Non spécifié'}
- Formation: ${userProfile.education || 'Non spécifiée'}
- LinkedIn: ${userProfile.linkedinUrl || 'Non spécifié'}
` : ''}

Génère une lettre de motivation PERSONNALISÉE pour cette entreprise.`;

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
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit - veuillez réessayer dans quelques instants' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const coverLetter = aiData.choices?.[0]?.message?.content || '';

    console.log(`✓ Generated cover letter for ${company.nom}`);

    return new Response(JSON.stringify({
      success: true,
      coverLetter,
      companyInfo: companyInfo ? { scraped: true, length: companyInfo.length } : null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-cover-letter:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});