import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AISearchMode } from "./search/AISearchMode";
import { ManualSearchMode } from "./search/ManualSearchMode";
import { SearchResultsStep } from "./search/SearchResultsStep";
import { JobProgressCard } from "./JobProgressCard";
import { AutomaticSearch } from "./AutomaticSearch";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import { useJobQueue } from "@/hooks/useJobQueue";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { Sparkles, Grid3X3, Loader2 } from "lucide-react";
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

interface SearchCompaniesProps {
  onNavigateToTab?: (tab: string) => void;
}

export const SearchCompanies = ({ onNavigateToTab }: SearchCompaniesProps = {}) => {
  const [, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<SearchMode>("ai");
  const [loading, setLoading] = useState(false);
  const [savingCompany, setSavingCompany] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [villes, setVilles] = useState<string[]>([]);
  const [minResults, setMinResults] = useState("20");
  const [minEmployees, setMinEmployees] = useState("5-100");
  const [isProcessing, setIsProcessing] = useState(false);

  const { features, isLoading: planLoading, isPremium } = usePlanFeatures();

  const handleJobComplete = useCallback((job: any) => {
    if (job.results && job.results.length > 0) {
      setCompanies(job.results);
    }
    setIsProcessing(false);
  }, []);

  const { currentJob, isLoading: jobLoading, createJob, subscribeToJob, unsubscribe } = useJobQueue(handleJobComplete);

  useEffect(() => {
    return () => unsubscribe();
  }, [unsubscribe]);

  const handleSearch = async (codes?: string[]) => {
    const searchCodes = codes || selectedCodes;
    if (searchCodes.length === 0 && villes.length === 0) {
      toast.error("Sélectionne au moins un secteur ou une ville");
      return;
    }

    const minResultsNum = parseInt(minResults) || 20;
    if (minResultsNum < 1 || minResultsNum > 200) {
      toast.error("Le nombre de résultats doit être entre 1 et 200");
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
      const codesToSearch = searchCodes.length > 0 ? searchCodes : [''];

      for (const codeApe of codesToSearch) {
        const searchPayload: any = {
          nombre: Math.ceil(minResultsNum / codesToSearch.length),
          userId: user.id,
        };

        if (codeApe) searchPayload.codeApe = codeApe;
        if (villes.length > 0) searchPayload.locations = villes;

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

      if (uniqueResults.length === 0) {
        toast.error("Aucune entreprise trouvée");
        setLoading(false);
        return;
      }

      const searchParams = {
        selectedCodes: searchCodes,
        villes,
        minResults: minResultsNum,
        minEmployees,
      };

      const jobId = await createJob(uniqueResults, searchParams);
      
      if (jobId) {
        subscribeToJob(jobId);
        setIsProcessing(true);
        supabase.functions.invoke('job-worker', { body: {} }).catch(console.error);
      } else {
        setCompanies(uniqueResults);
      }

      toast.success(`${uniqueResults.length} entreprise(s) trouvée(s), traitement en cours...`);

    } catch (error) {
      console.error('Erreur recherche:', error);
      toast.error("Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  };

  const handleAISectorsValidated = (codes: string[]) => {
    setSelectedCodes(codes);
    handleSearch(codes);
  };

  const handleManualSearch = (codes: string[], locations: string[], employees: string, count: string) => {
    setSelectedCodes(codes);
    setVilles(locations);
    setMinEmployees(employees);
    setMinResults(count);
    handleSearch(codes);
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

      const searchBatchId = crypto.randomUUID();
      const searchBatchDate = new Date().toISOString();

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
          search_batch_id: searchBatchId,
          search_batch_date: searchBatchDate,
        }));

      if (toInsert.length === 0) {
        toast.info('Tout est déjà sauvegardé');
        return;
      }

      const { error } = await supabase.from('companies').insert(toInsert);
      if (error) throw error;

      sessionStorage.setItem('latest_search_batch_id', searchBatchId);
      sessionStorage.setItem('latest_search_batch_count', String(toInsert.length));

      window.dispatchEvent(new CustomEvent('companies:updated'));
      window.dispatchEvent(new CustomEvent('search:batch-created', { 
        detail: { batchId: searchBatchId, count: toInsert.length } 
      }));
      
      toast.success(`${toInsert.length} entreprise(s) sauvegardée(s)`);
      setCompanies([]);
      
      if (onNavigateToTab) {
        onNavigateToTab('entreprises');
      } else {
        setSearchParams({ tab: 'entreprises' });
      }
    } catch (error: any) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  if (planLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!features.canUseAISearch && !features.canUseManualSearch) {
    return <AutomaticSearch onNavigateToTab={onNavigateToTab} />;
  }

  return (
    <div className="h-full space-y-6">
      {/* Mode Toggle - Pill centered */}
      <div className="flex justify-center animate-fade-in">
        <div className="relative inline-flex p-1 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50">
          {/* Animated slider */}
          <div
            className={cn(
              "absolute top-1 bottom-1 rounded-xl bg-primary transition-all duration-300 ease-out",
              mode === "ai" ? "left-1" : "",
              mode === "manual" ? "right-1" : ""
            )}
            style={{
              width: 'calc(50% - 4px)',
              left: mode === "ai" ? '4px' : 'calc(50%)',
              boxShadow: '0 0 20px hsl(var(--primary) / 0.3)',
            }}
          />
          {features.canUseAISearch && (
            <button
              onClick={() => setMode("ai")}
              className={cn(
                "relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-colors duration-300",
                mode === "ai"
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="h-4 w-4" />
              Mode IA
            </button>
          )}
          {features.canUseManualSearch && (
            <button
              onClick={() => setMode("manual")}
              className={cn(
                "relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-colors duration-300",
                mode === "manual"
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Grid3X3 className="h-4 w-4" />
              Manuel
            </button>
          )}
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel - Search Controls */}
        <div className="lg:col-span-4 space-y-4">
          {/* AI or Manual Panel */}
          {mode === "ai" && features.canUseAISearch ? (
            <AISearchMode 
              onSectorsValidated={handleAISectorsValidated} 
              loading={loading}
            />
          ) : mode === "manual" && features.canUseManualSearch ? (
            <ManualSearchMode 
              onSearch={handleManualSearch}
              loading={loading}
            />
          ) : null}

          {/* Upgrade Banner */}
          {!isPremium && (
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-4 backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">Passe au Premium</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Débloquez la recherche IA, les emails personnalisés et plus encore.
                  </p>
                  <a 
                    href="/pricing" 
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Voir les offres →
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-8">
          {isProcessing && currentJob ? (
            <div className="animate-fade-in">
              <JobProgressCard 
                job={currentJob} 
                onViewResults={() => {
                  if (currentJob.results && currentJob.results.length > 0) {
                    setCompanies(currentJob.results);
                  }
                  setIsProcessing(false);
                }}
              />
            </div>
          ) : (
            <SearchResultsStep
              companies={companies}
              loading={loading}
              savingCompany={savingCompany}
              onSaveCompany={saveCompany}
              onSaveAll={saveAllCompanies}
              onNewSearch={() => {
                setCompanies([]);
                setSelectedCodes([]);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
