import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Save, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVITY_SECTORS } from "@/lib/activity-sectors";

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

// Helpers d'effectif: transforme une tranche en estimation stable par entreprise
const TRANCHE_RANGES: Record<string, [number, number, string]> = {
  "00": [0, 0, "0"],
  "01": [1, 2, "1-2"],
  "02": [3, 5, "3-5"],
  "03": [6, 9, "6-9"],
  "11": [10, 19, "10-19"],
  "12": [20, 49, "20-49"],
  "21": [50, 99, "50-99"],
  "22": [100, 199, "100-199"],
  "32": [200, 249, "200-249"],
  "41": [250, 499, "250-499"],
  "42": [500, 999, "500-999"],
  "51": [1000, 1999, "1000-1999"],
  "52": [2000, 4999, "2000-4999"],
  "53": [5000, 8000, "5000+"],
};

function hashString(str: string) {
  let h = 5381; for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return h >>> 0;
}
function seededBetween(seed: string, min: number, max: number) {
  if (min >= max) return min;
  const h = hashString(seed);
  return min + (h % (max - min + 1));
}
function prettyEstimate(code: string, siren: string) {
  const r = TRANCHE_RANGES[code]; if (!r) return "n.c.";
  const [min, max, label] = r;
  if (min === max) return label;
  const val = seededBetween(siren, min, max);
  return `${val} (~${label})`;
}

export const SearchCompanies = () => {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sector, setSector] = useState("");
  const [ville, setVille] = useState("");
  const [trancheEffectif, setTrancheEffectif] = useState("");
  const [minResults, setMinResults] = useState("20");
  const [blacklistedSirens, setBlacklistedSirens] = useState<string[]>([]);

  useEffect(() => {
    const fetchBlacklist = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_company_blacklist")
        .select("company_siren");
      
      if (data) {
        setBlacklistedSirens(data.map(b => b.company_siren));
      }
    };
    fetchBlacklist();
  }, []);

  const handleSearch = async () => {
    if (!sector && !ville) {
      toast.error("Veuillez renseigner au moins un critère de recherche");
      return;
    }

    const minResultsNum = parseInt(minResults) || 20;
    if (minResultsNum < 1 || minResultsNum > 50) {
      toast.error("Le nombre de résultats doit être entre 1 et 50");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Gérer les codes APE du secteur sélectionné
      if (sector) {
        const selectedSector = ACTIVITY_SECTORS.find(s => s.label === sector);
        if (selectedSector && selectedSector.codes.length > 0) {
          // On utilise le premier code APE du secteur pour la recherche
          params.append("activite_principale", selectedSector.codes[0]);
        }
      }
      
      if (ville) {
        if (/^\d+$/.test(ville)) {
          params.append("code_postal", ville);
        } else {
          params.append("q", ville);
        }
      }
      
      if (trancheEffectif) params.append("tranche_effectif_salarie", trancheEffectif);
      params.append("per_page", "25");
      
      const fetchLimit = Math.ceil(minResultsNum * 8);
      let allResults: Company[] = [];
      let page = 1;
      
      while (allResults.length < fetchLimit && page <= 20) {
        params.set("page", page.toString());
        const response = await fetch(
          `https://recherche-entreprises.api.gouv.fr/search?${params.toString()}`
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.erreur || "Erreur API");
        }
        
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
        
        if (data.total_results < page * 25) break;
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Filtrage strict géographique
      let filtered = allResults;
      if (ville) {
        if (/^\d+$/.test(ville)) {
          // Filtre strict sur le code postal
          filtered = filtered.filter(c => c.code_postal === ville);
        } else {
          // Filtre strict sur le nom de ville (insensible à la casse)
          const villeNormalized = ville.toLowerCase().trim();
          filtered = filtered.filter(c => 
            c.ville.toLowerCase().trim() === villeNormalized
          );
        }
      }
      
      // Exclure les auto-entrepreneurs
      filtered = filtered.filter(c => c.nature_juridique !== "1000");
      
      // Exclure les entreprises blacklistées
      filtered = filtered.filter(c => !blacklistedSirens.includes(c.siren));
      
      // Filtrer pour n'avoir que les entreprises avec minimum 20 salariés
      const minEffectifTranches = ["12", "21", "22", "32", "41", "42", "51", "52", "53"];
      filtered = filtered.filter(c => minEffectifTranches.includes(c.tranche_effectif));
      
      // Filtrer par secteur (tous les codes APE du secteur)
      if (sector) {
        const selectedSector = ACTIVITY_SECTORS.find(s => s.label === sector);
        if (selectedSector) {
          filtered = filtered.filter(c => 
            selectedSector.codes.includes(c.code_ape)
          );
        }
      }
      
      // Mélanger et limiter
      const shuffled = filtered.sort(() => Math.random() - 0.5);
      const final = shuffled.slice(0, minResultsNum);
      
      setCompanies(final);
      toast.success(`${final.length} entreprise(s) trouvée(s)`);
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
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-background pb-4">
          <CardTitle className="text-2xl">Rechercher des entreprises</CardTitle>
          <CardDescription>Utilisez les filtres pour cibler vos prospects (20 salariés minimum)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Secteur d'activité</Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Choisir un secteur" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {ACTIVITY_SECTORS.map((s) => (
                    <SelectItem key={s.label} value={s.label}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ville ou Code Postal (filtrage strict)</Label>
              <Input
                placeholder="Paris, 75001..."
                value={ville}
                onChange={(e) => setVille(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tranche d'effectif (minimum 20 salariés)</Label>
              <Select value={trancheEffectif} onValueChange={setTrancheEffectif}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les tranches (20+)" />
                </SelectTrigger>
                <SelectContent>
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
              <Label>Nombre de résultats (1-50)</Label>
              <Input
                type="number"
                min="1"
                max="50"
                placeholder="20"
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
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-background pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Résultats de recherche ({companies.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {companies.map((company) => (
                <div
                  key={company.siret}
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
                    <p className="text-sm font-medium text-primary">
                      👥 Effectif estimé: {prettyEstimate(company.tranche_effectif, company.siren)}
                    </p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => saveCompany(company)}
                    className="ml-4"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
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
