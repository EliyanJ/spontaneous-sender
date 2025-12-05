import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Globe, Send, Copy, RefreshCw, Check, ExternalLink, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Company {
  id: string;
  nom: string;
  selected_email: string | null;
  website_url: string | null;
  company_insights: any;
  libelle_ape: string | null;
  ville: string | null;
}

interface GeneratedEmail {
  subject: string;
  body: string;
  highlights: string[];
  confidence: number;
}

export const PersonalizedEmailGenerator = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [template, setTemplate] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    const { data } = await supabase
      .from("companies")
      .select("id, nom, selected_email, website_url, company_insights, libelle_ape, ville")
      .not("website_url", "is", null)
      .order("nom");
    
    setCompanies(data || []);
  };

  const handleCompanySelect = (companyId: string) => {
    setSelectedCompanyId(companyId);
    const company = companies.find(c => c.id === companyId);
    setSelectedCompany(company || null);
    setGeneratedEmail(null);
  };

  const handleScrapeWebsite = async () => {
    if (!selectedCompany || !selectedCompany.website_url) {
      toast({ title: "Erreur", description: "Aucun site web disponible", variant: "destructive" });
      return;
    }

    setIsScraping(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      const { data, error } = await supabase.functions.invoke("scrape-company-deep", {
        body: { companyId: selectedCompany.id, websiteUrl: selectedCompany.website_url },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      if (data?.success) {
        toast({ 
          title: "Site scrapé avec succès", 
          description: `${data.pagesScraped} pages analysées` 
        });
        // Recharger les données de l'entreprise
        const { data: updatedCompany } = await supabase
          .from("companies")
          .select("id, nom, selected_email, website_url, company_insights, libelle_ape, ville")
          .eq("id", selectedCompany.id)
          .single();
        
        if (updatedCompany) {
          setSelectedCompany(updatedCompany);
          setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
        }
      } else {
        toast({ title: "Échec du scraping", description: data?.error || "Aucun contenu trouvé", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsScraping(false);
    }
  };

  const handleGenerateEmail = async () => {
    if (!selectedCompany) {
      toast({ title: "Erreur", description: "Sélectionnez une entreprise", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      const { data, error } = await supabase.functions.invoke("generate-personalized-email", {
        body: { 
          companyId: selectedCompany.id, 
          template: template || undefined 
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      if (data?.needsScraping) {
        toast({ 
          title: "Scraping requis", 
          description: "Veuillez d'abord scraper le site web de l'entreprise",
          variant: "destructive"
        });
        return;
      }

      if (data?.success && data?.email) {
        setGeneratedEmail(data.email);
        toast({ title: "Email généré avec succès" });
      } else {
        toast({ title: "Erreur de génération", description: data?.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copié dans le presse-papiers" });
  };

  const handleSendToComposer = () => {
    if (generatedEmail && selectedCompany) {
      window.dispatchEvent(new CustomEvent('load-personalized-email', {
        detail: {
          subject: generatedEmail.subject,
          body: generatedEmail.body,
          recipient: selectedCompany.selected_email,
        }
      }));
      toast({ title: "Email chargé dans le compositeur" });
    }
  };

  const hasInsights = selectedCompany?.company_insights?.content;
  const insightsPagesCount = selectedCompany?.company_insights?.pages_scraped || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Emails personnalisés IA</h3>
          <p className="text-sm text-muted-foreground">
            Générez des candidatures ultra-personnalisées basées sur le site web
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
            <CardDescription>Sélectionnez une entreprise et personnalisez</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Company Selection */}
            <div className="space-y-2">
              <Label>Entreprise</Label>
              <Select value={selectedCompanyId} onValueChange={handleCompanySelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une entreprise..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      <div className="flex items-center gap-2">
                        <span>{company.nom}</span>
                        {company.company_insights?.content && (
                          <Badge variant="secondary" className="text-xs">Scrapé</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Company Info */}
            {selectedCompany && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{selectedCompany.nom}</span>
                  {selectedCompany.website_url && (
                    <a 
                      href={selectedCompany.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-sm"
                    >
                      <Globe className="h-3 w-3" />
                      Site web
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {selectedCompany.libelle_ape && (
                  <p className="text-sm text-muted-foreground">{selectedCompany.libelle_ape}</p>
                )}
                {selectedCompany.ville && (
                  <p className="text-sm text-muted-foreground">{selectedCompany.ville}</p>
                )}
                {selectedCompany.selected_email && (
                  <Badge variant="outline">{selectedCompany.selected_email}</Badge>
                )}

                {/* Insights Status */}
                <div className="pt-2 border-t border-border mt-2">
                  {hasInsights ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-500 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        {insightsPagesCount} pages analysées
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleScrapeWebsite}
                        disabled={isScraping}
                      >
                        <RefreshCw className={`h-4 w-4 mr-1 ${isScraping ? 'animate-spin' : ''}`} />
                        Re-scraper
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleScrapeWebsite} 
                      disabled={isScraping || !selectedCompany.website_url}
                      className="w-full"
                      variant="secondary"
                    >
                      {isScraping ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyse en cours...
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4 mr-2" />
                          Analyser le site web
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Template (optional) */}
            <div className="space-y-2">
              <Label>Template de base (optionnel)</Label>
              <Textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="Collez votre template de candidature ici pour que l'IA le personnalise..."
                rows={6}
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Si vide, l'IA générera un email complet basé sur les insights.
              </p>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerateEmail}
              disabled={!selectedCompany || isGenerating || !hasInsights}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Générer email personnalisé
                </>
              )}
            </Button>

            {!hasInsights && selectedCompany && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Scraping requis</AlertTitle>
                <AlertDescription>
                  Analysez d'abord le site web pour collecter les insights.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Generated Email Preview */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-base">Email généré</CardTitle>
            <CardDescription>
              {generatedEmail ? "Aperçu de votre candidature personnalisée" : "L'email apparaîtra ici"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedEmail ? (
              <>
                {/* Confidence */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Niveau de personnalisation</span>
                    <span className="font-medium">{Math.round(generatedEmail.confidence * 100)}%</span>
                  </div>
                  <Progress value={generatedEmail.confidence * 100} className="h-2" />
                </div>

                {/* Highlights */}
                {generatedEmail.highlights.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Points clés utilisés</Label>
                    <div className="flex flex-wrap gap-2">
                      {generatedEmail.highlights.map((h, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {h}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subject */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Objet</Label>
                  <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                    <span className="font-medium">{generatedEmail.subject}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCopy(generatedEmail.subject)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Body */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Corps de l'email</Label>
                  <div className="p-3 rounded-lg bg-muted/50 max-h-64 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-sans">
                      {generatedEmail.body}
                    </pre>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCopy(generatedEmail.body)}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copier le corps
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={handleGenerateEmail}
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                    Régénérer
                  </Button>
                  <Button 
                    onClick={handleSendToComposer}
                    className="flex-1"
                    disabled={!selectedCompany?.selected_email}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer
                  </Button>
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Sélectionnez une entreprise et générez un email</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
