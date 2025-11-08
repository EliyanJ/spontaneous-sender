import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Globe, Search, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
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

interface EmailSearchProps {
  onNavigateToContacts?: () => void;
}

export const EmailSearch = ({ onNavigateToContacts }: EmailSearchProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [summary, setSummary] = useState<{ processed: number; total: number; emailsFound: number } | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    setIsSearching(true);
    setResults([]);
    setSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke('find-company-emails');

      if (error) {
        console.error('Error searching emails:', error);
        toast({
          title: "Erreur",
          description: "Impossible de rechercher les emails. Veuillez réessayer.",
          variant: "destructive",
        });
        return;
      }

      setResults(data.results || []);
      setSummary({
        processed: data.processed,
        total: data.total,
        emailsFound: data.emailsFound
      });

      toast({
        title: "Recherche terminée",
        description: `${data.emailsFound} emails trouvés pour ${data.processed} entreprises`,
      });

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la recherche",
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

    return (
      <Badge variant={variants[confidence] || "secondary"}>
        Confiance: {confidence}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Recherche d'Emails</h2>
          <p className="text-muted-foreground mt-2">
            Recherchez automatiquement les emails de contact de vos entreprises sauvegardées
          </p>
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={isSearching}
          size="lg"
        >
          {isSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Recherche en cours...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Lancer la recherche
            </>
          )}
        </Button>
      </div>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Résumé de la recherche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{summary.processed}/{summary.total}</div>
                <div className="text-sm text-muted-foreground">Entreprises traitées</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{summary.emailsFound}</div>
                <div className="text-sm text-muted-foreground">Emails trouvés</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {summary.emailsFound > 0 ? Math.round((summary.emailsFound / summary.processed) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Taux de réussite</div>
              </div>
            </div>
            
            {summary.emailsFound > 0 && onNavigateToContacts && (
              <div className="mt-4 flex justify-center">
                <Button 
                  onClick={onNavigateToContacts}
                  size="lg"
                  className="gap-2"
                >
                  Voir les emails trouvés
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Résultats détaillés</h3>
          {results.map((result, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {result.status === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    {result.company}
                  </CardTitle>
                  {result.confidence && getConfidenceBadge(result.confidence)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={result.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {result.website}
                    </a>
                  </div>
                )}
                
                {result.emails && result.emails.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Emails trouvés:
                    </div>
                    <div className="flex flex-wrap gap-2 pl-6">
                      {result.emails.map((email, emailIndex) => (
                        <Badge key={emailIndex} variant="outline">
                          {email}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {result.source && (
                  <div className="text-sm text-muted-foreground pl-6">
                    <span className="font-medium">Source:</span> {result.source}
                  </div>
                )}

                {result.error && (
                  <div className="text-sm text-destructive pl-6">
                    <span className="font-medium">Erreur:</span> {result.error}
                  </div>
                )}

                {result.status === 'success' && (!result.emails || result.emails.length === 0) && (
                  <div className="text-sm text-muted-foreground pl-6">
                    Aucun email trouvé pour cette entreprise
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isSearching && results.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comment ça fonctionne ?</CardTitle>
            <CardDescription>
              Notre IA va analyser toutes vos entreprises sauvegardées et:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div>
                <h4 className="font-medium">Recherche du site web</h4>
                <p className="text-sm text-muted-foreground">
                  L'IA cherche le site officiel de chaque entreprise en utilisant le nom, la ville et le SIREN
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div>
                <h4 className="font-medium">Analyse des pages de contact</h4>
                <p className="text-sm text-muted-foreground">
                  Le système explore les pages importantes du site pour trouver les emails de contact
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <div>
                <h4 className="font-medium">Recherche alternative</h4>
                <p className="text-sm text-muted-foreground">
                  Si aucun email n'est trouvé sur le site, l'IA cherche sur des annuaires et sites partenaires
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
