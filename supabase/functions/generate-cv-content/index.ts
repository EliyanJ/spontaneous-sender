import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { cvText, sector, sectorPhrases, jobDescription, missingKeywords, mode } = await req.json();

    if (!cvText) throw new Error("cvText is required");

    let systemPrompt = `Tu es un expert en rédaction de CV professionnels. Tu dois analyser le texte d'un CV et retourner des données structurées en JSON.

IMPORTANT: Tu DOIS retourner UNIQUEMENT un objet JSON valide, sans aucun texte avant ou après. Pas de markdown, pas de backticks.

Le JSON doit avoir cette structure exacte:
{
  "personalInfo": {
    "firstName": "string",
    "lastName": "string", 
    "title": "string (titre professionnel/poste recherché)",
    "email": "string",
    "phone": "string",
    "address": "string",
    "linkedin": "string"
  },
  "summary": "string (accroche professionnelle de 2-3 phrases)",
  "experiences": [
    {
      "company": "string",
      "role": "string",
      "dates": "string",
      "bullets": ["string (phrases d'impact avec résultats chiffrés)"]
    }
  ],
  "education": [
    {
      "school": "string",
      "degree": "string",
      "dates": "string"
    }
  ],
  "skills": {
    "technical": ["string"],
    "soft": ["string"]
  },
  "languages": [
    {
      "name": "string",
      "level": "string"
    }
  ],
  "certifications": ["string"],
  "interests": ["string"]
}`;

    let userPrompt = `Voici le texte du CV à structurer:\n\n${cvText}`;

    if (sector) {
      systemPrompt += `\n\nSecteur cible: ${sector}. Adapte le vocabulaire, les compétences mises en avant et les formulations pour correspondre aux attentes du secteur ${sector}.`;
    }

    if (sectorPhrases && sectorPhrases.length > 0) {
      systemPrompt += `\n\nVoici des phrases modèles du secteur à t'inspirer pour reformuler les expériences:\n${sectorPhrases.map((p: any) => `- [${p.category}] ${p.phrase}`).join('\n')}`;
    }

    if (mode === 'optimize' && jobDescription) {
      systemPrompt += `\n\nMode ADAPTATION À UNE OFFRE D'EMPLOI:
- Analyse la fiche de poste ci-dessous
- Intègre naturellement les mots-clés de l'offre dans les descriptions d'expérience
- Adapte l'accroche pour correspondre au poste
- Mets en avant les compétences les plus pertinentes pour ce poste`;
      
      userPrompt += `\n\nFiche de poste cible:\n${jobDescription}`;
    }

    if (missingKeywords && missingKeywords.length > 0) {
      systemPrompt += `\n\nMots-clés manquants à intégrer naturellement dans le CV (issus de l'analyse ATS):\n${missingKeywords.join(', ')}`;
    }

    if (mode === 'regenerate_section') {
      systemPrompt = `Tu es un expert en rédaction de CV. Reformule la section demandée pour la rendre plus percutante et adaptée au secteur ${sector || 'professionnel'}. Retourne UNIQUEMENT le texte reformulé, sans JSON.`;
    }

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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (mode === 'regenerate_section') {
      return new Response(JSON.stringify({ text: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the JSON from AI response
    let cvData;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      cvData = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", content);
      return new Response(JSON.stringify({ error: "Impossible de parser la réponse IA", raw: content }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ cvData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-cv-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
