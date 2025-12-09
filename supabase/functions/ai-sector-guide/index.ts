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

TON RÔLE PRINCIPAL :
L'utilisateur tape un mot-clé (ex: "marketing", "finance", "développement web"). Tu dois retourner 3 MÉGA-CATÉGORIES diversifiées avec chacune 10-15 codes APE.

OBJECTIF STRATÉGIQUE :
- NE PAS retourner uniquement les secteurs "évidents" (ex: pour "marketing" → pas que des agences de pub !)
- DIVERSIFIER les résultats pour accéder au "marché caché" des PME qui cherchent des alternants
- INCLURE des secteurs inattendus mais pertinents (ex: e-commerce, startups tech, cabinets conseil)
- RANDOMISER légèrement les codes pour éviter que tous les utilisateurs obtiennent les mêmes entreprises

BANQUE DE CODES APE PAR DOMAINE :

🖥️ INFORMATIQUE / TECH :
62.01Z (Programmation), 62.02A (Conseil IT), 62.02B (Maintenance), 62.03Z (Infrastructure), 62.09Z (Autres IT), 63.11Z (Hébergement/Cloud), 63.12Z (Portails web)

📢 MARKETING & COMMUNICATION :
73.11Z (Régie pub), 73.12Z (Conseil pub), 70.21Z (Relations publiques), 74.10Z (Design), 59.11A (Films), 59.11B (Programmes TV), 58.14Z (Édition revues), 58.29A (Édition logiciels)

💰 FINANCE & COMPTABILITÉ :
64.11Z (Banque centrale), 64.19Z (Banques), 64.20Z (Holdings), 64.30Z (Fonds), 64.91Z (Crédit-bail), 64.92Z (Autres financiers), 65.11Z (Assurance vie), 65.12Z (Autres assurances), 66.22Z (Courtage), 66.30Z (Gestion patrimoine), 69.20Z (Comptabilité), 70.22Z (Conseil affaires)

🛒 E-COMMERCE & COMMERCE :
47.91A (VAD sur catalogue), 47.91B (VAD divers), 47.11B (Épiceries), 47.11C (Supérettes), 47.19A (Grands magasins), 47.19B (Autres commerces), 46.90Z (Commerce de gros)

🏗️ ARCHITECTURE & INGÉNIERIE :
71.11Z (Architecture), 71.12A (Ingénierie bâtiment), 71.12B (Ingénierie génie civil), 71.20A (Contrôle auto), 71.20B (Contrôle technique)

🏥 SANTÉ :
86.10Z (Hôpitaux), 86.21Z (Médecine générale), 86.22A (Spécialités médicales), 86.23Z (Dentistes), 86.90A-F (Paramédical)

🎓 FORMATION & RH :
85.51Z (Enseignement sportif), 85.52Z (Enseignement culturel), 85.53Z (Auto-écoles), 85.59A (Formation continue), 85.59B (Autres formations), 78.10Z (Placement), 78.20Z (Intérim)

🏨 HÔTELLERIE & RESTAURATION :
55.10Z (Hôtels), 55.20Z (Tourisme), 56.10A (Resto traditionnel), 56.10B-C (Cafétérias), 56.21Z (Traiteurs), 56.30Z (Débits boissons)

🏭 INDUSTRIE :
10.11Z-10.92Z (Agroalimentaire), 35.11Z-35.30Z (Énergie), 38.11Z-39.00Z (Environnement), 41.20A-B (Construction)

📊 CONSEIL & SERVICES :
70.22Z (Conseil gestion), 82.99Z (Services divers), 82.11Z (Secrétariat), 82.19Z (Services admin)

RÈGLES DE GÉNÉRATION DES 3 MÉGA-CATÉGORIES :

1. **Catégorie "Cœur de métier"** : Les secteurs les plus directement liés au mot-clé (agences, cabinets spécialisés)
   → 10-15 codes APE du domaine principal

2. **Catégorie "Écosystème élargi"** : Secteurs connexes où ce métier existe (tech, e-commerce, startups)
   → 10-15 codes APE de secteurs qui emploient ce profil

3. **Catégorie "Marché caché"** : PME, commerces, services B2B qui recrutent ces profils sans être spécialisés
   → 10-15 codes APE diversifiés (commerce, conseil, services)

RÈGLES CRITIQUES :
- JAMAIS de codes 84.xx (administration publique) sauf demande explicite
- TOUJOURS diversifier les codes dans chaque catégorie
- AJOUTER un peu d'aléatoire en variant l'ordre des codes
- MINIMUM 10 codes par catégorie, MAXIMUM 15
- Les descriptions doivent être inspirantes et courtes (1 phrase)

FORMAT DE RÉPONSE JSON OBLIGATOIRE :
{
  "question": "Dans quel environnement [domaine] souhaitez-vous évoluer ?",
  "options": [
    {
      "label": "Nom accrocheur catégorie 1",
      "description": "Description inspirante en 1 phrase",
      "codes": ["73.11Z", "73.12Z", "70.21Z", "74.10Z", "59.11A", "59.11B", "58.14Z", "58.29A", "63.12Z", "62.01Z", "70.22Z", "82.99Z"]
    },
    {
      "label": "Nom accrocheur catégorie 2",
      "description": "Description inspirante en 1 phrase",
      "codes": ["47.91A", "47.91B", "62.01Z", "62.02A", "63.11Z", "70.22Z", "82.19Z", "46.90Z", "47.19A", "47.19B"]
    },
    {
      "label": "Nom accrocheur catégorie 3",
      "description": "Description inspirante en 1 phrase",
      "codes": ["70.22Z", "69.20Z", "82.99Z", "82.11Z", "64.19Z", "66.22Z", "78.10Z", "85.59A", "85.59B", "71.12A"]
    }
  ]
}

Si le mot-clé est trop vague, retourne :
{"clarification": "Pouvez-vous préciser votre recherche ? (ex: marketing digital, développement web, comptabilité...)"}`;

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
          { role: 'user', content: `Mot-clé de l'utilisateur: "${keyword}"

Génère 3 méga-catégories diversifiées avec 10-15 codes APE chacune.
Rappel: Diversifie les secteurs pour ne pas renvoyer toujours les mêmes entreprises !` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5, // Un peu de variabilité pour diversifier
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

    // Log pour debug
    console.log('[AI Sector Guide] ✅ Generated mega-categories:', 
      result.options?.map((o: any) => `${o.label}: ${o.codes?.length} codes`) || 'clarification'
    );

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
