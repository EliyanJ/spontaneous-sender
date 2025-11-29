import React, { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AISearchMode } from "./search/AISearchMode";
import { ManualSearchMode } from "./search/ManualSearchMode";
import { SearchFiltersStep } from "./search/SearchFiltersStep";
import { SearchResultsStep } from "./search/SearchResultsStep";
import { Sparkles, Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";

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

type SearchMode = "ai" | "manual";
type SearchStep = "select" | "filters" | "results";

export const SearchCompanies = () => {
  const [mode, setMode] = useState<SearchMode>("ai");
  const [step, setStep] = useState<SearchStep>("select");
  const [loading, setLoading] = useState(false);
  const [savingCompany, setSavingCompany] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [ville, setVille] = useState("");
  const [minResults, setMinResults] = useState("20");
  const [minEmployees, setMinEmployees] = useState("5-100");

  const handleSectorsValidated = (codes: string[]) => {
    setSelectedCodes(codes);
    setStep("filters");
  };

  const handleBackToSelect = () => {
    setStep("select");
    setCompanies([]);
  };

  const handleSearch = async () => {
    if (selectedCodes.length === 0 && !ville) {
      toast.error("Sélectionne au moins un secteur ou une ville");
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
        toast.error("Tu dois être connecté");
        return;
      }

      const allResults: Company[] = [];
      const codesToSearch = selectedCodes.length > 0 ? selectedCodes : [''];

      for (const codeApe of codesToSearch) {
        const searchPayload: any = {
          nombre: Math.ceil(minResultsNum / codesToSearch.length),
          userId: user.id,
        };

        if (codeApe) searchPayload.codeApe = codeApe;
        if (ville) searchPayload.location = ville;

        if (minEmployees) {
          const [min, max] = minEmployees.split('-').map(Number);
          searchPayload.minEmployees = min || 5;
          searchPayload.maxEmployees = max || 100;
        }

        const { data: searchData, error: searchError } = await supabase.functions.invoke(
          'search-companies',
          { body: searchPayload }
        );

        if (searchError) {
          console.error('Erreur pour code', codeApe, ':', searchError);
          continue;
        }

        if (searchData.success && searchData.data) {
          allResults.push(...searchData.data);
        }
      }

      const uniqueResults = Array.from(
        new Map(allResults.map(c => [c.siren, c])).values()
      ).slice(0, minResultsNum);

      setCompanies(uniqueResults);
      setStep("results");
      toast.success(`${uniqueResults.length} entreprise(s) trouvée(s)`);

    } catch (error) {
      console.error('Erreur recherche:', error);
      toast.error("Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  };

  const saveCompany = async (company: Company) => {
    setSavingCompany(company.siret);
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
      
      setCompanies(prev => prev.filter(c => c.siret !== company.siret));
      window.dispatchEvent(new CustomEvent('companies:updated'));
      toast.success("Entreprise sauvegardée");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingCompany(null);
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

      const { data: existing } = await supabase
        .from('companies')
        .select('siren')
        .eq('user_id', user.id);

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
        return;
      }

      const { error } = await supabase.from('companies').insert(toInsert);
      if (error) throw error;

      window.dispatchEvent(new CustomEvent('companies:updated'));
      toast.success(`${toInsert.length} entreprise(s) sauvegardée(s)`);
      setCompanies([]);
    } catch (error: any) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full">
      {/* Mode Tabs - Only visible during selection step */}
      {step === "select" && (
        <div className="flex justify-center mb-8 animate-fade-in">
          <div className="inline-flex p-1.5 rounded-2xl bg-card border border-border/50">
            <button
              onClick={() => setMode("ai")}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300",
                mode === "ai"
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              style={mode === "ai" ? { boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' } : {}}
            >
              <Sparkles className="h-4 w-4" />
              Recherche IA
            </button>
            <button
              onClick={() => setMode("manual")}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300",
                mode === "manual"
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              style={mode === "manual" ? { boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' } : {}}
            >
              <Grid3X3 className="h-4 w-4" />
              Recherche manuelle
            </button>
          </div>
        </div>
      )}

      {/* Content based on step */}
      <div className="relative">
        {step === "select" && (
          <div className="animate-fade-in">
            {mode === "ai" ? (
              <AISearchMode onSectorsValidated={handleSectorsValidated} />
            ) : (
              <ManualSearchMode onSectorsValidated={handleSectorsValidated} />
            )}
          </div>
        )}

        {step === "filters" && (
          <SearchFiltersStep
            selectedCodesCount={selectedCodes.length}
            ville={ville}
            setVille={setVille}
            minResults={minResults}
            setMinResults={setMinResults}
            minEmployees={minEmployees}
            setMinEmployees={setMinEmployees}
            loading={loading}
            onSearch={handleSearch}
            onBack={handleBackToSelect}
          />
        )}

        {step === "results" && (
          <SearchResultsStep
            companies={companies}
            loading={loading}
            savingCompany={savingCompany}
            onSaveCompany={saveCompany}
            onSaveAll={saveAllCompanies}
            onBack={() => setStep("filters")}
            onNewSearch={handleBackToSelect}
          />
        )}
      </div>
    </div>
  );
};
