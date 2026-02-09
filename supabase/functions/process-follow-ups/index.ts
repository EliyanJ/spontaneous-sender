import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { decryptToken } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== Deno.env.get('CRON_SECRET')) {
    console.error('Unauthorized cron request - invalid or missing secret');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Traitement des relances...');

    const { data: campaigns } = await supabase
      .from('email_campaigns')
      .select('*, user_preferences!inner(*)')
      .eq('follow_up_status', 'pending')
      .eq('follow_up_enabled', true)
      .is('response_detected_at', null);

    let notificationsSent = 0;
    let autoFollowUpsSent = 0;

    for (const campaign of campaigns || []) {
      const sentDate = new Date(campaign.sent_at);
      const now = new Date();
      const daysSince = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
      const delayDays = campaign.follow_up_delay_days || 10;

      if (daysSince >= delayDays) {
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('auto_follow_up, follow_up_template')
          .eq('user_id', campaign.user_id)
          .single();

        if (prefs?.auto_follow_up) {
          try {
            const { data: tokenData } = await supabase
              .from('gmail_tokens')
              .select('access_token, refresh_token, expires_at')
              .eq('user_id', campaign.user_id)
              .single();

            if (tokenData) {
              // Decrypt access token
              let accessToken = await decryptToken(tokenData.access_token);

              if (tokenData.expires_at && new Date(tokenData.expires_at) <= new Date()) {
                // Decrypt refresh token for refresh
                const decryptedRefreshToken = await decryptToken(tokenData.refresh_token || '');
                
                const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: new URLSearchParams({
                    client_id: Deno.env.get('GMAIL_CLIENT_ID') || '',
                    client_secret: Deno.env.get('GMAIL_CLIENT_SECRET') || '',
                    refresh_token: decryptedRefreshToken,
                    grant_type: 'refresh_token',
                  }),
                });

                const refreshData = await refreshResponse.json();
                accessToken = refreshData.access_token;
              }

              const followUpBody = prefs.follow_up_template || `
                Bonjour,
                
                Je me permets de revenir vers vous concernant ma candidature spontanée envoyée le ${sentDate.toLocaleDateString('fr-FR')}.
                
                Je reste disponible pour échanger sur les opportunités au sein de votre entreprise.
                
                Cordialement
              `;

              const emailLines = [
                `To: ${campaign.recipient}`,
                `Subject: Relance: ${campaign.subject}`,
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=utf-8',
                '',
                followUpBody,
              ];

              const email = emailLines.join('\r\n');
              const encodedEmail = btoa(unescape(encodeURIComponent(email)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

              const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ raw: encodedEmail }),
              });

              if (sendResponse.ok) {
                await supabase
                  .from('email_campaigns')
                  .update({
                    follow_up_status: 'sent',
                    follow_up_sent_at: new Date().toISOString(),
                  })
                  .eq('id', campaign.id);

                autoFollowUpsSent++;
              }
            }
          } catch (error) {
            console.error(`Erreur relance auto pour ${campaign.id}:`, error);
          }
        } else {
          await supabase
            .from('user_notifications')
            .insert({
              user_id: campaign.user_id,
              type: 'follow_up_reminder',
              title: '⏰ Relance à faire',
              message: `Il y a ${daysSince} jours, vous avez envoyé un email à ${campaign.recipient}. Pensez à faire une relance !`,
              related_campaign_id: campaign.id,
            });

          notificationsSent++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent,
        autoFollowUpsSent,
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
