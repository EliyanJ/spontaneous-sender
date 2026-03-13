import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { htmlContent, fileName } = await req.json();

    if (!htmlContent || typeof htmlContent !== "string") {
      return new Response(JSON.stringify({ success: false, error: "htmlContent manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY non configurée");
    }

    const systemPrompt = `Tu es un expert en conversion de templates HTML de CV en configurations JSON canvas-v2.

Le canvas est un document A4 de 595×842 pixels.
- Padding global : x=40, contenu width=515
- Les sections commencent à y=40 (haut du canvas)
- Chaque section a une hauteur estimée en fonction de sa densité de contenu

Types d'éléments disponibles :
- "cv-section" avec sectionId: "contact" | "summary" | "experiences" | "entrepreneurship" | "skills" | "education" | "languages" | "target_jobs"
- "text" : élément texte libre
- "shape" : rectangle décoratif (pour fond, photo placeholder)
- "divider" : ligne horizontale

RÈGLES DE MAPPING HTML → canvas-v2 :

1. PHOTO : si tu vois une balise <img class="photo"> ou un placeholder photo dans le HTML :
   - Crée un élément "shape" GRIS à la position exacte de la photo (x=40, y=40, w=120, h=120)
   - Ajoute content="[PHOTO]" pour signaler que c'est le placeholder photo
   - Set has_photo: true dans la config
   
2. HEADER avec photo (display:flex, photo à gauche) :
   - shape photo : x=40, y=40, w=120, h=120, backgroundColor="#e0e0e0"
   - cv-section "contact" : x=175, y=40, w=380, h=120

3. HEADER sans photo :
   - cv-section "contact" : x=40, y=40, w=515, h=100

4. SECTIONS (estime les hauteurs selon le nombre d'items) :
   - summary/profile : height=60-80px
   - experiences (2-3 items) : height=180-220px
   - experiences (1 item) : height=100px
   - entrepreneurship : height=80-100px
   - skills : height=70-90px
   - education : height=80-100px
   - languages/footer : height=60-80px

5. DIVIDERS : pour chaque <h2 style="border-bottom"> détecté, crée un élément "divider" juste AU-DESSUS de la section correspondante (x=40, height=2)

6. COULEURS : extrait exactement les couleurs CSS du HTML
   - backgroundColor du canvas : couleur du .cv-page background
   - textColor des sections : couleur du body/main
   - Couleur des dividers : couleur du border-bottom des h2

FORMAT DE SORTIE : retourne UNIQUEMENT un JSON valide de type canvas-v2 sans aucun commentaire ni markdown.

Exemple de structure :
{
  "version": "canvas-v2",
  "canvasWidth": 595,
  "canvasHeight": 842,
  "backgroundColor": "#ffffff",
  "fontFamily": "Arial, sans-serif",
  "has_photo": true,
  "elements": [
    {
      "id": "el-photo-001",
      "type": "shape",
      "x": 40, "y": 40, "width": 120, "height": 120,
      "content": "[PHOTO]",
      "visible": true, "locked": false,
      "styles": {
        "backgroundColor": "#e0e0e0",
        "borderRadius": 0
      }
    },
    {
      "id": "el-contact-001",
      "type": "cv-section",
      "sectionId": "contact",
      "x": 175, "y": 40, "width": 380, "height": 120,
      "visible": true, "locked": false,
      "styles": {
        "backgroundColor": "transparent",
        "color": "#000000",
        "fontSize": 10,
        "fontFamily": "Arial, sans-serif",
        "padding": 8
      }
    }
  ]
}`;

    const userPrompt = `Voici le code HTML du CV à convertir (fichier: ${fileName || "template.html"}) :

\`\`\`html
${htmlContent.slice(0, 15000)}
\`\`\`

Analyse ce HTML/CSS et génère la configuration canvas-v2 JSON correspondante.
- Estime les positions Y en tenant compte de l'ordre des sections et de la densité de contenu
- Conserve les couleurs exactes extraites du CSS
- Détecte si une photo est présente
- Ajoute des dividers pour les h2 avec border-bottom
- Retourne UNIQUEMENT le JSON, rien d'autre`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit IA dépassé, réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "Crédits IA insuffisants." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      throw new Error(`Erreur AI gateway: ${response.status} - ${errText}`);
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content ?? "";

    // Parse the JSON — strip markdown code blocks if any
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    let canvasConfig;
    try {
      canvasConfig = JSON.parse(jsonStr);
    } catch {
      // Try to find JSON object in the response
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error("L'IA n'a pas retourné un JSON valide.");
      }
      canvasConfig = JSON.parse(match[0]);
    }

    // Validate minimal structure
    if (!canvasConfig.version || !Array.isArray(canvasConfig.elements)) {
      throw new Error("Structure canvas-v2 invalide retournée par l'IA.");
    }

    // Ensure all elements have required fields and valid IDs
    canvasConfig.elements = canvasConfig.elements.map((el: any, i: number) => ({
      ...el,
      id: el.id || `el-imported-${Date.now()}-${i}`,
      visible: el.visible !== undefined ? el.visible : true,
      locked: el.locked !== undefined ? el.locked : false,
      styles: el.styles || {},
    }));

    return new Response(
      JSON.stringify({
        success: true,
        config: canvasConfig,
        elementCount: canvasConfig.elements.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("html-to-canvas-template error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
