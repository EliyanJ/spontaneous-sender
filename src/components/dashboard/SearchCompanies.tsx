import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AISearchMode } from "./search/AISearchMode";
import { ManualSearchMode } from "./search/ManualSearchMode";
import { SearchFiltersStep } from "./search/SearchFiltersStep";
import { SearchResultsStep } from "./search/SearchResultsStep";
import { JobProgressCard } from "./JobProgressCard";
import { AutomaticSearch } from "./AutomaticSearch";
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
type SearchStep = "select" | "filters" | "results" | "processing";

interface SearchCompaniesProps {
  onNavigateToTab?: (tab: string) => void;
}

export const SearchCompanies = ({ onNavigateToTab }: SearchCompaniesProps = {}) => {
  const [, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<SearchMode>("ai");
  const [step, setStep] = useState<SearchStep>("select");
  const [loading, setLoading] = useState(false);
  const [savingCompany, setSavingCompany] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [villes, setVilles] = useState<string[]>([]);
  const [minResults, setMinResults] = useState("20");
  const [minEmployees, setMinEmployees] = useState("5-100");

  // Plan features hook
  const { features, isLoading: planLoading } = usePlanFeatures();

  // Job queue hook
  const handleJobComplete = useCallback((job: any) => {
    // Auto-redirect to results when job completes
    if (job.results && job.results.length > 0) {
      setCompanies(job.results);
      setStep("results");
    }
  }, []);

  const { currentJob, isLoading: jobLoading, createJob, subscribeToJob, unsubscribe } = useJobQueue(handleJobComplete);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => unsubscribe();
  }, [unsubscribe]);

  const handleSectorsValidated = (codes: string[]) => {
    setSelectedCodes(codes);
    setStep("filters");
  };

  const handleBackToSelect = () => {
    setStep("select");
    setCompanies([]);
  };

  const handleSearch = async () => {
    if (selectedCodes.length === 0 && villes.length === 0) {
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

      // Step 1: Fetch companies from API (quick search)
      const allResults: Company[] = [];
      const codesToSearch = selectedCodes.length > 0 ? selectedCodes : [''];

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

      // Step 2: Create job in queue for further processing (emails, websites)
      const searchParams = {
        selectedCodes,
        villes,
        minResults: minResultsNum,
        minEmployees,
      };

      const jobId = await createJob(uniqueResults, searchParams);
      
      if (jobId) {
        subscribeToJob(jobId);
        setStep("processing");
        
        // Trigger the worker to start processing
        supabase.functions.invoke('job-worker', { body: {} }).catch(console.error);
      } else {
        // Fallback: show results directly if job creation fails
        setCompanies(uniqueResults);
        setStep("results");
      }

      toast.success(`${uniqueResults.length} entreprise(s) trouvée(s), traitement en cours...`);

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

      // Generate a unique batch ID for this search session
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

      // Store the batch ID in session for EmailSearchSection to use
      sessionStorage.setItem('latest_search_batch_id', searchBatchId);
      sessionStorage.setItem('latest_search_batch_count', String(toInsert.length));

      window.dispatchEvent(new CustomEvent('companies:updated'));
      window.dispatchEvent(new CustomEvent('search:batch-created', { 
        detail: { batchId: searchBatchId, count: toInsert.length } 
      }));
      
      toast.success(`${toInsert.length} entreprise(s) sauvegardée(s)`);
      setCompanies([]);
      
      // Redirect to entreprises tab
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

  // If plan is loading, show skeleton
  if (planLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user doesn't have AI/Manual search access, show AutomaticSearch
  if (!features.canUseAISearch && !features.canUseManualSearch) {
    return <AutomaticSearch onNavigateToTab={onNavigateToTab} />;
  }

  return (
    <div className="h-full">
      {/* Mode Tabs - Only visible during selection step */}
      {step === "select" && (
        <div className="flex justify-center mb-8 animate-fade-in">
          <div className="inline-flex p-1.5 rounded-2xl bg-card border border-border/50">
            {features.canUseAISearch && (
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
            )}
            {features.canUseManualSearch && (
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
            )}
          </div>
        </div>
      )}

      {/* Content based on step */}
      <div className="relative">
        {step === "select" && (
          <div className="animate-fade-in">
            {mode === "ai" && features.canUseAISearch ? (
              <AISearchMode onSectorsValidated={handleSectorsValidated} />
            ) : mode === "manual" && features.canUseManualSearch ? (
              <ManualSearchMode onSectorsValidated={handleSectorsValidated} />
            ) : null}
          </div>
        )}

        {step === "filters" && (
          <SearchFiltersStep
            selectedCodesCount={selectedCodes.length}
            villes={villes}
            setVilles={setVilles}
            minResults={minResults}
            setMinResults={setMinResults}
            minEmployees={minEmployees}
            setMinEmployees={setMinEmployees}
            loading={loading}
            onSearch={handleSearch}
            onBack={handleBackToSelect}
          />
        )}

        {step === "processing" && currentJob && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <JobProgressCard 
              job={currentJob} 
              onViewResults={() => {
                if (currentJob.results && currentJob.results.length > 0) {
                  setCompanies(currentJob.results);
                }
                setStep("results");
              }}
            />
          </div>
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
