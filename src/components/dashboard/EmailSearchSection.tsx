import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Globe, Search, CheckCircle2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  company: string;
  status: string;
  website?: string;
  emails?: string[];
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
  const { toast } = useToast();

  const handleSearch = async () => {
    setIsSearching(true);
    setResults([]);
    setSummary(null);

    try {
      let totalProcessed = 0;
      let totalEmailsFound = 0;
      let allResults: SearchResult[] = [];
      let hasMore = true;
      let batchCount = 0;

      while (hasMore) {
        batchCount++;
        const { data, error } = await supabase.functions.invoke('find-company-emails', {
          body: { maxCompanies: 50 }
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

        totalProcessed += data.processed || 0;
        totalEmailsFound += data.emailsFound || 0;
        allResults = [...allResults, ...(data.results || [])];
        hasMore = data.hasMore || false;

        setResults(allResults);
        setSummary({
          processed: totalProcessed,
          total: totalProcessed,
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
    return <Badge variant={variants[confidence] || "secondary"}>Confiance: {confidence}</Badge>;
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
        </CardContent>
      </Card>

      {/* Summary */}
      {summary && (
        <Card className="bg-card/50 border-border">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-foreground">{summary.processed}</div>
                <div className="text-sm text-muted-foreground">Entreprises traitées</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-success">{summary.emailsFound}</div>
                <div className="text-sm text-muted-foreground">Emails trouvés</div>
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
      {results.filter(r => r.emails && r.emails.length > 0).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Emails trouvés</h3>
          {results.filter(r => r.emails && r.emails.length > 0).map((result, index) => (
            <Card key={index} className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="font-medium text-foreground">{result.company}</span>
                  </div>
                  {result.confidence && getConfidenceBadge(result.confidence)}
                </div>
                
                {result.website && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Globe className="h-3 w-3" />
                    <a href={result.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {result.website}
                    </a>
                  </div>
                )}
                
                {result.emails && result.emails.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {result.emails.map((email, emailIndex) => (
                      <Badge key={emailIndex} variant="outline" className="gap-1">
                        <Mail className="h-3 w-3" />
                        {email}
                      </Badge>
                    ))}
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
