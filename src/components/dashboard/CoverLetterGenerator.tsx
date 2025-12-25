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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Sparkles,
  FileText,
  Upload,
  Building2,
  CheckCircle,
  XCircle,
  Eye,
  Edit3,
  RefreshCw,
  Globe,
  Wand2,
  Save,
  Trash2,
  FolderOpen,
  Copy,
  Download,
  AlertCircle
} from "lucide-react";
import { GenerationOverlay } from "./GenerationOverlay";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface Company {
  id: string;
  nom: string;
  selected_email: string | null;
  website_url: string | null;
  ville: string | null;
  libelle_ape: string | null;
}

interface GeneratedLetter {
  company_id: string;
  company_name: string;
  website_url?: string;
  success: boolean;
  letter?: string;
  error?: string;
  scraped_info?: boolean;
}

interface UserProfile {
  fullName: string | null;
  education: string | null;
  linkedinUrl: string | null;
  cvContent: string | null;
}

interface ProcessLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'processing';
  message: string;
  company?: string;
}

interface SavedCvProfile {
  id: string;
  name: string;
  content: string;
}

const CoverLetterGenerator = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [cvContent, setCvContent] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLetters, setGeneratedLetters] = useState<GeneratedLetter[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentCompany, setCurrentCompany] = useState("");
  const [previewLetter, setPreviewLetter] = useState<GeneratedLetter | null>(null);
  const [editingLetter, setEditingLetter] = useState<GeneratedLetter | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTab, setActiveTab] = useState<"setup" | "results">("setup");
  const [processLogs, setProcessLogs] = useState<ProcessLog[]>([]);
  const [currentStep, setCurrentStep] = useState<string>("");

  // Saved profiles
  const [savedCvProfiles, setSavedCvProfiles] = useState<SavedCvProfile[]>([]);
  const [selectedCvProfileId, setSelectedCvProfileId] = useState<string>("");
  const [newProfileName, setNewProfileName] = useState("");
  const [showSaveProfileDialog, setShowSaveProfileDialog] = useState(false);
  const [isParsingCv, setIsParsingCv] = useState(false);

  useEffect(() => {
    loadCompanies();
    loadUserProfile();
    loadSavedProfiles();
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

  const loadSavedProfiles = async () => {
    const { data } = await supabase
      .from("user_cv_profiles")
      .select("id, name, content")
      .order("created_at", { ascending: false });
    setSavedCvProfiles(data || []);
  };

  const handleSaveCvProfile = async () => {
    if (!newProfileName.trim() || !cvContent.trim()) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("user_cv_profiles").insert({
      user_id: user.id,
      name: newProfileName.trim(),
      content: cvContent
    });

    if (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } else {
      toast({ title: "Profil CV sauvegardé" });
      setNewProfileName("");
      setShowSaveProfileDialog(false);
      loadSavedProfiles();
    }
  };

  const handleLoadCvProfile = (profileId: string) => {
    const profile = savedCvProfiles.find(p => p.id === profileId);
    if (profile) {
      setCvContent(profile.content);
      setSelectedCvProfileId(profileId);
      toast({ title: `Profil "${profile.name}" chargé` });
    }
  };

  const handleDeleteCvProfile = async (profileId: string) => {
    await supabase.from("user_cv_profiles").delete().eq("id", profileId);
    loadSavedProfiles();
    if (selectedCvProfileId === profileId) setSelectedCvProfileId("");
    toast({ title: "Profil supprimé" });
  };

  const loadCompanies = async () => {
    const { data } = await supabase
      .from("companies")
      .select("id, nom, selected_email, website_url, ville, libelle_ape")
      .order("nom");

    setCompanies(data || []);
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

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text();
      setCvContent(text);
      toast({ title: "CV chargé", description: "Contenu du CV importé avec succès" });
      return;
    }

    setIsParsingCv(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

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

  const addLog = (type: ProcessLog['type'], message: string, company?: string) => {
    const log: ProcessLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      message,
      company
    };
    setProcessLogs(prev => [...prev, log]);
  };

  const handleGenerateLetters = async () => {
    if (selectedCompanies.size === 0) {
      toast({ title: "Sélection vide", description: "Sélectionnez au moins une entreprise", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setElapsedTime(0);
    setGeneratedLetters([]);
    setProcessLogs([]);
    addLog('info', `🚀 Démarrage de la génération pour ${selectedCompanies.size} entreprise(s)`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      const selectedCompanyList = companies.filter(c => selectedCompanies.has(c.id));
      const allResults: GeneratedLetter[] = [];

      for (let i = 0; i < selectedCompanyList.length; i++) {
        const company = selectedCompanyList[i];
        setCurrentCompany(company.nom);
        setCurrentStep(`${i + 1}/${selectedCompanyList.length} - ${company.nom}`);
        setProgress(((i + 1) / selectedCompanyList.length) * 100);

        addLog('processing', company.website_url 
          ? `🔍 Scraping du site web...` 
          : `📝 Génération basée sur les infos disponibles...`, 
          company.nom
        );

        try {
          const { data, error } = await supabase.functions.invoke("generate-cover-letter", {
            body: {
              company,
              cvContent: cvContent || null,
              userProfile
            },
            headers: { Authorization: `Bearer ${session.access_token}` }
          });

          if (error) throw error;

          if (data?.success && data?.coverLetter) {
            const result: GeneratedLetter = {
              company_id: company.id,
              company_name: company.nom,
              website_url: company.website_url || undefined,
              success: true,
              letter: data.coverLetter,
              scraped_info: data.companyInfo?.scraped
            };
            allResults.push(result);
            addLog('success', data.companyInfo?.scraped 
              ? `✅ Lettre générée (site web analysé)` 
              : `✅ Lettre générée (infos générales)`, 
              company.nom
            );
          } else {
            throw new Error(data?.error || 'Erreur inconnue');
          }
        } catch (error: any) {
          console.error(`Error for ${company.nom}:`, error);
          allResults.push({
            company_id: company.id,
            company_name: company.nom,
            success: false,
            error: error.message || 'Erreur de génération'
          });
          addLog('error', `❌ ${error.message || 'Erreur inconnue'}`, company.nom);
        }

        // Small delay between requests to avoid rate limiting
        if (i < selectedCompanyList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setGeneratedLetters(allResults);
      
      const successCount = allResults.filter(r => r.success).length;
      addLog('info', `🏁 Terminé: ${successCount}/${allResults.length} lettres générées`);
      
      toast({
        title: "Génération terminée",
        description: `${successCount} lettre(s) générée(s) sur ${allResults.length}`
      });

      setActiveTab("results");
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
      setCurrentCompany("");
      setCurrentStep("");
    }
  };

  const handleRegenerateLetter = async (letter: GeneratedLetter) => {
    const company = companies.find(c => c.id === letter.company_id);
    if (!company) return;

    setCurrentCompany(company.nom);
    addLog('processing', `🔄 Regénération en cours...`, company.nom);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      const { data, error } = await supabase.functions.invoke("generate-cover-letter", {
        body: {
          company,
          cvContent: cvContent || null,
          userProfile
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      if (data?.success && data?.coverLetter) {
        setGeneratedLetters(prev => prev.map(l => 
          l.company_id === letter.company_id 
            ? { ...l, success: true, letter: data.coverLetter, error: undefined, scraped_info: data.companyInfo?.scraped }
            : l
        ));
        addLog('success', `✅ Lettre regénérée`, company.nom);
        toast({ title: "Lettre regénérée" });
      } else {
        throw new Error(data?.error || 'Erreur');
      }
    } catch (error: any) {
      addLog('error', `❌ ${error.message}`, company.nom);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setCurrentCompany("");
    }
  };

  const handleCopyLetter = (letter: string) => {
    navigator.clipboard.writeText(letter);
    toast({ title: "Copié dans le presse-papiers" });
  };

  const handleDownloadLetter = (letter: GeneratedLetter) => {
    if (!letter.letter) return;
    const blob = new Blob([letter.letter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lettre-motivation-${letter.company_name.replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Lettre téléchargée" });
  };

  const handleDownloadAll = () => {
    const successfulLetters = generatedLetters.filter(l => l.success && l.letter);
    if (successfulLetters.length === 0) return;

    const content = successfulLetters.map(l => 
      `${'='.repeat(60)}\n${l.company_name}\n${'='.repeat(60)}\n\n${l.letter}\n\n`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lettres-motivation-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: `${successfulLetters.length} lettre(s) téléchargée(s)` });
  };

  const handleSaveEdit = () => {
    if (!editingLetter) return;
    setGeneratedLetters(prev => prev.map(l => 
      l.company_id === editingLetter.company_id 
        ? { ...l, letter: editedContent }
        : l
    ));
    setEditingLetter(null);
    toast({ title: "Modifications sauvegardées" });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const successfulLetters = generatedLetters.filter(l => l.success);
  const failedLetters = generatedLetters.filter(l => !l.success);

  return (
    <div className="space-y-6">
      <GenerationOverlay
        isOpen={isGenerating}
        progress={Math.round(progress)}
        elapsedTime={elapsedTime}
        processLogs={processLogs}
        currentStep={currentStep}
        totalItems={selectedCompanies.size}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Générateur de Lettres de Motivation IA
          </CardTitle>
          <CardDescription>
            Générez des lettres de motivation personnalisées pour plusieurs entreprises en une fois
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "setup" | "results")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="setup" className="gap-2">
                <Wand2 className="h-4 w-4" />
                Configuration
              </TabsTrigger>
              <TabsTrigger value="results" className="gap-2" disabled={generatedLetters.length === 0}>
                <FileText className="h-4 w-4" />
                Résultats ({successfulLetters.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-6 mt-6">
              {/* CV Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Votre CV / Profil</Label>
                  <div className="flex gap-2">
                    {savedCvProfiles.length > 0 && (
                      <Select value={selectedCvProfileId} onValueChange={handleLoadCvProfile}>
                        <SelectTrigger className="w-[180px]">
                          <FolderOpen className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Charger profil" />
                        </SelectTrigger>
                        <SelectContent>
                          {savedCvProfiles.map(profile => (
                            <SelectItem key={profile.id} value={profile.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{profile.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowSaveProfileDialog(true)}
                      disabled={!cvContent.trim()}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Sauvegarder
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleCvUpload}
                    className="hidden"
                    id="cv-upload-letter"
                    disabled={isParsingCv}
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('cv-upload-letter')?.click()}
                    disabled={isParsingCv}
                    className="gap-2"
                  >
                    {isParsingCv ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Importer CV
                  </Button>
                </div>

                <Textarea
                  value={cvContent}
                  onChange={(e) => setCvContent(e.target.value)}
                  placeholder="Collez le contenu de votre CV ici ou importez un fichier..."
                  className="min-h-[150px] text-sm"
                />

                {!cvContent && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Conseil</AlertTitle>
                    <AlertDescription>
                      Ajoutez votre CV pour des lettres plus personnalisées
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Company Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    Entreprises ({selectedCompanies.size}/{companies.length})
                  </Label>
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedCompanies.size === companies.length ? "Tout désélectionner" : "Tout sélectionner"}
                  </Button>
                </div>

                <ScrollArea className="h-[300px] border rounded-lg p-3">
                  {companies.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Aucune entreprise disponible. Recherchez d'abord des entreprises.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {companies.map(company => (
                        <div
                          key={company.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                            selectedCompanies.has(company.id) 
                              ? 'bg-primary/10 border-primary' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => handleSelectCompany(company.id)}
                        >
                          <Checkbox 
                            checked={selectedCompanies.has(company.id)}
                            onChange={() => {}}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium truncate">{company.nom}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              {company.ville && <span>📍 {company.ville}</span>}
                              {company.libelle_ape && <span>• {company.libelle_ape}</span>}
                            </div>
                          </div>
                          {company.website_url && (
                            <Badge variant="outline" className="shrink-0">
                              <Globe className="h-3 w-3 mr-1" />
                              Site web
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateLetters}
                disabled={isGenerating || selectedCompanies.size === 0}
                className="w-full gap-2"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Générer {selectedCompanies.size} lettre(s) de motivation
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="results" className="space-y-4 mt-6">
              {/* Stats */}
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {successfulLetters.length} réussie(s)
                </Badge>
                {failedLetters.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    {failedLetters.length} échec(s)
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  Temps: {formatTime(elapsedTime)}
                </span>
                {successfulLetters.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleDownloadAll} className="ml-auto gap-2">
                    <Download className="h-4 w-4" />
                    Tout télécharger
                  </Button>
                )}
              </div>

              {/* Results List */}
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {generatedLetters.map(letter => (
                    <Card key={letter.company_id} className={letter.success ? '' : 'border-destructive/50'}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {letter.success ? (
                                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive shrink-0" />
                              )}
                              <span className="font-medium truncate">{letter.company_name}</span>
                              {letter.scraped_info && (
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  <Globe className="h-3 w-3 mr-1" />
                                  Site analysé
                                </Badge>
                              )}
                            </div>
                            {letter.success && letter.letter && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {letter.letter.substring(0, 150)}...
                              </p>
                            )}
                            {!letter.success && letter.error && (
                              <p className="text-sm text-destructive mt-1">{letter.error}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {letter.success && letter.letter && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => setPreviewLetter(letter)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => {
                                  setEditingLetter(letter);
                                  setEditedContent(letter.letter || '');
                                }}>
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleCopyLetter(letter.letter!)}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDownloadLetter(letter)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRegenerateLetter(letter)}
                              disabled={currentCompany === letter.company_name}
                            >
                              {currentCompany === letter.company_name ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewLetter} onOpenChange={() => setPreviewLetter(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lettre pour {previewLetter?.company_name}</DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
            {previewLetter?.letter}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => previewLetter?.letter && handleCopyLetter(previewLetter.letter)}>
              <Copy className="h-4 w-4 mr-2" />
              Copier
            </Button>
            <Button variant="outline" onClick={() => previewLetter && handleDownloadLetter(previewLetter)}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingLetter} onOpenChange={() => setEditingLetter(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Modifier la lettre pour {editingLetter?.company_name}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[400px] text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setEditingLetter(null)}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit}>
              Sauvegarder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Profile Dialog */}
      <Dialog open={showSaveProfileDialog} onOpenChange={setShowSaveProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sauvegarder le profil CV</DialogTitle>
            <DialogDescription>
              Donnez un nom à ce profil pour le réutiliser plus tard
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            placeholder="Ex: Mon CV développeur"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowSaveProfileDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveCvProfile} disabled={!newProfileName.trim()}>
              Sauvegarder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoverLetterGenerator;
