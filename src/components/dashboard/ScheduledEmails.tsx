import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Clock, Mail, Trash2, Calendar, CheckCircle, AlertCircle } from "lucide-react";
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
  email_body?: string;
}

export const ScheduledEmails = () => {
  const [emails, setEmails] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<Record<string, string>>({});

  const loadScheduledEmails = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_emails')
        .select('*')
        .eq('status', 'pending')
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
  }, []);

  // Calculer le temps restant pour chaque email
  const updateTimeLeft = useCallback(() => {
    const newTimeLeft: Record<string, string> = {};
    
    emails.forEach(email => {
      const now = new Date();
      const scheduled = new Date(email.scheduled_for);
      const diff = scheduled.getTime() - now.getTime();

      if (diff <= 0) {
        newTimeLeft[email.id] = "Envoi en cours...";
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (hours > 24) {
          const days = Math.floor(hours / 24);
          newTimeLeft[email.id] = `${days}j ${hours % 24}h`;
        } else if (hours > 0) {
          newTimeLeft[email.id] = `${hours}h ${minutes}min`;
        } else if (minutes > 0) {
          newTimeLeft[email.id] = `${minutes}min ${seconds}s`;
        } else {
          newTimeLeft[email.id] = `${seconds}s`;
        }
      }
    });

    setTimeLeft(newTimeLeft);
  }, [emails]);

  useEffect(() => {
    loadScheduledEmails();

    // Écouter les nouveaux emails programmés
    const handleEmailScheduled = () => {
      loadScheduledEmails();
    };
    window.addEventListener('email-scheduled', handleEmailScheduled);

    // Recharger les emails toutes les 30 secondes
    const reloadInterval = setInterval(loadScheduledEmails, 30000);

    return () => {
      clearInterval(reloadInterval);
      window.removeEventListener('email-scheduled', handleEmailScheduled);
    };
  }, [loadScheduledEmails]);

  // Mettre à jour le temps restant chaque seconde
  useEffect(() => {
    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [updateTimeLeft]);

  const handleCancelEmail = async (emailId: string) => {
    setCancelling(emailId);
    try {
      // Mettre à jour le statut dans la DB
      const { error } = await supabase
        .from('scheduled_emails')
        .update({ status: 'cancelled' })
        .eq('id', emailId);

      if (error) throw error;

      toast({
        title: "Email annulé",
        description: "L'email programmé a été annulé avec succès.",
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

  const getStatusBadge = (status: string, scheduledFor: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledFor);
    const isImminent = scheduled.getTime() - now.getTime() < 60000; // Moins d'1 minute

    if (isImminent && status === 'pending') {
      return (
        <Badge variant="default" className="gap-1 bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle className="h-3 w-3 animate-pulse" />
          Envoi imminent
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        {timeLeft[scheduledFor] || 'Calcul...'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          Emails programmés
          {emails.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {emails.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {emails.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground">Aucun email programmé</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Les emails programmés apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {emails.map((email) => (
              <div
                key={email.id}
                className="group flex items-start justify-between p-4 border border-border/50 rounded-xl hover:bg-accent/5 transition-all duration-200"
              >
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium truncate">{email.subject}</span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground truncate pl-6">
                    → {email.recipients.join(', ')}
                  </p>
                  
                  <div className="flex items-center gap-3 pl-6">
                    <Badge 
                      variant="outline" 
                      className="gap-1 bg-primary/5 border-primary/20 text-primary"
                    >
                      <Clock className="h-3 w-3" />
                      {timeLeft[email.id] || 'Calcul...'}
                    </Badge>
                    
                    <span className="text-xs text-muted-foreground">
                      {new Date(email.scheduled_for).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>

                    {email.notify_on_sent && (
                      <Badge variant="secondary" className="text-xs">
                        Notification
                      </Badge>
                    )}
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={cancelling === email.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
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
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        Annuler cet email ?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        L'email programmé "<span className="font-medium">{email.subject}</span>" ne sera pas envoyé.
                        Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Retour</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleCancelEmail(email.id)}
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