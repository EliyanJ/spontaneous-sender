import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

// ============ RECHERCHE D'EMAILS VIA IA ============

interface AIEmailResponse {
  entreprise: string;
  site_web: string | null;
  domaine?: string;
  emails: {
    contact_general: string[];
    rh: string[];
    direction: string[];
    autres: string[];
  };
  details?: Array<{
    email: string;
    type: string;
    source: string;
    contexte: string;
  }>;
  stats?: {
    pages_consultees: number;
    emails_trouves: number;
  };
  status: string;
  message?: string;
  erreur?: string;
}

async function findEmailsWithAI(companyName: string): Promise<AIEmailResponse> {
  const systemPrompt = `MISSION
Tu es un assistant spécialisé dans la recherche d'informations de contact d'entreprises. À partir du nom commercial d'une entreprise, tu dois trouver son site web officiel et extraire tous les emails de contact pertinents (contact général, RH, direction).

PROCESSUS EN 2 ÉTAPES
ÉTAPE 1 : RECHERCHE DU SITE WEB OFFICIEL
Objectif : Trouver l'URL du site web officiel de l'entreprise.
Instructions :
- Effectue une recherche web pour trouver le site officiel de l'entreprise
- Vérifie que c'est bien le site corporate de l'entreprise (pas un réseau social, pas un annuaire)
- Exclus automatiquement : LinkedIn, Facebook, Twitter, Instagram, Wikipedia, Annuaires (PagesJaunes, societe.com, Verif.com, Kompass, Infogreffe), Sites d'avis (Trustpilot, Google Reviews)

ÉTAPE 2 : EXTRACTION DES EMAILS DE CONTACT
Objectif : Une fois le site trouvé, extraire tous les emails pertinents en visitant les pages clés.
Pages à consulter (dans l'ordre de priorité) :
🇫🇷 Si site français (.fr, .be, .ch) :
- Page contact : /contact, /nous-contacter, /contactez-nous
- Page RH : /recrutement, /carrieres, /rejoignez-nous, /jobs, /rh
- Page équipe : /equipe, /notre-equipe, /direction, /a-propos
- Mentions légales : /mentions-legales
- Footer de la homepage

🇬🇧 Si site international (.com, .io, .co.uk) :
- Page contact : /contact, /contact-us, /get-in-touch
- Page RH : /careers, /jobs, /join-us, /recruitment, /hr
- Page équipe : /team, /about-us, /leadership, /management
- Footer de la homepage

Instructions d'extraction :
- Visite chaque page mentionnée (ignore les erreurs 404, continue avec les autres)
- Cherche TOUS les emails présents sur ces pages
- Filtre automatiquement : EXCLURE noreply@, no-reply@, donotreply@. VÉRIFIER que le domaine de l'email correspond au site (ou domaine proche)
- Catégorise chaque email trouvé :
  * TYPE "contact_general" si l'email contient : contact@, info@, hello@, bonjour@, accueil@, support@, service@ OU trouvé sur page /contact ou dans footer
  * TYPE "rh" si l'email contient : rh@, recrutement@, careers@, jobs@, hr@, recruitment@, emploi@ OU trouvé sur page /recrutement, /careers, /jobs
  * TYPE "direction" si l'email contient : direction@, ceo@, dg@, president@ OU format prenom.nom@ avec mention de titre
  * TYPE "autre" si aucun des critères ci-dessus

FORMAT DE RÉPONSE FINAL
Réponds UNIQUEMENT avec ce JSON (rien d'autre) :
{
  "entreprise": "Nom Commercial",
  "site_web": "https://entreprise.fr",
  "domaine": "entreprise.fr",
  "emails": {
    "contact_general": ["contact@entreprise.fr"],
    "rh": ["recrutement@entreprise.fr"],
    "direction": ["ceo@entreprise.fr"],
    "autres": []
  },
  "details": [
    {
      "email": "contact@entreprise.fr",
      "type": "contact_general",
      "source": "Page /contact",
      "contexte": "Pour toute question"
    }
  ],
  "stats": {
    "pages_consultees": 8,
    "emails_trouves": 5
  },
  "status": "success"
}

Si aucun email trouvé :
{
  "entreprise": "Nom Commercial",
  "site_web": "https://entreprise.fr",
  "domaine": "entreprise.fr",
  "emails": {
    "contact_general": [],
    "rh": [],
    "direction": [],
    "autres": []
  },
  "message": "Site trouvé mais aucun email public détecté. L'entreprise utilise probablement un formulaire de contact.",
  "status": "no_emails_found"
}

Si site introuvable :
{
  "entreprise": "Nom Commercial",
  "site_web": null,
  "erreur": "Site web officiel introuvable",
  "status": "site_not_found"
}

RÈGLES IMPORTANTES :
✅ Chercher méthodiquement sur toutes les pages importantes
✅ Vérifier que les emails correspondent bien au domaine du site
✅ Catégoriser intelligemment selon le contexte
✅ Retourner TOUS les emails pertinents trouvés
❌ Ne JAMAIS inventer ou deviner des emails
❌ Ne pas retourner des emails de domaines différents
❌ Ne pas inclure les réseaux sociaux comme "site web"
❌ Ne pas retourner les emails noreply@

GESTION DES CAS PARTICULIERS
CAS 1 : Entreprise avec plusieurs sites → Privilégier le site corporate/institutionnel principal
CAS 2 : Site multilingue → Consulter les pages en français ET en anglais si disponibles
CAS 3 : Formulaire de contact uniquement → Mentionner dans le message qu'aucun email public n'est disponible
CAS 4 : Emails personnels (prenom.nom@) → Les inclure UNIQUEMENT si accompagnés d'un titre/poste (CEO, RH, etc.)`;

  const userPrompt = `Trouve le site web et les emails de contact pour l'entreprise : "${companyName}"`;

  console.log(`🤖 Appel à l'IA pour : ${companyName}`);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': `${ANTHROPIC_API_KEY}`,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-7-sonnet-20250219',
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur API IA (${response.status}):`, errorText);
      throw new Error(`API IA error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponseText = Array.isArray(data.content) ? data.content[0]?.text : undefined;
    
    if (!aiResponseText || typeof aiResponseText !== 'string') {
      throw new Error('Pas de réponse de l\'IA');
    }

    console.log(`✅ Réponse IA reçue pour ${companyName}`);
    
    // Parser le JSON de la réponse
    const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Pas de JSON trouvé dans la réponse:', aiResponseText);
      throw new Error('Format de réponse invalide');
    }

    const result: AIEmailResponse = JSON.parse(jsonMatch[0]);
    return result;

  } catch (error: any) {
    console.error(`❌ Erreur lors de la recherche IA pour ${companyName}:`, error);
    return {
      entreprise: companyName,
      site_web: null,
      emails: {
        contact_general: [],
        rh: [],
        direction: [],
        autres: []
      },
      status: 'error',
      erreur: error?.message || 'Erreur inconnue'
    };
  }
}

