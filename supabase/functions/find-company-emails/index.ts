import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const requestSchema = z.object({
  maxCompanies: z.number().int().min(1).max(50).optional().default(15)
});

// Rate limiting function
async function checkRateLimit(supabase: any, userId: string, action: string, limit: number = 20) {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  
  const { count, error } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', oneHourAgo);
    
  if (error) {
    console.error('Rate limit check error:', error);
    return; // Fail open
  }
  
  if (count && count >= limit) {
    throw new Error(`Rate limit exceeded. Maximum ${limit} requests per hour for ${action}`);
  }
  
  // Record this request
  await supabase.from('rate_limits').insert({
    user_id: userId,
    action,
    count: 1
  });
}

// Sanitize company data before AI prompts
function sanitizeForAI(text: string | null): string {
  if (!text) return "Non renseigné";
  return text.replace(/[{}[\]]/g, '').slice(0, 500);
}

interface CompanyRow {
  id: string;
  nom: string;
  ville: string | null;
  siren: string;
  code_ape: string | null;
  libelle_ape: string | null;
  adresse: string | null;
}

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function selectBestEmailWithAI(emails: string[]): Promise<string> {
  if (!LOVABLE_API_KEY) {
    console.error("[AI] LOVABLE_API_KEY not configured for email selection");
    return emails[0] || "";
  }

  if (emails.length === 0) return "";
  if (emails.length === 1) return emails[0];

  const prompt = `Tu es un expert en sélection d'emails professionnels pour des candidatures spontanées.

EMAILS DISPONIBLES:
${emails.map((e, i) => `${i + 1}. ${e}`).join('\n')}

MISSION:
Choisis l'email le plus pertinent pour envoyer une candidature spontanée.

ORDRE DE PRIORITÉ (mais reste flexible):
1. Email RH ou recrutement (rh@, recrutement@, recruitment@, hr@, jobs@, careers@)
2. Email contact général (contact@)
3. Email information (info@)
4. Sinon, l'email qui semble le plus approprié pour une prise de contact professionnelle

RÈGLES:
- Tu DOIS choisir un email parmi la liste fournie
- Réponds UNIQUEMENT avec l'email choisi, rien d'autre
- Pas de JSON, pas d'explication, juste l'email

RÉPONSE ATTENDUE (exemple):
contact@example.fr`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Tu es un assistant de sélection d'emails. Tu réponds UNIQUEMENT avec l'email choisi, sans aucun texte supplémentaire.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error("[AI] Email selection error:", response.status);
      return emails[0]; // Fallback au premier email
    }

    const data = await response.json();
    const selectedEmail = (data.choices?.[0]?.message?.content ?? "").trim();

    // Vérifier que l'email sélectionné est dans la liste
    if (emails.includes(selectedEmail)) {
      console.log(`[AI] ✓ Selected email: ${selectedEmail}`);
      return selectedEmail;
    }

    // Fallback si l'IA a retourné quelque chose d'invalide
    console.warn(`[AI] Invalid selection, falling back to first email`);
    return emails[0];
  } catch (error) {
    console.error(`[AI] Error selecting email:`, error instanceof Error ? error.message : String(error));
    return emails[0]; // Fallback au premier email
  }
}

