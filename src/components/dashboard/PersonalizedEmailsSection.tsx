import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Sparkles,
  FileText,
  Upload,
  Send,
  Building2,
  Mail,
  CheckCircle,
  XCircle,
  Eye,
  Edit3,
  RefreshCw,
  Globe,
  Clock,
  Wand2
} from "lucide-react";

interface Company {
  id: string;
  nom: string;
  selected_email: string;
  website_url: string | null;
  ville: string | null;
  libelle_ape: string | null;
}

interface GeneratedEmail {
  company_id: string;
  company_name: string;
  company_email?: string;
  website_url?: string;
  success: boolean;
  subject?: string;
  body?: string;
  error?: string;
  scraped_info?: boolean;
}

interface UserProfile {
  fullName: string | null;
  education: string | null;
  linkedinUrl: string | null;
  cvContent: string | null;
}

export const PersonalizedEmailsSection = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [template, setTemplate] = useState("");
  const [cvContent, setCvContent] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEmails, setGeneratedEmails] = useState<GeneratedEmail[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentCompany, setCurrentCompany] = useState("");
  const [previewEmail, setPreviewEmail] = useState<GeneratedEmail | null>(null);
  const [editingEmail, setEditingEmail] = useState<GeneratedEmail | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTab, setActiveTab] = useState<"setup" | "results">("setup");

  useEffect(() => {
    loadCompanies();
    loadUserProfile();
    checkGmailConnection();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const loadCompanies = async () => {
    // Get sent/scheduled emails to exclude
    const { data: campaignsData } = await supabase
      .from("email_campaigns")
      .select("recipient");
    
    const sentEmails = new Set(
      (campaignsData || []).map(c => c.recipient.toLowerCase())
    );

    const { data: scheduledData } = await supabase
      .from("scheduled_emails")
      .select("recipients")
      .eq("status", "pending");
    
    const scheduledEmails = new Set<string>();
    (scheduledData || []).forEach(s => {
      (s.recipients || []).forEach((r: string) => scheduledEmails.add(r.toLowerCase()));
    });

    // Get companies with valid emails
    const { data } = await supabase
      .from("companies")
      .select("id, nom, selected_email, website_url, ville, libelle_ape")
      .not("selected_email", "is", null)
      .neq("selected_email", "NOT_FOUND");

    const filteredCompanies = (data || []).filter(company => {
      const email = company.selected_email?.toLowerCase();
      return email && !sentEmails.has(email) && !scheduledEmails.has(email);
    });

    setCompanies(filteredCompanies);
  };

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("full_name, education, linkedin_url, cv_content")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      setUserProfile({
        fullName: data.full_name,
        education: data.education,
        linkedinUrl: data.linkedin_url,
        cvContent: data.cv_content
      });
      if (data.cv_content) {
        setCvContent(data.cv_content);
      }
    }
  };

  const checkGmailConnection = async () => {
    const { data } = await supabase.from("gmail_tokens").select("id").maybeSingle();
    setGmailConnected(!!data);
  };

  const handleSelectAll = () => {
    if (selectedCompanies.size === companies.length) {
      setSelectedCompanies(new Set());
    } else {
      setSelectedCompanies(new Set(companies.map(c => c.id)));
    }
  };

  const handleSelectCompany = (id: string) => {
    const newSelected = new Set(selectedCompanies);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCompanies(newSelected);
  };

  const [isParsingCv, setIsParsingCv] = useState(false);

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    const isSupported = supportedTypes.includes(file.type) || 
      file.name.endsWith('.pdf') || 
      file.name.endsWith('.docx') || 
      file.name.endsWith('.txt');

    if (!isSupported) {
      toast({ 
        title: "Format non supporté", 
        description: "Formats acceptés: PDF, DOCX, TXT", 
        variant: "destructive" 
      });
      return;
    }

    // For plain text, read directly
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text();
      setCvContent(text);
      toast({ title: "CV chargé", description: "Contenu du CV importé avec succès" });
      return;
    }

    // For PDF and DOCX, use the parsing edge function
    setIsParsingCv(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("parse-cv-document", {
        body: {
          fileBase64: base64,
          fileName: file.name,
          fileType: file.type
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      if (data?.success && data?.text) {
        setCvContent(data.text);
        toast({ 
          title: "CV analysé", 
          description: `${file.name} importé avec succès` 
        });
      } else {
        throw new Error(data?.error || "Échec de l'analyse");
      }
    } catch (error) {
      console.error("CV parsing error:", error);
      toast({ 
        title: "Erreur d'analyse", 
        description: "Impossible de lire le fichier. Essayez de coller le texte directement.", 
        variant: "destructive" 
      });
    } finally {
      setIsParsingCv(false);
    }
  };

  const saveCvToProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .upsert({ id: user.id, cv_content: cvContent, updated_at: new Date().toISOString() });

    toast({ title: "CV sauvegardé", description: "Votre CV a été sauvegardé dans votre profil" });
  };

  const handleGenerateEmails = async () => {
    if (selectedCompanies.size === 0) {
      toast({ title: "Sélection vide", description: "Sélectionnez au moins une entreprise", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setElapsedTime(0);
    setGeneratedEmails([]);
    setActiveTab("results");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      const selectedCompanyList = companies.filter(c => selectedCompanies.has(c.id));
      const batchSize = 5;
      const allResults: GeneratedEmail[] = [];

      for (let i = 0; i < selectedCompanyList.length; i += batchSize) {
        const batch = selectedCompanyList.slice(i, i + batchSize);
        setCurrentCompany(`${batch.map(c => c.nom).join(', ')}...`);

        const { data, error } = await supabase.functions.invoke("generate-personalized-emails", {
          body: {
            companies: batch,
            template: template || null,
            cvContent: cvContent || null,
            userProfile
          },
          headers: { Authorization: `Bearer ${session.access_token}` }
        });

        if (error) {
          console.error("Generation error:", error);
          batch.forEach(c => {
            allResults.push({
              company_id: c.id,
              company_name: c.nom,
              success: false,
              error: error.message
            });
          });
        } else if (data?.results) {
          allResults.push(...data.results);
        }

        setGeneratedEmails([...allResults]);
        setProgress(Math.round(((i + batch.length) / selectedCompanyList.length) * 100));

        // Small delay between batches
        if (i + batchSize < selectedCompanyList.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successCount = allResults.filter(r => r.success).length;
      toast({
        title: "Génération terminée",
        description: `${successCount}/${selectedCompanyList.length} emails générés avec succès`
      });

    } catch (error) {
      console.error("Generation error:", error);
      toast({ title: "Erreur", description: "Une erreur est survenue", variant: "destructive" });
    } finally {
      setIsGenerating(false);
      setCurrentCompany("");
    }
  };

  const handleEditEmail = (email: GeneratedEmail) => {
    setEditingEmail(email);
    setEditedSubject(email.subject || "");
    setEditedBody(email.body || "");
  };

  const handleSaveEdit = () => {
    if (!editingEmail) return;
    
    setGeneratedEmails(prev => prev.map(e => 
      e.company_id === editingEmail.company_id 
        ? { ...e, subject: editedSubject, body: editedBody }
        : e
    ));
    setEditingEmail(null);
    toast({ title: "Email modifié" });
  };

  const handleSendEmail = async (email: GeneratedEmail) => {
    if (!email.company_email || !email.subject || !email.body) return;
    
    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      const { error } = await supabase.functions.invoke("send-gmail-emails", {
        body: {
          recipients: [email.company_email],
          subject: email.subject,
          body: email.body,
          attachments: []
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      toast({ title: "Email envoyé", description: `Email envoyé à ${email.company_name}` });
      
      // Remove from list
      setGeneratedEmails(prev => prev.filter(e => e.company_id !== email.company_id));
      setSelectedCompanies(prev => {
        const newSet = new Set(prev);
        newSet.delete(email.company_id);
        return newSet;
      });

    } catch (error) {
      console.error("Send error:", error);
      toast({ title: "Erreur d'envoi", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendAllEmails = async () => {
    const validEmails = generatedEmails.filter(e => e.success && e.company_email);
    if (validEmails.length === 0) {
      toast({ title: "Aucun email à envoyer", variant: "destructive" });
      return;
    }

    setIsSending(true);
    let sentCount = 0;

    for (const email of validEmails) {
      try {
        await handleSendEmail(email);
        sentCount++;
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay between sends
      } catch (error) {
        console.error(`Failed to send to ${email.company_name}:`, error);
      }
    }

    toast({
      title: "Envoi terminé",
      description: `${sentCount}/${validEmails.length} emails envoyés`
    });
    setIsSending(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const successfulEmails = generatedEmails.filter(e => e.success);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "setup" | "results")}>
        <TabsList className="bg-card/50 border border-border">
          <TabsTrigger value="setup" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Wand2 className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" disabled={generatedEmails.length === 0}>
            <Mail className="h-4 w-4" />
            Emails générés ({successfulEmails.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="mt-6 space-y-6">
          {/* Template & CV Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Template de référence
                </CardTitle>
                <CardDescription>
                  Décrivez le style et la structure souhaités pour vos emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder="Ex: Je souhaite un email qui met en avant mon expérience en développement web, mon intérêt pour les startups innovantes, et ma capacité à apprendre rapidement. Le ton doit être professionnel mais dynamique..."
                  rows={8}
                  className="bg-background resize-none"
                />
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Upload className="h-5 w-5 text-primary" />
                  Votre CV / Compétences
                </CardTitle>
                <CardDescription>
                  L'IA utilisera ces informations pour personnaliser chaque email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Input
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={handleCvUpload}
                    className="hidden"
                    id="cv-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("cv-upload")?.click()}
                    disabled={isParsingCv}
                    className="w-full border-dashed"
                  >
                    {isParsingCv ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {isParsingCv ? "Analyse en cours..." : "Importer CV (PDF, DOCX, TXT)"}
                  </Button>
                </div>
                <Textarea
                  value={cvContent}
                  onChange={(e) => setCvContent(e.target.value)}
                  placeholder="Ou collez directement vos compétences, expériences, formations..."
                  rows={6}
                  className="bg-background resize-none"
                />
                {cvContent && (
                  <Button variant="secondary" size="sm" onClick={saveCvToProfile}>
                    Sauvegarder dans mon profil
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Company Selection */}
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                    Sélectionner les entreprises
                  </CardTitle>
                  <CardDescription>
                    {companies.length} entreprises disponibles avec email
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedCompanies.size === companies.length ? "Désélectionner tout" : "Tout sélectionner"}
                  </Button>
                  <Badge variant="secondary" className="text-sm">
                    {selectedCompanies.size} sélectionnée(s)
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {companies.map((company) => (
                    <div
                      key={company.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedCompanies.has(company.id)
                          ? "bg-primary/10 border-primary/30"
                          : "bg-card hover:bg-muted/50 border-border"
                      }`}
                      onClick={() => handleSelectCompany(company.id)}
                    >
                      <Checkbox
                        checked={selectedCompanies.has(company.id)}
                        onCheckedChange={() => handleSelectCompany(company.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{company.nom}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {company.ville} • {company.libelle_ape || "Secteur non spécifié"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {company.website_url && (
                          <Globe className="h-4 w-4 text-success" />
                        )}
                        <Badge variant="outline" className="text-xs shrink-0">
                          {company.selected_email}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleGenerateEmails}
              disabled={isGenerating || selectedCompanies.size === 0}
              className="gap-2 px-8"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Générer {selectedCompanies.size} email(s) personnalisé(s)
                </>
              )}
            </Button>
          </div>

          {/* Progress */}
          {isGenerating && (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    <Clock className="h-4 w-4 inline mr-1" />
                    {formatTime(elapsedTime)}
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {currentCompany || "Initialisation..."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="results" className="mt-6 space-y-6">
          {/* Actions */}
          {successfulEmails.length > 0 && (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="font-medium">{successfulEmails.length} emails prêts à envoyer</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("setup")}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regénérer
                  </Button>
                  <Button
                    onClick={handleSendAllEmails}
                    disabled={isSending || !gmailConnected}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Tout envoyer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Email List */}
          <div className="space-y-4">
            {generatedEmails.map((email) => (
              <Card 
                key={email.company_id} 
                className={`bg-card/50 border-border ${!email.success ? "opacity-60" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {email.success ? (
                          <CheckCircle className="h-4 w-4 text-success shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        )}
                        <span className="font-medium truncate">{email.company_name}</span>
                        {email.scraped_info && (
                          <Badge variant="secondary" className="text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            Site scrapé
                          </Badge>
                        )}
                      </div>
                      {email.success ? (
                        <>
                          <p className="text-sm text-muted-foreground mb-1">
                            <strong>Objet:</strong> {email.subject}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {email.body?.slice(0, 150)}...
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-destructive">{email.error}</p>
                      )}
                    </div>
                    {email.success && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewEmail(email)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditEmail(email)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSendEmail(email)}
                          disabled={isSending || !gmailConnected}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewEmail} onOpenChange={() => setPreviewEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aperçu - {previewEmail?.company_name}</DialogTitle>
            <DialogDescription>
              Email personnalisé généré par l'IA
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Destinataire</Label>
              <p className="font-medium">{previewEmail?.company_email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Objet</Label>
              <p className="font-medium">{previewEmail?.subject}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Message</Label>
              <div className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                {previewEmail?.body}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingEmail} onOpenChange={() => setEditingEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier - {editingEmail?.company_name}</DialogTitle>
            <DialogDescription>
              Modifiez l'email avant envoi
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Objet</Label>
              <Input
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={12}
                className="mt-1.5 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingEmail(null)}>
                Annuler
              </Button>
              <Button onClick={handleSaveEdit}>
                Sauvegarder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
