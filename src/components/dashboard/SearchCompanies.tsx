import React, { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SmartSearchSuggestions } from "./SmartSearchSuggestions";
import { SectorGrid } from "./SectorGrid";
import { SearchFilters } from "./SearchFilters";
import { SearchResults } from "./SearchResults";

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

type SearchStep = "sectors" | "filters";

export const SearchCompanies = () => {
  const [step, setStep] = useState<SearchStep>("sectors");
  const [loading, setLoading] = useState(false);
  const [savingCompany, setSavingCompany] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [ville, setVille] = useState("");
  const [minResults, setMinResults] = useState("20");
  const [minEmployees, setMinEmployees] = useState("5-100");

  const handleSmartSuggestion = (codes: string[]) => {
    setSelectedCodes(codes);
    setStep("filters");
  };

  const handleValidateSectors = () => {
    if (selectedCodes.length === 0) {
      toast.error("Sélectionne au moins un secteur");
      return;
    }
    setStep("filters");
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

  const getSelectedSectorsCount = () => {
    // Count unique sectors from codes
    const sectors = new Set<string>();
    selectedCodes.forEach(code => {
      sectors.add(code.split('.')[0]);
    });
    return selectedCodes.length;
  };

  return (
    <div className="h-full">
      {step === "sectors" && (
        <div className="space-y-6 animate-fade-in">
          {/* Smart Suggestions */}
          <SmartSearchSuggestions onSuggestionSelect={handleSmartSuggestion} />
          
          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">ou choisir manuellement</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Sector Grid */}
          <SectorGrid 
            selectedCodes={selectedCodes}
            onCodesChange={setSelectedCodes}
            onValidate={handleValidateSectors}
          />
        </div>
      )}

      {step === "filters" && (
        <div className="space-y-4">
          <SearchFilters
            ville={ville}
            setVille={setVille}
            minResults={minResults}
            setMinResults={setMinResults}
            minEmployees={minEmployees}
            setMinEmployees={setMinEmployees}
            loading={loading}
            onSearch={handleSearch}
            onBack={() => setStep("sectors")}
            selectedSectorsCount={getSelectedSectorsCount()}
          />

          <SearchResults
            companies={companies}
            loading={loading}
            savingCompany={savingCompany}
            onSaveCompany={saveCompany}
            onSaveAll={saveAllCompanies}
          />
        </div>
      )}
    </div>
  );
};
