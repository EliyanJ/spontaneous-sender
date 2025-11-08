import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache pour l'access token
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken() {
  const now = Date.now();
  
  // Si on a un token en cache et qu'il n'est pas expiré, on le retourne
  if (cachedToken && cachedToken.expiresAt > now) {
    console.log("Using cached token");
    return cachedToken.token;
  }

  console.log("Fetching new token");
  const clientId = Deno.env.get('FRANCE_TRAVAIL_CLIENT_ID');
  const clientSecret = Deno.env.get('FRANCE_TRAVAIL_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('France Travail credentials not configured');
  }

  const scope = Deno.env.get('FRANCE_TRAVAIL_SCOPE') || 'api_offresdemploiv2 o2dsoffre';
  const tokenUrl = 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire';

  // Try with HTTP Basic first (most compatible), then fall back to body credentials
  const basicAuth = 'Basic ' + btoa(`${clientId}:${clientSecret}`);

  const requestTokenWithBasic = () =>
    fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': basicAuth,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope,
      }).toString(),
    });

  const requestTokenWithBody = () =>
    fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope,
      }).toString(),
    });

  let response = await requestTokenWithBasic();

  // If we didn't get JSON (often HTML login page), try the alternative form
  let contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Token (basic) unexpected:', response.status, contentType, text.substring(0, 200));
    response = await requestTokenWithBody();
    contentType = response.headers.get('content-type') || '';
  }

  if (!response.ok) {
    const error = await response.text();
    console.error('Token error:', error);
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  if (!contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Unexpected token response type:', contentType, text.substring(0, 200));
    throw new Error('France Travail token endpoint returned non-JSON. Check credentials, scopes, and that your application is approved for access.');
  }

  const data = await response.json();
  
  // Cache le token (expire dans expires_in secondes, on retire 60s de marge)
  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'search';

    if (action === 'search') {
      const motsCles = url.searchParams.get('motsCles') || '';
      const location = url.searchParams.get('location') || '';
      const typeContrat = url.searchParams.get('typeContrat') || '';
      const distance = url.searchParams.get('distance') || '10';
      const range = url.searchParams.get('range') || '0-149';

      const token = await getAccessToken();

      // Si on a un code postal/ville, le convertir en coordonnées GPS + code INSEE
      let latitude = '';
      let longitude = '';
      let departement = '';
      
      if (location) {
        try {
          // Géocodage avec type=municipality pour prioriser les communes
          const geocodeUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(location)}&type=municipality&limit=1`;
          console.log('Geocoding:', geocodeUrl);
          
          const geocodeResponse = await fetch(geocodeUrl);
          if (geocodeResponse.ok) {
            const geocodeData = await geocodeResponse.json();
            if (geocodeData.features && geocodeData.features.length > 0) {
              const feature = geocodeData.features[0];
              const coords = feature.geometry.coordinates;
              longitude = coords[0].toString();
              latitude = coords[1].toString();
              
              // Extraire le département depuis le code INSEE (2 premiers chiffres)
              const citycode = feature.properties?.citycode || '';
              if (citycode.length >= 2) {
                departement = citycode.substring(0, 2);
              }
              
              console.log('Geo resolved:', { latitude, longitude, departement, citycode });
            }
          }
        } catch (error) {
          console.error('Geocoding error:', error);
        }
      }

      // Construire les paramètres de recherche
      const searchParams = new URLSearchParams();
      if (motsCles) searchParams.append('motsCles', motsCles);
      
      // Utiliser les coordonnées GPS pour une recherche localisée
      if (latitude && longitude) {
        searchParams.append('latitude', latitude);
        searchParams.append('longitude', longitude);
      }
      
      // Ajouter le département pour affiner les résultats
      if (departement) {
        searchParams.append('departement', departement);
      }
      
      if (typeContrat) searchParams.append('typeContrat', typeContrat);
      searchParams.append('distance', distance);
      searchParams.append('range', range);
      
      // Tri par distance croissante pour prioriser les offres proches
      if (latitude && longitude) {
        searchParams.append('sort', '1'); // 1 = tri par distance croissante
      }

      const apiUrl = `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${searchParams.toString()}`;
      
      console.log('Searching offers:', apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('API error:', error);
        
        // Parse error if it's JSON
        try {
          const errorJson = JSON.parse(error);
          const errorMessage = errorJson.message || `API error: ${response.status}`;
          return new Response(JSON.stringify({ 
            error: errorMessage,
            details: errorJson 
          }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (e) {
          return new Response(JSON.stringify({ 
            error: `API error: ${response.status}`,
            details: error
          }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'details') {
      const offreId = url.searchParams.get('id');
      
      if (!offreId) {
        throw new Error('Offre ID is required');
      }

      const token = await getAccessToken();

      const apiUrl = `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/${offreId}`;
      
      console.log('Fetching offer details:', apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('API error:', error);
        
        // Parse error if it's JSON
        try {
          const errorJson = JSON.parse(error);
          const errorMessage = errorJson.message || `API error: ${response.status}`;
          return new Response(JSON.stringify({ 
            error: errorMessage,
            details: errorJson 
          }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (e) {
          return new Response(JSON.stringify({ 
            error: `API error: ${response.status}`,
            details: error
          }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
