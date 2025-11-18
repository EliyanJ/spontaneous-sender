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

    console.log('Vérification des bounces...');

    // Récupérer les utilisateurs avec tokens Gmail
    const { data: tokens, error: tokensError } = await supabase
      .from('gmail_tokens')
      .select('user_id, access_token, refresh_token, expires_at');

    if (tokensError || !tokens || tokens.length === 0) {
      console.log('Aucun token trouvé');
      return new Response(
        JSON.stringify({ message: 'Aucun utilisateur avec Gmail connecté' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let bouncesDetected = 0;
    let retriedEmails = 0;

    for (const token of tokens) {
      try {
        let accessToken = token.access_token;

        // Rafraîchir le token si expiré
        if (token.expires_at && new Date(token.expires_at) <= new Date() && token.refresh_token) {
          const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: Deno.env.get('GMAIL_CLIENT_ID') || '',
              client_secret: Deno.env.get('GMAIL_CLIENT_SECRET') || '',
              refresh_token: token.refresh_token,
              grant_type: 'refresh_token',
            }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            accessToken = refreshData.access_token;

            await supabase
              .from('gmail_tokens')
              .update({
                access_token: accessToken,
                expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
              })
              .eq('user_id', token.user_id);
          }
        }

        // Chercher les bounces dans la boîte mail (emails de mailer-daemon)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const searchQuery = `from:mailer-daemon OR from:postmaster after:${Math.floor(thirtyDaysAgo.getTime() / 1000)}`;
        
        const searchResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          }
        );

        if (!searchResponse.ok) {
          console.error(`Erreur recherche bounces pour user ${token.user_id}`);
          continue;
        }

        const searchData = await searchResponse.json();
        
        if (!searchData.messages || searchData.messages.length === 0) {
          console.log(`Aucun bounce trouvé pour user ${token.user_id}`);
          continue;
        }

        console.log(`${searchData.messages.length} bounces trouvés pour user ${token.user_id}`);

        // Analyser chaque bounce
        for (const message of searchData.messages) {
          const messageResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
            {
              headers: { 'Authorization': `Bearer ${accessToken}` },
            }
          );

          if (!messageResponse.ok) continue;

          const messageData = await messageResponse.json();
          const headers = messageData.payload?.headers || [];
          
          // Extraire l'email qui a bounced
          const originalRecipient = headers.find((h: any) => 
            h.name.toLowerCase() === 'x-failed-recipients'
          )?.value;

          if (!originalRecipient) continue;

          console.log(`Bounce détecté pour: ${originalRecipient}`);
          bouncesDetected++;

          // Trouver la campagne correspondante
          const { data: campaign } = await supabase
            .from('email_campaigns')
            .select('*, companies(emails, id, nom)')
            .eq('recipient', originalRecipient)
            .eq('user_id', token.user_id)
            .eq('status', 'sent')
            .order('sent_at', { ascending: false })
            .limit(1)
            .single();

          if (!campaign || !campaign.companies) {
            console.log(`Campagne non trouvée pour ${originalRecipient}`);
            continue;
          }

          // Marquer la campagne comme bounce
          await supabase
            .from('email_campaigns')
            .update({ status: 'bounce' })
            .eq('id', campaign.id);

          // Vérifier si l'entreprise a d'autres emails
          const company = campaign.companies;
          const emails = (company.emails as any) || [];
          const alternativeEmails = emails.filter((e: any) => 
            e.email && e.email !== originalRecipient
          );

          if (alternativeEmails.length > 0) {
            console.log(`Tentative avec email alternatif pour ${company.nom}`);
            
            // Créer une nouvelle campagne avec l'email alternatif
            const { error: newCampaignError } = await supabase
              .from('email_campaigns')
              .insert({
                user_id: token.user_id,
                company_id: company.id,
                recipient: alternativeEmails[0].email,
                subject: campaign.subject,
                body: campaign.body,
                attachments: campaign.attachments,
                status: 'pending',
                follow_up_enabled: campaign.follow_up_enabled,
                follow_up_delay_days: campaign.follow_up_delay_days,
              });

            if (!newCampaignError) {
              retriedEmails++;
              
              // Notifier l'utilisateur
              await supabase
                .from('user_notifications')
                .insert({
                  user_id: token.user_id,
                  type: 'bounce_retry',
                  title: 'Email renvoyé',
                  message: `L'email à ${company.nom} a été renvoyé à ${alternativeEmails[0].email}`,
                  status: 'info',
                });
            }
          } else {
            // Notifier l'utilisateur du bounce sans alternative
            await supabase
              .from('user_notifications')
              .insert({
                user_id: token.user_id,
                type: 'bounce',
                title: 'Email non délivré',
                message: `L'email à ${company.nom} (${originalRecipient}) n'a pas pu être délivré et aucun email alternatif n'est disponible.`,
                status: 'error',
              });
          }
        }
      } catch (error) {
        console.error(`Erreur traitement user ${token.user_id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        bouncesDetected,
        retriedEmails,
        message: `${bouncesDetected} bounces détectés, ${retriedEmails} emails retentés`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
