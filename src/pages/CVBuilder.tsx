import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles, Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CVBuilderForm } from "@/components/cv-builder/CVBuilderForm";
import { CVPreview } from "@/components/cv-builder/CVPreview";
import { emptyCVData, CV_TEMPLATES, type CVData, type CVDesignOptions, type TemplateId } from "@/lib/cv-templates";
import { useAuth } from "@/hooks/useAuth";
import logoTransparent from "@/assets/logo-transparent.png";

const SECTORS = [
  { value: "finance", label: "Finance & Corporate" },
  { value: "marketing", label: "Marketing & Communication" },
  { value: "tech", label: "Tech & IT" },
  { value: "consulting", label: "Conseil & Stratégie" },
  { value: "rh", label: "Ressources Humaines" },
  { value: "commerce", label: "Commerce & Vente" },
  { value: "general", label: "Généraliste" },
];

// Template thumbnail mini-preview
const TemplateThumbnail = ({ id, name, active, onClick }: { id: TemplateId; name: string; active: boolean; onClick: () => void }) => {
  const previews: Record<TemplateId, React.ReactNode> = {
    classic: (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <div style={{ width: "38%", background: "#0f1b3d", height: "100%" }} />
        <div style={{ flex: 1, background: "#fff", padding: 4 }}>
          <div style={{ width: "70%", height: 4, background: "#c9a84c", marginBottom: 3, borderRadius: 1 }} />
          <div style={{ width: "50%", height: 3, background: "#ddd", marginBottom: 6, borderRadius: 1 }} />
          {[1,2,3].map(i => <div key={i} style={{ width: "90%", height: 2, background: "#eee", marginBottom: 2, borderRadius: 1 }} />)}
        </div>
      </div>
    ),
    dark: (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#111827" }}>
        <div style={{ width: "40%", borderRight: "1px solid #10b981", padding: 4 }}>
          <div style={{ width: "80%", height: 4, background: "#10b981", marginBottom: 3, borderRadius: 1 }} />
          {[1,2,3].map(i => <div key={i} style={{ width: "90%", height: 2, background: "#374151", marginBottom: 2, borderRadius: 1 }} />)}
        </div>
        <div style={{ flex: 1, padding: 4 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ width: "90%", height: 2, background: "#374151", marginBottom: 2, borderRadius: 1 }} />)}
        </div>
      </div>
    ),
    light: (
      <div style={{ width: "100%", height: "100%", background: "#fff" }}>
        <div style={{ background: "#16a34a", height: "30%", width: "100%", marginBottom: 4 }} />
        <div style={{ padding: "0 4px" }}>
          {[1,2,3,4].map(i => <div key={i} style={{ width: "90%", height: 2, background: "#eee", marginBottom: 2, borderRadius: 1 }} />)}
        </div>
      </div>
    ),
    geo: (
      <div style={{ width: "100%", height: "100%", background: "#fff" }}>
        <div style={{ background: "#475569", height: "28%", width: "100%", marginBottom: 4, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -8, right: 10, width: 20, height: 20, background: "rgba(255,255,255,0.1)", transform: "rotate(45deg)" }} />
        </div>
        <div style={{ height: 2, background: "linear-gradient(90deg, #3b82f6, #475569)", marginBottom: 4 }} />
        <div style={{ padding: "0 4px", display: "flex", gap: 3 }}>
          <div style={{ flex: 2 }}>{[1,2,3].map(i => <div key={i} style={{ width: "90%", height: 2, background: "#eee", marginBottom: 2, borderRadius: 1 }} />)}</div>
          <div style={{ flex: 1 }}>{[1,2].map(i => <div key={i} style={{ width: "90%", height: 2, background: "#3b82f620", marginBottom: 2, borderRadius: 1 }} />)}</div>
        </div>
      </div>
    ),
  };
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 group"
    >
      <div
        className={`rounded-md overflow-hidden transition-all duration-150 ${active ? "ring-2 ring-primary shadow-md" : "ring-1 ring-border hover:ring-primary/50"}`}
        style={{ width: 72, height: 52 }}
      >
        {previews[id]}
      </div>
      <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{name}</span>
    </button>
  );
};

