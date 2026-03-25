import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "eliyanjacquet99@gmail.com";
// Domain verified in Resend - using custom domain
const FROM_EMAIL = "Cronos <noreply@getcronos.fr>";
// Support email for ticket replies - hosted on IONOS
const SUPPORT_EMAIL = "support@getcronos.fr";

// HTML escape helper to prevent XSS/injection in email templates
const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

interface EmailRequest {
  type: 
    | 'welcome' 
    | 'ticket_notification' 
    | 'ticket_confirmation'
    | 'gmail_connected'
    | 'campaign_sent'
    | 'campaign_scheduled'
    | 'campaign_reminder_2h'
    | 'payment_received_admin'
    | 'new_user_admin';
  to?: string;
  firstName?: string;
  subject?: string;
  description?: string;
  currentPage?: string;
  userEmail?: string;
  userId?: string;
  // Campaign fields
  emailsSent?: number;
  companiesContacted?: string[];
  scheduledTime?: string;
  scheduledDate?: string;
  // Ticket fields
  ticketId?: string;
  // Payment fields
  amount?: number;
  planType?: string;
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
      
      <p>Vous pouvez répondre directement à cet email si vous avez des informations supplémentaires à ajouter.</p>
      
      <p>En attendant, n'hésitez pas à consulter notre <a href="https://getcronos.fr/help">centre d'aide</a> qui peut peut-être répondre à votre question.</p>
      
