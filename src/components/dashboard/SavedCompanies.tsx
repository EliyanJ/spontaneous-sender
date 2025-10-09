import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Building2 } from "lucide-react";
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
}

export const SavedCompanies = () => {
  const [companies, setCompanies] = useState<SavedCompany[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
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

  useEffect(() => {
    fetchCompanies();
  }, []);

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Entreprises sauvegardées ({companies.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {companies.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucune entreprise sauvegardée
          </p>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {companies.map((company) => (
              <div
                key={company.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex-1">
                  <h3 className="font-semibold">{company.nom}</h3>
                  <p className="text-sm text-muted-foreground">
                    {company.adresse}, {company.code_postal} {company.ville}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    APE: {company.code_ape} - {company.libelle_ape}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    SIREN: {company.siren}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteCompany(company.id)}
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
