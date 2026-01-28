import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Mail, Search, CheckCircle2, Clock, Building2, 
  ChevronRight, ArrowRight, Send
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreditsNeededModal } from "./CreditsNeededModal";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Search in progress - Full screen overlay
  if (isSearching) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
        <div className="w-full max-w-lg mx-auto px-6">
          <Card className="border-primary/20 bg-card">
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">Recherche en cours</h2>
                <p className="text-muted-foreground">
                  Analyse des sites web et recherche des emails de contact...
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Temps écoulé: {formatTime(elapsedTime)}</span>
                  </div>
                  {summary && (
                    <span className="text-foreground font-medium">
                      {summary.processed} / {summary.total}
                    </span>
                  )}
                </div>
                
                {summary && summary.total > 0 && (
                  <Progress 
                    value={(summary.processed / summary.total) * 100} 
                    className="h-3"
                  />
                )}

                {summary && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      <span className="text-lg font-semibold text-foreground">
                        {summary.emailsFound} emails trouvés
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Live results */}
              {results.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {results.slice(-5).map((result, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                    >
                      <span className="truncate flex-1">{result.company}</span>
                      {result.selected_email ? (
                        <Badge variant="default" className="ml-2 shrink-0">
                          <Mail className="h-3 w-3 mr-1" />
                          Trouvé
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          Aucun email
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Search complete - Show success and CTA
  if (searchComplete && companiesWithEmail.length > 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-display font-semibold text-foreground">Recherche de contact</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Trouvez les emails de vos entreprises sauvegardées
          </p>
        </div>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
          <CardContent className="p-8 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-foreground">
                Recherche terminée !
              </h3>
              <p className="text-muted-foreground">
                {summary?.emailsFound || companiesWithEmail.length} contacts trouvés sur {summary?.processed || companies.length} entreprises
              </p>
            </div>

            <Button 
              onClick={handleGoToCampaigns}
              size="lg"
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              <Send className="h-5 w-5" />
              Lancer une campagne
              <ArrowRight className="h-4 w-4" />
            </Button>

            {companiesWithoutEmail.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {companiesWithoutEmail.length} entreprises restantes sans email
              </p>
            )}
          </CardContent>
        </Card>

        <CreditsNeededModal 
          isOpen={showCreditsModal} 
          onClose={() => setShowCreditsModal(false)}
          planType={creditsInfo.planType}
          creditsAvailable={creditsInfo.creditsAvailable}
        />
      </div>
    );
  }

  // Default view - Show companies and search button
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-semibold text-foreground">Recherche de contact</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Trouvez les emails de vos entreprises sauvegardées
        </p>
      </div>

      {/* Main CTA Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {companiesWithoutEmail.length > 0 
                  ? `Rechercher les informations de contact`
                  : companiesWithEmail.length > 0
                    ? "Tous vos contacts sont prêts !"
                    : "Aucune entreprise"
                }
              </h3>
              <p className="text-muted-foreground">
                {companiesWithoutEmail.length > 0 
                  ? `${companiesWithoutEmail.length} entreprise${companiesWithoutEmail.length > 1 ? 's' : ''} en attente de recherche d'email`
                  : companiesWithEmail.length > 0
                    ? `${companiesWithEmail.length} contact${companiesWithEmail.length > 1 ? 's' : ''} disponible${companiesWithEmail.length > 1 ? 's' : ''} pour vos campagnes`
                    : "Lancez d'abord une recherche d'entreprises"
                }
              </p>
            </div>

            {companiesWithoutEmail.length > 0 ? (
              <Button 
                onClick={handleSearch}
                size="lg"
                className="bg-primary hover:bg-primary/90 gap-2 whitespace-nowrap"
              >
                <Search className="h-5 w-5" />
                Rechercher {companiesWithoutEmail.length} email{companiesWithoutEmail.length > 1 ? 's' : ''}
              </Button>
            ) : companiesWithEmail.length > 0 ? (
              <Button 
                onClick={handleGoToCampaigns}
                size="lg"
                className="bg-primary hover:bg-primary/90 gap-2 whitespace-nowrap"
              >
                <Send className="h-5 w-5" />
                Lancer une campagne
              </Button>
            ) : (
              <Button 
                onClick={() => onNavigateToTab?.('search')}
                size="lg"
                variant="outline"
                className="gap-2 whitespace-nowrap"
              >
                <Building2 className="h-5 w-5" />
                Rechercher des entreprises
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Companies slide panel */}
      {companies.length > 0 && (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <Building2 className="h-4 w-4" />
              Voir les {companies.length} entreprises
              <ChevronRight className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Entreprises ({companies.length})
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-8rem)] mt-4 pr-4">
              <div className="space-y-2">
                {companies.map((company) => (
                  <div 
                    key={company.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{company.nom}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {company.ville || 'Ville inconnue'} {company.code_postal ? `(${company.code_postal})` : ''}
                      </p>
                    </div>
                    {company.selected_email ? (
                      <Badge variant="default" className="shrink-0 ml-2">
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0 ml-2">
                        En attente
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}

      {/* Stats */}
      {companies.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{companiesWithEmail.length}</p>
              <p className="text-sm text-muted-foreground">Avec email</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-muted-foreground">{companiesWithoutEmail.length}</p>
              <p className="text-sm text-muted-foreground">Sans email</p>
            </CardContent>
          </Card>
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
