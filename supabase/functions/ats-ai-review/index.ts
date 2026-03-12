import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify admin role
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== MODE: EXTRACT KEYWORDS FROM TEXT =====
    if (body.mode === 'extract_keywords') {
      const { text, profession_name, existing_primary, existing_secondary, existing_soft_skills } = body;
      if (!text) {
        return new Response(JSON.stringify({ error: 'Missing text' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const extractPrompt = `Tu es un expert en recrutement et ATS. Analyse le texte suivant et extrais les mots-clés pertinents pour la thématique "${profession_name || 'générale'}".

Texte à analyser:
${text.substring(0, 8000)}

Mots-clés déjà existants (NE PAS les inclure dans ta réponse):
- Primary: ${(existing_primary || []).join(', ')}
- Secondary: ${(existing_secondary || []).join(', ')}
- Soft skills: ${(existing_soft_skills || []).join(', ')}

Extrais UNIQUEMENT les NOUVEAUX mots-clés qui ne sont pas déjà dans les listes ci-dessus. Catégorise-les en:
- primary: compétences techniques principales (outils, technologies, méthodologies clés)
- secondary: compétences secondaires (connaissances complémentaires)
- soft_skill: savoir-être et compétences comportementales

Ne retourne que des compétences spécifiques et pertinentes, pas de mots génériques.`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Tu es un expert RH/ATS. Réponds uniquement via le tool call demandé.' },
            { role: 'user', content: extractPrompt },
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'extract_keywords',
              description: 'Extract and categorize keywords from text',
              parameters: {
                type: 'object',
                properties: {
                  keywords: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        keyword: { type: 'string' },
                        category: { type: 'string', enum: ['primary', 'secondary', 'soft_skill'] },
                      },
                      required: ['keyword', 'category'],
                    },
                  },
                },
                required: ['keywords'],
              },
            },
          }],
          tool_choice: { type: 'function', function: { name: 'extract_keywords' } },
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error('AI extract error:', aiResponse.status, errText);
        throw new Error('AI extraction failed');
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      let keywords = [];
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        keywords = parsed.keywords || [];
      }

      return new Response(JSON.stringify({ keywords }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== MODE: SUGGEST NEW PROFESSION (AI detects unknown job) =====
    if (body.mode === 'suggest_profession') {
      const { job_title, job_description, existing_themes } = body;
      if (!job_title || !job_description) {
        return new Response(JSON.stringify({ error: 'Missing job_title or job_description' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const themesListStr = (existing_themes || []).map((t: any) => `- ${t.name} (${t.category || 'sans catégorie'})`).join('\n');

      const suggestPrompt = `Tu es un expert RH et ATS. Un poste a été analysé mais aucun métier connu ne correspond.

Intitulé du poste: "${job_title}"
Description du poste:
${(job_description || '').substring(0, 3000)}

Thématiques existantes dans notre base:
${themesListStr || 'Aucune thématique encore.'}

Ta mission:
1. Identifie le nom précis du métier correspondant à ce poste (ex: "Scrum Master", "Revenue Operations Manager", "Data Engineer")
2. Détermine quelle thématique parente de la liste ci-dessus est la plus adaptée (ou propose d'en créer une nouvelle si vraiment nécessaire)
3. Extrais les mots-clés spécifiques à CE métier (pas les mots génériques de la thématique)

Sois précis et concret. Les mots-clés doivent être des compétences réelles utilisées dans les ATS.`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Tu es un expert RH/ATS. Réponds uniquement en UTF-8 avec les accents français corrects. Utilise uniquement le tool call demandé.' },
            { role: 'user', content: suggestPrompt },
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'suggest_profession',
              description: 'Suggest a new profession to add to the ATS database',
              parameters: {
                type: 'object',
                properties: {
                  suggested_job_name: { type: 'string', description: 'Nom précis du métier (ex: Scrum Master)' },
                  suggested_theme_name: { type: 'string', description: 'Nom de la thématique parente existante ou nouvelle (ex: Gestion de projet)' },
                  is_new_theme: { type: 'boolean', description: 'true si la thématique parente est nouvelle et n\'existe pas encore' },
                  confidence: { type: 'number', description: 'Niveau de confiance de 0 à 1' },
                  reasoning: { type: 'string', description: 'Explication courte du choix en français' },
                  primary_keywords: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Mots-clés hard skills spécifiques à CE métier (pas à la thématique)'
                  },
                  secondary_keywords: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Mots-clés secondaires spécifiques à ce métier'
                  },
                  soft_skills: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Soft skills typiques de ce métier'
                  },
                  aliases: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Intitulés alternatifs pour ce métier'
                  },
                },
                required: ['suggested_job_name', 'suggested_theme_name', 'is_new_theme', 'confidence', 'reasoning', 'primary_keywords', 'secondary_keywords', 'soft_skills', 'aliases'],
              },
            },
          }],
          tool_choice: { type: 'function', function: { name: 'suggest_profession' } },
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        const text = await aiResponse.text();
        console.error('AI suggest_profession error:', status, text);
        throw new Error('AI suggestion failed');
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      let suggestion = null;
      if (toolCall?.function?.arguments) {
        suggestion = JSON.parse(toolCall.function.arguments);
      }

      return new Response(JSON.stringify({ suggestion }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== MODE: REVIEW ANALYSIS KEYWORDS (default) =====
    const { analysis } = body;
    if (!analysis?.analysis_result) {
      return new Response(JSON.stringify({ error: 'Missing analysis data' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const keywords: Array<{ keyword: string; category: string }> = [];
    const result = analysis.analysis_result;
    if (result?.primaryKeywords?.scores) {
      for (const s of result.primaryKeywords.scores) keywords.push({ keyword: s.keyword, category: 'primary' });
    }
    if (result?.secondaryKeywords?.scores) {
      for (const s of result.secondaryKeywords.scores) keywords.push({ keyword: s.keyword, category: 'secondary' });
    }
    if (result?.softSkills?.scores) {
      for (const s of result.softSkills.scores) keywords.push({ keyword: s.skill, category: 'soft_skill' });
    }

    const prompt = `Tu es un expert en recrutement et en analyse de CV/ATS.

Contexte: Analyse d'un CV pour le poste "${analysis.job_title}" (thématique: ${analysis.profession_name || 'non identifiée'}).

Voici les mots-clés identifiés par notre algorithme de scoring ATS. Pour chaque mot-clé, indique:
1. Si c'est une VRAIE compétence/soft skill pertinente pour ce poste (is_valid: true/false)
2. Si la catégorie est correcte :
   - primary : compétence technique principale (outil, logiciel, technologie, certification)
   - secondary : compétence complémentaire associée au métier
   - soft_skill : savoir-être, qualité comportementale
   - excluded : mot technique valide mais hors contexte de ce métier
   - common_word : mot trop courant du français, sans valeur de compétence (ex: "travail", "équipe", "développement" au sens générique, "projet" seul)
3. Une courte raison si tu changes quelque chose (en français, avec accents corrects)

Mots-clés à analyser:
${keywords.map(k => `- "${k.keyword}" (catégorie actuelle: ${k.category})`).join('\n')}

IMPORTANT: Les mots courants du français ne sont PAS des compétences. Utilise "common_word" pour eux.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un expert RH/ATS. Réponds UNIQUEMENT en UTF-8 correct avec les accents français (é, è, à, ç, ô, î...). N\'utilise jamais d\'entités HTML ni d\'encodages alternatifs. Réponds uniquement avec le JSON demandé via le tool call.' },
          { role: 'user', content: prompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'review_keywords',
            description: 'Review ATS keywords for validity and correct categorization',
            parameters: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      keyword: { type: 'string' },
                      original_category: { type: 'string' },
                      corrected_category: { type: 'string', enum: ['primary', 'secondary', 'soft_skill', 'excluded', 'common_word'] },
                      is_valid: { type: 'boolean' },
                      reason: { type: 'string' },
                    },
                    required: ['keyword', 'original_category', 'corrected_category', 'is_valid', 'reason'],
                  },
                },
              },
              required: ['suggestions'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'review_keywords' } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error('AI error:', status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      suggestions = parsed.suggestions || [];
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ats-ai-review:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