      <p>Merci de votre confiance,<br>L'équipe Cronos</p>
    </div>
    <div class="footer">
      <p>© 2025 Cronos - Votre assistant de prospection</p>
      <p>Contact : <a href="mailto:support@getcronos.fr">support@getcronos.fr</a></p>
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

// Campaign sent - after immediate send
const getCampaignSentHtml = (data: EmailRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .stat-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center; border: 1px solid #e5e7eb; }
    .stat-number { font-size: 48px; font-weight: bold; color: #10b981; }
    .companies-list { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; max-height: 200px; overflow-y: auto; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Campagne envoyée !</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Vos emails de prospection ont été envoyés avec succès.</p>
      
      <div class="stat-box">
        <p class="stat-number">${data.emailsSent || 0}</p>
        <p>email(s) envoyé(s)</p>
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
      
      <p>Consultez votre tableau de bord pour suivre les réponses et planifier vos relances.</p>
      
      <p style="text-align: center; margin-top: 20px;">
        <a href="https://getcronos.fr/dashboard?tab=campagnes" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Voir mes campagnes
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

// Campaign scheduled - when user schedules for later
const getCampaignScheduledHtml = (data: EmailRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .schedule-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #3b82f6; }
    .schedule-date { font-size: 24px; font-weight: bold; color: #1d4ed8; }
    .schedule-time { font-size: 32px; font-weight: bold; color: #3b82f6; margin-top: 5px; }
    .stat-box { background: #eff6ff; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Campagne programmée</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Votre campagne de prospection a été programmée avec succès.</p>
      
      <div class="schedule-box">
        <p style="margin: 0; color: #6b7280;">Envoi prévu le</p>
        <p class="schedule-date">${data.scheduledDate || 'Date non spécifiée'}</p>
        <p class="schedule-time">à ${data.scheduledTime || 'Heure non spécifiée'}</p>
      </div>
      
      <div class="stat-box">
        <p style="margin: 0;"><strong>${data.emailsSent || 0}</strong> email(s) seront envoyés</p>
      </div>
      
      ${data.companiesContacted && data.companiesContacted.length > 0 ? `
      <p><strong>Entreprises ciblées :</strong> ${data.companiesContacted.slice(0, 5).join(', ')}${data.companiesContacted.length > 5 ? ` et ${data.companiesContacted.length - 5} autres` : ''}</p>
      ` : ''}
      
      <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
        💡 <strong>Vous pouvez annuler</strong> à tout moment depuis votre tableau de bord avant l'heure d'envoi.
      </p>
      
      <p style="text-align: center; margin-top: 20px;">
        <a href="https://getcronos.fr/dashboard?tab=emails-programmes" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Gérer mes emails programmés
        </a>
      </p>
      
      <p>À bientôt !<br>L'équipe Cronos</p>
    </div>
    <div class="footer">
      <p>© 2025 Cronos - Votre assistant de prospection</p>
    </div>
  </div>
</body>
</html>
`;

// Campaign reminder 2h before
const getCampaignReminder2hHtml = (data: EmailRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .countdown-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #f59e0b; }
    .countdown { font-size: 48px; font-weight: bold; color: #d97706; }
    .stat-box { background: #fffbeb; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
    .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Rappel : Envoi dans 2 heures</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Votre campagne de prospection programmée sera envoyée dans <strong>2 heures</strong>.</p>
      
      <div class="countdown-box">
        <p class="countdown">2h</p>
        <p style="margin: 0; color: #6b7280;">avant l'envoi</p>
        <p style="margin-top: 10px;"><strong>${data.scheduledTime || ''}</strong></p>
      </div>
      
      <div class="stat-box">
        <p style="margin: 0;"><strong>${data.emailsSent || 0}</strong> email(s) seront envoyés</p>
      </div>
      
      <div class="warning-box">
        <p style="margin: 0;"><strong>⚠️ Besoin de modifier ou annuler ?</strong></p>
        <p style="margin: 5px 0 0 0;">Vous avez encore le temps de modifier ou annuler cet envoi depuis votre tableau de bord.</p>
      </div>
      
      <p style="text-align: center; margin-top: 20px;">
        <a href="https://getcronos.fr/dashboard?tab=emails-programmes" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Voir mes emails programmés
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

// ============= MAIN HANDLER =============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: EmailRequest = await req.json();
    console.log(`Processing email type: ${data.type}`);

    let emailConfig: { to: string; subject: string; html: string; replyTo?: string } | null = null;

    switch (data.type) {
      case "welcome":
        emailConfig = {
          to: data.to!,
          subject: "🎉 Bienvenue sur Cronos !",
          html: getWelcomeEmailHtml(data.firstName || ""),
        };
        break;

      case "ticket_notification":
        emailConfig = {
          to: ADMIN_EMAIL,
          subject: `🎫 Nouveau ticket: ${data.subject}`,
          html: getTicketNotificationHtml(data),
        };
        break;

      case "ticket_confirmation":
        emailConfig = {
          to: data.to || data.userEmail!,
          subject: "🎫 Ticket reçu - Cronos Support",
          html: getTicketConfirmationHtml(data),
          replyTo: SUPPORT_EMAIL,
        };
        break;

      case "gmail_connected":
        emailConfig = {
          to: data.to || data.userEmail!,
          subject: "🔗 Gmail connecté à Cronos",
          html: getGmailConnectedHtml(data.userEmail || ""),
        };
        break;

      case "campaign_sent":
        emailConfig = {
          to: data.to || data.userEmail!,
          subject: `🚀 Campagne envoyée : ${data.emailsSent || 0} email(s)`,
          html: getCampaignSentHtml(data),
        };
        break;

      case "campaign_scheduled":
        emailConfig = {
          to: data.to || data.userEmail!,
          subject: `📅 Campagne programmée pour le ${data.scheduledDate}`,
          html: getCampaignScheduledHtml(data),
        };
        break;

      case "campaign_reminder_2h":
        emailConfig = {
          to: data.to || data.userEmail!,
          subject: `⏰ Rappel : Votre campagne part dans 2 heures`,
          html: getCampaignReminder2hHtml(data),
        };
        break;

      case "payment_received_admin":
        emailConfig = {
          to: ADMIN_EMAIL,
          subject: `💰 Paiement reçu: ${((data.amount || 0) / 100).toFixed(2)}€`,
          html: getPaymentReceivedAdminHtml(data),
        };
        break;

      case "new_user_admin":
        emailConfig = {
          to: ADMIN_EMAIL,
          subject: `👤 Nouvel utilisateur: ${data.userEmail}`,
          html: getNewUserAdminHtml(data),
        };
        break;

      default:
        throw new Error(`Unknown email type: ${data.type}`);
    }

    if (!emailConfig) {
      throw new Error("Email configuration not set");
    }

    console.log(`Sending email to: ${emailConfig.to}`);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: emailConfig.to,
      subject: emailConfig.subject,
      html: emailConfig.html,
      ...(emailConfig.replyTo && { reply_to: emailConfig.replyTo }),
    });

    console.log(`Email sent successfully:`, result);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
