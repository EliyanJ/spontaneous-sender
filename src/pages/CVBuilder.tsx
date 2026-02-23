import React, { useState, useCallback, useEffect } from "react";
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
import { emptyCVData, type CVData } from "@/lib/cv-templates";
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
              />
            </div>
          </div>

          {/* RIGHT PANEL - 8 cols: Preview */}
          <div className="lg:col-span-8 hidden lg:block overflow-hidden">
            <CVPreview cvData={cvData} />
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
              <CVPreview cvData={cvData} />
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
