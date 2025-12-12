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

    // NOUVELLE APPROCHE: Lire les messages de la queue pgmq
    // On lit jusqu'à 20 messages à la fois, avec un visibility timeout de 60 secondes
    const { data: queueMessages, error: readError } = await supabase.rpc('read_email_queue', {
      batch_size: 20,
      visibility_timeout: 60
    });

    // Fallback si la fonction RPC n'existe pas: utiliser la méthode classique
    if (readError) {
      console.log('RPC read_email_queue not found, using fallback method');
      return await processWithFallback(supabase, now);
    }

    if (!queueMessages || queueMessages.length === 0) {
      console.log('Aucun message dans la queue');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'Aucun email à traiter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`${queueMessages.length} messages à traiter depuis la queue`);

    let successCount = 0;
    let failCount = 0;

    for (const msg of queueMessages) {
      try {
        const emailData = msg.message;
        console.log(`Traitement email pour user ${emailData.user_id}`);

        // Envoyer l'email
        const sendResult = await sendEmailViaGmail(supabase, emailData);

        if (sendResult.success) {
          successCount++;

          // Supprimer le message de la queue
          await supabase.rpc('delete_from_queue', {
            queue_name: 'scheduled_emails_queue',
            msg_id: msg.msg_id
          });

          // Mettre à jour le statut dans scheduled_emails
          await supabase
            .from('scheduled_emails')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('user_id', emailData.user_id)
            .eq('subject', emailData.subject)
            .eq('status', 'pending');

          // Notification si demandé
          if (emailData.notify_on_sent) {
            await supabase
              .from('user_notifications')
              .insert({
                user_id: emailData.user_id,
                type: 'email_sent',
                title: 'Email envoyé',
                message: `Votre email "${emailData.subject}" a été envoyé avec succès.`,
              });
          }

          // Créer entrée email_campaigns pour tracking
          await supabase
            .from('email_campaigns')
            .insert({
              user_id: emailData.user_id,
              recipient: emailData.recipients[0],
              subject: emailData.subject,
              body: emailData.body,
              status: 'sent',
              sent_at: new Date().toISOString(),
            });

        } else {
          throw new Error(sendResult.error);
        }

      } catch (error: any) {
        console.error(`Erreur traitement message:`, error);
        failCount++;

        // Archive le message en erreur (après 3 tentatives il sera archivé automatiquement par pgmq)
        const emailData = msg.message;
        
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'failed',
            error_message: error.message,
          })
          .eq('user_id', emailData.user_id)
          .eq('subject', emailData.subject)
          .eq('status', 'pending');

        // Notification d'échec
        await supabase
          .from('user_notifications')
          .insert({
            user_id: emailData.user_id,
            type: 'email_failed',
            title: 'Échec envoi email',
            message: `L'envoi de votre email "${emailData.subject}" a échoué: ${error.message}`,
          });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: successCount + failCount,
        sent: successCount,
        failed: failCount,
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

// Fonction pour envoyer un email via Gmail API
async function sendEmailViaGmail(supabase: any, emailData: any): Promise<{ success: boolean; error?: string }> {
  try {
    // Récupérer le token Gmail de l'utilisateur
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', emailData.user_id)
      .single();

    if (tokenError || !tokenData) {
      return { success: false, error: 'Token Gmail non trouvé' };
    }

    let accessToken = tokenData.access_token;

    // Rafraîchir le token si nécessaire
    if (tokenData.expires_at && new Date(tokenData.expires_at) <= new Date()) {
      console.log('Token expired, refreshing...');
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
      
      if (refreshData.access_token) {
        accessToken = refreshData.access_token;

        await supabase
          .from('gmail_tokens')
          .update({
            access_token: accessToken,
            expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          })
          .eq('user_id', emailData.user_id);
      } else {
        return { success: false, error: 'Impossible de rafraîchir le token Gmail' };
      }
    }

    // FIX: Encoder le sujet en UTF-8 Base64 pour les caractères spéciaux
    const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(emailData.subject)))}?=`;
    
    const attachments = emailData.attachments || [];
    let emailContent: string;

    if (attachments.length > 0) {
      // Construire un email multipart avec pièces jointes
      const boundary = "boundary_" + Math.random().toString(36).substring(7);
      emailContent = [
        `To: ${emailData.recipients.join(', ')}`,
        `Subject: ${encodedSubject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        emailData.body,
        '',
      ].join('\r\n');

      for (const attachment of attachments) {
        emailContent += [
          `--${boundary}`,
          `Content-Type: ${attachment.contentType}`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
          '',
          attachment.data,
          '',
        ].join('\r\n');
      }

      emailContent += `--${boundary}--`;
    } else {
      // Email simple sans pièces jointes
      emailContent = [
        `To: ${emailData.recipients.join(', ')}`,
        `Subject: ${encodedSubject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        emailData.body,
      ].join('\r\n');
    }

    const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Envoyer directement via Gmail API
    const sendResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedEmail }),
      }
    );

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      console.error('Erreur envoi Gmail:', errorText);
      return { success: false, error: errorText };
    }

    console.log(`Email envoyé avec succès à ${emailData.recipients.join(', ')} (${attachments.length} pièces jointes)`);
    return { success: true };

  } catch (error: any) {
    console.error('Erreur sendEmailViaGmail:', error);
    return { success: false, error: error.message };
  }
}

// Fallback: méthode classique sans pgmq (compatibilité)
async function processWithFallback(supabase: any, now: string) {
  console.log('Using fallback method (direct DB query)');
  
  const { data: scheduledEmails, error: fetchError } = await supabase
    .from('scheduled_emails')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now);

  if (fetchError) {
    throw fetchError;
  }

  console.log(`${scheduledEmails?.length || 0} emails à traiter (fallback)`);

  let successCount = 0;
  let failCount = 0;

  for (const email of scheduledEmails || []) {
    try {
      // Si email_body existe, utiliser le nouveau système
      if (email.email_body) {
        const emailData = {
          user_id: email.user_id,
          recipients: email.recipients,
          subject: email.subject,
          body: email.email_body,
          notify_on_sent: email.notify_on_sent,
        };

        const sendResult = await sendEmailViaGmail(supabase, emailData);

        if (sendResult.success) {
          successCount++;
          await supabase
            .from('scheduled_emails')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', email.id);

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

          await supabase
            .from('email_campaigns')
            .insert({
              user_id: email.user_id,
              recipient: email.recipients[0],
              subject: email.subject,
              body: email.email_body,
              status: 'sent',
              sent_at: new Date().toISOString(),
            });
        } else {
          throw new Error(sendResult.error);
        }
      } else {
        // Ancien système avec brouillon Gmail
        const { data: tokenData } = await supabase
          .from('gmail_tokens')
          .select('access_token, refresh_token, expires_at')
          .eq('user_id', email.user_id)
          .single();

        if (!tokenData) {
          throw new Error('Token Gmail non trouvé');
        }

        let accessToken = tokenData.access_token;

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

        const sendResponse = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/drafts/send',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: email.gmail_draft_id }),
          }
        );

        if (!sendResponse.ok) {
          const errorText = await sendResponse.text();
          throw new Error(errorText);
        }

        successCount++;
        await supabase
          .from('scheduled_emails')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', email.id);

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
      }
    } catch (error: any) {
      console.error(`Erreur traitement email ${email.id}:`, error);
      failCount++;
      
      await supabase
        .from('scheduled_emails')
        .update({ status: 'failed', error_message: error.message })
        .eq('id', email.id);

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
      processed: successCount + failCount,
      sent: successCount,
      failed: failCount,
      message: 'Traitement terminé (fallback)',
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}
