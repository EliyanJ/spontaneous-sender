import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  codeApe: z.string().max(10).optional(),
  locations: z.array(z.string().max(100)).optional(), // Array pour multi-villes
  location: z.string().max(100).optional(), // Backward compatibility
  nombre: z.number().int().min(1).max(200),
  userId: z.string().uuid(),
  minEmployees: z.number().int().min(0).optional().default(5),
  maxEmployees: z.number().int().min(1).optional().default(100)
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

// Régions avec leurs départements (codes à 2 chiffres)
const REGIONS: Record<string, string[]> = {
  'ile-de-france': ['75', '77', '78', '91', '92', '93', '94', '95'],
  'provence-alpes-cote d\'azur': ['04', '05', '06', '13', '83', '84'],
  'auvergne-rhone-alpes': ['01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74'],
  'nouvelle-aquitaine': ['16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87'],
  'occitanie': ['09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82'],
  'hauts-de-france': ['02', '59', '60', '62', '80'],
  'grand est': ['08', '10', '51', '52', '54', '55', '57', '67', '68', '88'],
  'pays de la loire': ['44', '49', '53', '72', '85'],
  'bretagne': ['22', '29', '35', '56'],
  'normandie': ['14', '27', '50', '61', '76'],
  'bourgogne-franche-comte': ['21', '25', '39', '58', '70', '71', '89', '90'],
  'centre-val de loire': ['18', '28', '36', '37', '41', '45'],
};

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

// Mapper les limites de salariés vers les codes de tranche
// Codes valides INSEE: 00=0, 01=1-2, 02=3-5, 03=6-9, 11=10-19, 12=20-49, 21=50-99, 22=100-199, 32=200-499, 41=500-999, 42=1000-1999, 51=2000-4999, 52=5000-9999, 53=10000+
function getEmployeeTranches(minEmployees: number, maxEmployees?: number): string {
  // Toutes les tranches avec leurs bornes (codes INSEE valides uniquement)
  const allTranches = [
    { code: '00', min: 0, max: 0 },
    { code: '01', min: 1, max: 2 },
    { code: '02', min: 3, max: 5 },
    { code: '03', min: 6, max: 9 },
    { code: '11', min: 10, max: 19 },
    { code: '12', min: 20, max: 49 },
    { code: '21', min: 50, max: 99 },
    { code: '22', min: 100, max: 199 },
    { code: '32', min: 200, max: 499 },
    { code: '41', min: 500, max: 999 },
    { code: '42', min: 1000, max: 1999 },
    { code: '51', min: 2000, max: 4999 },
    { code: '52', min: 5000, max: 9999 },
    { code: '53', min: 10000, max: Infinity },
  ];
  
  // Filtrer les tranches qui correspondent aux critères min/max
  const matchingTranches = allTranches.filter(t => {
    const trancheOverlapsMin = t.max >= minEmployees;
    const trancheOverlapsMax = maxEmployees ? t.min <= maxEmployees : true;
    return trancheOverlapsMin && trancheOverlapsMax;
  });
  
  if (matchingTranches.length === 0) {
    // Fallback: 5-99 (tranches 02, 03, 11, 12, 21)
    return '02,03,11,12,21';
  }
  
  console.log(`[Tranches] min=${minEmployees}, max=${maxEmployees} → ${matchingTranches.map(t => t.code).join(',')}`);
  return matchingTranches.map(t => t.code).join(',');
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

    const { codeApe, locations, location, nombre = 20, userId, minEmployees = 5, maxEmployees = 100 } = validationResult.data;
    
    // Support multi-villes
    const searchLocations = locations && locations.length > 0 ? locations : (location ? [location] : []);

    console.log('Recherche:', { codeApe, locations: searchLocations, nombre, userId, minEmployees, maxEmployees });

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
      tranche_effectif_salarie: getEmployeeTranches(minEmployees, maxEmployees),
    };

    // Gestion du code APE
    if (codeApe) {
      params.activite_principale = formatCodeApe(codeApe);
    }

    // Gestion multi-localisations
    if (searchLocations.length > 0) {
      const allPostalCodes: string[] = [];
      const textSearchTerms: string[] = [];

      for (const loc of searchLocations) {
        const normalized = normalizeVille(loc);
        
        if (/^\d{5}$/.test(loc)) {
          // Code postal exact à 5 chiffres
          allPostalCodes.push(loc);
        } else if (/^\d{2}$/.test(loc)) {
          // Code département à 2 chiffres - générer tous les codes postaux du département
          // Pour chaque département, on couvre tous les codes postaux possibles (XX000-XX999)
          // L'API accepte les codes postaux, donc on génère des codes représentatifs
          for (let i = 0; i < 1000; i += 100) {
            allPostalCodes.push(`${loc}${i.toString().padStart(3, '0')}`);
          }
        } else if (REGIONS[normalized]) {
          // Région : utiliser tous les départements de la région
          const departments = REGIONS[normalized];
          for (const dept of departments) {
            // Pour chaque département, générer des codes postaux représentatifs
            for (let i = 0; i < 1000; i += 100) {
              allPostalCodes.push(`${dept}${i.toString().padStart(3, '0')}`);
            }
          }
          console.log(`Région détectée: ${loc} → ${departments.length} départements`);
        } else if (VILLES_ARRONDISSEMENTS[normalized]) {
          // Ville avec arrondissements: TOUS les arrondissements
          const arrondissements = VILLES_ARRONDISSEMENTS[normalized];
          allPostalCodes.push(...arrondissements);
        } else {
          // Ville normale pour recherche textuelle
          textSearchTerms.push(loc);
        }
      }

      if (allPostalCodes.length > 0) {
        params.code_postal = allPostalCodes.join(',');
        console.log(`Multi-localisation: ${allPostalCodes.length} codes postaux`);
      }

      if (textSearchTerms.length > 0) {
        params.q = textSearchTerms.join(' OR ');
        console.log(`Recherche textuelle multi-villes: ${textSearchTerms.join(', ')}`);
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
