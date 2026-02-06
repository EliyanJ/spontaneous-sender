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
  const authHeader = req.headers.get('Authorization');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  
  const isValidCronSecret = cronSecret === expectedSecret;
  const isValidAuthHeader = authHeader === `Bearer ${expectedSecret}`;
  
  if (!isValidCronSecret && !isValidAuthHeader) {
    console.error('Unauthorized cron request - invalid or missing secret');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('check-campaign-reminders: Starting...');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    
    // Fenêtre de 2h : entre maintenant +1h45 et maintenant +2h15
    // Cela permet de capturer les emails programmés dans ~2h avec une marge
    const minTime = new Date(now.getTime() + 105 * 60 * 1000); // +1h45
    const maxTime = new Date(now.getTime() + 135 * 60 * 1000); // +2h15

    console.log(`Recherche emails programmés entre ${minTime.toISOString()} et ${maxTime.toISOString()}`);

    // Récupérer les emails programmés dans la fenêtre de 2h qui n'ont pas encore reçu de rappel
    const { data: scheduledEmails, error: fetchError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('status', 'pending')
      .gte('scheduled_for', minTime.toISOString())
      .lte('scheduled_for', maxTime.toISOString());

    if (fetchError) {
      console.error('Erreur fetch scheduled_emails:', fetchError);
      throw fetchError;
    }

    console.log(`${scheduledEmails?.length || 0} emails programmés dans ~2h`);

    let remindersSent = 0;

    // Grouper par user_id pour envoyer un seul rappel par utilisateur
    const emailsByUser: Record<string, typeof scheduledEmails> = {};
    
    for (const email of scheduledEmails || []) {
      if (!emailsByUser[email.user_id]) {
        emailsByUser[email.user_id] = [];
      }
      emailsByUser[email.user_id].push(email);
    }

    for (const [userId, userEmails] of Object.entries(emailsByUser)) {
      try {
        // Récupérer l'email de l'utilisateur
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();

        // Récupérer l'adresse email depuis auth.users via une requête admin
        const { data: authData } = await supabase.auth.admin.getUserById(userId);
        const userEmail = authData?.user?.email;

        if (!userEmail) {
          console.log(`Impossible de trouver l'email pour user ${userId}`);
          continue;
        }

        // Calculer le total d'emails et l'heure d'envoi
        const totalEmails = userEmails.reduce((sum, e) => sum + (e.recipients?.length || 1), 0);
        const firstScheduledTime = new Date(userEmails[0].scheduled_for);
        const formattedTime = firstScheduledTime.toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        // Vérifier si on a déjà envoyé un rappel pour ces emails (via metadata ou autre)
        // Pour éviter les doublons, on vérifie si une notification récente existe
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        const { data: existingNotif } = await supabase
          .from('user_notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'campaign_reminder_2h')
          .gte('created_at', twoHoursAgo.toISOString())
          .single();

        if (existingNotif) {
          console.log(`Rappel déjà envoyé pour user ${userId} dans les 2 dernières heures`);
          continue;
        }

        // Envoyer la notification email
        await supabase.functions.invoke('send-system-email', {
          body: {
            type: 'campaign_reminder_2h',
            to: userEmail,
            userEmail: userEmail,
            emailsSent: totalEmails,
            scheduledTime: formattedTime,
          }
        });

        // Créer une notification in-app aussi
        await supabase
          .from('user_notifications')
          .insert({
            user_id: userId,
            type: 'campaign_reminder_2h',
            title: '⏰ Rappel : Envoi dans 2h',
            message: `${totalEmails} email(s) programmé(s) seront envoyés à ${formattedTime}.`,
          });

        remindersSent++;
        console.log(`Rappel envoyé à ${userEmail} pour ${totalEmails} emails`);

      } catch (userError) {
        console.error(`Erreur envoi rappel pour user ${userId}:`, userError);
        // Continuer avec les autres utilisateurs
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        remindersSent,
        usersNotified: Object.keys(emailsByUser).length,
        message: `${remindersSent} rappel(s) envoyé(s)`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Erreur check-campaign-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
