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

    const { recipients, subject, body, scheduledFor, notifyOnSent } = await req.json();

    // Récupérer le token Gmail
    const { data: tokenData } = await supabase
      .from('gmail_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .single();

    if (!tokenData) {
      throw new Error('Token Gmail non trouvé');
    }

    let accessToken = tokenData.access_token;

    // Vérifier si le token est expiré
    if (tokenData.expires_at && new Date(tokenData.expires_at) <= new Date()) {
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GMAIL_CLIENT_ID') || '',
          client_secret: Deno.env.get('GMAIL_CLIENT_SECRET') || '',
          refresh_token: tokenData.refresh_token || '',
          grant_type: 'refresh_token',
        }),
      });

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      await supabase
        .from('gmail_tokens')
        .update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq('user_id', user.id);
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

    // Stocker la référence dans notre DB
    const { error: insertError } = await supabase
      .from('scheduled_emails')
      .insert({
        user_id: user.id,
        gmail_draft_id: draftData.id,
        scheduled_for: scheduledFor,
        recipients,
        subject,
        notify_on_sent: notifyOnSent || false,
        status: 'pending',
      });

    if (insertError) {
      console.error('Erreur insertion DB:', insertError);
      throw insertError;
    }

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