async function findCompanyEmailsWithAI({
  nom,
  ville,
  siren,
  code_ape,
  libelle_ape,
  adresse,
}: CompanyRow): Promise<{ website: string | null; emails: string[] }> {
  if (!LOVABLE_API_KEY) {
    console.error("[AI] LOVABLE_API_KEY not configured");
    return { website: null, emails: [] };
  }

  const prompt = `Tu es un expert en recherche d'informations d'entreprises sur internet.

ENTREPRISE À RECHERCHER:
- Nom: ${sanitizeForAI(nom)}
- Ville: ${sanitizeForAI(ville)}
- SIREN: ${sanitizeForAI(siren)}
- Code APE: ${sanitizeForAI(code_ape)}
- Secteur d'activité: ${sanitizeForAI(libelle_ape)}
- Adresse: ${sanitizeForAI(adresse)}

MISSION:
1. Fais une recherche web pour trouver le SITE WEB OFFICIEL de cette entreprise
2. Une fois le site trouvé, extrait TOUS les emails de contact professionnels présents (contact@, info@, commercial@, rh@, recrutement@, bonjour@, hello@, etc.)

RÈGLES:
- Cherche d'abord avec le nom exact + la ville
- Si pas de résultat, cherche avec le nom + SIREN
- Si pas de résultat, cherche avec le nom + secteur d'activité
- Privilégie les sites officiels (pas LinkedIn, Facebook, ou annuaires)
- Extrait TOUS les emails trouvés (sauf noreply@, no-reply@, newsletter@, unsubscribe@)
- Vérifie que les emails sont valides (format email@domaine.extension)

RÉPONSE ATTENDUE (JSON strict):
{
  "website": "https://site-officiel.fr",
  "emails": ["contact@example.fr", "info@example.fr"],
  "confidence": "high" | "medium" | "low"
}

Si aucun site trouvé:
{
  "website": null,
  "emails": [],
  "confidence": "none"
}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Tu es un assistant de recherche d'informations d'entreprises. Tu utilises la recherche web pour trouver des sites officiels et extraire des emails. Tu réponds UNIQUEMENT en JSON valide.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI] Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit atteint. Attendez quelques minutes avant de relancer.");
      }
      if (response.status === 402) {
        throw new Error("Crédits Lovable AI épuisés. Rechargez vos crédits.");
      }
      
      return { website: null, emails: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";

    console.log(`[AI] Raw response for ${nom}:`, content.slice(0, 500));

    // Parse le JSON
    let parsed;
    try {
      // Nettoyer le contenu si nécessaire
      const cleaned = content
        .replace(/```json\n?/g, "")
        .replace(/```/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("[AI] JSON parse error:", e);
      // Essayer d'extraire le JSON avec regex
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return { website: null, emails: [] };
      }
    }

    const website = parsed.website || null;
    const emails: string[] = Array.isArray(parsed.emails) ? parsed.emails : [];

    // Valider les emails (format basique)
    const validEmails = emails.filter((e) => 
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && 
      !/no-?reply|newsletter|unsubscribe/i.test(e)
    );

    console.log(`[AI] ✓ ${nom}: website=${website ? "found" : "not found"}, emails=${validEmails.length}`);

    return {
      website,
      emails: [...new Set(validEmails)], // Dédupliquer
    };
  } catch (error) {
    console.error(`[AI] Error for ${nom}:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Validate input and check rate limit
    const requestBody = await req.json().catch(() => ({}));
    const validationResult = requestSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid input", 
          details: validationResult.error.issues.map(i => i.message) 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { maxCompanies } = validationResult.data;

    // Check rate limit (stricter for AI-heavy operations)
    await checkRateLimit(supabase, user.id, 'find-company-emails', 10);

    // Récupérer les entreprises avec toutes les infos
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, nom, ville, siren, code_ape, libelle_ape, adresse")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(maxCompanies);

    if (companiesError) throw companiesError;

    if (!companies || companies.length === 0) {
      return new Response(
        JSON.stringify({
          message: "Aucune entreprise trouvée. Ajoutez des entreprises depuis l'onglet Recherche.",
          processed: 0,
          total: 0,
          emailsFound: 0,
          results: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[SEARCH] Starting AI-powered search for ${companies.length} companies`);

    let processed = 0;
    let emailsFound = 0;
    const results: any[] = [];

    for (const company of companies as CompanyRow[]) {
      try {
        console.log(`[SEARCH] Processing: ${company.nom}`);

        const { website, emails } = await findCompanyEmailsWithAI(company);

        if (!website) {
          results.push({
            company: company.nom,
            status: "no-website",
            error: "Site web introuvable malgré la recherche web",
          });
          processed++;
          await delay(2000);
          continue;
        }

        // Sélectionner le meilleur email avec l'IA
        let selectedEmail = null;
        if (emails.length > 0) {
          selectedEmail = await selectBestEmailWithAI(emails);
          console.log(`[AI] Selected email for ${company.nom}: ${selectedEmail}`);
        }

        // Mettre à jour la BDD
        const updates: Record<string, any> = { 
          website_url: website,
          status: 'not sent'
        };
        if (emails.length > 0) {
          updates.emails = emails;
          updates.selected_email = selectedEmail;
          emailsFound += emails.length;
        }

        const { error: updateError } = await supabase
          .from("companies")
          .update(updates)
          .eq("id", company.id);

        if (updateError) {
          console.error("[DB] Update error:", updateError.message);
        }

        results.push({
          company: company.nom,
          status: "success",
          website,
          emails,
          confidence: emails.length > 0 ? "high" : "medium",
        });

        processed++;
        await delay(1500); // Pause entre entreprises

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
        console.error(`[PROCESS] Error for ${company.nom}:`, errorMessage);
        
        results.push({
          company: company.nom,
          status: "error",
          error: errorMessage,
        });
        
        processed++;
        
        // Si rate limit, arrêter
        if (errorMessage.includes("Rate limit") || errorMessage.includes("Crédits")) {
          console.error("[SEARCH] Stopping due to API limits");
          break;
        }
      }
    }

    console.log(`[SEARCH] ✓ Completed: ${processed}/${companies.length}, ${emailsFound} emails found`);

    return new Response(
      JSON.stringify({
        message: "Recherche d'emails terminée",
        processed,
        total: companies.length,
        emailsFound,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[MAIN]", error instanceof Error ? error.message : String(error));
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});