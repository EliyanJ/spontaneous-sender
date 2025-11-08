import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Eye, Send } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CompanyEmail {
  id: string;
  nom: string;
  selected_email: string | null;
  emails: any;
  status: string | null;
}

export const ContactEmails = () => {
  const [companies, setCompanies] = useState<CompanyEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingDrafts, setCreatingDrafts] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("companies")
        .select("id, nom, selected_email, emails, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Cast emails to string[] for display
      const formattedData = (data || []).map(company => ({
        ...company,
        emails: Array.isArray(company.emails) ? company.emails : []
      }));
      
      setCompanies(formattedData);
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les emails",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGmailDrafts = async () => {
    try {
      setCreatingDrafts(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté",
          variant: "destructive",
        });
        return;
      }

      // Appeler l'edge function pour obtenir l'URL d'autorisation
      const { data, error } = await supabase.functions.invoke("create-gmail-drafts", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.authUrl) {
        // Rediriger vers Google OAuth
        window.location.href = data.authUrl;
      } else if (data.results) {
        // Les brouillons ont été créés
        toast({
          title: "Succès",
          description: data.message,
        });
        await loadCompanies();
      }
    } catch (error) {
      console.error("Erreur création brouillons:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer les brouillons Gmail",
        variant: "destructive",
      });
    } finally {
      setCreatingDrafts(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary">Non défini</Badge>;

    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      "not sent": { label: "Non envoyé", variant: "secondary" },
      "sent": { label: "Envoyé", variant: "default" },
      "replied": { label: "Répondu", variant: "outline" },
      "draft created": { label: "Brouillon créé", variant: "outline" },
    };

    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Emails de contact</h2>
          <p className="text-muted-foreground mt-2">
            Liste des entreprises avec leurs emails de contact
          </p>
        </div>
        <Button
          onClick={handleCreateGmailDrafts}
          disabled={creatingDrafts || companies.filter(c => c.status === "not sent" && c.selected_email).length === 0}
          className="gap-2"
        >
          {creatingDrafts ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Création en cours...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Créer les brouillons Gmail
            </>
          )}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Entreprise</TableHead>
              <TableHead className="w-[250px]">Email sélectionné</TableHead>
              <TableHead className="w-[150px]">Statut</TableHead>
              <TableHead className="w-[150px]">Autres emails</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Aucune entreprise avec des emails trouvés
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.nom}</TableCell>
                  <TableCell>
                    {company.selected_email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{company.selected_email}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(company.status)}</TableCell>
                  <TableCell>
                    {company.emails && company.emails.length > 1 ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8">
                            <Eye className="h-4 w-4 mr-1" />
                            Voir ({company.emails.length})
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Tous les emails trouvés:</h4>
                            <div className="space-y-1">
                              {company.emails.map((email: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <span>{email}</span>
                                  {email === company.selected_email && (
                                    <Badge variant="outline" className="text-xs">
                                      Sélectionné
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : company.emails && company.emails.length === 1 ? (
                      <span className="text-sm text-muted-foreground">1 seul email</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {companies.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Total: {companies.length} entreprise{companies.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};
