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

    // MODIFICATION 3 — Log scraping result
    console.log(`Scraping ${company.nom}: ${companyInfo ? companyInfo.length + ' chars trouvés' : 'RIEN TROUVÉ'}`);

    // Low-content warning for the prompt
    const lowContentWarning = (!companyInfo || companyInfo.length < 200)
      ? `\nATTENTION : très peu d'informations ont été trouvées sur le site de cette entreprise. Ne comble PAS ce manque par des suppositions. Base le paragraphe VOUS uniquement sur le secteur d'activité (libellé APE fourni) et la localisation. Mieux vaut 2 phrases factuelles que 5 phrases de remplissage.\n`
      : '';

    // Truncate inputs to avoid flooding the model
    const truncatedCv = cvContent ? cvContent.slice(0, 4000) : '';
    const truncatedCompanyInfo = companyInfo ? companyInfo.slice(0, 6000) : '';

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

RÈGLES ANTI-HALLUCINATION (CRITIQUES) :
- Utilise EXCLUSIVEMENT les compétences et l'expérience mentionnées dans le CV du candidat. Si le CV parle de marketing et communication, la lettre DOIT parler de marketing et communication, PAS de développement web ou d'autre chose.
- Ne JAMAIS interpréter le nom de l'entreprise.
- Ne JAMAIS avouer un manque d'information sur l'entreprise. Écris TOUJOURS comme si tu connaissais l'entreprise.
- Le nom complet du candidat est fourni. Utilise-le EXACTEMENT. Ne JAMAIS laisser de placeholder [Nom], [Prénom], [Nom du candidat]. Si le nom n'est pas fourni, utilise simplement "Bien cordialement" sans nom plutôt qu'un placeholder.
- Si une donnée est absente, ne la mentionne simplement pas.
${lowContentWarning}
APPRENTISSAGE PAR L'EXEMPLE — Étudie cet exemple pour comprendre ce qui fait une bonne lettre :

EXEMPLE DE BONNE LETTRE (entreprise : Bergamotte, fleuriste en ligne, candidat en marketing digital) :

"Bonjour,

Issu d'un parcours en communication RH et corporate en agence, je me spécialise aujourd'hui en marketing digital avec une appétence forte pour la gestion de projet web, le référencement et l'automatisation.

En découvrant Bergamotte, j'ai été marqué par votre capacité à conjuguer e-commerce et engagement responsable — notamment votre certification B Corp et le choix de travailler en circuit court avec des producteurs certifiés MPS. Votre logique de collections saisonnières renouvelées chaque semaine demande une communication digitale réactive et créative, c'est exactement ce type de défi qui me motive.

Mon expérience en pilotage de projets digitaux et en optimisation SEO pourrait contribuer à renforcer votre visibilité en ligne et accompagner vos temps forts commerciaux. Je serais ravi d'en échanger avec vous. Mon CV est en pièce jointe.

Bien cordialement,

Eliyan Jacquet"

POURQUOI CET EXEMPLE EST BON — Applique ces principes à chaque lettre :

1. Le paragraphe JE est court (2 phrases). Il dit l'essentiel sans lister tous les outils. Une lettre n'est pas un CV, elle donne envie de lire le CV.

2. Le paragraphe VOUS cite des FAITS RÉELS trouvés dans les informations scrapées : la certification B Corp, le circuit court, les producteurs MPS, les collections saisonnières. Il ne dit JAMAIS "votre positionnement dans le secteur" ou "votre approche innovante" — ces phrases ne veulent rien dire et montrent qu'on n'a pas fait de recherche.

3. Le paragraphe NOUS fait un LIEN CONCRET entre une compétence du candidat (SEO, pilotage digital) et un besoin réel de l'entreprise (visibilité en ligne, temps forts commerciaux d'un e-commerce). Ce n'est pas "je suis convaincu de pouvoir apporter une contribution significative" — ça aussi ça ne veut rien dire.

4. La lettre fait ~150-200 mots, pas 300. Un recruteur lit 50 candidatures par jour.

5. Aucune information n'est inventée. Si les données scrapées ne donnent pas assez d'infos concrètes sur l'entreprise, déduis un angle pertinent à partir du secteur d'activité (code APE), de la ville, et du nom — ne dis JAMAIS que tu manques d'infos.