// ============ MAIN HANDLER ============

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch recent companies for this user (process in batches)
    const { data: companies, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (fetchError) throw fetchError;
    if (!companies || companies.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No companies to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎯 Traitement de ${companies.length} entreprises`);
    let processedCount = 0;
    let failedCount = 0;
    let totalEmailsFound = 0;

    for (const company of companies) {
      try {
        console.log(`\n=== Traitement: ${company.nom} ===`);
        
        // Recherche via IA
        const aiResult = await findEmailsWithAI(company.nom);
        
        if (aiResult.status === 'success' && aiResult.site_web) {
          // Préparer les données pour la DB
          const flatEmails = Array.from(new Set([
            ...(aiResult.emails.contact_general || []),
            ...(aiResult.emails.rh || []),
            ...(aiResult.emails.direction || []),
            ...(aiResult.emails.autres || []),
          ]));

          // Stocker dans la base de données
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              website_url: aiResult.site_web,
              emails: flatEmails,
            })
            .eq('id', company.id);

          if (updateError) {
            console.error(`❌ Échec mise à jour ${company.nom}:`, updateError);
            failedCount++;
          } else {
            const totalEmails = flatEmails.length;
            console.log(`✅ ${company.nom}: ${totalEmails} emails trouvés`);
            if (aiResult.stats) {
              console.log(`   📊 ${aiResult.stats.pages_consultees} pages consultées`);
            }
            totalEmailsFound += totalEmails;
            processedCount++;
          }
        } else {
          console.log(`⚠️ ${company.nom}: ${aiResult.erreur || aiResult.message || 'Site non trouvé'}`);
          
          // Stocker quand même pour éviter de re-traiter
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              website_url: aiResult.site_web,
              emails: [],
            })
            .eq('id', company.id);
            
          if (!updateError) processedCount++;
        }
        
        // Délai entre les appels pour éviter le rate limiting
        await delay(2000);
        
      } catch (error: any) {
        console.error(`❌ Erreur traitement ${company.nom}:`, error);
        failedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Recherche d\'emails terminée',
        processed: processedCount,
        failed: failedCount,
        total: companies.length,
        companiesUpdated: processedCount,
        totalEmailsFound
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erreur dans find-company-emails:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
