import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Globe, Search, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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

interface EmailSearchSectionProps {
  onEmailsFound?: () => void;
}

export const EmailSearchSection = ({ onEmailsFound }: EmailSearchSectionProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [summary, setSummary] = useState<{ processed: number; total: number; emailsFound: number } | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const { toast } = useToast();

  // Timer pour le temps écoulé
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

  const handleSearch = async () => {
    setIsSearching(true);
    setResults([]);
    setSummary(null);
    setElapsedTime(0);

    try {
      // D'abord, compter les entreprises à traiter
      const { count } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .is('selected_email', null);
      
      setEstimatedTotal(count || 0);

      let totalProcessed = 0;
      let totalEmailsFound = 0;
      let allResults: SearchResult[] = [];
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase.functions.invoke('find-company-emails', {
          body: { maxCompanies: 20 } // Réduit à 20 pour éviter timeout backend
        });

        if (error) {
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

        // Correction: utiliser les bons champs de la réponse
        totalProcessed += data.processed || 0;
        totalEmailsFound += data.summary?.found || data.results?.filter((r: SearchResult) => r.emails && r.emails.length > 0).length || 0;
        allResults = [...allResults, ...(data.results || [])];
        hasMore = data.hasMore || false;

        setResults(allResults);
        setSummary({
          processed: totalProcessed,
          total: estimatedTotal,
          emailsFound: totalEmailsFound
        });

        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      window.dispatchEvent(new CustomEvent('companies:updated'));

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

  // Calcul de l'estimation du temps restant
  const getTimeEstimate = () => {
    if (!summary || !estimatedTotal || summary.processed === 0) return "";
    const avgTimePerCompany = elapsedTime / summary.processed; // Calculer le temps moyen réel
    const remaining = Math.max(0, (estimatedTotal - summary.processed) * avgTimePerCompany);
    
    if (remaining > 60) {
      return `~${Math.ceil(remaining / 60)} min restantes`;
    }
    return `~${Math.ceil(remaining)}s restantes`;
  };

  return (
    <div className="space-y-6">
      {/* Search Button */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Recherche automatique</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Trouvez les emails de toutes vos entreprises sauvegardées
              </p>
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={isSearching}
              size="lg"
              className="bg-primary hover:bg-primary/90"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recherche...
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
                  Cela peut prendre plusieurs minutes selon le nombre d'entreprises.
                  <br />
                  <span className="text-xs opacity-75">
                    Nous analysons les sites web et recherchons les emails de contact.
                  </span>
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
            {/* Pourcentage de succès */}
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
    </div>
  );
};