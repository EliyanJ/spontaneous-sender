import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  codeApe: z.string().max(10).optional(),
  location: z.string().max(100).optional(),
  nombre: z.number().int().min(1).max(200),
  userId: z.string().uuid()
});

function sanitizeError(error: any): { message: string; code?: string } {
  return {
    message: error.message || "Unknown error",
    code: error.code || error.name
  };
}

function mapToUserError(error: any): string {
  const msg = error.message?.toLowerCase() || "";
  if (msg.includes("auth") || msg.includes("unauthorized")) return "Non autorisé";
  if (msg.includes("api") || msg.includes("fetch")) return "Erreur lors de la recherche";
  return "Une erreur est survenue";
}

// Configuration
const BASE_URL = 'https://recherche-entreprises.api.gouv.fr';
const DELAY_BETWEEN_REQUESTS = 150; // ms
const MULTIPLIER = 6; // Récupérer 6x plus pour randomisation
const MAX_PER_PAGE = 25;
const MAX_API_PAGE = 300;
const ARRONDISSEMENTS_COUNT = 3;

// Villes avec arrondissements (codes postaux à 5 chiffres)
const VILLES_ARRONDISSEMENTS: Record<string, string[]> = {
  'paris': Array.from({ length: 20 }, (_, i) => `750${(i + 1).toString().padStart(2, '0')}`),
  'lyon': Array.from({ length: 9 }, (_, i) => `6900${i + 1}`),
  'marseille': Array.from({ length: 16 }, (_, i) => `130${(i + 1).toString().padStart(2, '0')}`),
};