const CVBuilder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"create" | "adapt">("create");
  const [sector, setSector] = useState("finance");
  const [jobDescription, setJobDescription] = useState("");
  const [cvData, setCvData] = useState<CVData>(emptyCVData);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<TemplateId>("classic");
  const [designOptions, setDesignOptions] = useState<CVDesignOptions>({
    primaryColor: "#0f1b3d",
    textColor: "#1a1a2e",
    accentColor: "#c9a84c",
  });

  const handleTemplateChange = (id: TemplateId) => {
    setTemplateId(id);
    const tpl = CV_TEMPLATES.find(t => t.id === id);
    if (tpl) setDesignOptions(prev => ({ ...tpl.defaultDesign, photoUrl: prev.photoUrl }));
  };

  // Parse a file (PDF/DOCX/TXT) and fill cvData via AI
  const handleFileParsed = useCallback(async (file: File) => {
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const text = await file.text();
      await generateFromText(text);
      setImportedFileName(file.name);
      return;
    }

    if (
      file.type === "application/pdf" ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".pdf") ||
      file.name.endsWith(".docx")
    ) {
      setIsLoading(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const fileBase64 = btoa(binary);

        const { data, error } = await supabase.functions.invoke("parse-cv-document", {
          body: { fileBase64, fileName: file.name, fileType: file.type },
        });

        if (error) throw error;
        if (data?.text) {
          await generateFromText(data.text);
          setImportedFileName(file.name);
        } else {
          toast.error("Impossible d'extraire le texte du fichier");
        }
      } catch (err: any) {
        toast.error("Erreur lors du parsing: " + (err.message || "Erreur inconnue"));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    toast.error("Format non supporté. Utilisez un fichier .txt, .pdf ou .docx");
  }, [sector]);

  // Generate structured CV from raw text via AI
  const generateFromText = async (cvText: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cv-content", {
        body: { cvText, sector, mode: "structure" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.cvData) {
        setCvData(data.cvData);
        toast.success("CV importé et structuré avec succès !");
      }
    } catch (err: any) {
      toast.error("Erreur IA: " + (err.message || "Erreur inconnue"));
    } finally {
      setIsLoading(false);
    }
  };

  // Load CV from user_cv_profiles
  const handleLoadFromDB = async (profileContent: string, profileName: string) => {
    setImportedFileName(profileName);
    await generateFromText(profileContent);
  };

  // Optimize CV against job description
  const handleOptimize = async () => {
    if (!jobDescription.trim()) {
      toast.error("Veuillez coller la fiche de poste");
      return;
    }
    const hasContent = cvData.personalInfo.firstName || cvData.experiences.some(e => e.role);
    if (!hasContent) {
      toast.error("Veuillez d'abord remplir votre CV");
      return;
    }

    setIsOptimizing(true);
    try {
      const cvText = JSON.stringify(cvData);
      const { data, error } = await supabase.functions.invoke("generate-cv-content", {
        body: { cvText, sector, jobDescription, mode: "optimize" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.cvData) {
        setCvData(data.cvData);
        toast.success("CV optimisé pour le poste !");
      }
    } catch (err: any) {
      toast.error("Erreur: " + (err.message || "Erreur inconnue"));
    } finally {
      setIsOptimizing(false);
    }
  };

  // Save CV
  const handleSaveCV = async () => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }
    try {
      const { error } = await supabase.from("user_generated_cvs").insert({
        user_id: user.id,
        name: `CV ${SECTORS.find(s => s.value === sector)?.label || sector} - ${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`.trim(),
        cv_data: cvData as any,
        job_description: mode === "adapt" ? jobDescription : null,
      });
      if (error) throw error;
      toast.success("CV sauvegardé !");
    } catch (err: any) {
      toast.error("Erreur: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <div className="flex items-center gap-2">
              <img src={logoTransparent} alt="Cronos" className="h-7 w-auto" />
              <span className="font-semibold text-foreground hidden sm:inline">CV Builder</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowMobilePreview(true)} className="lg:hidden gap-1.5">
              <Eye className="h-4 w-4" />
              Aperçu
            </Button>
            <Button size="sm" onClick={handleSaveCV} className="gap-1.5">
              <Save className="h-4 w-4" />
              Sauvegarder
            </Button>
          </div>
        </div>
      </header>

      {/* Main split layout */}
      <main className="flex-1 container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-120px)]">
          {/* LEFT PANEL - 4 cols */}
          <div className="lg:col-span-4 flex flex-col gap-4 overflow-hidden">
            {/* Mode Tabs */}
            <Tabs value={mode} onValueChange={(v) => setMode(v as "create" | "adapt")} className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="create">Créer un CV</TabsTrigger>
                <TabsTrigger value="adapt">Adapter à une offre</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Template selector */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Modèle de CV</Label>
              <div className="grid grid-cols-4 gap-2">
                {CV_TEMPLATES.map(tpl => (
                  <TemplateThumbnail
                    key={tpl.id}
                    id={tpl.id}
                    name={tpl.name}
                    active={templateId === tpl.id}
                    onClick={() => handleTemplateChange(tpl.id)}
                  />
                ))}
              </div>
              {/* Color customization */}
              <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Personnalisation</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <input
                      type="color"
                      value={designOptions.primaryColor}
                      onChange={e => setDesignOptions(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-8 h-8 rounded cursor-pointer border border-border"
                      title="Couleur principale"
                    />
                    <span className="text-[9px] text-muted-foreground">Principal</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <input
                      type="color"
                      value={designOptions.accentColor}
                      onChange={e => setDesignOptions(prev => ({ ...prev, accentColor: e.target.value }))}
                      className="w-8 h-8 rounded cursor-pointer border border-border"
                      title="Couleur accent"
                    />
                    <span className="text-[9px] text-muted-foreground">Accent</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <input
                      type="color"
                      value={designOptions.textColor}
                      onChange={e => setDesignOptions(prev => ({ ...prev, textColor: e.target.value }))}
                      className="w-8 h-8 rounded cursor-pointer border border-border"
                      title="Couleur texte"
                    />
                    <span className="text-[9px] text-muted-foreground">Texte</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sector */}
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">Secteur cible</Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Job description (adapt mode only) */}
            {mode === "adapt" && (
              <div className="glass rounded-xl p-3 space-y-2">
                <Label className="text-xs font-semibold text-foreground">Fiche de poste</Label>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Collez la fiche de poste ici..."
                  className="min-h-[100px] text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleOptimize}
                  disabled={isOptimizing || !jobDescription.trim()}
                  className="w-full gap-1.5"
                >
                  {isOptimizing ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Optimisation...</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5" /> Optimiser avec IA</>
                  )}
                </Button>
              </div>
            )}

            {/* Scrollable form area */}
            <div className="flex-1 overflow-y-auto pr-1 min-h-0">
              <CVBuilderForm
                cvData={cvData}
                onChange={setCvData}
                onFileParsed={handleFileParsed}
                onLoadFromDB={handleLoadFromDB}
                isLoading={isLoading}
                importedFileName={importedFileName}
                onClearImport={() => setImportedFileName(null)}
                designOptions={designOptions}
                onDesignChange={setDesignOptions}
              />
            </div>
          </div>

          {/* RIGHT PANEL - 8 cols: Preview */}
          <div className="lg:col-span-8 hidden lg:block overflow-hidden">
            <CVPreview cvData={cvData} templateId={templateId} designOptions={designOptions} />
          </div>
        </div>

        {/* Mobile preview overlay */}
        {showMobilePreview && (
          <div className="fixed inset-0 z-50 bg-background flex flex-col lg:hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">Aperçu du CV</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowMobilePreview(false)}>
                Fermer
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <CVPreview cvData={cvData} templateId={templateId} designOptions={designOptions} />
            </div>
          </div>
        )}
      </main>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyse et structuration du CV...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CVBuilder;
