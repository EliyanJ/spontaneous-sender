import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Non authentifié');
    }

    const requestBody = await req.json();
    const { recipients, subject, body: rawBody, scheduledFor, notifyOnSent } = requestBody;

    console.log('Received request:', { recipients, subject, scheduledFor, notifyOnSent });

    // Valider scheduledFor
    if (!scheduledFor) {
      throw new Error('Date de programmation manquante');
    }

    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      console.error('Invalid scheduledFor value:', scheduledFor);
      throw new Error('Date de programmation invalide');
    }

    console.log('Parsed scheduled date:', scheduledDate.toISOString());

    // Formater le body avec des retours à la ligne HTML
    const body = rawBody ? rawBody.replace(/\n/g, '<br>') : '';

    // Récupérer le token Gmail
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      console.error('Token error:', tokenError);
      throw new Error('Token Gmail non trouvé');
    }

    let accessToken = tokenData.access_token;

    // Vérifier si le token est expiré
    const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;
    const isExpired = expiresAt ? expiresAt <= new Date() : false;

    if (isExpired && tokenData.refresh_token) {
      console.log('Token expired, refreshing...');
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GMAIL_CLIENT_ID') || '',
          client_secret: Deno.env.get('GMAIL_CLIENT_SECRET') || '',
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const refreshData = await refreshResponse.json();
      
      if (refreshData.access_token) {
        accessToken = refreshData.access_token;
        
        const newExpiresAt = refreshData.expires_in 
          ? new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
          : null;

        if (newExpiresAt) {
          await supabase
            .from('gmail_tokens')
            .update({
              access_token: accessToken,
              expires_at: newExpiresAt,
            })
            .eq('user_id', user.id);
        }
      } else {
        console.error('Token refresh failed:', refreshData);
        throw new Error('Impossible de rafraîchir le token Gmail');
      }
    }

    // Créer le message email
    const emailLines = [
      `To: ${recipients.join(', ')}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ];

    const email = emailLines.join('\r\n');
    const encodedEmail = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Créer le brouillon dans Gmail
    console.log('Creating Gmail draft...');
    const draftResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          raw: encodedEmail,
        },
      }),
    });

    if (!draftResponse.ok) {
      const error = await draftResponse.text();
      console.error('Erreur création brouillon:', error);
      throw new Error('Erreur lors de la création du brouillon Gmail');
    }

    const draftData = await draftResponse.json();
    console.log('Brouillon créé:', draftData.id);

    // Stocker la référence dans notre DB avec la date validée
    const { error: insertError } = await supabase
      .from('scheduled_emails')
      .insert({
        user_id: user.id,
        gmail_draft_id: draftData.id,
        scheduled_for: scheduledDate.toISOString(),
        recipients,
        subject,
        notify_on_sent: notifyOnSent || false,
        status: 'pending',
      });

    if (insertError) {
      console.error('Erreur insertion DB:', insertError);
      throw insertError;
    }

    console.log('Email scheduled successfully for:', scheduledDate.toISOString());

    return new Response(
      JSON.stringify({
        success: true,
        draftId: draftData.id,
        message: 'Email programmé avec succès',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
