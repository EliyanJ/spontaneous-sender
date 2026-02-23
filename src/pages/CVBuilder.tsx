import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CVBuilderIntro } from "@/components/cv-builder/CVBuilderIntro";
import { CVBuilderForm } from "@/components/cv-builder/CVBuilderForm";
import { CVPreview } from "@/components/cv-builder/CVPreview";
import { emptyCVData, type CVData } from "@/lib/cv-templates";
import { useAuth } from "@/hooks/useAuth";
import logoTransparent from "@/assets/logo-transparent.png";

type Step = "intro" | "import" | "editor";

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
  const [step, setStep] = useState<Step>("intro");
  const [mode, setMode] = useState<"create" | "adapt">("create");
  const [sector, setSector] = useState("finance");
  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [cvData, setCvData] = useState<CVData>(emptyCVData);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleSelectMode = (selectedMode: "create" | "adapt") => {
    setMode(selectedMode);
    setStep("import");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For text files, read directly
    if (file.type === "text/plain") {
      const text = await file.text();
      setCvText(text);
      return;
    }

    // For PDF or DOCX, use parse-cv-document edge function
    if (file.type === "application/pdf" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith(".pdf") || file.name.endsWith(".docx")) {
      setIsLoading(true);
      try {
        // Convert file to base64
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
        if (data?.text) setCvText(data.text);
        else toast.error("Impossible d'extraire le texte du fichier");
      } catch (err: any) {
        toast.error("Erreur lors du parsing: " + (err.message || "Erreur inconnue"));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    toast.error("Format non supporté. Utilisez un fichier .txt, .pdf ou .docx");
  };

  const handleGenerateCV = async () => {
    if (!cvText.trim()) {
      toast.error("Veuillez entrer ou importer le texte de votre CV");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cv-content", {
        body: {
          cvText,
          sector,
          jobDescription: mode === "adapt" ? jobDescription : undefined,
          mode: mode === "adapt" ? "optimize" : "structure",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.cvData) {
        setCvData(data.cvData);
        setStep("editor");
        toast.success("CV structuré avec succès !");
      }
    } catch (err: any) {
      toast.error("Erreur IA: " + (err.message || "Erreur inconnue"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateSection = async (section: string, content: string) => {
    setIsRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cv-content", {
        body: {
          cvText: content,
          sector,
          mode: "regenerate_section",
        },
      });

      if (error) throw error;
      if (data?.text) {
        if (section === "summary") {
          setCvData(prev => ({ ...prev, summary: data.text }));
        }
        toast.success("Section régénérée !");
      }
    } catch (err: any) {
      toast.error("Erreur: " + (err.message || ""));
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveCV = async () => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }
    try {
      const { error } = await supabase.from("user_generated_cvs").insert({
        user_id: user.id,
        name: `CV ${SECTORS.find(s => s.value === sector)?.label || sector} - ${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`,
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
            <Button variant="ghost" size="sm" onClick={() => step === "intro" ? navigate("/dashboard") : setStep(step === "editor" ? "import" : "intro")} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <div className="flex items-center gap-2">
              <img src={logoTransparent} alt="Cronos" className="h-7 w-auto" />
              <span className="font-semibold text-foreground hidden sm:inline">CV Builder</span>
            </div>
          </div>
          {step === "editor" && (
            <Button size="sm" onClick={handleSaveCV} className="gap-1.5">
              Sauvegarder
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-4">
        {step === "intro" && <CVBuilderIntro onSelectMode={handleSelectMode} />}

        {step === "import" && (
          <div className="max-w-3xl mx-auto py-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {mode === "create" ? "Importer votre CV" : "CV + Fiche de poste"}
            </h2>

            {/* Sector selection */}
            <div className="mb-6">
              <Label className="text-sm mb-2 block">Secteur cible</Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CV Input */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Texte du CV</Label>
                <label className="cursor-pointer">
                  <input type="file" accept=".txt,.pdf,.docx" onChange={handleFileUpload} className="hidden" />
                  <span className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                    <Upload className="h-3.5 w-3.5" />
                    Importer un fichier
                  </span>
                </label>
              </div>
              <Textarea
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                placeholder="Collez le texte de votre CV ici ou importez un fichier..."
                className="min-h-[200px] text-sm"
              />
            </div>

            {/* Job Description (adapt mode) */}
            {mode === "adapt" && (
              <div className="mb-6">
                <Label className="text-sm mb-2 block">Fiche de poste</Label>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Collez la fiche de poste ici..."
                  className="min-h-[150px] text-sm"
                />
              </div>
            )}

            {/* Generate button */}
            <Button onClick={handleGenerateCV} disabled={isLoading || !cvText.trim()} className="gap-2" size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Générer le CV
                </>
              )}
            </Button>
          </div>
        )}

        {step === "editor" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
            {/* Left: Form */}
            <div className="overflow-hidden">
              <CVBuilderForm
                cvData={cvData}
                onChange={setCvData}
                onRegenerateSection={handleRegenerateSection}
                isRegenerating={isRegenerating}
              />
            </div>
            {/* Right: Preview */}
            <div className="hidden lg:block">
              <CVPreview cvData={cvData} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CVBuilder;
