import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Mail, Trash2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CampaignEditor } from "./CampaignEditor";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  sent_emails: number;
  total_emails: number;
  created_at: string;
}

export const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");

  const fetchCampaigns = async () => {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setCampaigns(data);
  };

  const createCampaign = async () => {
    if (!name || !subject || !bodyTemplate) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("campaigns").insert({
        user_id: user.id,
        name,
        subject,
        body_template: bodyTemplate,
        status: "draft",
      });

      if (error) throw error;

      toast.success("Campagne créée");
      setName("");
      setSubject("");
      setBodyTemplate("");
      setShowForm(false);
      fetchCampaigns();
    } catch (error) {
      toast.error("Erreur lors de la création");
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setCampaigns(campaigns.filter(c => c.id !== id));
      toast.success("Campagne supprimée");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  if (selectedCampaignId) {
    return (
      <CampaignEditor
        campaignId={selectedCampaignId}
        onBack={() => setSelectedCampaignId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-background pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Mail className="h-6 w-6 text-primary" />
                Campagnes d'emailing
              </CardTitle>
              <CardDescription>Gérez vos campagnes de prospection par email</CardDescription>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle campagne
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="space-y-4 mb-6 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label>Nom de la campagne</Label>
                <Input
                  placeholder="Prospection IT Paris"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Objet de l'email</Label>
                <Input
                  placeholder="Candidature spontanée"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Corps de l'email</Label>
                <Textarea
                  placeholder="Bonjour,&#10;&#10;Je me permets de vous contacter...&#10;&#10;Variables disponibles: {nom_entreprise}, {prenom}, {nom}"
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  rows={8}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createCampaign}>Créer</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {campaigns.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucune campagne créée
              </p>
            ) : (
              campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="group flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
                  onClick={() => setSelectedCampaignId(campaign.id)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        {campaign.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        📧 {campaign.subject}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-xs text-muted-foreground">
                          ✉️ {campaign.sent_emails}/{campaign.total_emails} envoyés
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          campaign.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          campaign.status === 'sending' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                          'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCampaignId(campaign.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCampaign(campaign.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
