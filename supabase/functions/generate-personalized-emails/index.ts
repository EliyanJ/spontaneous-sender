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

  for (const page of additionalPages.slice(0, 3)) {
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

// Subject type descriptions for the prompt
const SUBJECT_TYPE_PROMPTS: Record<string, string> = {
  corporate: `TYPE D'OBJET : Corporate / RH (sécurisant, ATS-friendly)
Objectif : rassurer, clarté administrative.
Format objet : "Candidature spontanée – [Spécialité] – [Nom Prénom]" ou "Profil [spécialité] – Candidature spontanée – [Nom Prénom]"`,
  
  value: `TYPE D'OBJET : Valeur ajoutée (RH + managers ouverts)
Objectif : montrer l'apport sans se vendre.
Format objet : "Appui [spécialité] – Candidature spontanée – [Nom Prénom]" ou "Renfort [spécialité] – Candidature spontanée – [Nom Prénom]"`,
  
  manager: `TYPE D'OBJET : Managers / opérationnels
Objectif : proximité métier, concret.
Format objet : "Appui sur vos projets [spécialité] – Candidature spontanée – [Nom Prénom]" ou "Intérêt pour vos projets [spécialité] – Candidature spontanée – [Nom Prénom]"`,
  
  question: `TYPE D'OBJET : Approche question (engagement doux)
Objectif : déclencher une réponse sans pression.
Format objet : "Vos sujets [spécialité] actuels – Candidature spontanée – [Nom Prénom]" ou "Besoins actuels en [spécialité] – Candidature spontanée – [Nom Prénom]"
Règle : Toujours rattacher explicitement à "candidature spontanée". Jamais de vocabulaire "prospection".`,
};

const TONE_PROMPTS: Record<string, string> = {
  formal: `TON : Formel (Version RH)
- Vouvoiement strict
- "Je souhaite vous adresser ma candidature spontanée"
- Ton professionnel et structuré`,
  
  balanced: `TON : Équilibré
- "Je me permets de vous contacter afin de vous proposer ma candidature spontanée"
- Professionnel mais accessible`,
  
  direct: `TON : Direct (Version manager)
- "J'ai découvert [projet/initiative] de [Nom entreprise], ce qui m'a donné envie de vous adresser ma candidature spontanée"
- Concret et orienté action`,
  
  soft: `TON : Question adoucie
- "Je serais ravi d'échanger avec vous afin de mieux comprendre sur quels aspects je pourrais apporter du renfort"
- Doux, non pressant`,
};

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

    const { companies, template, cvContent, userProfile, subjectType, tone } = await req.json();

    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      throw new Error('companies doit être un tableau non vide');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurée');
    }

    // Determine subject type and tone instructions
    const selectedSubjectType = subjectType || 'corporate';
    const selectedTone = tone || 'balanced';
    const subjectTypeInstruction = SUBJECT_TYPE_PROMPTS[selectedSubjectType] || SUBJECT_TYPE_PROMPTS.corporate;
    const toneInstruction = TONE_PROMPTS[selectedTone] || TONE_PROMPTS.balanced;

    console.log(`Generating personalized emails for ${companies.length} companies (type: ${selectedSubjectType}, tone: ${selectedTone})`);

    // --- Récupération des exemples validés (RAG - filtre côté code) ---
    let examplesBlock = '';
    try {
      const { data: examples } = await supabaseClient
        .from('email_subject_examples')
        .select('subject_text, admin_score, context_data')
        .gte('admin_score', 4)
        .order('admin_score', { ascending: false })
        .limit(5);

      if (examples && examples.length > 0) {
        const filtered = examples.filter((e: any) =>
          e.context_data?.type_objet === selectedSubjectType &&
          e.context_data?.ton === selectedTone
        );
        const toUse = filtered.length > 0 ? filtered.slice(0, 3) : examples.slice(0, 3);
        const list = toUse.map((e: any) => `- "${e.subject_text}"`).join('\n');
        examplesBlock = `\nEXEMPLES DE RÉFÉRENCE :\n${list}\nCes exemples ont été validés comme efficaces. Inspire-toi de leur approche.\n`;
        console.log(`Exemples RAG: ${toUse.length} utilisés (${filtered.length} matchés sur type+ton)`);
      } else {
        console.log(`Exemples RAG: aucun exemple disponible`);
      }
    } catch (err) {
      console.error('Erreur exemples:', err);
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
          sectorContext = `\nCONTEXTE SECTORIEL (données de référence) :\n${contextParts.join('\n\n')}\n\nCes informations te donnent une vision du secteur et du métier. Utilise-les comme contexte pour mieux comprendre l'environnement professionnel, PAS comme une liste de mots à placer. L'email doit rester naturel et personnalisé.\n`;
          console.log(`ATS context: ${top.map((p: any) => p.name).join(', ')}`);
        }
      }
    } catch (err) {
      console.error('Erreur ATS context:', err);
    }

    const results = [];

    for (const company of companies) {
      try {
        console.log(`Processing: ${company.nom}`);

        // Step 1: Use cached scraping if recent (< 7 days), else scrape in real-time
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
          const mainContent = await scrapeWebsite(company.website_url);
          const additionalContent = await getAdditionalContent(company.website_url);
          companyInfo = (mainContent + additionalContent).slice(0, 10000);

          // Save for future use
          if (companyInfo) {
            await supabaseClient.from('companies').update({
              company_insights: {
                scraped_at: new Date().toISOString(),
                content_preview: companyInfo.slice(0, 1000),
                full_content: companyInfo
              }
            }).eq('id', company.id);
          }
        }

        // Step 2: Generate personalized email using AI
        const systemPrompt = `Tu es un expert en rédaction d'emails de candidature spontanée. Tu appliques une stratégie précise pour maximiser le taux d'ouverture et de réponse.

RÈGLES STRICTES :
1. Écris UNIQUEMENT l'email, sans introduction ni explication
2. Le corps du mail fait MAXIMUM 4 LIGNES (4 phrases courtes)
3. Structure obligatoire du corps :
   - Ligne 1 : Qui je suis (statut volontairement flou, spécialisation)
   - Ligne 2 : Pourquoi cette entreprise (élément spécifique si possible)
   - Ligne 3 : Ce que je peux apporter (appui / renfort / contribution)
   - Ligne 4 : Ouverture + mention PJ ("Vous trouverez en pièces jointes mon CV et ma lettre de motivation.")
4. Ne JAMAIS mentionner le type de contrat (CDI, CDD, stage, alternance...)
5. Toujours mentionner CV + lettre de motivation en pièces jointes
6. AUCUN vocabulaire de prospection commerciale (pas de "collaboration", "enjeux", "échange" isolé)
7. Ton professionnel, humain, non-commercial
8. Ne laisser AUCUN placeholder [XXX] - personnaliser tout
9. L'objet doit TOUJOURS contenir "Candidature spontanée"

${subjectTypeInstruction}

${toneInstruction}
${examplesBlock}${sectorContext}
RÈGLES ANTI-HALLUCINATION (CRITIQUES) :
- Ne JAMAIS inventer de compétences. Utilise UNIQUEMENT les compétences mentionnées dans le CV du candidat. Si le CV mentionne du marketing, ne parle PAS de développement web.
- Ne JAMAIS interpréter ou deviner le sens du nom de l'entreprise. Le nom "CHOOSE" ne veut pas dire que l'entreprise aide à "choisir".
- Si les informations scrapées sont absentes ou insuffisantes, reste FACTUEL : mentionne uniquement le nom, la ville et le secteur APE. Ne comble PAS le manque d'information par des suppositions ou des formulations vagues type "votre approche innovante".
- Le nom du candidat est fourni dans les données. Utilise-le TEL QUEL. Ne JAMAIS écrire "[Votre Nom]", "[Nom]", "[Nom du candidat]" ou tout autre placeholder.
- Si une donnée est marquée "Non spécifié", ne la mentionne pas du tout plutôt que d'écrire "Non spécifié" dans l'email.

FORMAT DE SORTIE :
Sujet: [objet selon le type choisi]

[corps de l'email - 4 lignes max]`;

        const candidatName = userProfile?.fullName || '';
        const userPrompt = `ENTREPRISE CIBLE:
- Nom: ${company.nom}
- Ville: ${company.ville || 'Non spécifiée'}
- Secteur: ${company.libelle_ape || 'Non spécifié'}
- Site web: ${company.website_url || 'Non disponible'}

INFORMATIONS SCRAPÉES DU SITE:
${companyInfo || 'Aucune information scrapée disponible. NE PAS inventer d informations sur cette entreprise. Utilise uniquement le nom, la ville et le secteur APE fournis ci-dessus.'}

${template ? `STYLE DE RÉFÉRENCE (à adapter, pas copier):
${template}` : ''}

${cvContent ? `PROFIL DU CANDIDAT:
${cvContent}` : ''}

${userProfile ? `INFORMATIONS CANDIDAT:
- Nom: ${userProfile.fullName || 'Non spécifié'}
- Formation: ${userProfile.education || 'Non spécifiée'}
- LinkedIn: ${userProfile.linkedinUrl || 'Non spécifié'}
` : ''}

NOM DU CANDIDAT POUR L'OBJET: ${candidatName || 'Non spécifié'}

Génère un email de candidature spontanée PERSONNALISÉ pour cette entreprise en respectant strictement les règles ci-dessus.`;

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

        // (company_insights already saved during scraping cache logic above)

        results.push({
          company_id: company.id,
          company_name: company.nom,
          company_email: company.selected_email,
          website_url: company.website_url,
          success: true,
          subject,
          body,
          scraped_info: companyInfo ? true : false,
          subject_type: selectedSubjectType,
          tone: selectedTone,
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
