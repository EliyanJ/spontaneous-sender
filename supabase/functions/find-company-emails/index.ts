import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Company {
  id: string;
  nom: string;
  ville: string;
  siren: string;
  website_url?: string;
  emails?: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Get companies for the user
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      throw companiesError;
    }

    if (!companies || companies.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No companies found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting email search for ${companies.length} companies`);
    
    let processedCount = 0;
    let emailsFoundCount = 0;
    const results = [];

    for (const company of companies) {
      try {
        console.log(`\n--- Processing: ${company.nom} (${company.ville}) ---`);
        
        // Use GPT-5 to search for company website and emails
        const searchPrompt = `Tu es un assistant expert en recherche d'informations d'entreprises sur internet.

Entreprise à rechercher:
- Nom: ${company.nom}
- Ville: ${company.ville}
- SIREN: ${company.siren}

Ta mission:
1. Cherche le site web officiel de cette entreprise en te basant sur le nom, la ville et le SIREN
2. Une fois le site trouvé, analyse les pages importantes (Contact, À propos, etc.) pour trouver des emails de contact
3. Si tu ne trouves pas d'email sur le site, cherche "${company.nom} email contact" pour trouver l'email sur des sites partenaires ou annuaires

Retourne UNIQUEMENT un objet JSON avec cette structure:
{
  "website": "url du site web trouvé ou null",
  "emails": ["email1@domain.com", "email2@domain.com"] ou [],
  "confidence": "high|medium|low",
  "source": "explication de comment tu as trouvé les informations"
}

Ne retourne RIEN d'autre que le JSON valide.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5-2025-08-07',
            messages: [
              { 
                role: 'system', 
                content: 'Tu es un assistant expert en recherche d\'informations sur internet. Tu réponds UNIQUEMENT avec du JSON valide, sans texte additionnel.'
              },
              { role: 'user', content: searchPrompt }
            ],
            max_completion_tokens: 1000,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error(`OpenAI API error for ${company.nom}:`, error);
          results.push({
            company: company.nom,
            status: 'error',
            error: 'API error'
          });
          continue;
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        console.log(`AI Response for ${company.nom}:`, content);
        
        // Parse JSON response
        let searchResult;
        try {
          // Remove markdown code blocks if present
          const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          searchResult = JSON.parse(cleanContent);
        } catch (parseError) {
          console.error(`Failed to parse JSON for ${company.nom}:`, parseError);
          results.push({
            company: company.nom,
            status: 'error',
            error: 'Failed to parse AI response'
          });
          continue;
        }

        // Update company in database
        const updates: any = {};
        if (searchResult.website) {
          updates.website_url = searchResult.website;
        }
        if (searchResult.emails && searchResult.emails.length > 0) {
          updates.emails = searchResult.emails;
          emailsFoundCount += searchResult.emails.length;
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('companies')
            .update(updates)
            .eq('id', company.id);

          if (updateError) {
            console.error(`Error updating company ${company.nom}:`, updateError);
          } else {
            console.log(`✓ Updated ${company.nom} with ${searchResult.emails?.length || 0} emails`);
          }
        }

        results.push({
          company: company.nom,
          status: 'success',
          website: searchResult.website,
          emails: searchResult.emails || [],
          confidence: searchResult.confidence,
          source: searchResult.source
        });

        processedCount++;

        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`Error processing company ${company.nom}:`, error);
        results.push({
          company: company.nom,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Processed: ${processedCount}/${companies.length}`);
    console.log(`Total emails found: ${emailsFoundCount}`);
    console.log(`================\n`);

    return new Response(
      JSON.stringify({
        message: 'Email search completed',
        processed: processedCount,
        total: companies.length,
        emailsFound: emailsFoundCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in find-company-emails function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
