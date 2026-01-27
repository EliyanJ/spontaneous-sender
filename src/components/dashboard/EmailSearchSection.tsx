import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Globe, Search, CheckCircle2, ArrowRight, Clock, Calendar, FolderOpen, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditsNeededModal } from "./CreditsNeededModal";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

interface BatchInfo {
  id: string | null;
  date: string;
  count: number;
  withoutEmail: number;
}

interface EmailSearchSectionProps {
  onEmailsFound?: () => void;
}

type SearchScope = "latest" | "previous" | "campaign";

export const EmailSearchSection = ({ onEmailsFound }: EmailSearchSectionProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [summary, setSummary] = useState<{ processed: number; total: number; emailsFound: number } | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditsInfo, setCreditsInfo] = useState<{ planType?: string; creditsAvailable?: number }>({});
  
  // Batch selection state
  const [searchScope, setSearchScope] = useState<SearchScope>("latest");
  const [latestBatch, setLatestBatch] = useState<BatchInfo | null>(null);
  const [previousBatches, setPreviousBatches] = useState<BatchInfo[]>([]);
  const [campaignReady, setCampaignReady] = useState<{ count: number }>({ count: 0 });
  const [loading, setLoading] = useState(true);
  
  const { toast } = useToast();

  // Load batch information on mount
  useEffect(() => {
    loadBatchInfo();
    
    // Listen for new batch creation
    const handleBatchCreated = () => {
      loadBatchInfo();
    };
    window.addEventListener('search:batch-created', handleBatchCreated);
    window.addEventListener('companies:updated', handleBatchCreated);
    
    return () => {
      window.removeEventListener('search:batch-created', handleBatchCreated);
      window.removeEventListener('companies:updated', handleBatchCreated);
    };
  }, []);

  const loadBatchInfo = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all companies grouped by batch
      const { data: companies } = await supabase
        .from('companies')
        .select('id, search_batch_id, search_batch_date, selected_email, status')
        .eq('user_id', user.id)
        .order('search_batch_date', { ascending: false });

      if (!companies) return;

      // Group by batch
      const batchMap = new Map<string | null, { date: string; count: number; withoutEmail: number }>();
      
      companies.forEach(c => {
        const batchId = c.search_batch_id || 'legacy';
        const existing = batchMap.get(batchId) || { 
          date: c.search_batch_date || c.search_batch_date, 
          count: 0, 
          withoutEmail: 0 
        };
        existing.count++;
        if (!c.selected_email) existing.withoutEmail++;
        batchMap.set(batchId, existing);
      });

      // Convert to array and sort by date
      const batches: BatchInfo[] = [];
      batchMap.forEach((info, id) => {
        batches.push({ id, ...info });
      });

      // Sort by date descending
      batches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Latest batch (most recent with companies without email)
      const latestWithPending = batches.find(b => b.withoutEmail > 0);
      setLatestBatch(latestWithPending || null);

      // Previous batches (excluding latest)
      const previousWithPending = batches
        .filter(b => b.id !== latestWithPending?.id && b.withoutEmail > 0)
        .slice(0, 5);
      setPreviousBatches(previousWithPending);

      // Companies ready for campaign (have email, status not 'sent')
      const readyCount = companies.filter(c => 
        c.selected_email && c.status !== 'sent'
      ).length;
      setCampaignReady({ count: readyCount });

      // Auto-select scope based on availability
      if (latestWithPending) {
        setSearchScope("latest");
      } else if (previousWithPending.length > 0) {
        setSearchScope("previous");
      } else if (readyCount > 0) {
        setSearchScope("campaign");
      }

    } catch (error) {
      console.error('Error loading batch info:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}min ${secs}s` : `${secs}s`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMM yyyy", { locale: fr });
    } catch {
      return "Date inconnue";
    }
  };

  const handleSearch = async () => {
    if (searchScope === "campaign") {
      // Campaign mode - navigate to email composer
      if (onEmailsFound) onEmailsFound();
      return;
    }

    setIsSearching(true);
    setResults([]);
    setSummary(null);
    setElapsedTime(0);

    try {
      // Determine which batch(es) to search
      let batchIds: (string | null)[] = [];
      
      if (searchScope === "latest" && latestBatch) {
        batchIds = [latestBatch.id];
        setEstimatedTotal(latestBatch.withoutEmail);
      } else if (searchScope === "previous") {
        batchIds = previousBatches.map(b => b.id);
        setEstimatedTotal(previousBatches.reduce((acc, b) => acc + b.withoutEmail, 0));
      }

      let totalProcessed = 0;
      let totalEmailsFound = 0;
      let allResults: SearchResult[] = [];
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase.functions.invoke('find-company-emails', {
          body: { 
            maxCompanies: 25,
            batchIds: batchIds.filter(id => id !== null && id !== 'legacy')
          }
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
      loadBatchInfo(); // Refresh batch info

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

  const getConfidenceBadge = (confidence?: string) => {
    if (!confidence) return null;
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      high: "default",
      medium: "secondary",
      low: "destructive"
    };
    const labels: Record<string, string> = {
      high: "Haute",
      medium: "Moyenne",
      low: "Faible"
    };
    return <Badge variant={variants[confidence] || "secondary"}>Confiance: {labels[confidence] || confidence}</Badge>;
  };

  const getSourceBadge = (source?: string) => {
    if (!source || source === "none") return null;
    const colors: Record<string, string> = {
      scraping: "bg-blue-500/20 text-blue-400",
      "hunter.io": "bg-purple-500/20 text-purple-400"
    };
    return <Badge className={colors[source] || ""}>{source}</Badge>;
  };

  const getTimeEstimate = () => {
    if (!summary || !estimatedTotal || summary.processed === 0) return "";
    const avgTimePerCompany = elapsedTime / summary.processed;
    const remaining = Math.max(0, (estimatedTotal - summary.processed) * avgTimePerCompany);
    
    if (remaining > 60) {
      return `~${Math.ceil(remaining / 60)} min restantes`;
    }
    return `~${Math.ceil(remaining)}s restantes`;
  };

  const getSelectedCount = () => {
    if (searchScope === "latest" && latestBatch) return latestBatch.withoutEmail;
    if (searchScope === "previous") return previousBatches.reduce((acc, b) => acc + b.withoutEmail, 0);
    if (searchScope === "campaign") return campaignReady.count;
    return 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const noCompanies = !latestBatch && previousBatches.length === 0 && campaignReady.count === 0;

  return (
    <div className="space-y-6">
      {/* Batch Selection */}
      {!noCompanies && (
        <Card className="bg-card/50 border-border">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Sélectionner les contacts</h3>
            
            <RadioGroup value={searchScope} onValueChange={(v) => setSearchScope(v as SearchScope)} className="space-y-3">
              {/* Latest batch */}
              {latestBatch && (
                <div className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${searchScope === 'latest' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                  <RadioGroupItem value="latest" id="latest" />
                  <Label htmlFor="latest" className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-primary" />
                        <span className="font-medium">Recherche récente</span>
                        <Badge variant="secondary" className="text-xs">
                          {formatDate(latestBatch.date)}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {latestBatch.withoutEmail} sans email
                      </span>
                    </div>
                  </Label>
                </div>
              )}

              {/* Previous batches */}
              {previousBatches.length > 0 && (
                <div className={`flex items-start space-x-3 p-4 rounded-lg border transition-all ${searchScope === 'previous' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                  <RadioGroupItem value="previous" id="previous" className="mt-1" />
                  <Label htmlFor="previous" className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Recherches précédentes</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {previousBatches.reduce((acc, b) => acc + b.withoutEmail, 0)} sans email
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {previousBatches.slice(0, 3).map((batch, i) => (
                        <div key={batch.id || i} className="flex justify-between">
                          <span>{formatDate(batch.date)}</span>
                          <span>{batch.withoutEmail} contacts</span>
                        </div>
                      ))}
                    </div>
                  </Label>
                </div>
              )}

              {/* Campaign ready */}
              {campaignReady.count > 0 && (
                <div className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${searchScope === 'campaign' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                  <RadioGroupItem value="campaign" id="campaign" />
                  <Label htmlFor="campaign" className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Prêts pour campagne</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {campaignReady.count} avec email
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Contacts avec email, non encore contactés
                    </p>
                  </Label>
                </div>
              )}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Search Button */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">
                {searchScope === "campaign" ? "Lancer une campagne" : "Recherche automatique"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {noCompanies 
                  ? "Aucune entreprise à traiter. Lancez une recherche d'abord."
                  : searchScope === "campaign"
                    ? `Envoyer des emails à ${getSelectedCount()} contacts`
                    : `Trouver les emails de ${getSelectedCount()} entreprises`
                }
              </p>
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={isSearching || noCompanies || getSelectedCount() === 0}
              size="lg"
              className={searchScope === "campaign" ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:bg-primary/90"}
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recherche en cours...
                </>
              ) : searchScope === "campaign" ? (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Composer les emails
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Lancer la recherche
                </>
              )}
            </Button>
          </div>

          {/* Progress during search */}
          {isSearching && (
            <div className="mt-6 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Temps écoulé: {formatTime(elapsedTime)}</span>
                </div>
                <span className="text-muted-foreground">{getTimeEstimate()}</span>
              </div>
              
              {summary && estimatedTotal > 0 && (
                <Progress 
                  value={(summary.processed / estimatedTotal) * 100} 
                  className="h-2"
                />
              )}
              
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-sm text-center text-muted-foreground">
                  <span className="text-primary font-medium">Recherche en cours...</span>
                  <br />
                  Analyse des sites web et recherche des emails de contact.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {summary && !isSearching && (
        <Card className="bg-card/50 border-border animate-fade-in">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-primary">
                {summary.processed > 0 ? Math.round((summary.emailsFound / summary.processed) * 100) : 0}%
              </div>
              <div className="text-lg text-muted-foreground mt-1">
                {summary.emailsFound} / {summary.processed} entreprises avec email
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 text-center border-t border-border pt-4">
              <div>
                <div className="text-2xl font-bold text-foreground">{summary.processed}</div>
                <div className="text-xs text-muted-foreground">Traitées</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">{summary.emailsFound}</div>
                <div className="text-xs text-muted-foreground">Trouvés</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-muted-foreground">{summary.processed - summary.emailsFound}</div>
                <div className="text-xs text-muted-foreground">Sans email</div>
              </div>
            </div>
            
            {summary.emailsFound > 0 && onEmailsFound && (
              <div className="mt-6 flex justify-center">
                <Button onClick={onEmailsFound} className="gap-2">
                  Composer un email
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.filter(r => r.emails && r.emails.length > 0).length > 0 && !isSearching && (
        <div className="space-y-3 animate-fade-in">
          <h3 className="text-lg font-semibold text-foreground">
            Emails trouvés ({results.filter(r => r.emails && r.emails.length > 0).length})
          </h3>
          {results.filter(r => r.emails && r.emails.length > 0).map((result, index) => (
            <Card key={index} className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-foreground">{result.company}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSourceBadge(result.source)}
                    {getConfidenceBadge(result.confidence)}
                  </div>
                </div>
                
                {result.website && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Globe className="h-3 w-3" />
                    <a href={result.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-md">
                      {result.website}
                    </a>
                  </div>
                )}
                
                {result.emails && result.emails.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {result.emails.slice(0, 3).map((email, emailIndex) => (
                      <Badge 
                        key={emailIndex} 
                        variant={emailIndex === 0 ? "default" : "outline"} 
                        className="gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        {email}
                      </Badge>
                    ))}
                    {result.emails.length > 3 && (
                      <Badge variant="outline" className="opacity-60">
                        +{result.emails.length - 3} autres
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Credits Modal */}
      <CreditsNeededModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        planType={creditsInfo.planType}
        creditsAvailable={creditsInfo.creditsAvailable}
      />
    </div>
  );
};
