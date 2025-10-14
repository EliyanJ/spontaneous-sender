import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Loader2 } from "lucide-react";

interface CampaignEditorProps {
  campaignId: string;
  onBack: () => void;
}

export function CampaignEditor({ campaignId, onBack }: CampaignEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      toast({
        title: "Campagne mise à jour",
        description: "Les modifications ont été enregistrées.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la campagne.",
        variant: "destructive",
      });
    },
  });

  const sendCampaign = async () => {
    if (!campaign || !companies) return;

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-campaign-emails", {
        body: { campaignId },
      });

      if (error) throw error;

      toast({
        title: "Campagne lancée",
        description: `L'envoi des emails a démarré.`,
      });

      updateCampaign.mutate({ status: "running" });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de lancer la campagne.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading || !campaign) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const companiesWithEmails = companies?.filter(c => {
    const emails = c.emails as any[];
    return emails && Array.isArray(emails) && emails.length > 0;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{campaign.name}</h2>
          <p className="text-sm text-muted-foreground">
            Éditeur de campagne email
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuration de la campagne</CardTitle>
            <CardDescription>
              Personnalisez le contenu de vos emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la campagne</Label>
              <Input
                id="name"
                value={campaign.name}
                onChange={(e) =>
                  updateCampaign.mutate({ name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Objet de l'email</Label>
              <Input
                id="subject"
                value={campaign.subject}
                onChange={(e) =>
                  updateCampaign.mutate({ subject: e.target.value })
                }
                placeholder="Ex: Proposition de collaboration"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Corps de l'email</Label>
              <Textarea
                id="body"
                value={campaign.body_template}
                onChange={(e) =>
                  updateCampaign.mutate({ body_template: e.target.value })
                }
                rows={10}
                placeholder="Bonjour,&#10;&#10;Je me permets de vous contacter...&#10;&#10;Variables disponibles: {company_name}, {company_city}"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emails_per_day">Emails par jour</Label>
                <Input
                  id="emails_per_day"
                  type="number"
                  value={campaign.emails_per_day}
                  onChange={(e) =>
                    updateCampaign.mutate({
                      emails_per_day: parseInt(e.target.value),
                    })
                  }
                  min="1"
                  max="100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delay">Délai entre emails (min)</Label>
                <Input
                  id="delay"
                  type="number"
                  value={campaign.delay_between_emails}
                  onChange={(e) =>
                    updateCampaign.mutate({
                      delay_between_emails: parseInt(e.target.value),
                    })
                  }
                  min="1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistiques</CardTitle>
            <CardDescription>
              Suivi de votre campagne
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <div className="text-2xl font-bold text-primary">
                  {companiesWithEmails.length}
                </div>
                <p className="text-sm text-muted-foreground">
                  Entreprises avec emails
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="text-2xl font-bold">
                  {campaign.sent_emails || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Emails envoyés
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="text-2xl font-bold text-green-600">
                  {campaign.total_emails - campaign.sent_emails - campaign.failed_emails || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  En attente
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="text-2xl font-bold text-red-600">
                  {campaign.failed_emails || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Échecs
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Statut</span>
                <span className="font-medium capitalize">{campaign.status}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Créée le</span>
                <span className="font-medium">
                  {new Date(campaign.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>

            <Button
              onClick={sendCampaign}
              disabled={isSending || campaign.status === "running" || companiesWithEmails.length === 0}
              className="w-full"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Lancement en cours...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Lancer la campagne
                </>
              )}
            </Button>

            {companiesWithEmails.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Aucune entreprise avec email trouvée.
                Recherchez d'abord des entreprises et trouvez leurs emails.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
