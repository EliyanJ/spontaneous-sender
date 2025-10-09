import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  siren: string;
  siret: string;
  nom: string;
  adresse: string;
  code_postal: string;
  ville: string;
  code_ape: string;
  libelle_ape: string;
  nature_juridique: string;
  tranche_effectif: string;
}

export const SearchCompanies = () => {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [codeApe, setCodeApe] = useState("");
  const [ville, setVille] = useState("");
  const [trancheEffectif, setTrancheEffectif] = useState("");
  const [minResults, setMinResults] = useState("300");

  const handleSearch = async () => {
    if (!codeApe && !ville) {
      toast.error("Veuillez renseigner au moins un critère de recherche");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (codeApe) params.append("activite_principale", codeApe);
      if (ville) params.append("code_commune", ville);
      if (trancheEffectif) params.append("tranche_effectif_salarie", trancheEffectif);
      params.append("per_page", "100");
      params.append("nature_juridique", "EXCL:1000"); // Exclure auto-entrepreneurs
      
      const minResultsNum = parseInt(minResults) || 300;
      const fetchLimit = Math.ceil(minResultsNum * 6); // x6 multiplier
      
      let allResults: Company[] = [];
      let page = 1;
      
      while (allResults.length < fetchLimit) {
        params.set("page", page.toString());
        const response = await fetch(
          `https://recherche-entreprises.api.gouv.fr/search?${params.toString()}`
        );
        
        if (!response.ok) throw new Error("Erreur API");
        
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) break;
        
        const formatted = data.results.map((r: any) => ({
          siren: r.siren,
          siret: r.siege?.siret || r.siren,
          nom: r.nom_complet || r.nom_raison_sociale,
          adresse: r.siege?.adresse || "",
          code_postal: r.siege?.code_postal || "",
          ville: r.siege?.libelle_commune || "",
          code_ape: r.activite_principale || "",
          libelle_ape: r.libelle_activite_principale || "",
          nature_juridique: r.nature_juridique || "",
          tranche_effectif: r.tranche_effectif_salarie || "",
        }));
        
        allResults = [...allResults, ...formatted];
        page++;
        
        if (data.total_results < page * 100) break;
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Randomize and limit
      const shuffled = allResults.sort(() => Math.random() - 0.5);
      setCompanies(shuffled.slice(0, minResultsNum));
      
      toast.success(`${shuffled.slice(0, minResultsNum).length} entreprises trouvées`);
    } catch (error) {
      toast.error("Erreur lors de la recherche");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const saveCompany = async (company: Company) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("companies").insert({
        user_id: user.id,
        siren: company.siren,
        siret: company.siret,
        nom: company.nom,
        adresse: company.adresse,
        code_postal: company.code_postal,
        ville: company.ville,
        code_ape: company.code_ape,
        libelle_ape: company.libelle_ape,
        nature_juridique: company.nature_juridique,
        tranche_effectif: company.tranche_effectif,
      });

      if (error) throw error;
      toast.success("Entreprise sauvegardée");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rechercher des entreprises</CardTitle>
          <CardDescription>Utilisez les filtres pour trouver vos prospects</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Code APE (ex: 62.01Z)</Label>
              <Input
                placeholder="62.01Z"
                value={codeApe}
                onChange={(e) => setCodeApe(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ville ou Code Postal</Label>
              <Input
                placeholder="Paris, 75001..."
                value={ville}
                onChange={(e) => setVille(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tranche d'effectif</Label>
              <Select value={trancheEffectif} onValueChange={setTrancheEffectif}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="00">0 salarié</SelectItem>
                  <SelectItem value="01">1 ou 2 salariés</SelectItem>
                  <SelectItem value="02">3 à 5 salariés</SelectItem>
                  <SelectItem value="03">6 à 9 salariés</SelectItem>
                  <SelectItem value="11">10 à 19 salariés</SelectItem>
                  <SelectItem value="12">20 à 49 salariés</SelectItem>
                  <SelectItem value="21">50 à 99 salariés</SelectItem>
                  <SelectItem value="22">100 à 199 salariés</SelectItem>
                  <SelectItem value="32">200 à 249 salariés</SelectItem>
                  <SelectItem value="41">250 à 499 salariés</SelectItem>
                  <SelectItem value="42">500 à 999 salariés</SelectItem>
                  <SelectItem value="51">1000 à 1999 salariés</SelectItem>
                  <SelectItem value="52">2000 à 4999 salariés</SelectItem>
                  <SelectItem value="53">5000 salariés et plus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Résultats minimum souhaités</Label>
              <Input
                type="number"
                placeholder="300"
                value={minResults}
                onChange={(e) => setMinResults(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleSearch} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recherche en cours...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Rechercher
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {companies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats ({companies.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {companies.map((company) => (
                <div
                  key={company.siret}
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
                      SIREN: {company.siren} | Effectif: {company.tranche_effectif}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveCompany(company)}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
