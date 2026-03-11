import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `Tu es un expert en design de templates CV. 
Tu analyses une image d'un CV et tu génères un JSON structuré qui reproduit fidèlement sa mise en page dans un éditeur canvas de 595×842 pixels (format A4).

Tu dois retourner UNIQUEMENT un JSON valide correspondant au schéma CanvasConfig canvas-v2.

Règles de mapping:
- Si le CV a une sidebar (colonne colorée gauche ou droite) → crée une "shape" pleine avec la couleur de fond exacte
- Si le CV a un header coloré → crée une "shape" en haut du canvas
- Les sections de contenu (expériences, compétences, contact, formation, langues, résumé, métiers) → crée des "cv-section" avec le sectionId approprié
- Les titres décoratifs, labels, textes statiques → crée des éléments "text"
- Les lignes séparatrices horizontales ou verticales → crée des "divider"
- Extrait les couleurs dominantes (fond, texte, accent) le plus fidèlement possible
- Positionne chaque élément en px (x, y, width, height) en respectant les proportions visuelles du CV

SectionId valides: "contact", "summary", "target_jobs", "experiences", "entrepreneurship", "skills", "education", "languages"

Format JSON à retourner:
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
- Génère entre 5 et 20 éléments pour reproduire au mieux le design
- Les shapes doivent couvrir les zones colorées du fond
- Place les cv-sections dans les zones correspondantes du layout
- Ne répète pas deux fois le même sectionId
- Retourne UNIQUEMENT le JSON, sans texte avant ou après`;

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

    console.log(`Analyzing PDF for template reproduction: ${fileName}`);

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call Gemini Vision with tool calling to force structured JSON output
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyse ce CV et génère le JSON CanvasConfig canvas-v2 qui reproduit fidèlement sa mise en page. Retourne UNIQUEMENT le JSON valide, sans markdown, sans code block, sans texte autour.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${fileBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 8000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit atteint, veuillez réessayer dans quelques instants.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits IA insuffisants. Rechargez votre compte Lovable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    
    console.log('Raw AI response length:', rawContent.length);

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
    config.canvasWidth = config.canvasWidth || 595;
    config.canvasHeight = config.canvasHeight || 842;

    // Ensure all elements have required fields
    config.elements = config.elements.map((el: any, i: number) => ({
      id: el.id || `el-${Date.now()}-${i}`,
      type: el.type || 'shape',
      x: typeof el.x === 'number' ? el.x : 0,
      y: typeof el.y === 'number' ? el.y : 0,
      width: typeof el.width === 'number' ? el.width : 100,
      height: typeof el.height === 'number' ? el.height : 50,
      visible: el.visible !== false,
      locked: el.locked === true,
      sectionId: el.sectionId,
      content: el.content,
      styles: el.styles || {},
    }));

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
