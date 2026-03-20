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

    // Scrape company website — use cache if recent (< 7 days)
    let companyInfo = '';
    const existingInsights = company.company_insights;
    if (existingInsights?.full_content && existingInsights?.scraped_at) {
      const scrapedDate = new Date(existingInsights.scraped_at);
      const daysSince = (Date.now() - scrapedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        companyInfo = existingInsights.full_content;
        console.log(`Scraping cache hit: ${company.nom} (scrapé il y a ${Math.round(daysSince)} jours)`);
      }
    }

    if (!companyInfo && company.website_url) {
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

      // Save for future use
      if (companyInfo) {
        const supabaseForUpdate = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        await supabaseForUpdate.from('companies').update({
          company_insights: {
            scraped_at: new Date().toISOString(),
            content_preview: companyInfo.slice(0, 1000),
            full_content: companyInfo
          }
        }).eq('id', company.id);
      }
    }

    // --- Récupération du template de lettre ---
    let templateBlock = '';
    try {
      const { data: templates } = await supabaseClient
        .from('cover_letter_templates')
        .select('id, name, content, usage_count')
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
        .limit(3);

      let bestTemplate = null;
      if (templates && templates.length > 0) {
        bestTemplate = templates[0];
      }

      if (bestTemplate) {
        templateBlock = `\nMODÈLE DE RÉFÉRENCE — Voici un modèle de lettre de motivation validé. Utilise-le comme structure et inspiration, en adaptant le contenu au profil du candidat et à l'entreprise ciblée :\n\n${bestTemplate.content}\n`;
        console.log(`Template LM: "${bestTemplate.name}" utilisé`);

        // Incrémenter le compteur d'utilisation
        await supabaseClient
          .from('cover_letter_templates')
          .update({ usage_count: (bestTemplate as any).usage_count + 1 })
          .eq('id', bestTemplate.id);
      } else {
        console.log('Template LM: aucun template actif trouvé');
      }
    } catch (err) {
      console.error('Erreur récupération template LM:', err);
    }

    // --- Contexte sectoriel depuis la base ATS ---
    let sectorContext = '';
    try {
      const { data: professions } = await supabaseClient
        .from('ats_professions')
        .select('name, primary_keywords, secondary_keywords, soft_skills, category')
        .eq('profession_status', 'active');

      if (professions && professions.length > 0) {
        const searchTerms = [
          company?.libelle_ape?.toLowerCase() || '',
          (userProfile as any)?.targetJobs?.toLowerCase() || '',
          ...((userProfile as any)?.targetSectors || []).map((s: string) => s.toLowerCase()),
        ].filter(Boolean);

        const matched = professions.filter((prof: any) => {
          const profName = prof.name?.toLowerCase() || '';
          const profCategory = prof.category?.toLowerCase() || '';
          return searchTerms.some((term: string) =>
            profName.includes(term) || term.includes(profName) ||
            profCategory.includes(term) || term.includes(profCategory)
          );
        });

        if (matched.length > 0) {
          const top = matched.slice(0, 2);
          const contextParts = top.map((p: any) => {
            const primary = (p.primary_keywords || []).slice(0, 10).join(', ');
            const secondary = (p.secondary_keywords || []).slice(0, 6).join(', ');
            const soft = (p.soft_skills || []).slice(0, 5).join(', ');
            return `Métier identifié : ${p.name}\nCompétences techniques courantes : ${primary}\nCompétences complémentaires : ${secondary}\nQualités valorisées : ${soft}`;
          });
          sectorContext = `\nCONTEXTE SECTORIEL (données de référence) :\n${contextParts.join('\n\n')}\n\nCes informations te donnent une compréhension du secteur du candidat. Utilise ce contexte pour écrire une lettre pertinente qui montre une compréhension du métier. Ne liste pas ces compétences, elles servent juste à comprendre l'univers professionnel.\n`;
          console.log(`ATS context: ${top.map((p: any) => p.name).join(', ')}`);
        }
      }
    } catch (err) {
      console.error('Erreur ATS context:', err);
    }

    const systemPrompt = `Tu es un expert en rédaction de lettres de motivation pour candidatures spontanées en français.

STRUCTURE OBLIGATOIRE — 3 PARAGRAPHES (pas plus, pas moins) :

PARAGRAPHE 1 — Présentation :
- Qui je suis (statut actuel)
- Spécialisation / domaine
- Compétences principales + outils maîtrisés
- Formation (optionnel, si pertinent)

PARAGRAPHE 2 — Entreprise :
- Ce qui attire chez cette entreprise SPÉCIFIQUEMENT
- Un projet, une valeur, un positionnement PRÉCIS (issu du scraping si disponible)
- Alignement personnel avec l'entreprise

PARAGRAPHE 3 — Apport :
- Ce que je peux apporter CONCRÈTEMENT
- Appui / renfort / regard neuf
- Ouverture à l'échange
${templateBlock}${sectorContext}
RÈGLES STRICTES :
- Maximum 1 page (~350 mots)
- Ton professionnel, fluide, PAS familier
- Pas de langage commercial ou de prospection
- Ne JAMAIS mentionner le type de contrat (CDI, CDD, stage, alternance...)
- Personnalisation RÉELLE de l'entreprise (au moins 1 élément concret du scraping)
- Ne laisser AUCUN placeholder [XXX]
- PAS de format lettre classique (pas de lieu/date/objet en en-tête)
- Commencer directement par "Bonjour [Prénom si trouvé, sinon 'l'équipe'],"
- Terminer par "Bien cordialement," suivi du nom

FORMAT :
Bonjour [destinataire],

[Paragraphe 1 - Présentation]

[Paragraphe 2 - Entreprise]

[Paragraphe 3 - Apport]

Bien cordialement,
[Nom du candidat]`;

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
- Nom complet: ${(userProfile as any).fullName || 'Non spécifié'}
- Formation: ${(userProfile as any).education || 'Non spécifiée'}
- LinkedIn: ${(userProfile as any).linkedinUrl || 'Non spécifié'}
` : ''}

Génère une lettre de motivation PERSONNALISÉE pour cette entreprise en respectant STRICTEMENT la structure 3 paragraphes et les règles ci-dessus.`;

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
