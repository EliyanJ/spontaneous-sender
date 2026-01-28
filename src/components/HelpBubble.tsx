import { useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { HelpCircle, Loader2, Send, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const HelpBubble = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Vous devez être connecté pour envoyer un ticket");
      return;
    }

    if (!subject.trim() || !description.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    try {
      // Insert ticket into database
      const { error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: subject.trim(),
          description: description.trim(),
          current_page: location.pathname,
        });

      if (ticketError) throw ticketError;

      // Send notification email
      try {
        await supabase.functions.invoke('send-system-email', {
          body: {
            type: 'ticket_notification',
            subject: subject.trim(),
            description: description.trim(),
            currentPage: location.pathname,
            userEmail: user.email,
            userId: user.id,
          },
        });
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }

      setSubmitted(true);
      toast.success("Ticket envoyé avec succès !");

      // Reset after 2 seconds
      setTimeout(() => {
        setSubmitted(false);
        setSubject("");
        setDescription("");
        setOpen(false);
      }, 2000);

    } catch (error: any) {
      console.error('Ticket submission error:', error);
      toast.error(error.message || "Erreur lors de l'envoi du ticket");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50 bg-primary hover:bg-primary/90"
        >
          <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Besoin d'aide ?
          </DialogTitle>
          <DialogDescription>
            Envoyez-nous un message et nous vous répondrons rapidement.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-primary" />
            <p className="text-lg font-medium text-center">Ticket envoyé !</p>
            <p className="text-sm text-muted-foreground text-center">
              Nous vous répondrons dès que possible.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Sujet</Label>
              <Input
                id="subject"
                placeholder="Décrivez brièvement votre problème"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={loading}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Donnez-nous plus de détails sur votre problème ou suggestion..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={5}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/2000
              </p>
            </div>

            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              📍 Page actuelle: <code>{location.pathname}</code>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer le ticket
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};