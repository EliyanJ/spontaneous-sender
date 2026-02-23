import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Mail, Search, CheckCircle2, Clock, Building2, 
  ChevronRight, ArrowRight, Send, Zap, Target, XCircle,
  MoreHorizontal, Filter, MailCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreditsNeededModal } from "./CreditsNeededModal";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchResult {
  company: string;
  status?: string;
  website?: string;
  emails?: string[];
  selected_email?: string;
  confidence?: string;
  source?: string;
  error?: string;
}

interface CompanyInfo {
  id: string;
  nom: string;
  ville: string | null;
  code_postal: string | null;
  libelle_ape: string | null;
  selected_email: string | null;
  search_batch_date: string | null;
}

interface ContactSearchProps {
  onNavigateToTab?: (tab: string) => void;
}

const AVATAR_COLORS = [
  'bg-white text-black',
  'bg-indigo-600 text-white',
  'bg-blue-500 text-white',
  'bg-purple-600 text-white',
  'bg-emerald-600 text-white',
  'bg-amber-500 text-black',
];

export const ContactSearch = ({ onNavigateToTab }: ContactSearchProps) => {
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [companiesWithoutEmail, setCompaniesWithoutEmail] = useState<CompanyInfo[]>([]);
  const [companiesWithEmail, setCompaniesWithEmail] = useState<CompanyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [summary, setSummary] = useState<{ processed: number; total: number; emailsFound: number } | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditsInfo, setCreditsInfo] = useState<{ planType?: string; creditsAvailable?: number }>({});
  const [searchComplete, setSearchComplete] = useState(false);
  const [tableFilter, setTableFilter] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    loadCompanies();
    
    const handleUpdate = () => loadCompanies();
    window.addEventListener('companies:updated', handleUpdate);
    window.addEventListener('search:batch-created', handleUpdate);
    
    return () => {
      window.removeEventListener('companies:updated', handleUpdate);
      window.removeEventListener('search:batch-created', handleUpdate);
    };
  }, []);

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSearching) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('companies')
        .select('id, nom, ville, code_postal, libelle_ape, selected_email, search_batch_date')
        .eq('user_id', user.id)
        .order('search_batch_date', { ascending: false });

      if (error) throw error;

      setCompanies(data || []);
      setCompaniesWithoutEmail(data?.filter(c => !c.selected_email) || []);
      setCompaniesWithEmail(data?.filter(c => c.selected_email) || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}min ${secs}s` : `${secs}s`;
  };

  const handleSearch = async () => {
    if (companiesWithoutEmail.length === 0) return;

    setIsSearching(true);
    setResults([]);
    setSummary(null);
    setElapsedTime(0);
    setSearchComplete(false);

    try {
      let totalProcessed = 0;
      let totalEmailsFound = 0;
      let allResults: SearchResult[] = [];
      let hasMore = true;
      const estimatedTotal = companiesWithoutEmail.length;

      while (hasMore) {
        const { data, error } = await supabase.functions.invoke('find-company-emails', {
          body: { maxCompanies: 25 }
        });

        if (error) {
          if (error.message?.includes('Crédits insuffisants') || error.message?.includes('402')) {
            setCreditsInfo({ planType: 'free', creditsAvailable: 0 });
            setShowCreditsModal(true);
            break;
          }
          
          if (error.message?.includes('Rate limit')) {
            toast({
              title: "Limite atteinte",
              description: `${totalProcessed} entreprises traitées. Réessayez dans quelques minutes.`,
              variant: "destructive",
            });
            break;
          }
          toast({
            title: "Erreur",
            description: error.message || "Impossible de rechercher les emails.",
            variant: "destructive",
          });
          break;
        }

        if (data?.creditsNeeded === true) {
          setCreditsInfo({ planType: data.planType, creditsAvailable: data.creditsAvailable });
          setShowCreditsModal(true);
          break;
        }

        totalProcessed += data.processed || 0;
        totalEmailsFound += data.summary?.found || data.results?.filter((r: SearchResult) => r.emails && r.emails.length > 0).length || 0;
        allResults = [...allResults, ...(data.results || [])];
        hasMore = data.hasMore === true;
        
        setResults(allResults);
        setSummary({
          processed: totalProcessed,
          total: estimatedTotal,
          emailsFound: totalEmailsFound
        });

        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      window.dispatchEvent(new CustomEvent('companies:updated'));
      await loadCompanies();
      setSearchComplete(true);

      toast({
        title: "Recherche terminée",
        description: `${totalEmailsFound} emails trouvés pour ${totalProcessed} entreprises`,
      });

    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleGoToCampaigns = () => {
    sessionStorage.setItem('emails_initial_section', 'send');
    onNavigateToTab?.('emails');
  };

  const successRate = companies.length > 0 
    ? Math.round((companiesWithEmail.length / companies.length) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Search in progress - Full screen overlay
  if (isSearching) {
    const totalToProcess = summary?.total || companiesWithoutEmail.length;
    const processed = summary?.processed || 0;
    const emailsFound = summary?.emailsFound || 0;
    const progressPercent = totalToProcess > 0 ? Math.round((processed / totalToProcess) * 100) : 0;
    const avgTimePerItem = processed > 0 ? elapsedTime / processed : 0;
    const remainingItems = totalToProcess - processed;
    const estimatedRemaining = processed > 0 ? Math.round(avgTimePerItem * remainingItems) : 0;

    return (
      <div className="fixed inset-0 z-[100] bg-[#09090b] flex items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-2xl">
          <div className="bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-xl">
            <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-h-[calc(100svh-2rem)] overflow-hidden">
              {/* Header */}
              <div className="text-center space-y-1">
                <h2 className="text-xl sm:text-2xl font-semibold text-white">Recherche en cours</h2>
                <p className="text-sm text-gray-400">
                  Analyse des sites web et recherche des emails...
                </p>
              </div>

              {/* Progress Gauge */}
              <div className="space-y-3">
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="relative w-28 h-28 sm:w-36 sm:h-36">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${progressPercent * 2.64} 264`} className="text-indigo-500 transition-all duration-500 ease-out" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl sm:text-4xl font-bold text-white">{progressPercent}%</span>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#18181b]/50 rounded-lg p-2 sm:p-3">
                    <div className="text-lg sm:text-xl font-semibold text-white">{processed}</div>
                    <div className="text-xs text-gray-500">Traités</div>
                  </div>
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-2 sm:p-3">
                    <div className="text-lg sm:text-xl font-semibold text-indigo-400">{emailsFound}</div>
                    <div className="text-xs text-gray-500">Emails</div>
                  </div>
                  <div className="bg-[#18181b]/50 rounded-lg p-2 sm:p-3">
                    <div className="text-lg sm:text-xl font-semibold text-white">{totalToProcess}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                </div>

                {/* Time info */}
                <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 px-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatTime(elapsedTime)}</span>
                  </div>
                  {processed > 0 && processed < totalToProcess ? (
                    <span>~{formatTime(estimatedRemaining)} restant</span>
                  ) : processed === 0 ? (
                    <span className="animate-pulse">Initialisation...</span>
                  ) : null}
                </div>
              </div>

              {/* Live results */}
              {results.length > 0 && (
                <div className="space-y-2">
                  {results.slice(-5).map((result, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs sm:text-sm p-2 rounded bg-[#18181b]/50">
                      <span className="truncate flex-1 mr-2 text-gray-300">{result.company}</span>
                      {result.selected_email ? (
                        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                          <Mail className="h-3 w-3 inline mr-1" />Trouvé
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-gray-400">
                          Aucun
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Search complete - Show success and CTA
  if (searchComplete && companiesWithEmail.length > 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Recherche de contact</h2>
          <p className="text-sm text-gray-400 mt-1">
            Gérez vos recherches d'emails et suivez vos campagnes.
          </p>
        </div>

        <div className="bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-green-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="p-8 text-center space-y-6 relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20">
              <CheckCircle2 className="h-10 w-10 text-green-400" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-white">
                Recherche terminée !
              </h3>
              <p className="text-gray-400">
                {summary?.emailsFound || companiesWithEmail.length} contacts trouvés sur {summary?.processed || companies.length} entreprises
              </p>
            </div>

            <button 
              onClick={handleGoToCampaigns}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <Send className="h-5 w-5" />
              Lancer une campagne
              <ArrowRight className="h-4 w-4" />
            </button>

            {companiesWithoutEmail.length > 0 && (
              <p className="text-sm text-gray-500">
                {companiesWithoutEmail.length} entreprises restantes sans email
              </p>
            )}
          </div>
        </div>

        <CreditsNeededModal 
          isOpen={showCreditsModal} 
          onClose={() => setShowCreditsModal(false)}
          planType={creditsInfo.planType}
          creditsAvailable={creditsInfo.creditsAvailable}
        />
      </div>
    );
  }

  // Filtered companies for table
  const filteredCompanies = companies.filter(c => 
    !tableFilter || c.nom.toLowerCase().includes(tableFilter.toLowerCase()) ||
    c.ville?.toLowerCase().includes(tableFilter.toLowerCase())
  );

  // Default view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Recherche de contact</h2>
        <p className="text-sm text-gray-400 mt-1">
          Gérez vos recherches d'emails et suivez vos campagnes.
        </p>
      </div>

      {/* Top Grid: CTA + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CTA Card */}
        <div className="lg:col-span-2 bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Search className="h-6 w-6 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white">
                {companiesWithoutEmail.length > 0 
                  ? "Rechercher les informations"
                  : companiesWithEmail.length > 0
                    ? "Tous vos contacts sont prêts !"
                    : "Aucune entreprise"
                }
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">
                {companiesWithoutEmail.length > 0 
                  ? `${companiesWithoutEmail.length} entreprise${companiesWithoutEmail.length > 1 ? 's' : ''} en attente de recherche`
                  : companiesWithEmail.length > 0
                    ? `${companiesWithEmail.length} contact${companiesWithEmail.length > 1 ? 's' : ''} disponible${companiesWithEmail.length > 1 ? 's' : ''}`
                    : "Lancez d'abord une recherche d'entreprises"
                }
              </p>
            </div>
            <div className="shrink-0 w-full sm:w-auto">
              {companiesWithoutEmail.length > 0 ? (
                <button
                  onClick={handleSearch}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <Zap className="h-4 w-4" />
                  Rechercher {companiesWithoutEmail.length} email{companiesWithoutEmail.length > 1 ? 's' : ''}
                </button>
              ) : companiesWithEmail.length > 0 ? (
                <button
                  onClick={handleGoToCampaigns}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <Send className="h-4 w-4" />
                  Lancer une campagne
                </button>
              ) : (
                <Button 
                  onClick={() => onNavigateToTab?.('search')}
                  variant="outline"
                  className="w-full sm:w-auto gap-2 border-white/10 hover:border-indigo-500/30"
                >
                  <Building2 className="h-4 w-4" />
                  Rechercher des entreprises
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Card - Emails trouvés */}
        <div className="bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <MailCheck className="h-5 w-5 text-green-400" />
              </div>
              {successRate > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 font-medium">
                  +{successRate}%
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Emails trouvés</p>
            <p className="text-3xl font-bold text-white mt-1">{companiesWithEmail.length}</p>
          </div>
          {/* Decorative mini chart */}
          <svg className="absolute bottom-0 right-0 opacity-30 w-24 h-16" viewBox="0 0 100 60" fill="none">
            <path d="M0 55 Q20 40 35 45 T60 30 T85 20 T100 10" stroke="hsl(142 76% 36%)" strokeWidth="2" fill="none" />
            <path d="M0 55 Q20 40 35 45 T60 30 T85 20 T100 10 V60 H0 Z" fill="hsl(142 76% 36% / 0.1)" />
          </svg>
        </div>
      </div>

      {/* Stats Row */}
      {companies.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* En attente */}
          <div className="bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">En attente</p>
              <p className="text-xl font-bold text-white">{companiesWithoutEmail.length}</p>
            </div>
          </div>

          {/* Sans email */}
          <div className="bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
              <XCircle className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Sans email</p>
              <p className="text-xl font-bold text-white">
                {companies.filter(c => c.search_batch_date && !c.selected_email).length}
              </p>
            </div>
          </div>

          {/* Taux succès */}
          <div className="bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Taux succès</p>
              <p className="text-xl font-bold text-indigo-400">{successRate}%</p>
            </div>
          </div>

          {/* Voir la liste */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="bg-[#18181b]/60 backdrop-blur-xl border border-dashed border-white/20 hover:border-indigo-500/50 rounded-2xl p-5 flex items-center gap-4 transition-colors w-full text-left">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Voir la liste</p>
                  <p className="text-xl font-bold text-white">{companies.length}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg max-w-full bg-[#09090b] border-l border-white/[0.08]">
              <SheetHeader className="pr-8">
                <SheetTitle className="flex items-center gap-2 text-white">
                  <Building2 className="h-5 w-5 text-indigo-400" />
                  Entreprises ({companies.length})
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-6rem)] sm:h-[calc(100vh-8rem)] mt-4 pr-2 sm:pr-4">
                <div className="space-y-2">
                  {companies.map((company) => (
                    <div 
                      key={company.id}
                      className="bg-[#18181b]/60 backdrop-blur-xl p-4 rounded-xl border border-white/[0.05] hover:border-indigo-500/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="font-bold text-white text-sm truncate">{company.nom}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {company.code_postal && (
                              <span className="bg-zinc-800 text-gray-400 text-[10px] rounded px-1.5 py-0.5">
                                {company.code_postal}
                              </span>
                            )}
                            <span className="text-xs text-gray-500 truncate">
                              {company.ville || 'Ville inconnue'}
                            </span>
                          </div>
                        </div>
                        {company.selected_email ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
                        ) : company.search_batch_date ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Results Table */}
      {companies.length > 0 && (
        <div className="bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/[0.05]">
            <h3 className="text-base font-semibold text-white">Derniers résultats</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm bg-[#09090b] border border-white/[0.1] rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 w-40"
                />
              </div>
              <button className="p-1.5 rounded-lg border border-white/[0.1] hover:border-indigo-500/30 transition-colors">
                <Filter className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Table Head */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-white/[0.02] border-b border-white/[0.05] text-xs text-gray-500 uppercase tracking-wider">
            <div className="col-span-5">Entreprise</div>
            <div className="col-span-3">Localisation</div>
            <div className="col-span-3">Statut</div>
            <div className="col-span-1">Action</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-white/[0.03]">
            {filteredCompanies.slice(0, 20).map((company, index) => {
              const colorIdx = index % AVATAR_COLORS.length;
              const initial = company.nom.charAt(0).toUpperCase();
              const hasEmail = !!company.selected_email;
              const searched = !!company.search_batch_date;

              return (
                <div
                  key={company.id}
                  className="group grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center"
                >
                  {/* Company */}
                  <div className="md:col-span-5 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded font-bold text-xs flex items-center justify-center shrink-0 ${AVATAR_COLORS[colorIdx]}`}>
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{company.nom}</p>
                      <p className="text-xs text-gray-500 truncate">{company.libelle_ape || '—'}</p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="md:col-span-3 hidden md:block">
                    <p className="text-sm text-gray-400 truncate">
                      {company.ville || 'Inconnue'} {company.code_postal ? `(${company.code_postal})` : ''}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="md:col-span-3">
                    {hasEmail ? (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        Email trouvé
                      </span>
                    ) : searched ? (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                        <XCircle className="h-3 w-3" />
                        Sans email
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                        En recherche
                      </span>
                    )}
                  </div>

                  {/* Action */}
                  <div className="md:col-span-1 hidden md:flex justify-end">
                    <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/[0.05] transition-all">
                      <MoreHorizontal className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCompanies.length > 20 && (
            <div className="px-4 py-3 border-t border-white/[0.05] text-center">
              <p className="text-xs text-gray-500">
                {filteredCompanies.length - 20} entreprises supplémentaires
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {companies.length === 0 && (
        <div className="bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800 mb-4">
            <Search className="h-7 w-7 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Aucune entreprise</h3>
          <p className="text-sm text-gray-400 mb-4">Commencez par rechercher des entreprises pour trouver leurs contacts.</p>
          <Button 
            onClick={() => onNavigateToTab?.('search')}
            variant="outline"
            className="gap-2 border-white/10 hover:border-indigo-500/30"
          >
            <Building2 className="h-4 w-4" />
            Rechercher des entreprises
          </Button>
        </div>
      )}

      <CreditsNeededModal 
        isOpen={showCreditsModal} 
        onClose={() => setShowCreditsModal(false)}
        planType={creditsInfo.planType}
        creditsAvailable={creditsInfo.creditsAvailable}
      />
    </div>
  );
};
