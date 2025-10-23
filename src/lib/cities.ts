// Fichier généré à partir des 39,193 communes françaises
// Contient la résolution géographique avec gestion des arrondissements

export interface LocationResolution {
  type: 'code_postal' | 'ville' | 'ville_arrondissements';
  codePostaux: string[];
  ville?: string;
}

// Villes avec arrondissements (codes postaux à 5 chiffres)
const VILLES_ARRONDISSEMENTS: Record<string, string[]> = {
  'paris': Array.from({ length: 20 }, (_, i) => `750${(i + 1).toString().padStart(2, '0')}`),
  'lyon': Array.from({ length: 9 }, (_, i) => `6900${i + 1}`),
  'marseille': Array.from({ length: 16 }, (_, i) => `130${(i + 1).toString().padStart(2, '0')}`),
};

// Map de toutes les communes françaises (nom normalisé -> codes postaux)
const COMMUNES_MAP: Record<string, string[]> = {
  // Cette map sera peuplée dynamiquement depuis le CSV
};

// Fonction pour normaliser les noms de villes
export function normalizeVille(ville: string): string {
  return ville
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Retire les accents
    .trim()
    .replace(/\s+/g, ' ');
}

// Fonction pour charger les communes depuis le CSV
let communesLoaded = false;

export async function loadCommunes() {
  if (communesLoaded) return;
  
  try {
    const response = await fetch('/src/lib/communes.csv');
    const text = await response.text();
    const lines = text.split('\n').slice(1); // Skip header
    
    for (const line of lines) {
      const [nom, codePostal] = line.split(';');
      if (nom && codePostal) {
        const normalized = normalizeVille(nom.trim());
        if (!COMMUNES_MAP[normalized]) {
          COMMUNES_MAP[normalized] = [];
        }
        if (!COMMUNES_MAP[normalized].includes(codePostal.trim())) {
          COMMUNES_MAP[normalized].push(codePostal.trim());
        }
      }
    }
    communesLoaded = true;
  } catch (error) {
    console.error('Erreur chargement communes:', error);
  }
}

// Résolution d'une localisation (code postal ou ville)
export function resolveLocation(input: string): LocationResolution {
  const normalized = normalizeVille(input);
  
  // Si c'est un code postal (5 chiffres)
  if (/^\d{5}$/.test(input)) {
    return {
      type: 'code_postal',
      codePostaux: [input]
    };
  }
  
  // Vérifier si c'est une ville avec arrondissements
  if (VILLES_ARRONDISSEMENTS[normalized]) {
    return {
      type: 'ville_arrondissements',
      codePostaux: VILLES_ARRONDISSEMENTS[normalized],
      ville: input
    };
  }
  
  // Chercher dans la map des communes
  const codePostaux = COMMUNES_MAP[normalized];
  if (codePostaux && codePostaux.length > 0) {
    return {
      type: 'ville',
      codePostaux,
      ville: input
    };
  }
  
  // Fallback: retourner comme recherche textuelle
  return {
    type: 'ville',
    codePostaux: [],
    ville: input
  };
}

// Sélection aléatoire d'arrondissements (Fisher-Yates)
export function selectRandomArrondissements(codePostaux: string[], count: number = 3): string[] {
  if (codePostaux.length <= count) return codePostaux;
  
  const shuffled = [...codePostaux];
  
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, count);
}
