import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { 
      codeApe, 
      location, 
      nombre = 20,
      userId 
    } = await req.json();

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

    // Gestion de la localisation avec randomisation
    if (location) {
      const normalized = normalizeVille(location);
      
      if (/^\d{5}$/.test(location)) {
        params.code_postal = location;
      } else if (VILLES_ARRONDISSEMENTS[normalized]) {
        const arrondissements = VILLES_ARRONDISSEMENTS[normalized];
        const selected = selectRandomArrondissements(arrondissements, ARRONDISSEMENTS_COUNT);
        params.code_postal = selected.join(',');
        console.log(`Arrondissements sélectionnés: ${selected.join(', ')}`);
      } else {
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
        } catch (error) {
          console.error(`Erreur page ${pageNum}:`, error);
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

    // Formatage
    const formatted = final.map(c => ({
      siren: c.siren,
      siret: c.siege?.siret || c.siren,
      nom: c.nom_complet || c.nom_raison_sociale || '',
      nom_commercial: c.siege?.nom_commercial || '',
      adresse: c.siege?.adresse || '',
      code_postal: c.siege?.code_postal || '',
      ville: c.siege?.libelle_commune || '',
      code_ape: typeof c.activite_principale === 'object' 
        ? c.activite_principale?.code 
        : c.activite_principale || '',
      libelle_ape: c.libelle_activite_principale || '',
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
    }));

    console.log(`Résultat final: ${formatted.length} entreprises`);

    return new Response(JSON.stringify({
      success: true,
      count: formatted.length,
      data: formatted
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erreur search-companies:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
