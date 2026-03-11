import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `Tu es un expert en design de templates CV. 
Tu analyses un CV (image ou PDF) et tu génères un JSON structuré qui reproduit fidèlement sa mise en page dans un éditeur canvas de 595×842 pixels (format A4).

Tu dois retourner UNIQUEMENT un JSON valide correspondant au schéma CanvasConfig canvas-v2.

RÈGLES CRITIQUES DE POSITIONNEMENT :
- Le canvas fait exactement 595px de large et 842px de haut
- Toutes les coordonnées x, y, width, height sont en pixels ABSOLUS dans ce canvas
- x doit être entre 0 et 595, y entre 0 et 842
- Si le CV a une sidebar GAUCHE (colonne colorée à gauche) : sa largeur est typiquement 150-200px, x=0, y=0, height=842
- Si le CV a une sidebar DROITE (colonne colorée à droite) : x=395-445, y=0, height=842
- Si le CV a un header coloré en haut : x=0, y=0, width=595, height=80-150
- Les cv-section doivent être placées DANS les zones correspondantes (pas en dehors du canvas)
- Les shapes de fond doivent être en premier (z-index bas), les sections CV par-dessus

TYPES D'ÉLÉMENTS disponibles :
1. "shape" : rectangle plein ou avec bordure (pour sidebars, headers, décors de fond)
   - styles: { backgroundColor, borderRadius, borderStyle, borderColor, borderWidth }
2. "cv-section" : bloc de contenu CV dynamique (JAMAIS à x > 550 ni y > 800)
   - sectionId valides: "contact", "summary", "target_jobs", "experiences", "entrepreneurship", "skills", "education", "languages"
   - styles: { backgroundColor, color, fontSize, fontFamily, padding }
3. "text" : texte statique décoratif (titre, label)
   - content: le texte affiché
   - styles: { color, fontSize, fontWeight, fontFamily, textAlign, backgroundColor }
4. "divider" : ligne séparatrice horizontale ou verticale
   - styles: { backgroundColor }

MAPPING DES SECTIONS (Ne jamais répéter le même sectionId) :
- Zone avec nom/email/téléphone/adresse → sectionId: "contact"
- Zone avec résumé/profil/objectif → sectionId: "summary"  
- Zone avec expériences/emplois/postes → sectionId: "experiences"
- Zone avec compétences/skills → sectionId: "skills"
- Zone avec formation/diplômes → sectionId: "education"
- Zone avec langues → sectionId: "languages"
- Zone avec métiers cherchés → sectionId: "target_jobs"
- Zone avec entrepreneuriat/projets → sectionId: "entrepreneurship"

FORMAT JSON ATTENDU :
{
  "version": "canvas-v2",
  "canvasWidth": 595,
  "canvasHeight": 842,
  "backgroundColor": "#ffffff",
  "fontFamily": "Helvetica, Arial, sans-serif",
  "elements": [
    {
      "id": "el-1",
      "type": "shape",
      "x": 0,
      "y": 0,
      "width": 180,
      "height": 842,
      "visible": true,
      "locked": false,
      "styles": {
        "backgroundColor": "#1a2340",
        "borderRadius": 0
      }
    },
    {
      "id": "el-2",
      "type": "cv-section",
      "sectionId": "contact",
      "x": 10,
      "y": 20,
      "width": 160,
      "height": 130,
      "visible": true,
      "locked": false,
      "styles": {
        "backgroundColor": "transparent",
        "color": "#ffffff",
        "fontSize": 10,
        "fontFamily": "Helvetica, Arial, sans-serif",
        "padding": 12
      }
    }
  ]
}

IMPORTANT: 
- Génère entre 8 et 20 éléments pour reproduire fidèlement le design
- Les shapes de fond DOIVENT couvrir les zones colorées (sidebar, header)
- Les cv-sections DOIVENT être dans les limites du canvas (x+width <= 595, y+height <= 842)
- Ne répète JAMAIS deux fois le même sectionId
- Retourne UNIQUEMENT le JSON, sans texte avant ou après, sans markdown`;

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

    const { fileBase64, fileName } = await req.json();

    if (!fileBase64 || !fileName) {
      throw new Error('Missing file data');
    }

    console.log(`Analyzing PDF for template reproduction: ${fileName}, base64 length: ${fileBase64.length}`);

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use Gemini native API with inline_data — properly supports PDF files
    const geminiResponse = await fetch(
      'https://ai.gateway.lovable.dev/google/gemini-2.5-flash/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'Analyse ce CV et génère le JSON CanvasConfig canvas-v2 qui reproduit fidèlement sa mise en page. Retourne UNIQUEMENT le JSON valide, sans markdown, sans code block, sans aucun texte autour.',
                },
                {
                  inline_data: {
                    mime_type: 'application/pdf',
                    data: fileBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 8000,
            temperature: 0.2,
          },
        }),
      }
    );

    let rawContent = '';

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini native API error:', geminiResponse.status, errorText);
      
      // Fallback: try OpenAI-compatible gateway with image_url format
      console.log('Falling back to OpenAI-compatible gateway...');
      const fallbackResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyse ce CV et génère le JSON CanvasConfig canvas-v2 qui reproduit fidèlement sa mise en page. Retourne UNIQUEMENT le JSON valide, sans markdown, sans code block.',
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:application/pdf;base64,${fileBase64}` },
                },
              ],
            },
          ],
          max_tokens: 8000,
          temperature: 0.2,
        }),
      });

      if (!fallbackResponse.ok) {
        const fallbackError = await fallbackResponse.text();
        console.error('Fallback error:', fallbackResponse.status, fallbackError);
        if (fallbackResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit atteint, veuillez réessayer dans quelques instants.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`AI API error: ${fallbackResponse.status}`);
      }

      const fallbackData = await fallbackResponse.json();
      rawContent = fallbackData.choices?.[0]?.message?.content || '';
    } else {
      const geminiData = await geminiResponse.json();
      rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    console.log('Raw AI response length:', rawContent.length);
    console.log('Raw AI response preview:', rawContent.slice(0, 200));

    // Clean the response: remove markdown code blocks if present
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    // Parse and validate
    let config;
    try {
      config = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw:', jsonStr.slice(0, 500));
      throw new Error('L\'IA n\'a pas retourné un JSON valide. Réessayez avec un PDF plus clair.');
    }

    // Validate structure
    if (!config.elements || !Array.isArray(config.elements)) {
      throw new Error('Structure JSON invalide : champ "elements" manquant.');
    }

    // Ensure version is set
    config.version = 'canvas-v2';
    config.canvasWidth = 595;
    config.canvasHeight = 842;

    // Clamp and validate all elements
    config.elements = config.elements
      .filter((el: any) => el && el.type)
      .map((el: any, i: number) => {
        const x = typeof el.x === 'number' ? Math.max(0, Math.min(el.x, 580)) : 0;
        const y = typeof el.y === 'number' ? Math.max(0, Math.min(el.y, 830)) : 0;
        const width = typeof el.width === 'number' ? Math.max(10, Math.min(el.width, 595 - x)) : 100;
        const height = typeof el.height === 'number' ? Math.max(5, Math.min(el.height, 842 - y)) : 50;

        return {
          id: el.id || `el-${Date.now()}-${i}`,
          type: el.type || 'shape',
          x,
          y,
          width,
          height,
          visible: el.visible !== false,
          locked: el.locked === true,
          sectionId: el.sectionId,
          content: el.content,
          styles: el.styles || {},
        };
      });

    // Remove duplicate sectionIds
    const seenSectionIds = new Set<string>();
    config.elements = config.elements.filter((el: any) => {
      if (el.type === 'cv-section' && el.sectionId) {
        if (seenSectionIds.has(el.sectionId)) return false;
        seenSectionIds.add(el.sectionId);
      }
      return true;
    });

    console.log(`Generated ${config.elements.length} elements for template`);

    return new Response(JSON.stringify({
      success: true,
      config,
      elementCount: config.elements.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in ai-template-from-pdf:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
