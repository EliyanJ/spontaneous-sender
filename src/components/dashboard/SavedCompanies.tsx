import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Building2, Mail, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SavedCompany {
  id: string;
  siren: string;
  nom: string;
  adresse: string;
  code_postal: string;
  ville: string;
  code_ape: string;
  libelle_ape: string;
  created_at: string;
  emails: string[];
  website_url: string | null;
}

export const SavedCompanies = () => {
  const [companies, setCompanies] = useState<SavedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchingEmails, setSearchingEmails] = useState(false);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const mappedData = (data || []).map(company => ({
        ...company,
        emails: (company.emails as string[]) || []
      }));
      
      setCompanies(mappedData as SavedCompany[]);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setCompanies(companies.filter(c => c.id !== id));
      toast.success("Entreprise supprimée");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const findAllEmails = async () => {
    setSearchingEmails(true);
    toast.info("Recherche des emails en cours...");
    
    try {
      const { data, error } = await supabase.functions.invoke("find-company-emails");

      if (error) throw error;

      toast.success(
        `${data.totalEmailsFound} emails trouvés pour ${data.companiesUpdated} entreprises`
      );
      
      // Rafraîchir la liste
      await fetchCompanies();
    } catch (error) {
      console.error("Error finding emails:", error);
      toast.error("Erreur lors de la recherche des emails");
    } finally {
      setSearchingEmails(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="bg-gradient-to-r from-muted/50 to-background pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Building2 className="h-6 w-6 text-primary" />
            Entreprises sauvegardées ({companies.length})
          </CardTitle>
          {companies.length > 0 && (
            <Button
              onClick={findAllEmails}
              disabled={searchingEmails}
              size="sm"
            >
              {searchingEmails ? (
                <>
                  <Search className="h-4 w-4 mr-2 animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Rechercher emails
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {companies.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucune entreprise sauvegardée
          </p>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {companies.map((company) => (
              <div
                key={company.id}
                className="group relative flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                    {company.nom}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    📍 {company.adresse}, {company.code_postal} {company.ville}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    🏢 APE: {company.code_ape} - {company.libelle_ape}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    🔢 SIREN: {company.siren}
                  </p>
                  {company.website_url && (
                    <p className="text-sm text-primary font-medium">
                      🌐 {company.website_url}
                    </p>
                  )}
                  {company.emails && company.emails.length > 0 && (
                    <div className="mt-2 flex items-start gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <Mail className="h-4 w-4 mt-0.5 text-green-600" />
                      <div className="flex flex-col gap-1">
                        {company.emails.map((email, idx) => (
                          <span key={idx} className="text-sm text-green-600 font-medium">
                            {email}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteCompany(company.id)}
                  className="ml-4"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
