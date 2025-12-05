import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, Send, Copy, RefreshCw, Check, FileText, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  companyId: string;
  companyName: string;
  email: string;
  subject: string;
  body: string;
  highlights: string[];
  confidence: number;
}

export const PersonalizedEmailGenerator = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [template, setTemplate] = useState("");
  const [cvContent, setCvContent] = useState("");
  const [generatedEmails, setGeneratedEmails] = useState<GeneratedEmail[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
    loadCvContent();
  }, []);

  const loadCompanies = async () => {
    const { data } = await supabase
      .from("companies")
      .select("id, nom, selected_email, website_url, company_insights, libelle_ape, ville")
      .not("website_url", "is", null)
      .not("selected_email", "is", null)
      .order("nom");
    setCompanies(data || []);
  };

  const loadCvContent = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("cv_content")
      .eq("id", user.id)
      .single();
    if (data?.cv_content) setCvContent(data.cv_content);
  };

  const saveCvContent = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ cv_content: cvContent }).eq("id", user.id);
    toast({ title: "CV sauvegardé" });
  };

  const toggleCompany = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const eligibleIds = companies.filter(c => c.company_insights?.content).map(c => c.id);
    setSelectedIds(eligibleIds);
  };

  const handleBatchGenerate = async () => {
    if (selectedIds.length === 0) {
      toast({ title: "Sélectionnez au moins une entreprise", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: selectedIds.length });
    setGeneratedEmails([]);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Session expirée", variant: "destructive" });
      setIsProcessing(false);
      return;
    }

    const results: GeneratedEmail[] = [];

    for (let i = 0; i < selectedIds.length; i++) {
      const companyId = selectedIds[i];
      const company = companies.find(c => c.id === companyId);
      if (!company) continue;

      setProgress({ current: i + 1, total: selectedIds.length });

      try {
        // Scrape si pas d'insights
        if (!company.company_insights?.content && company.website_url) {
          await supabase.functions.invoke("scrape-company-deep", {
            body: { companyId, websiteUrl: company.website_url },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        }

        const { data, error } = await supabase.functions.invoke("generate-personalized-email", {
          body: { companyId, template: template || undefined, cvContent: cvContent || undefined },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!error && data?.success && data?.email) {
          results.push({
            companyId,
            companyName: company.nom,
            email: company.selected_email || "",
            subject: data.email.subject,
            body: data.email.body,
            highlights: data.email.highlights || [],
            confidence: data.email.confidence || 0.5,
          });
        }
      } catch (err) {
        console.error(`Error for ${company.nom}:`, err);
      }

      // Petit délai entre chaque pour éviter le rate limiting
      if (i < selectedIds.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setGeneratedEmails(results);
    setIsProcessing(false);
    toast({ title: `${results.length}/${selectedIds.length} emails générés` });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSendToComposer = (email: GeneratedEmail) => {
    window.dispatchEvent(new CustomEvent('load-personalized-email', {
      detail: { subject: email.subject, body: email.body, recipient: email.email }
    }));
    toast({ title: "Email chargé dans le compositeur" });
  };

  const eligibleCompanies = companies.filter(c => c.company_insights?.content);
  const needsScrapingCount = companies.length - eligibleCompanies.length;

  return (
    <div className="space-y-4">
      {/* Header compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Emails personnalisés IA</h3>
          <Badge variant="outline" className="text-xs">Gemini 2.5 Flash</Badge>
        </div>
        <Badge variant="secondary">{eligibleCompanies.length} prêtes / {companies.length} total</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Colonne 1: CV + Template */}
        <Card className="bg-card/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" /> CV & Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Contenu CV (pour argumentaire)</Label>
              <Textarea
                value={cvContent}
                onChange={(e) => setCvContent(e.target.value)}
                placeholder="Collez votre CV ici pour que l'IA adapte l'argumentaire..."
                rows={4}
                className="text-sm mt-1"
              />
              <Button variant="ghost" size="sm" onClick={saveCvContent} className="mt-1 h-7 text-xs">
                Sauvegarder CV
              </Button>
            </div>
            <div>
              <Label className="text-xs">Template de base (optionnel)</Label>
              <Textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="Template à personnaliser..."
                rows={4}
                className="text-sm mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Colonne 2: Sélection entreprises */}
        <Card className="bg-card/50">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Entreprises</CardTitle>
              <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
                Tout sélectionner ({eligibleCompanies.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <div className="space-y-1">
                {companies.map((company) => {
                  const hasInsights = !!company.company_insights?.content;
                  return (
                    <div
                      key={company.id}
                      className={`flex items-center gap-2 p-2 rounded text-sm ${
                        hasInsights ? "hover:bg-muted/50" : "opacity-50"
                      }`}
                    >
                      <Checkbox
                        checked={selectedIds.includes(company.id)}
                        onCheckedChange={() => toggleCompany(company.id)}
                        disabled={!hasInsights}
                      />
                      <span className="truncate flex-1">{company.nom}</span>
                      {hasInsights ? (
                        <Badge variant="secondary" className="text-[10px]">Prêt</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">À scraper</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            {needsScrapingCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {needsScrapingCount} entreprises nécessitent un scraping (automatique)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Colonne 3: Génération + Résultats */}
        <Card className="bg-card/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" /> Génération
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={handleBatchGenerate}
              disabled={selectedIds.length === 0 || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {progress.current}/{progress.total}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Générer {selectedIds.length} email{selectedIds.length > 1 ? "s" : ""}
                </>
              )}
            </Button>

            {isProcessing && (
              <Progress value={(progress.current / progress.total) * 100} className="h-2" />
            )}

            {generatedEmails.length > 0 && (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {generatedEmails.map((email) => (
                    <div key={email.companyId} className="p-2 rounded bg-muted/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{email.companyName}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {Math.round(email.confidence * 100)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{email.subject}</p>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => handleCopy(`${email.subject}\n\n${email.body}`, email.companyId)}
                        >
                          {copied === email.companyId ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => handleSendToComposer(email)}
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};