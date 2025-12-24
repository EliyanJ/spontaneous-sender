import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "eliyanjacquet99@gmail.com";
const FROM_EMAIL = "Cronos <onboarding@resend.dev>";

interface EmailRequest {
  type: 'welcome' | 'ticket_notification' | 'email_reminder' | 'response_detected';
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
}

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