CE QU'IL NE FAUT JAMAIS FAIRE :
- Lister plus de 3-4 compétences ou outils dans le JE
- Écrire "votre positionnement unique", "votre approche innovante", "j'ai été particulièrement intéressé par" sans info concrète derrière
- Deviner ce que fait l'entreprise uniquement à partir de son nom
- Écrire plus de 300 mots
- Répéter ses qualités dans le paragraphe NOUS au lieu de faire un lien avec l'entreprise
- Laisser des placeholders [Nom], [Prénom], [Votre Nom]
- Écrire "malgré les informations limitées", "bien que n'ayant pas de détails", "je n'ai pas d'informations"
${templateBlock}${sectorContext}
STRUCTURE OBLIGATOIRE — 3 PARAGRAPHES (pas plus, pas moins) :

PARAGRAPHE 1 [JE] — Présentation (2 phrases max) :
- Qui je suis (statut actuel), spécialisation/domaine, compétences principales
- Ne pas lister tous les outils.

PARAGRAPHE 2 [VOUS] — Entreprise (3-4 phrases) :
- Ce qui attire chez cette entreprise
- Si des infos scrapées sont disponibles : citer un projet, une valeur, un positionnement PRÉCIS
- Si AUCUNE info scrapée n'est disponible : déduire un angle pertinent à partir du secteur d'activité (code APE), de la ville, et du nom de l'entreprise. Par exemple, parler des enjeux typiques du secteur, de la dynamique économique locale, ou du type de projets courants dans ce domaine.
- INTERDIT : écrire "je n'ai pas d'informations", "malgré les informations limitées", "bien que n'ayant pas de détails" ou toute formulation similaire. Écris TOUJOURS comme si tu connaissais l'entreprise.

PARAGRAPHE 3 [NOUS] — Apport (2-3 phrases) :
- Lien CONCRET entre une compétence du candidat et un besoin de l'entreprise
- Ouverture à l'échange + mention CV en pièce jointe
- INTERDICTION : "je suis convaincu de pouvoir apporter une contribution significative"

RÈGLES STRICTES :
- Entre ~150 et ~300 mots — un recruteur lit 50 candidatures par jour
- Ton professionnel, fluide, PAS familier
- Ne JAMAIS mentionner le type de contrat
- Ne laisser AUCUN placeholder [XXX]
- Commencer directement par "Bonjour,"
- Terminer par "Bien cordialement," suivi du nom complet du candidat

FORMAT :
Bonjour,

[Paragraphe 1 - JE]

[Paragraphe 2 - VOUS]

[Paragraphe 3 - NOUS]

Bien cordialement,
[Nom complet du candidat]`;

    const up = userProfile as any;
    const candidatName = up?.fullName || '';
    const candidatSpecialty = up?.targetJobs || up?.specialty || '';

    const userPrompt = `ENTREPRISE CIBLE:
- Nom: ${company.nom}
- Ville: ${company.ville || ''}
- Secteur: ${company.libelle_ape || ''}
${company.website_url ? `- Site web: ${company.website_url}` : ''}

INFORMATIONS SCRAPÉES DU SITE WEB:
${truncatedCompanyInfo || `Aucune info scrapée. Déduis le contexte à partir du nom "${company.nom}", du secteur "${company.libelle_ape || ''}" et de la ville "${company.ville || ''}". NE MENTIONNE JAMAIS que tu n'as pas d'informations.`}

${up?.profileSummary ? `RÉSUMÉ DU PROFIL (rédigé par le candidat — lire EN PREMIER pour comprendre son parcours) :
${up.profileSummary}

` : ''}${truncatedCv ? `CONTENU CV DU CANDIDAT:
${truncatedCv}` : ''}

${userProfile ? `INFORMATIONS CANDIDAT:
- Nom complet: ${candidatName || ''}
- Prénom: ${up?.firstName || ''}
- Nom: ${up?.lastName || ''}${up?.experienceLevel ? `\n- Niveau d'expérience: ${up.experienceLevel}` : ''}${candidatSpecialty ? `\n- Spécialité / métier visé: ${candidatSpecialty}` : ''}${up?.targetJobs ? `\n- Postes recherchés: ${up.targetJobs}` : ''}${up?.education ? `\n- Formation: ${up.education}` : ''}${up?.linkedinUrl ? `\n- LinkedIn: ${up.linkedinUrl}` : ''}${(up?.targetSectors || []).length ? `\n- Secteurs cibles: ${(up.targetSectors || []).join(', ')}` : ''}
` : ''}

RÈGLE SIGNATURE: La lettre doit se terminer par "Bien cordialement," suivi de "${candidatName || ''}" EXACTEMENT.
Si le nom est vide, terminer par "Bien cordialement," sans nom, JAMAIS par un placeholder.

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
        max_tokens: 4000,
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
