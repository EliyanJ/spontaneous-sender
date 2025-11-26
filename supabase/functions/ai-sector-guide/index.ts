import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`[AI Sector Guide] Analyzing keyword: ${keyword}`);

    const systemPrompt = `Tu es un assistant IA spécialisé dans l'orientation professionnelle pour alternances et stages en France.

TON RÔLE :
- Analyser un mot-clé fourni par l'utilisateur
- Identifier le domaine principal (informatique, marketing, finance, santé, etc.)
- Formuler UNE SEULE question fermée et pertinente avec 2-3 options claires
- Mapper chaque option sur des codes APE français spécifiques

CODES APE DISPONIBLES PAR DOMAINE :

INFORMATIQUE :
- Dev web/app : 62.01Z, 62.02A, 62.02B
- Backend/Infra : 62.03Z, 63.11Z, 63.12Z
- Conseil IT : 62.02A, 62.09Z

MARKETING & COMMUNICATION :
- Pub/Création : 73.11Z, 73.12Z
- Digital/Réseaux : 73.12Z, 70.21Z
- Communication corporate : 70.21Z

FINANCE & ASSURANCE :
- Banque/Trading : 64.19Z, 64.20Z, 64.30Z, 64.91Z, 64.92Z, 64.99Z
- Assurance : 65.11Z, 65.12Z, 66.11Z, 66.12Z, 66.19A, 66.19B, 66.21Z, 66.22Z, 66.29Z, 66.30Z
- Gestion de patrimoine : 66.30Z

ARCHITECTURE & INGÉNIERIE :
- Bâtiments/Urbanisme : 71.11Z, 71.12A
- Génie civil : 71.12B
- Études techniques : 71.20A, 71.20B

COMMERCE :
- E-commerce : 47.91A, 47.91B
- Commerce physique : 47.11B, 47.11C, 47.11D, 47.11E, 47.11F, 47.19A, 47.19B
- Immobilier : 68.10Z, 68.20A, 68.20B, 68.31Z, 68.32A, 68.32B

SANTÉ :
- Hospitalier : 86.10Z
- Pratiques médicales : 86.21Z, 86.22A, 86.22B, 86.23Z
- Services de santé : 86.90A, 86.90B, 86.90C, 86.90D, 86.90E, 86.90F

FORMATION :
- Enseignement : 85.51Z, 85.52Z, 85.53Z, 85.59A, 85.59B

INDUSTRIE :
- Agroalimentaire : 10.11Z à 10.92Z
- Énergie : 35.11Z, 35.12Z, 35.13Z, 35.14Z, 35.21Z, 35.22Z, 35.23Z, 35.30Z

CONSTRUCTION & BTP :
- Construction : 41.10A, 41.10B, 41.10C, 41.10D, 41.20A, 41.20B
- Génie civil : 42.11Z, 42.12Z, 42.13A, 42.13B, 42.21Z, 42.22Z, 42.91Z, 42.99Z

HÔTELLERIE & RESTAURATION :
- Hôtellerie : 55.10Z, 55.20Z, 55.30Z
- Restauration : 56.10A, 56.10B, 56.10C, 56.21Z, 56.29A, 56.29B, 56.30Z

TRANSPORT & LOGISTIQUE :
- Transport : 49.10Z à 52.29B

FORMAT DE RÉPONSE OBLIGATOIRE (JSON) :
{
  "question": "Ta question courte et directe ?",
  "options": [
    {
      "label": "Nom court de l'option",
      "description": "Description accrocheuse en 1 phrase",
      "codes": ["62.01Z", "62.02A"]
    },
    {
      "label": "Nom court de l'option 2",
      "description": "Description accrocheuse en 1 phrase",
      "codes": ["62.03Z", "63.11Z"]
    },
    {
      "label": "Nom court de l'option 3",
      "description": "Description accrocheuse en 1 phrase",
      "codes": ["62.09Z", "70.22Z"]
    }
  ]
}

RÈGLES STRICTES :
- Question courte (max 10 mots)
- 2-3 options MAXIMUM
- Descriptions inspirantes sans jargon
- Codes APE réels uniquement
- Options distinctes et pertinentes
- Si mot-clé ambigu, retourne: {"clarification": "Tu peux préciser ? (ex: dev web, marketing digital, etc.)"}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Mot-clé: ${keyword}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Sector Guide] API Error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);

    console.log('[AI Sector Guide] ✅ Generated response:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[AI Sector Guide] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
