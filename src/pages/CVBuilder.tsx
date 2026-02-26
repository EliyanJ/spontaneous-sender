import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles, Save, Eye, ChevronRight, Check, Palette } from "lucide-react";
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

// Large template card for the selection screen
const TemplateCard = ({
  id, name, defaultDesign, selected, onSelect,
}: {
  id: TemplateId; name: string; defaultDesign: CVDesignOptions; selected: boolean; onSelect: () => void;
}) => {
  const previews: Record<TemplateId, React.ReactNode> = {
    classic: (
      <div style={{ width: "100%", height: "100%", display: "flex", fontFamily: "sans-serif" }}>
        <div style={{ width: "36%", background: defaultDesign.primaryColor, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: defaultDesign.accentColor, opacity: 0.7, marginBottom: 4 }} />
          <div style={{ height: 3, background: defaultDesign.accentColor, borderRadius: 2, width: "80%" }} />
          <div style={{ height: 2, background: "rgba(255,255,255,0.2)", borderRadius: 2, width: "60%" }} />
          <div style={{ height: 2, background: "rgba(255,255,255,0.15)", borderRadius: 2, width: "70%", marginTop: 6 }} />
          {[1,2,3].map(i => <div key={i} style={{ height: 1.5, background: "rgba(255,255,255,0.1)", borderRadius: 2, width: "90%" }} />)}
        </div>
        <div style={{ flex: 1, padding: "12px 10px" }}>
          <div style={{ height: 2, background: "#ddd", borderRadius: 2, width: "80%", marginBottom: 8 }} />
          <div style={{ height: 1.5, background: "#eee", borderRadius: 2, width: "60%", marginBottom: 10 }} />
          {[90,70,80,60,75].map((w, i) => <div key={i} style={{ height: 1.5, background: "#f0f0f0", borderRadius: 2, width: `${w}%`, marginBottom: 4 }} />)}
        </div>
      </div>
    ),
    dark: (
      <div style={{ width: "100%", height: "100%", display: "flex", background: defaultDesign.primaryColor }}>
        <div style={{ width: "38%", borderRight: `2px solid ${defaultDesign.accentColor}`, padding: "12px 10px" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: defaultDesign.accentColor, opacity: 0.5, marginBottom: 6 }} />
          <div style={{ height: 2.5, background: defaultDesign.accentColor, borderRadius: 2, width: "75%", marginBottom: 4 }} />
          {[1,2,3,4].map(i => <div key={i} style={{ height: 1.5, background: "rgba(255,255,255,0.1)", borderRadius: 2, width: "85%", marginBottom: 3 }} />)}
        </div>
        <div style={{ flex: 1, padding: "12px 10px" }}>
          <div style={{ height: 2, background: defaultDesign.accentColor, borderRadius: 2, width: "70%", marginBottom: 8 }} />
          {[80,65,75,55,70].map((w, i) => <div key={i} style={{ height: 1.5, background: "rgba(255,255,255,0.1)", borderRadius: 2, width: `${w}%`, marginBottom: 4 }} />)}
        </div>
      </div>
    ),
    light: (
      <div style={{ width: "100%", height: "100%", background: "#fff" }}>
        <div style={{ background: defaultDesign.primaryColor, padding: "10px 12px", marginBottom: 8 }}>
          <div style={{ height: 3, background: "rgba(255,255,255,0.9)", borderRadius: 2, width: "55%", marginBottom: 4 }} />
          <div style={{ height: 2, background: "rgba(255,255,255,0.6)", borderRadius: 2, width: "40%", marginBottom: 4 }} />
          <div style={{ display: "flex", gap: 6 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 1.5, background: "rgba(255,255,255,0.4)", borderRadius: 2, width: 30 }} />)}
          </div>
        </div>
        <div style={{ padding: "0 12px" }}>
          <div style={{ height: 2, background: `${defaultDesign.primaryColor}40`, borderRadius: 2, width: "40%", marginBottom: 6 }} />
          {[85,65,75,55,70].map((w, i) => <div key={i} style={{ height: 1.5, background: "#f0f0f0", borderRadius: 2, width: `${w}%`, marginBottom: 3 }} />)}
        </div>
      </div>
    ),
    geo: (
      <div style={{ width: "100%", height: "100%", background: "#fff" }}>
        <div style={{ background: defaultDesign.primaryColor, padding: "10px 12px", position: "relative", overflow: "hidden", marginBottom: 0 }}>
          <div style={{ position: "absolute", top: -10, right: 20, width: 30, height: 30, background: "rgba(255,255,255,0.1)", transform: "rotate(45deg)" }} />
          <div style={{ position: "absolute", top: 5, right: 45, width: 18, height: 18, background: "rgba(255,255,255,0.07)", transform: "rotate(30deg)" }} />
          <div style={{ height: 3, background: "rgba(255,255,255,0.9)", borderRadius: 2, width: "50%", marginBottom: 4 }} />
          <div style={{ height: 2, background: defaultDesign.accentColor, borderRadius: 2, width: "35%", filter: "brightness(2)" }} />
        </div>
        <div style={{ height: 2.5, background: `linear-gradient(90deg, ${defaultDesign.accentColor}, ${defaultDesign.primaryColor})`, marginBottom: 6 }} />
        <div style={{ display: "flex", gap: 8, padding: "0 10px" }}>
          <div style={{ flex: 2 }}>{[80,60,70,55].map((w, i) => <div key={i} style={{ height: 1.5, background: "#eee", borderRadius: 2, width: `${w}%`, marginBottom: 3 }} />)}</div>
          <div style={{ flex: 1 }}>{[1,2,3].map(i => <div key={i} style={{ height: 1.5, background: `${defaultDesign.accentColor}30`, borderLeft: `2px solid ${defaultDesign.accentColor}`, paddingLeft: 2, marginBottom: 4 }} />)}</div>
        </div>
      </div>
    ),
  };

  return (
    <button
      onClick={onSelect}
      className={`relative group flex flex-col rounded-2xl overflow-hidden border-2 transition-all duration-200 text-left ${
        selected
          ? "border-primary shadow-lg shadow-primary/20 scale-[1.02]"
          : "border-border hover:border-primary/40 hover:shadow-md"
      }`}
    >
      {/* Preview */}
      <div className="relative bg-muted/30 overflow-hidden" style={{ height: 160 }}>
        <div style={{ transform: "scale(1)", width: "100%", height: "100%" }}>
          {previews[id]}
        </div>
        {selected && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
        )}
      </div>
      {/* Label */}
      <div className={`px-4 py-3 flex items-center justify-between ${selected ? "bg-primary/5" : "bg-card"}`}>
        <div>
          <p className={`font-semibold text-sm ${selected ? "text-primary" : "text-foreground"}`}>{name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {id === "classic" ? "Sidebar · Photo ronde" :
             id === "dark" ? "Fond sombre · Accent vif" :
             id === "light" ? "Header coloré · Épuré" :
             "Géométrique · Moderne"}
          </p>
        </div>
        <div className="flex gap-1">
          <div className="w-3.5 h-3.5 rounded-full border border-border/50" style={{ background: defaultDesign.primaryColor }} />
          <div className="w-3.5 h-3.5 rounded-full border border-border/50" style={{ background: defaultDesign.accentColor }} />
        </div>
      </div>
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const CVBuilder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<"select" | "editor">("select");
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

  const handleTemplateSelect = (id: TemplateId) => {
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
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const fileBase64 = btoa(binary);
        const { data, error } = await supabase.functions.invoke("parse-cv-document", {
          body: { fileBase64, fileName: file.name, fileType: file.type },
        });
        if (error) throw error;
        if (data?.text) { await generateFromText(data.text); setImportedFileName(file.name); }
        else toast.error("Impossible d'extraire le texte du fichier");
      } catch (err: any) {
        toast.error("Erreur lors du parsing: " + (err.message || "Erreur inconnue"));
      } finally { setIsLoading(false); }
      return;
    }
    toast.error("Format non supporté. Utilisez un fichier .txt, .pdf ou .docx");
  }, [sector]);

  const generateFromText = async (cvText: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cv-content", {
        body: { cvText, sector, mode: "structure" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.cvData) { setCvData(data.cvData); toast.success("CV importé et structuré avec succès !"); }
    } catch (err: any) {
      toast.error("Erreur IA: " + (err.message || "Erreur inconnue"));
    } finally { setIsLoading(false); }
  };

  const handleLoadFromDB = async (profileContent: string, profileName: string) => {
    setImportedFileName(profileName);
    await generateFromText(profileContent);
  };

  const handleOptimize = async () => {
    if (!jobDescription.trim()) { toast.error("Veuillez coller la fiche de poste"); return; }
    const hasContent = cvData.personalInfo.firstName || cvData.experiences.some(e => e.role);
    if (!hasContent) { toast.error("Veuillez d'abord remplir votre CV"); return; }
    setIsOptimizing(true);
    try {
      const cvText = JSON.stringify(cvData);
      const { data, error } = await supabase.functions.invoke("generate-cv-content", {
        body: { cvText, sector, jobDescription, mode: "optimize" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.cvData) { setCvData(data.cvData); toast.success("CV optimisé pour le poste !"); }
    } catch (err: any) {
      toast.error("Erreur: " + (err.message || "Erreur inconnue"));
    } finally { setIsOptimizing(false); }
  };

  const handleSaveCV = async () => {
    if (!user) { toast.error("Vous devez être connecté"); return; }
    try {
      const { error } = await supabase.from("user_generated_cvs").insert({
        user_id: user.id,
        name: `CV ${SECTORS.find(s => s.value === sector)?.label || sector} - ${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`.trim(),
        cv_data: cvData as any,
        job_description: mode === "adapt" ? jobDescription : null,
      });
      if (error) throw error;
      toast.success("CV sauvegardé !");
    } catch (err: any) { toast.error("Erreur: " + err.message); }
  };

  // ── STEP 1: Template selection ─────────────────────────────────────────────
  if (step === "select") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
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
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">1</span>
              <span>Choisir un modèle</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>2</span>
              <span>Éditer le contenu</span>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-10 max-w-5xl">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-2">Choisissez votre modèle</h1>
            <p className="text-muted-foreground">Sélectionnez un design de CV. Vous pourrez personnaliser les couleurs dans l'étape suivante.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
            {CV_TEMPLATES.map(tpl => (
              <TemplateCard
                key={tpl.id}
                id={tpl.id}
                name={tpl.name}
                defaultDesign={tpl.defaultDesign}
                selected={templateId === tpl.id}
                onSelect={() => handleTemplateSelect(tpl.id)}
              />
            ))}
          </div>

          {/* Color customization on selection screen */}
          <div className="bg-card/60 border border-border/50 rounded-2xl p-6 mb-8 max-w-md mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">Personnaliser les couleurs</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center gap-2">
                <label className="text-xs text-muted-foreground font-medium">Principal</label>
                <input
                  type="color"
                  value={designOptions.primaryColor}
                  onChange={e => setDesignOptions(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                />
              </div>
              <div className="flex flex-col items-center gap-2">
                <label className="text-xs text-muted-foreground font-medium">Accent</label>
                <input
                  type="color"
                  value={designOptions.accentColor}
                  onChange={e => setDesignOptions(prev => ({ ...prev, accentColor: e.target.value }))}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                />
              </div>
              <div className="flex flex-col items-center gap-2">
                <label className="text-xs text-muted-foreground font-medium">Texte</label>
                <input
                  type="color"
                  value={designOptions.textColor}
                  onChange={e => setDesignOptions(prev => ({ ...prev, textColor: e.target.value }))}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button size="lg" onClick={() => setStep("editor")} className="gap-2 px-10 h-12 text-base">
              Continuer avec ce modèle
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ── STEP 2: Editor ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setStep("select")} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Modèles
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

      <main className="flex-1 container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-120px)]">
          {/* LEFT PANEL */}
          <div className="lg:col-span-4 flex flex-col gap-4 overflow-hidden">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "create" | "adapt")} className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="create">Créer un CV</TabsTrigger>
                <TabsTrigger value="adapt">Adapter à une offre</TabsTrigger>
              </TabsList>
            </Tabs>

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

            {mode === "adapt" && (
              <div className="glass rounded-xl p-3 space-y-2">
                <Label className="text-xs font-semibold text-foreground">Fiche de poste</Label>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Collez la fiche de poste ici..."
                  className="min-h-[100px] text-sm"
                />
                <Button size="sm" onClick={handleOptimize} disabled={isOptimizing || !jobDescription.trim()} className="w-full gap-1.5">
                  {isOptimizing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Optimisation...</> : <><Sparkles className="h-3.5 w-3.5" /> Optimiser avec IA</>}
                </Button>
              </div>
            )}

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

          {/* RIGHT PANEL */}
          <div className="lg:col-span-8 hidden lg:block overflow-hidden">
            <CVPreview cvData={cvData} templateId={templateId} designOptions={designOptions} />
          </div>
        </div>

        {showMobilePreview && (
          <div className="fixed inset-0 z-50 bg-background flex flex-col lg:hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">Aperçu du CV</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowMobilePreview(false)}>Fermer</Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <CVPreview cvData={cvData} templateId={templateId} designOptions={designOptions} />
            </div>
          </div>
        )}
      </main>

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
