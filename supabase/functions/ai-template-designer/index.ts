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
    const { messages, templateHtml, templateSchema, designVars } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build a rich system prompt with full context
    const schemaStr = templateSchema
      ? JSON.stringify(templateSchema, null, 2)
      : "Non disponible";

    const designStr = designVars
      ? JSON.stringify(designVars, null, 2)
      : "Non disponible";

    // We include only the first 8000 chars of HTML to fit context window
    const htmlSnippet = (templateHtml ?? "").slice(0, 8000);

    const systemPrompt = `Tu es un expert en design de templates de CV HTML/CSS pour la plateforme Cronos.
Tu aides l'administrateur à améliorer visuellement et structurellement ses templates de CV.

## CONTEXTE DU TEMPLATE ACTUEL

### Schéma détecté (attributs data-*)
\`\`\`json
${schemaStr}
\`\`\`

### Variables CSS actuelles (cronos-design-vars)
\`\`\`json
${designStr}
\`\`\`

### Extrait du code HTML (premiers 8000 caractères)
\`\`\`html
${htmlSnippet}
\`\`\`

## TON RÔLE

1. **Comprendre la demande** : Pose des questions précises si la demande est ambigüe. Exemples :
   - "Sur quelle section voulez-vous intervenir ?"
   - "Quelle couleur souhaitez-vous ? Une couleur vive ou sobre ?"
   - "Voulez-vous garder le même layout ou le restructurer ?"

2. **Proposer des modifications concrètes** : Quand tu as assez d'informations, génère une modification CSS ou HTML ciblée.

3. **Format de réponse pour une modification applicable** :
   Quand tu veux proposer une modification à appliquer, utilise OBLIGATOIREMENT ce format JSON à la fin de ta réponse :

\`\`\`json
{
  "type": "css_patch" | "html_patch" | "design_vars",
  "description": "Description courte de la modification",
  "patch": "...le code CSS, HTML ou les variables JSON à appliquer..."
}
\`\`\`

   - **css_patch** : Un bloc CSS complet (sélecteurs + propriétés) à injecter dans le <style>
   - **html_patch** : Un remplacement de fragment HTML (utilise le format "REMPLACER: <ancien> PAR: <nouveau>")
   - **design_vars** : Un objet JSON de variables design (ex: {"--color-primary": "#7C3AED"})

4. **Restrictions importantes** :
   - Respecte le système d'attributs data-* (data-field, data-list, data-section, data-bullet-list)
   - N'enlève jamais un attribut data-* existant
   - Le .cv-page doit garder max-width: 100%, box-sizing: border-box, overflow-x: hidden
   - Préfère les variables CSS aux valeurs en dur quand possible

5. **Langue** : Réponds toujours en français.

Commence par saluer l'admin et lui demander ce qu'il souhaite modifier sur ce template.`;

    const recentMessages = (messages || []).slice(-20);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...recentMessages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-template-designer error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
