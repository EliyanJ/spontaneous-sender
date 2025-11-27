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
- Identifier le domaine principal visé (informatique, marketing, finance, santé, etc.)
- Formuler UNE SEULE question fermée et pertinente avec 2-3 options claires
- Mapper chaque option sur des codes APE français RÉELS et PERTINENTS

CODES APE PAR DOMAINE (UTILISE UNIQUEMENT CES CODES) :

🖥️ INFORMATIQUE / TECH :
- Développement logiciel/web : 62.01Z (Programmation informatique)
- Conseil en systèmes : 62.02A (Conseil en systèmes et logiciels), 62.02B (Tierce maintenance)
- Gestion d'infrastructures : 62.03Z (Gestion d'installations informatiques)
- Hébergement/Cloud : 63.11Z (Traitement de données, hébergement)
- Portails web : 63.12Z (Portails Internet)

📢 MARKETING & COMMUNICATION :
- Agences de publicité : 73.11Z (Activités des agences de publicité)
- Agences média/digital : 73.12Z (Régie publicitaire de médias)
- Conseil en communication : 70.21Z (Conseil en relations publiques et communication)
- Design graphique : 74.10Z (Activités spécialisées de design)
- Production audiovisuelle : 59.11A, 59.11B (Production films et programmes TV)

💰 FINANCE & COMPTABILITÉ :
- Banque : 64.19Z (Autres intermédiations monétaires)
- Gestion d'actifs : 64.30Z (Fonds d'investissement)
- Assurance : 65.11Z (Assurance vie), 65.12Z (Autres assurances)
- Expertise comptable : 69.20Z (Activités comptables)
- Audit/Conseil financier : 70.22Z (Conseil pour les affaires)

🏥 SANTÉ :
- Hôpitaux : 86.10Z (Activités hospitalières)
- Cabinets médicaux : 86.21Z (Médecine générale), 86.22A, 86.22B, 86.22C (Spécialités)
- Laboratoires : 86.90A (Ambulances), 86.90B (Laboratoires d'analyses)
- Pharmacie : 47.73Z (Commerce de détail de produits pharmaceutiques)

🏗️ BTP & ARCHITECTURE :
- Architecture : 71.11Z (Activités d'architecture)
- Ingénierie : 71.12A (Ingénierie), 71.12B (Ingénierie, études techniques)
- Contrôle technique : 71.20A, 71.20B (Analyses et contrôle technique)
- Construction bâtiments : 41.20A, 41.20B (Construction de bâtiments)
- Travaux publics : 42.11Z, 42.12Z, 42.13A, 42.13B (Génie civil)

🛒 COMMERCE & VENTE :
- E-commerce : 47.91A, 47.91B (Vente à distance)
- Grande distribution : 47.11A, 47.11B, 47.11C (Supermarchés, hypermarchés)
- Commerce de gros : 46.11Z à 46.90Z (Intermédiaires du commerce)
- Immobilier : 68.10Z (Activités des marchands de biens immobiliers), 68.20A, 68.20B, 68.31Z

🎓 FORMATION & RH :
- Formation adultes : 85.59A, 85.59B (Autres enseignements)
- Enseignement supérieur : 85.42Z (Enseignement supérieur)
- Recrutement : 78.10Z (Activités des agences de placement)
- Intérim : 78.20Z (Activités des agences de travail temporaire)
- Conseil RH : 70.22Z (Conseil pour les affaires)

🏨 HÔTELLERIE & RESTAURATION :
- Hôtellerie : 55.10Z (Hôtels et hébergement)
- Restauration traditionnelle : 56.10A (Restauration traditionnelle)
- Restauration rapide : 56.10B, 56.10C (Cafétérias, restauration rapide)
- Traiteurs : 56.21Z (Services des traiteurs)

🚚 TRANSPORT & LOGISTIQUE :
- Transport routier : 49.41A, 49.41B, 49.41C (Transports routiers de fret)
- Logistique/entreposage : 52.10A, 52.10B (Entreposage et stockage)
- Messagerie : 53.20Z (Autres activités de poste et courrier)

⚡ INDUSTRIE & ÉNERGIE :
- Agroalimentaire : 10.11Z à 10.92Z (Industries alimentaires)
- Énergie : 35.11Z, 35.12Z, 35.13Z (Production d'électricité)
- Environnement : 38.11Z, 38.21Z (Collecte et traitement des déchets)
- Automobile : 29.10Z (Construction de véhicules automobiles)

RÈGLES CRITIQUES :
1. Pour "marketing" → UNIQUEMENT codes 73.11Z, 73.12Z, 70.21Z (PAS de mairies, PAS d'administration publique!)
2. Pour "informatique" ou "dev" → UNIQUEMENT codes 62.xx ou 63.xx
3. Pour "finance" → UNIQUEMENT codes 64.xx, 65.xx, 66.xx, 69.20Z, 70.22Z
4. JAMAIS de codes 84.xx (administration publique) sauf si l'utilisateur demande explicitement le secteur public
5. Toujours vérifier que les codes correspondent au DOMAINE PRIVÉ demandé

FORMAT DE RÉPONSE OBLIGATOIRE (JSON) :
{
  "question": "Ta question courte et directe ?",
  "options": [
    {
      "label": "Nom court de l'option",
      "description": "Description accrocheuse en 1 phrase",
      "codes": ["73.11Z", "73.12Z"]
    },
    {
      "label": "Nom court de l'option 2",
      "description": "Description accrocheuse en 1 phrase",
      "codes": ["70.21Z"]
    }
  ]
}

RÈGLES STRICTES :
- Question courte (max 10 mots)
- 2-3 options MAXIMUM
- Descriptions inspirantes sans jargon
- Codes APE RÉELS et PERTINENTS uniquement (vérifiés dans la liste ci-dessus)
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
