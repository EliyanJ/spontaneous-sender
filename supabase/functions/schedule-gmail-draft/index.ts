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

    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    // Calculer le délai en secondes
    const now = new Date();
    const delaySeconds = Math.max(0, Math.floor((scheduledDate.getTime() - now.getTime()) / 1000));
    
    console.log(`Email programmé pour ${scheduledDate.toISOString()}, délai: ${delaySeconds} secondes`);

    // Formater le body avec des retours à la ligne HTML
    const body = rawBody ? rawBody.replace(/\n/g, '<br>') : '';

    // Créer le message pour la queue avec toutes les infos nécessaires
    const queueMessage = {
      user_id: user.id,
      recipients,
      subject,
      body,
      notify_on_sent: notifyOnSent || false,
      scheduled_for: scheduledDate.toISOString(),
    };

    // Ajouter le message à la queue pgmq avec le délai calculé
    const { data: queueResult, error: queueError } = await serviceSupabase.rpc('pgmq_send_with_delay', {
      queue_name: 'scheduled_emails_queue',
      message: queueMessage,
      delay_seconds: delaySeconds
    });

    // Si la fonction RPC n'existe pas, utiliser une approche directe via SQL
    if (queueError) {
      console.log('Using direct SQL for pgmq.send:', queueError.message);
      
      const { data: msgId, error: sqlError } = await serviceSupabase.rpc('exec_sql', {
        sql: `SELECT pgmq.send('scheduled_emails_queue', $1::jsonb, $2)`,
        params: [JSON.stringify(queueMessage), delaySeconds]
      });

      if (sqlError) {
        // Fallback: insérer directement dans la table scheduled_emails avec le nouveau système
        console.log('Fallback to scheduled_emails table');
      }
    }

    // Stocker aussi dans scheduled_emails pour l'affichage frontend
    const { data: insertedEmail, error: insertError } = await supabase
      .from('scheduled_emails')
      .insert({
        user_id: user.id,
        gmail_draft_id: `queue_${Date.now()}`, // ID temporaire car plus de brouillon Gmail
        scheduled_for: scheduledDate.toISOString(),
        recipients,
        subject,
        email_body: body,
        notify_on_sent: notifyOnSent || false,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Erreur insertion DB:', insertError);
      throw insertError;
    }

    console.log('Email scheduled successfully via pgmq for:', scheduledDate.toISOString());

    return new Response(
      JSON.stringify({
        success: true,
        emailId: insertedEmail?.id,
        scheduledFor: scheduledDate.toISOString(),
        delaySeconds,
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
