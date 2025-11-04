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

  const response = await fetch(
    'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'api_offresdemploiv2 o2dsoffre',
      }).toString(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Token error:', error);
    throw new Error(`Failed to get access token: ${response.status}`);
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
      const commune = url.searchParams.get('commune') || '';
      const typeContrat = url.searchParams.get('typeContrat') || '';
      const distance = url.searchParams.get('distance') || '10';
      const range = url.searchParams.get('range') || '0-149';

      const token = await getAccessToken();

      // Si on a un code postal/ville, le convertir en coordonnées GPS
      let latitude = '';
      let longitude = '';
      
      if (commune) {
        try {
          const geocodeUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(commune)}&limit=1`;
          console.log('Geocoding:', geocodeUrl);
          
          const geocodeResponse = await fetch(geocodeUrl);
          if (geocodeResponse.ok) {
            const geocodeData = await geocodeResponse.json();
            if (geocodeData.features && geocodeData.features.length > 0) {
              const coords = geocodeData.features[0].geometry.coordinates;
              longitude = coords[0].toString();
              latitude = coords[1].toString();
              console.log('Coordinates found:', { latitude, longitude });
            }
          }
        } catch (error) {
          console.error('Geocoding error:', error);
        }
      }

      // Construire les paramètres de recherche
      const searchParams = new URLSearchParams();
      if (motsCles) searchParams.append('motsCles', motsCles);
      
      // Utiliser les coordonnées GPS au lieu du code postal
      if (latitude && longitude) {
        searchParams.append('latitude', latitude);
        searchParams.append('longitude', longitude);
      }
      
      if (typeContrat) searchParams.append('typeContrat', typeContrat);
      searchParams.append('distance', distance);
      searchParams.append('range', range);

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
