import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "eliyanjacquet99@gmail.com";
// TODO: Update to noreply@getcronos.fr once domain is verified in Resend
const FROM_EMAIL = "Cronos <onboarding@resend.dev>";

interface EmailRequest {
  type: 
    | 'welcome' 
    | 'ticket_notification' 
    | 'ticket_confirmation'
    | 'email_reminder' 
    | 'response_detected'
    | 'gmail_connected'
    | 'campaign_summary'
    | 'payment_received_admin'
    | 'new_user_admin'
    | 'credits_low';
  to?: string;
  firstName?: string;
  subject?: string;
  description?: string;
  currentPage?: string;
  userEmail?: string;
  userId?: string;
  scheduledCount?: number;
  scheduledTime?: string;
  companyName?: string;
  responseCategory?: string;
  // New fields
  ticketId?: string;
  emailsSent?: number;
  companiesContacted?: string[];
  amount?: number;
  planType?: string;
  creditsRemaining?: number;
  renewalDate?: string;
}

// ============= EMAIL TEMPLATES =============

const getWelcomeEmailHtml = (firstName: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bienvenue sur Cronos !</h1>
    </div>
    <div class="content">
      <p>Bonjour ${firstName},</p>
      <p>Félicitations ! Votre compte Cronos a été créé avec succès.</p>
      <p>Vous pouvez maintenant :</p>
      <ul>
        <li>🔍 Rechercher des entreprises</li>
        <li>📧 Envoyer des emails personnalisés</li>
        <li>📊 Suivre vos candidatures</li>
        <li>🤖 Utiliser l'IA pour personnaliser vos messages</li>
      </ul>
      <p style="text-align: center;">
        <a href="https://getcronos.fr/dashboard" class="button">Accéder au tableau de bord</a>
      </p>
      <p>Si vous avez des questions, n'hésitez pas à utiliser le bouton d'aide (?) en bas à droite de l'écran.</p>
      <p>Bonne prospection !<br>L'équipe Cronos</p>
    </div>
    <div class="footer">
      <p>© 2025 Cronos - Votre assistant de prospection</p>
      <p><a href="https://getcronos.fr/terms-of-service">Conditions Générales</a> | <a href="https://getcronos.fr/privacy-policy">Politique de Confidentialité</a></p>
    </div>
  </div>
</body>
</html>
`;

const getTicketNotificationHtml = (data: EmailRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea; }
    .label { font-weight: bold; color: #374151; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎫 Nouveau Ticket Support</h1>
    </div>
    <div class="content">
      <div class="info-box">
        <p class="label">Utilisateur:</p>
        <p>${data.userEmail || 'Non spécifié'}</p>
      </div>
      <div class="info-box">
        <p class="label">Sujet:</p>
        <p>${data.subject}</p>
      </div>
      <div class="info-box">
        <p class="label">Description:</p>
        <p>${data.description}</p>
      </div>
      <div class="info-box">
        <p class="label">Page:</p>
        <p><code>${data.currentPage}</code></p>
      </div>
      <p style="margin-top: 20px;">
        <a href="https://getcronos.fr/admin/tickets" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Voir dans le panel admin
        </a>
      </p>
    </div>
  </div>
</body>
</html>
`;

const getTicketConfirmationHtml = (data: EmailRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .ticket-id { font-size: 24px; font-weight: bold; color: #667eea; }
    .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎫 Ticket reçu !</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Nous avons bien reçu votre demande d'assistance.</p>
      
      ${data.ticketId ? `<p>Numéro de ticket : <span class="ticket-id">#${data.ticketId.slice(0, 8).toUpperCase()}</span></p>` : ''}
      
      <div class="info-box">
        <p><strong>Sujet :</strong> ${data.subject}</p>
      </div>
      
      <p>Notre équipe vous répondra dans les <strong>24 à 48 heures</strong> ouvrables.</p>
      
      <p>En attendant, n'hésitez pas à consulter notre <a href="https://getcronos.fr/help">centre d'aide</a> qui peut peut-être répondre à votre question.</p>
      
      <p>Merci de votre confiance,<br>L'équipe Cronos</p>
    </div>
    <div class="footer">
      <p>© 2025 Cronos - Votre assistant de prospection</p>
    </div>
  </div>
</body>
</html>
`;

const getEmailReminderHtml = (scheduledCount: number, scheduledTime: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .highlight { font-size: 24px; font-weight: bold; color: #667eea; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Rappel: Emails programmés</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Vos <span class="highlight">${scheduledCount} email(s)</span> seront envoyés dans <strong>1 minute</strong> (à ${scheduledTime}).</p>
      <p>Si vous souhaitez annuler ou modifier, connectez-vous rapidement à votre tableau de bord.</p>
      <p style="text-align: center; margin-top: 20px;">
        <a href="https://getcronos.fr/dashboard?tab=emails" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Voir mes emails programmés
        </a>
      </p>
    </div>
  </div>
</body>
</html>
`;

const getResponseDetectedHtml = (companyName: string, responseCategory: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .company { font-size: 20px; font-weight: bold; color: #667eea; }
    .category { display: inline-block; padding: 4px 12px; border-radius: 20px; background: #e0e7ff; color: #3730a3; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📬 Nouvelle réponse reçue !</h1>
    </div>
    <div class="content">
      <p>Bonne nouvelle !</p>
      <p>Vous avez reçu une réponse de <span class="company">${companyName}</span>.</p>
      <p>Catégorie: <span class="category">${responseCategory}</span></p>
      <p style="text-align: center; margin-top: 20px;">
        <a href="https://getcronos.fr/dashboard?tab=emails" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Voir la réponse
        </a>
      </p>
    </div>
  </div>
</body>
</html>
`;

const getGmailConnectedHtml = (userEmail: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4285f4 0%, #34a853 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .scope-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔗 Gmail connecté à Cronos</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Votre compte Gmail <strong>${userEmail}</strong> a été connecté à Cronos avec succès.</p>
      
      <div class="scope-box">
        <h3>📋 Permissions accordées :</h3>
        <ul>
          <li><strong>Envoi d'emails</strong> (gmail.send) - Permet à Cronos d'envoyer des emails en votre nom</li>
        </ul>
        <p style="font-size: 14px; color: #6b7280;">Cronos ne peut pas lire vos emails existants ni accéder à votre boîte de réception.</p>
      </div>
      
      <div class="warning-box">
        <strong>⚠️ Ce n'était pas vous ?</strong>
        <p style="margin: 5px 0 0 0;">Si vous n'êtes pas à l'origine de cette connexion, <a href="https://myaccount.google.com/permissions">révoquez l'accès immédiatement</a> depuis votre compte Google.</p>
      </div>
      
      <p>Vous pouvez maintenant envoyer des emails de prospection directement depuis Cronos.</p>
      
      <p style="text-align: center; margin-top: 20px;">
        <a href="https://getcronos.fr/dashboard?tab=settings" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Gérer mes connexions
        </a>
      </p>
      
      <p>Bonne prospection !<br>L'équipe Cronos</p>
    </div>
    <div class="footer">
      <p>© 2025 Cronos - Votre assistant de prospection</p>
    </div>
  </div>
</body>
</html>
`;

const getCampaignSummaryHtml = (data: EmailRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .stat-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center; border: 1px solid #e5e7eb; }
    .stat-number { font-size: 36px; font-weight: bold; color: #667eea; }
    .companies-list { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; max-height: 200px; overflow-y: auto; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Récapitulatif de votre campagne</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Voici le récapitulatif de vos emails envoyés :</p>
      
      <div class="stat-box">
        <p class="stat-number">${data.emailsSent || 0}</p>
        <p>Email(s) envoyé(s)</p>
      </div>
      
      ${data.companiesContacted && data.companiesContacted.length > 0 ? `
      <div class="companies-list">
        <h3>🏢 Entreprises contactées :</h3>
        <ul>
          ${data.companiesContacted.slice(0, 10).map(company => `<li>${company}</li>`).join('')}
          ${data.companiesContacted.length > 10 ? `<li><em>... et ${data.companiesContacted.length - 10} autres</em></li>` : ''}
        </ul>
      </div>
      ` : ''}
      
      <p>Consultez votre tableau de bord pour suivre les réponses et gérer vos prochaines relances.</p>
      
      <p style="text-align: center; margin-top: 20px;">
        <a href="https://getcronos.fr/dashboard?tab=emails" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Voir mes emails
        </a>
      </p>
      
      <p>Bonne continuation !<br>L'équipe Cronos</p>
    </div>
    <div class="footer">
      <p>© 2025 Cronos - Votre assistant de prospection</p>
    </div>
  </div>
</body>
</html>
`;

const getPaymentReceivedAdminHtml = (data: EmailRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .amount { font-size: 32px; font-weight: bold; color: #10b981; }
    .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Nouveau Paiement Reçu !</h1>
    </div>
    <div class="content">
      <p style="text-align: center;">
        <span class="amount">${((data.amount || 0) / 100).toFixed(2)} €</span>
      </p>
      
      <div class="info-box">
        <p><strong>Client :</strong> ${data.userEmail}</p>
        <p><strong>Type :</strong> ${data.planType || 'Achat'}</p>
        <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
      </div>
      
      <p style="text-align: center; margin-top: 20px;">
        <a href="https://getcronos.fr/admin/analytics" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Voir le dashboard admin
        </a>
      </p>
    </div>
  </div>
</body>
</html>
`;

const getNewUserAdminHtml = (data: EmailRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👤 Nouvel Utilisateur Inscrit !</h1>
    </div>
    <div class="content">
      <div class="info-box">
        <p><strong>Email :</strong> ${data.userEmail}</p>
        <p><strong>Prénom :</strong> ${data.firstName || 'Non renseigné'}</p>
        <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
      </div>
      
      <p style="text-align: center; margin-top: 20px;">
        <a href="https://getcronos.fr/admin/users" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Voir les utilisateurs
        </a>
      </p>
    </div>
  </div>
</body>
</html>
`;

const getCreditsLowHtml = (data: EmailRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .credits { font-size: 48px; font-weight: bold; color: #f59e0b; text-align: center; }
    .info-box { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Crédits faibles</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Il vous reste peu de crédits sur Cronos :</p>
      
      <p class="credits">${data.creditsRemaining || 0}</p>
      <p style="text-align: center; color: #6b7280;">crédits d'envoi restants</p>
      
      ${data.renewalDate ? `
      <div class="info-box">
        <p><strong>📅 Prochain renouvellement :</strong> ${data.renewalDate}</p>
        <p>Vos crédits seront automatiquement rechargés à cette date si vous avez un abonnement actif.</p>
      </div>
      ` : ''}
      
      <p>Pour continuer à prospecter sans interruption, pensez à recharger vos crédits ou à passer à un forfait supérieur.</p>
      
      <p style="text-align: center; margin-top: 20px;">
        <a href="https://getcronos.fr/pricing" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Voir les offres
        </a>
      </p>
      
      <p>À bientôt,<br>L'équipe Cronos</p>
    </div>
    <div class="footer">
      <p>© 2025 Cronos - Votre assistant de prospection</p>
    </div>
  </div>
</body>
</html>
`;

// ============= MAIN HANDLER =============

serve(async (req): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: EmailRequest = await req.json();
    console.log('Sending system email:', data.type);

    let to: string;
    let subject: string;
    let html: string;

    switch (data.type) {
      case 'welcome':
        to = data.to!;
        subject = "🎉 Bienvenue sur Cronos !";
        html = getWelcomeEmailHtml(data.firstName || 'Utilisateur');
        break;

      case 'ticket_notification':
        to = ADMIN_EMAIL;
        subject = `🎫 Nouveau ticket: ${data.subject}`;
        html = getTicketNotificationHtml(data);
        break;

      case 'ticket_confirmation':
        to = data.to!;
        subject = `🎫 Ticket reçu - ${data.subject}`;
        html = getTicketConfirmationHtml(data);
        break;

      case 'email_reminder':
        to = data.to!;
        subject = `⏰ Rappel: ${data.scheduledCount} email(s) dans 1 minute`;
        html = getEmailReminderHtml(data.scheduledCount!, data.scheduledTime!);
        break;

      case 'response_detected':
        to = data.to!;
        subject = `📬 Réponse de ${data.companyName}`;
        html = getResponseDetectedHtml(data.companyName!, data.responseCategory || 'Non catégorisée');
        break;

      case 'gmail_connected':
        to = data.to!;
        subject = "🔗 Gmail connecté à votre compte Cronos";
        html = getGmailConnectedHtml(data.userEmail || data.to!);
        break;

      case 'campaign_summary':
        to = data.to!;
        subject = `📊 Récap: ${data.emailsSent} email(s) envoyé(s)`;
        html = getCampaignSummaryHtml(data);
        break;

      case 'payment_received_admin':
        to = ADMIN_EMAIL;
        subject = `💰 Nouveau paiement: ${((data.amount || 0) / 100).toFixed(2)}€ - ${data.planType}`;
        html = getPaymentReceivedAdminHtml(data);
        break;

      case 'new_user_admin':
        to = ADMIN_EMAIL;
        subject = `👤 Nouvel utilisateur: ${data.userEmail}`;
        html = getNewUserAdminHtml(data);
        break;

      case 'credits_low':
        to = data.to!;
        subject = `⚠️ Plus que ${data.creditsRemaining} crédits sur Cronos`;
        html = getCreditsLowHtml(data);
        break;

      default:
        throw new Error(`Unknown email type: ${data.type}`);
    }

    const emailResponse = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, ...emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-system-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
