import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { companyId, template, userProfile } = await req.json();

    if (!companyId) {
      return new Response(JSON.stringify({ error: "companyId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Récupérer les infos de l'entreprise avec les insights
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .eq("user_id", user.id)
      .single();

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: "Company not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Récupérer le profil utilisateur si non fourni
    let profile = userProfile;
    if (!profile) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      profile = profileData;
    }

    const insights = company.company_insights;
    
    if (!insights || !insights.content) {
      return new Response(JSON.stringify({ 
        error: "No insights available for this company. Please scrape the website first.",
        needsScraping: true
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Generate Email] Company: ${company.nom}, Pages scraped: ${insights.pages_scraped}`);

    // Construire le contexte pour l'IA
    const companyContext = `
ENTREPRISE: ${company.nom}
SECTEUR: ${company.libelle_ape || "Non spécifié"}
VILLE: ${company.ville || "Non spécifiée"}
SITE WEB: ${company.website_url || "Non spécifié"}

CONTENU DU SITE WEB:
${Object.entries(insights.content as Record<string, string>)
  .map(([page, content]) => `--- ${page.toUpperCase()} ---\n${content}`)
  .join("\n\n")}
`.substring(0, 15000); // Limiter le contexte

    const userContext = profile ? `
PROFIL DU CANDIDAT:
- Nom: ${profile.full_name || "Non renseigné"}
- Formation: ${profile.education || "Non renseignée"}
- LinkedIn: ${profile.linkedin_url || "Non renseigné"}
` : "";

    const templateContext = template ? `
TEMPLATE DE BASE FOURNI PAR L'UTILISATEUR:
${template}

INSTRUCTIONS: Utilise ce template comme base mais personnalise-le avec les informations de l'entreprise.
` : "";

    const systemPrompt = `Tu es un expert en rédaction de candidatures spontanées personnalisées pour des alternances/stages en France.

TON OBJECTIF: Générer un email de candidature ULTRA-PERSONNALISÉ basé sur les informations réelles de l'entreprise.

RÈGLES STRICTES:
1. UTILISE UNIQUEMENT les informations trouvées dans le contenu du site web
2. NE JAMAIS inventer de projets, valeurs ou informations
3. Cite des éléments CONCRETS et VÉRIFIABLES du site
4. Le ton doit être professionnel mais authentique, pas générique
5. L'email doit montrer que tu as VRAIMENT étudié l'entreprise
6. Mentionne un projet récent, une valeur, ou un aspect spécifique de l'entreprise
7. Explique en quoi le parcours du candidat correspond aux besoins de l'entreprise
8. L'email doit faire environ 150-250 mots (pas trop long)

FORMAT DE SORTIE (JSON):
{
  "subject": "Objet personnalisé de l'email",
  "body": "Corps de l'email avec les paragraphes séparés par \\n\\n",
  "highlights": ["Point clé 1 utilisé pour personnaliser", "Point clé 2", "Point clé 3"],
  "confidence": 0.0 à 1.0 (confiance dans la personnalisation)
}`;

    const userPrompt = `${companyContext}

${userContext}

${templateContext}

Génère un email de candidature spontanée PERSONNALISÉ pour cette entreprise. 
L'email doit montrer une vraie connaissance de l'entreprise et expliquer pourquoi le candidat souhaite les rejoindre.`;

    // Appeler Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Generate Email] AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parser la réponse JSON
    let emailData;
    try {
      // Extraire le JSON de la réponse (peut être entouré de markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        emailData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("[Generate Email] Parse error:", parseError);
      // Fallback: utiliser le contenu brut
      emailData = {
        subject: `Candidature spontanée - ${company.nom}`,
        body: content,
        highlights: [],
        confidence: 0.5
      };
    }

    console.log(`[Generate Email] Generated email with confidence ${emailData.confidence}`);

    return new Response(JSON.stringify({
      success: true,
      email: {
        subject: emailData.subject,
        body: emailData.body,
        highlights: emailData.highlights || [],
        confidence: emailData.confidence || 0.5,
      },
      company: {
        id: company.id,
        nom: company.nom,
        selected_email: company.selected_email,
        website_url: company.website_url,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[Generate Email] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
