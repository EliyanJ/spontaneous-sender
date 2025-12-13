import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    throw new Error('Rate limiting unavailable - please try again later');
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping websites for user:', user.id);

    // Check rate limit (20 per hour)
    await checkRateLimit(supabaseClient, user.id, 'scrape-websites', 20);

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY non configurée');
    }

    const { companies } = await req.json();
    
    if (!companies || !Array.isArray(companies)) {
      throw new Error('companies doit être un tableau');
    }

    console.log(`Scraping de ${companies.length} entreprises`);

    const results = [];

    // Traiter par lots de 5 pour éviter rate limit
    const batchSize = 5;
    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (company: any) => {
        try {
          // Recherche du site web avec Claude
          const searchPrompt = `Trouve le site web officiel de l'entreprise "${company.nom}" située à ${company.ville} (${company.code_postal}). 
          
Réponds UNIQUEMENT avec l'URL du site web (format: https://...) ou "AUCUN" si tu ne trouves pas de site officiel fiable.

Critères:
- Site officiel uniquement (pas d'annuaires, pages jaunes, societe.com, etc.)
- Vérifie que l'entreprise correspond bien (nom + localisation)
- Préfère les sites .fr ou .com
- Si plusieurs sites, choisis le plus officiel

Réponds juste l'URL ou AUCUN.`;

          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-5',
              max_tokens: 200,
              messages: [{
                role: 'user',
                content: searchPrompt
              }]
            })
          });

          if (!response.ok) {
            console.error(`Claude API error for ${company.nom}:`, response.status);
            return { ...company, website_url: null };
          }

          const data = await response.json();
          const content = data.content?.[0]?.text || '';
          
          // Extraire l'URL
          let websiteUrl = null;
          const urlMatch = content.match(/https?:\/\/[^\s]+/);
          if (urlMatch && !content.includes('AUCUN')) {
            websiteUrl = urlMatch[0].replace(/[.,;)]$/, ''); // Nettoyer ponctuation finale
          }

          console.log(`${company.nom}: ${websiteUrl || 'non trouvé'}`);

          return {
            ...company,
            website_url: websiteUrl
          };

        } catch (error) {
          console.error(`Erreur scraping ${company.nom}:`, error);
          return { ...company, website_url: null };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Pause entre les lots
      if (i + batchSize < companies.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const foundCount = results.filter(r => r.website_url).length;
    console.log(`Résultat: ${foundCount}/${companies.length} sites trouvés`);

    return new Response(JSON.stringify({
      success: true,
      data: results,
      stats: {
        total: companies.length,
        found: foundCount
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erreur scrape-websites:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
