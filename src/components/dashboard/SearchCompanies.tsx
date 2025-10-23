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
  nom_commercial?: string;
  adresse: string;
  code_postal: string;
  ville: string;
  code_ape: string;
  libelle_ape: string;
  nature_juridique: string;
  effectif_code: string;
  date_creation?: string;
  categorie_entreprise?: string;
  nombre_etablissements?: number;
  dirigeant_nom?: string;
  dirigeant_prenoms?: string;
  dirigeant_fonction?: string;
  website_url?: string | null;
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

export const SearchCompanies = ({ onSavedAll }: { onSavedAll?: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sector, setSector] = useState("");
  const [ville, setVille] = useState("");
  const [minResults, setMinResults] = useState("20");
  const handleSearch = async () => {
    if (!sector && !ville) {
      toast.error("Veuillez renseigner au moins un critère de recherche");
      return;
    }

    const minResultsNum = parseInt(minResults) || 20;
    if (minResultsNum < 1 || minResultsNum > 100) {
      toast.error("Le nombre de résultats doit être entre 1 et 100");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté");
        return;
      }

      // Appel à l'Edge Function de recherche
      const searchPayload: any = {
        nombre: minResultsNum,
        userId: user.id,
      };

      // Code APE du secteur
      if (sector) {
        const selectedSector = ACTIVITY_SECTORS.find(s => s.label === sector);
        if (selectedSector && selectedSector.codes.length > 0) {
          searchPayload.codeApe = selectedSector.codes[0];
        }
      }

      // Localisation
      if (ville) {
        searchPayload.location = ville;
      }

      console.log('Recherche avec:', searchPayload);
      toast.info("Recherche en cours avec randomisation...");

      const { data: searchData, error: searchError } = await supabase.functions.invoke(
        'search-companies',
        { body: searchPayload }
      );

      if (searchError) throw searchError;
      if (!searchData.success) throw new Error(searchData.error);

      let results = searchData.data || [];
      console.log(`${results.length} entreprises trouvées`);


      setCompanies(results);
      toast.success(`${results.length} entreprise(s) trouvée(s)`);

    } catch (error) {
      console.error('Erreur recherche:', error);
      toast.error("Erreur lors de la recherche");
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
        tranche_effectif: company.effectif_code,
        website_url: company.website_url,
      });

      if (error) throw error;
      toast.success("Entreprise sauvegardée");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const saveAllCompanies = async () => {
    if (companies.length === 0) {
      toast.error("Aucun résultat à sauvegarder");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer les SIREN déjà sauvegardés pour éviter les doublons
      const { data: existing, error: existingError } = await supabase
        .from('companies')
        .select('siren')
        .eq('user_id', user.id);
      if (existingError) throw existingError;

      const existingSirens = new Set((existing || []).map((c: any) => c.siren));
      const uniqueBySiren = new Map<string, any>();
      for (const company of companies) {
        if (!uniqueBySiren.has(company.siren)) uniqueBySiren.set(company.siren, company);
      }

      const toInsert = Array.from(uniqueBySiren.values())
        .filter(c => !existingSirens.has(c.siren))
        .map(company => ({
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
          tranche_effectif: company.effectif_code,
          website_url: company.website_url ?? null,
        }));

      if (toInsert.length === 0) {
        toast.info('Tout est déjà sauvegardé');
        onSavedAll?.();
        return;
      }

      const { error } = await supabase.from('companies').insert(toInsert);
      if (error) throw error;

      toast.success(`${toInsert.length} entreprise(s) sauvegardée(s)`);
      setCompanies([]);
      onSavedAll?.();
    } catch (error: any) {
      toast.error('Erreur lors de la sauvegarde');
      console.error(error);
    } finally {
      setLoading(false);
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
              <Label>Nombre de résultats (1-100)</Label>
              <Input
                type="number"
                min="1"
                max="100"
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Résultats de recherche ({companies.length})
              </CardTitle>
              <Button 
                onClick={saveAllCompanies} 
                disabled={loading}
                size="lg"
                className="shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Sauvegarder tous les résultats
                  </>
                )}
              </Button>
            </div>
            <CardDescription className="mt-2">
              Cliquez sur "Sauvegarder tous les résultats" pour ajouter toutes ces entreprises à votre base
            </CardDescription>
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
                      👥 Effectif estimé: {prettyEstimate(company.effectif_code, company.siren)}
                    </p>
                    {company.website_url && (
                      <p className="text-sm text-muted-foreground">
                        🌐 <a 
                          href={company.website_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {company.website_url}
                        </a>
                      </p>
                    )}
                    {company.dirigeant_nom && (
                      <p className="text-xs text-muted-foreground">
                        👤 {company.dirigeant_prenoms} {company.dirigeant_nom} - {company.dirigeant_fonction}
                      </p>
                    )}
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