function normalizeVille(ville: string): string {
  return ville.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function selectRandomArrondissements(codePostaux: string[], count: number = 3): string[] {
  if (codePostaux.length <= count) return codePostaux;
  const shuffled = [...codePostaux];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateRandomPageNumbers(count: number, maxPage: number): number[] {
  const allPages = Array.from({ length: maxPage }, (_, i) => i + 1);
  const shuffled = shuffleArray(allPages);
  return shuffled.slice(0, count);
}

function formatCodeApe(code: string): string {
  if (!code) return '';
  const cleaned = code.replace(/[.\s]/g, '');
  if (cleaned.length >= 4) {
    return `${cleaned.substring(0, 2)}.${cleaned.substring(2, 4)}${cleaned.substring(4) || 'Z'}`;
  }
  return code;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Valider le corps de la requête
    const rawBody = await req.json();
    const validationResult = requestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error("[VALIDATION]", validationResult.error.issues);
      return new Response(
        JSON.stringify({ error: "Invalid request format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { codeApe, location, nombre = 20, userId } = validationResult.data;

    console.log('Recherche:', { codeApe, location, nombre, userId });

    // Récupérer la blacklist de l'utilisateur
    let blacklistedSirens: string[] = [];
    if (userId) {
      const { data } = await supabase
        .from('user_company_blacklist')
        .select('company_siren')
        .eq('user_id', userId);
      
      if (data) {
        blacklistedSirens = data.map(b => b.company_siren);
        console.log(`Blacklist: ${blacklistedSirens.length} entreprises`);
      }
    }

    // Construction des paramètres
    const params: any = {
      per_page: MAX_PER_PAGE.toString(),
      page: '1',
      est_entrepreneur_individuel: 'false',
      etat_administratif: 'A',
      tranche_effectif_salarie: '12,21,22,31,32,41,42,51,52,53', // Min 20 salariés
    };

    // Gestion du code APE
    if (codeApe) {
      params.activite_principale = formatCodeApe(codeApe);
    }

    // Gestion de la localisation STRICTE (tous les arrondissements)
    if (location) {
      const normalized = normalizeVille(location);
      
      if (/^\d{5}$/.test(location)) {
        // Code postal exact
        params.code_postal = location;
      } else if (VILLES_ARRONDISSEMENTS[normalized]) {
        // Ville avec arrondissements: TOUS les arrondissements (pas aléatoire)
        const arrondissements = VILLES_ARRONDISSEMENTS[normalized];
        params.code_postal = arrondissements.join(',');
        console.log(`Filtrage strict sur tous les arrondissements: ${arrondissements.length} codes postaux`);
      } else {
        // Ville normale: recherche par nom de commune
        params.commune = location;
      }
    }

    // Calcul du nombre d'entreprises à récupérer
    const fetchSize = nombre * MULTIPLIER;
    console.log(`Récupération de ${fetchSize} entreprises (×${MULTIPLIER})`);

    // Probe API pour connaître le total
    const probeUrl = `${BASE_URL}/search?${new URLSearchParams(params)}`;
    const probeResponse = await fetch(probeUrl);
    
    if (!probeResponse.ok) {
      throw new Error(`API probe error: ${probeResponse.status}`);
    }

    const probeData = await probeResponse.json();
    const totalResults = probeData.total_results || 0;
    const totalPages = Math.ceil(totalResults / MAX_PER_PAGE);
    const maxAvailablePages = Math.min(totalPages, MAX_API_PAGE);

    console.log(`Total: ${totalResults} entreprises, ${maxAvailablePages} pages disponibles`);

    if (totalResults === 0) {
      return new Response(JSON.stringify({
        success: true,
        count: 0,
        data: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Génération des numéros de pages aléatoires
    const pagesNeeded = Math.ceil(fetchSize / MAX_PER_PAGE);
    const randomPages = generateRandomPageNumbers(
      Math.min(pagesNeeded, maxAvailablePages),
      maxAvailablePages
    );

    console.log(`Pages aléatoires: ${randomPages.join(', ')}`);

    // Récupération des données
    let allCompanies: any[] = [];
    
    for (const pageNum of randomPages) {
      params.page = pageNum.toString();
      const url = `${BASE_URL}/search?${new URLSearchParams(params)}`;
      
      let retries = 0;
      let success = false;
      
      while (!success && retries < 3) {
        try {
          const response = await fetch(url);
          
          if (response.status === 429) {
            console.log('Rate limit, attente 1s...');
            await sleep(1000);
            retries++;
            continue;
          }
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            allCompanies = [...allCompanies, ...data.results];
          }
          
          success = true;
        } catch (error: any) {
          const safeError = sanitizeError(error);
          console.error(`[PAGE_ERROR] ${pageNum}:`, safeError);
          retries++;
          if (retries < 3) await sleep(500);
        }
      }
      
      // Délai entre requêtes
      if (pageNum !== randomPages[randomPages.length - 1]) {
        await sleep(DELAY_BETWEEN_REQUESTS);
      }
    }

    console.log(`Récupéré: ${allCompanies.length} entreprises brutes`);

    // Filtrage blacklist
    let filtered = allCompanies.filter(c => !blacklistedSirens.includes(c.siren));
    console.log(`Après blacklist: ${filtered.length} entreprises`);

    // Randomisation finale (Fisher-Yates)
    filtered = shuffleArray(filtered);
    const final = filtered.slice(0, nombre);

    // Formatage avec recherche de l'établissement dans la localisation demandée
    const formatted = final.map(c => {
      let etablissement = c.siege;
      
      // Si on a filtré par localisation, chercher l'établissement correspondant
      if (location && params.code_postal) {
        const allowedPostalCodes = params.code_postal.split(',').map((cp: string) => cp.trim());
        
        // Chercher dans matching_etablissements un établissement avec le bon code postal
        if (c.matching_etablissements && Array.isArray(c.matching_etablissements)) {
          const matching = c.matching_etablissements.find((etab: any) => 
            allowedPostalCodes.includes(etab.code_postal)
          );
          if (matching) etablissement = matching;
        }
        
        // Sinon vérifier si le siège correspond
        if (!allowedPostalCodes.includes(etablissement?.code_postal || '')) {
          // Si le siège ne correspond pas, on skip cette entreprise
          return null;
        }
      }
      
      return {
        siren: c.siren,
        siret: etablissement?.siret || c.siren,
        nom: c.nom_complet || c.nom_raison_sociale || '',
        nom_commercial: etablissement?.nom_commercial || '',
        adresse: etablissement?.adresse || '',
        code_postal: etablissement?.code_postal || '',
        ville: etablissement?.libelle_commune || '',
        code_ape: (etablissement?.activite_principale && typeof etablissement.activite_principale === 'object')
          ? (etablissement.activite_principale.code || '')
          : (typeof c.activite_principale === 'object' ? (c.activite_principale?.code || '') : (c.activite_principale || '')),
        libelle_ape: (etablissement?.activite_principale && typeof etablissement.activite_principale === 'object')
          ? (etablissement.activite_principale.libelle || etablissement.libelle_activite_principale || '')
          : (etablissement?.libelle_activite_principale || (typeof c.activite_principale === 'object'
            ? (c.activite_principale?.libelle || c.libelle_activite_principale || '')
            : (c.libelle_activite_principale || ''))),
        effectif_code: c.tranche_effectif_salarie || '',
        date_creation: c.date_creation || '',
        nature_juridique: typeof c.nature_juridique_entreprise === 'object'
          ? c.nature_juridique_entreprise?.code
          : c.nature_juridique_entreprise || '',
        categorie_entreprise: c.categorie_entreprise || '',
        nombre_etablissements: c.nombre_etablissements || 0,
        dirigeant_nom: c.dirigeants?.[0]?.nom || '',
        dirigeant_prenoms: c.dirigeants?.[0]?.prenoms || '',
        dirigeant_fonction: c.dirigeants?.[0]?.qualite || '',
      };
    }).filter(c => c !== null);

    console.log(`Résultat final: ${formatted.length} entreprises`);

    return new Response(JSON.stringify({
      success: true,
      count: formatted.length,
      data: formatted
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    const safeError = sanitizeError(error);
    console.error('[INTERNAL]', safeError);
    return new Response(JSON.stringify({
      success: false,
      error: mapToUserError(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
