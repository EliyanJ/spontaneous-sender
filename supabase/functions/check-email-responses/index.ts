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

    console.log('Vérification des réponses emails...');

    // Récupérer tous les utilisateurs avec Gmail configuré
    const { data: users } = await supabase
      .from('gmail_tokens')
      .select('user_id, access_token, refresh_token, expires_at');

    let totalChecked = 0;
    let responsesFound = 0;

    for (const user of users || []) {
      try {
        let accessToken = user.access_token;

        // Rafraîchir le token si nécessaire
        if (user.expires_at && new Date(user.expires_at) <= new Date()) {
          const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: Deno.env.get('GMAIL_CLIENT_ID') || '',
              client_secret: Deno.env.get('GMAIL_CLIENT_SECRET') || '',
              refresh_token: user.refresh_token || '',
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
            .eq('user_id', user.user_id);
        }

        // Récupérer les campagnes sans réponse de moins de 30 jours
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: campaigns } = await supabase
          .from('email_campaigns')
          .select('*')
          .eq('user_id', user.user_id)
          .is('response_detected_at', null)
          .gte('sent_at', thirtyDaysAgo.toISOString());

        totalChecked += campaigns?.length || 0;

        for (const campaign of campaigns || []) {
          // Construire la requête Gmail
          const afterDate = new Date(campaign.sent_at);
          const formattedDate = afterDate.toISOString().split('T')[0].replace(/-/g, '/');
          const query = `from:${campaign.recipient} after:${formattedDate}`;

          const searchResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=5`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          if (!searchResponse.ok) continue;

          const searchData = await searchResponse.json();

          if (searchData.messages && searchData.messages.length > 0) {
            console.log(`Réponse trouvée pour campagne ${campaign.id}`);
            responsesFound++;

            // Récupérer le premier message
            const messageId = searchData.messages[0].id;
            const messageResponse = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
              {
                headers: { Authorization: `Bearer ${accessToken}` },
              }
            );

            const messageData = await messageResponse.json();
            const headers = messageData.payload?.headers || [];
            const subjectHeader = headers.find((h: any) => h.name === 'Subject');
            
            let bodyText = '';
            if (messageData.payload?.body?.data) {
              bodyText = atob(messageData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            }

            // Analyser avec AI (simplifié pour l'instant)
            const isPositive = bodyText.toLowerCase().includes('intéressé') || 
                             bodyText.toLowerCase().includes('merci') ||
                             bodyText.toLowerCase().includes('rendez-vous');
            
            const category = isPositive ? 'positive' : 'neutral';
            const stage = isPositive ? 'interested' : 'pending_info';

            // Mettre à jour la campagne
            await supabase
              .from('email_campaigns')
              .update({
                response_detected_at: new Date().toISOString(),
                response_category: category,
                pipeline_stage: stage,
                response_summary: bodyText.substring(0, 200),
                follow_up_status: 'responded',
              })
              .eq('id', campaign.id);

            // Stocker la réponse complète
            await supabase
              .from('email_responses')
              .insert({
                campaign_id: campaign.id,
                user_id: user.user_id,
                gmail_message_id: messageId,
                received_at: new Date(parseInt(messageData.internalDate)).toISOString(),
                subject: subjectHeader?.value || '',
                body: bodyText,
                category,
                pipeline_stage: stage,
                summary: bodyText.substring(0, 200),
              });

            // Notifier l'utilisateur
            await supabase
              .from('user_notifications')
              .insert({
                user_id: user.user_id,
                type: 'response_detected',
                title: '📬 Nouvelle réponse !',
                message: `${campaign.recipient} a répondu à votre candidature`,
                related_campaign_id: campaign.id,
              });
          }
        }
      } catch (error) {
        console.error(`Erreur pour user ${user.user_id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: totalChecked,
        responsesFound,
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
