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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date().toISOString();
    console.log('Traitement des emails programmés à:', now);

    // Récupérer tous les emails à envoyer
    const { data: scheduledEmails, error: fetchError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`${scheduledEmails?.length || 0} emails à traiter`);

    for (const email of scheduledEmails || []) {
      try {
        console.log(`Traitement email ${email.id} pour user ${email.user_id}`);

        // Récupérer le token Gmail de l'utilisateur
        const { data: tokenData } = await supabase
          .from('gmail_tokens')
          .select('access_token, refresh_token, expires_at')
          .eq('user_id', email.user_id)
          .single();

        if (!tokenData) {
          console.error(`Token non trouvé pour user ${email.user_id}`);
          await supabase
            .from('scheduled_emails')
            .update({
              status: 'failed',
              error_message: 'Token Gmail non trouvé',
            })
            .eq('id', email.id);
          continue;
        }

        let accessToken = tokenData.access_token;

        // Rafraîchir le token si nécessaire
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
            .eq('user_id', email.user_id);
        }

        // Envoyer le brouillon via Gmail API
        const sendResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${email.gmail_draft_id}/send`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!sendResponse.ok) {
          const errorText = await sendResponse.text();
          console.error(`Erreur envoi draft ${email.gmail_draft_id}:`, errorText);
          throw new Error(errorText);
        }

        console.log(`Email ${email.id} envoyé avec succès`);

        // Mettre à jour le statut
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', email.id);

        // Envoyer notification si demandé
        if (email.notify_on_sent) {
          await supabase
            .from('user_notifications')
            .insert({
              user_id: email.user_id,
              type: 'email_sent',
              title: 'Email envoyé',
              message: `Votre email "${email.subject}" a été envoyé avec succès.`,
            });
        }

        // Créer une campagne email pour le tracking
        await supabase
          .from('email_campaigns')
          .insert({
            user_id: email.user_id,
            recipient: email.recipients[0],
            subject: email.subject,
            body: '',
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

      } catch (error: any) {
        console.error(`Erreur traitement email ${email.id}:`, error);
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'failed',
            error_message: error.message,
          })
          .eq('id', email.id);

        // Notification d'échec
        await supabase
          .from('user_notifications')
          .insert({
            user_id: email.user_id,
            type: 'email_failed',
            title: 'Échec envoi email',
            message: `L'envoi de votre email "${email.subject}" a échoué: ${error.message}`,
          });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: scheduledEmails?.length || 0,
        message: 'Traitement terminé',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Erreur globale:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
