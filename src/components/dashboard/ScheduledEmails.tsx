import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Clock, Mail, Trash2, Calendar } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ScheduledEmail {
  id: string;
  gmail_draft_id: string;
  subject: string;
  recipients: string[];
  scheduled_for: string;
  status: string;
  created_at: string;
  notify_on_sent: boolean;
}

export const ScheduledEmails = () => {
  const [emails, setEmails] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    loadScheduledEmails();
    processScheduledEmails();

    // Écouter les nouveaux emails programmés
    const handleEmailScheduled = () => {
      loadScheduledEmails();
    };
    window.addEventListener('email-scheduled', handleEmailScheduled);

    // Recharger et traiter les emails toutes les 30 secondes
    const interval = setInterval(() => {
      loadScheduledEmails();
      processScheduledEmails();
    }, 30000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('email-scheduled', handleEmailScheduled);
    };
  }, []);

  const processScheduledEmails = async () => {
    try {
      await supabase.functions.invoke('process-scheduled-emails');
    } catch (error) {
      console.error('Erreur lors du traitement des emails programmés:', error);
    }
  };

  const loadScheduledEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_emails')
        .select('*')
        .in('status', ['pending'])
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error loading scheduled emails:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les emails programmés.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEmail = async (emailId: string, draftId: string) => {
    setCancelling(emailId);
    try {
      // Supprimer le brouillon Gmail
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const { data: tokenData } = await supabase
        .from('gmail_tokens')
        .select('access_token')
        .single();

      if (tokenData) {
        await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
            },
          }
        );
      }

      // Mettre à jour le statut
      const { error } = await supabase
        .from('scheduled_emails')
        .update({ status: 'cancelled' })
        .eq('id', emailId);

      if (error) throw error;

      toast({
        title: "Email annulé",
        description: "L'email programmé a été annulé.",
      });

      loadScheduledEmails();
    } catch (error: any) {
      console.error('Error cancelling email:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'annuler l'email.",
        variant: "destructive",
      });
    } finally {
      setCancelling(null);
    }
  };

  const getTimeUntilSend = (scheduledFor: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledFor);
    const diff = scheduled.getTime() - now.getTime();

    if (diff < 0) return "En cours d'envoi...";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Dans ${days} jour${days > 1 ? 's' : ''}`;
    }

    if (hours > 0) {
      return `Dans ${hours}h ${minutes}min`;
    }

    return `Dans ${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Emails programmés ({emails.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {emails.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucun email programmé</p>
          </div>
        ) : (
          <div className="space-y-3">
            {emails.map((email) => (
              <div
                key={email.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{email.subject}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Destinataires: {email.recipients.join(', ')}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {getTimeUntilSend(email.scheduled_for)}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(email.scheduled_for).toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={cancelling === email.id}
                    >
                      {cancelling === email.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Annuler cet email ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        L'email programmé "{email.subject}" ne sera pas envoyé.
                        Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Retour</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleCancelEmail(email.id, email.gmail_draft_id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Annuler l'email
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
