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

  // Validate CRON_SECRET for security
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

    const now = new Date();
    
    console.log('Vérification des relances à faire:', now.toISOString());

    // Récupérer les campagnes envoyées sans réponse
    const { data: campaigns, error: fetchError } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        user_preferences!inner(follow_up_delay_days)
      `)
      .eq('status', 'sent')
      .eq('follow_up_status', 'pending')
      .is('response_detected_at', null);

    if (fetchError) {
      console.error('Erreur récupération campagnes:', fetchError);
      throw fetchError;
    }

    console.log(`${campaigns?.length || 0} relances à traiter`);

    let remindersCreated = 0;

    for (const campaign of campaigns || []) {
      try {
        const daysSinceSent = Math.floor(
          (now.getTime() - new Date(campaign.sent_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Récupérer le délai de relance configuré par l'utilisateur
        const followUpDelay = (campaign as any).user_preferences?.follow_up_delay_days || 10;

        // Vérifier si le délai est atteint
        if (daysSinceSent < followUpDelay) {
          continue;
        }

        // Vérifier si une notification de relance n'existe pas déjà
        const { data: existingNotif } = await supabase
          .from('user_notifications')
          .select('id')
          .eq('related_campaign_id', campaign.id)
          .eq('type', 'follow_up_reminder')
          .single();

        if (!existingNotif) {
          // Créer une notification de rappel
          const { error: notifError } = await supabase
            .from('user_notifications')
            .insert({
              user_id: campaign.user_id,
              type: 'follow_up_reminder',
              title: 'Relance à faire',
              message: `Il est temps de faire une relance pour votre email à ${campaign.recipient} (envoyé il y a ${daysSinceSent} jours)`,
              related_campaign_id: campaign.id,
              status: 'unread',
            });

          if (notifError) {
            console.error('Erreur création notification:', notifError);
          } else {
            remindersCreated++;
            console.log(`Notification créée pour campagne ${campaign.id}`);
          }
        }

      } catch (error: any) {
        console.error(`Erreur traitement campagne ${campaign.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaigns_checked: campaigns?.length || 0,
        reminders_created: remindersCreated,
        message: 'Vérification des relances terminée',
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
