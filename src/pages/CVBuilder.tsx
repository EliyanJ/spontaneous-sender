import React, { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, Sparkles, Save, Eye, ChevronRight, Check,
  SlidersHorizontal, ArrowRight,
} from "lucide-react";
import { PublicNav } from "@/components/PublicNav";
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
import logoBlack from "@/assets/logo-black.png";

const SECTORS = [
  { value: "finance", label: "Finance & Corporate" },
  { value: "marketing", label: "Marketing & Communication" },
  { value: "tech", label: "Tech & IT" },
  { value: "consulting", label: "Conseil & Stratégie" },
  { value: "rh", label: "Ressources Humaines" },
  { value: "commerce", label: "Commerce & Vente" },
  { value: "general", label: "Généraliste" },
];

// ─── Templates enrichis avec image + score ATS ────────────────────────────────
interface TemplateGalleryItem {
  id: TemplateId;
  name: string;
  description: string;
  atsScore: number;
  image: string;
  colors: string[];
  category: "modern" | "classic";
  columns: 1 | 2 | 3;
  hasPhoto: boolean;
  isRecommended?: boolean;
}

const GALLERY_TEMPLATES: TemplateGalleryItem[] = [
  {
    id: "modern",
    name: "Moderne Pro",
    description: "Design moderne avec photo, parfait pour les jeunes diplômés",
    atsScore: 95,
    image: "/images/cv-template-modern-pro.png",
    colors: ["#7C3AED", "#22C55E", "#3B82F6"],
    category: "modern",
    columns: 2,
    hasPhoto: true,
    isRecommended: true,
  },
  {
    id: "classic",
    name: "Classique Elite",
    description: "Template traditionnel, idéal pour tous secteurs",
    atsScore: 92,
    image: "/images/cv-template-classic-elite.png",
    colors: ["#22C55E", "#3B82F6", "#6B7280"],
    category: "classic",
    columns: 1,
    hasPhoto: false,
    isRecommended: true,
  },
  {
    id: "geo",
    name: "Créatif Plus",
    description: "Design créatif pour les métiers artistiques",
    atsScore: 88,
    image: "/images/cv-template-creative-plus.png",
    colors: ["#7C3AED", "#EC4899", "#F97316"],
    category: "modern",
    columns: 3,
    hasPhoto: true,
    isRecommended: true,
  },
  {
    id: "dark",
    name: "Executive",
    description: "Sobre et percutant pour les profils seniors",
    atsScore: 90,
    image: "/images/cv-template-executive.png",
    colors: ["#EF4444", "#6B7280"],
    category: "classic",
    columns: 1,
    hasPhoto: false,
  },
  {
    id: "minimal",
    name: "Minimaliste",
    description: "Épuré et élégant, typographie soignée",
    atsScore: 87,
    image: "/images/cv-template-minimal.png",
    colors: ["#14B8A6", "#3B82F6"],
    category: "classic",
    columns: 2,
    hasPhoto: false,
  },
  {
    id: "light",
    name: "Étudiant",
    description: "Moderne et accessible pour les premières candidatures",
    atsScore: 85,
    image: "/images/cv-template-student.png",
    colors: ["#EAB308", "#F97316"],
    category: "modern",
    columns: 1,
    hasPhoto: true,
  },
];

const ALL_TEMPLATES_EXTRA = [
  { name: "Tech Pro", image: "/images/cv-template-tech-pro.png", colors: ["#6366F1", "#7C3AED"], score: 91 },
  { name: "Designer", image: "/images/cv-template-designer.png", colors: ["#EC4899", "#EF4444"], score: 86 },
  { name: "Business", image: "/images/cv-template-business.png", colors: ["#10B981", "#22C55E"], score: 89 },
];

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
  const [templateId, setTemplateId] = useState<TemplateId>("modern");
  const [designOptions, setDesignOptions] = useState<CVDesignOptions>({
    primaryColor: "#7c3aed",
    textColor: "#1e1b4b",
    accentColor: "#a78bfa",
  });

  // Sidebar filters
  const [filterPhoto, setFilterPhoto] = useState<"all" | "oui" | "non">("all");
  const [filterDesign, setFilterDesign] = useState<("modern" | "classic")[]>([]);
  const [filterColumns, setFilterColumns] = useState<number[]>([]);

  // Personalization form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [withPhoto, setWithPhoto] = useState(true);

  const handleTemplateSelect = (id: TemplateId) => {
    setTemplateId(id);
    const tpl = CV_TEMPLATES.find(t => t.id === id);
    if (tpl) setDesignOptions(prev => ({ ...tpl.defaultDesign, photoUrl: prev.photoUrl }));
  };

  const getFilteredTemplates = () => {
    return GALLERY_TEMPLATES.filter(t => {
      if (filterPhoto === "oui" && !t.hasPhoto) return false;
      if (filterPhoto === "non" && t.hasPhoto) return false;
      if (filterDesign.length > 0 && !filterDesign.includes(t.category)) return false;
      if (filterColumns.length > 0 && !filterColumns.includes(t.columns)) return false;
      return true;
    });
  };

  const toggleDesignFilter = (val: "modern" | "classic") => {
    setFilterDesign(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };
  const toggleColumnsFilter = (val: number) => {
    setFilterColumns(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
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
      if (data?.cvData) {
        // Pre-fill name from personalization form
        const updatedData = { ...data.cvData };
        if (firstName) updatedData.personalInfo = { ...updatedData.personalInfo, firstName };
        if (lastName) updatedData.personalInfo = { ...updatedData.personalInfo, lastName };
        setCvData(updatedData);
        toast.success("CV importé et structuré avec succès !");
      }
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

  const handleContinue = () => {
    // Pre-fill name if provided
    if (firstName || lastName) {
      setCvData(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          firstName: firstName || prev.personalInfo.firstName,
          lastName: lastName || prev.personalInfo.lastName,
        },
      }));
    }
    setStep("editor");
  };

  const filteredTemplates = getFilteredTemplates();
  const recommendedTemplates = filteredTemplates.filter(t => t.isRecommended);

  // ── STEP 1: Template selection ─────────────────────────────────────────────
  if (step === "select") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header unifié */}
        {!user ? (
          <PublicNav />
        ) : (
          <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" />
                  Tableau de bord
                </Button>
                <div className="h-5 w-px bg-gray-200" />
                <div className="flex items-center gap-2">
                  <img src={logoBlack} alt="Cronos" className="h-6 w-auto" />
                  <span className="font-semibold text-gray-900 text-sm">CV Builder</span>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Hero banner violet */}
        <div className="bg-gradient-to-br from-[hsl(263_75%_58%)] to-[hsl(263_75%_45%)] text-white py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">Créez votre CV parfait</h1>
              <p className="text-lg text-white/90">Maximisez vos opportunités avec nos templates optimisés ATS</p>
            </div>

            {/* Personalization form */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-6">Personnalisez votre CV</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Prénom</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Votre prénom"
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nom</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Votre nom"
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Palette de couleurs</label>
                  <div className="flex space-x-3">
                    {[
                      { color: "#7C3AED", label: "violet" },
                      { color: "#22C55E", label: "green" },
                      { color: "#3B82F6", label: "blue" },
                      { color: "#475569", label: "slate" },
                    ].map(({ color }) => (
                      <button
                        key={color}
                        onClick={() => setDesignOptions(prev => ({ ...prev, primaryColor: color }))}
                        className="w-10 h-10 rounded-xl shadow-lg hover:scale-110 transition-transform"
                        style={{
                          background: color,
                          border: designOptions.primaryColor === color ? "2px solid white" : "2px solid transparent",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">CV avec photo</label>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setWithPhoto(v => !v)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${withPhoto ? "bg-white/50" : "bg-white/30"}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${withPhoto ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                    <span className="text-sm font-medium">{withPhoto ? "Oui" : "Non"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex-1 w-full">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Sidebar filtres */}
            <aside className="w-full lg:w-72 bg-gray-50 rounded-2xl p-6 h-fit border border-gray-200 shrink-0">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Filtres
                </h3>
              </div>

              <div className="space-y-6">
                {/* Photo */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Photo</h4>
                  <div className="space-y-2">
                    {([["all", "Tous"], ["oui", "Oui"], ["non", "Non"]] as const).map(([val, label]) => (
                      <label key={val} className="flex items-center cursor-pointer group">
                        <input
                          type="radio"
                          name="photo"
                          checked={filterPhoto === val}
                          onChange={() => setFilterPhoto(val)}
                          className="mr-3 accent-purple-600"
                        />
                        <span className="text-gray-600 group-hover:text-gray-900 text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Design</h4>
                  <div className="space-y-2">
                    {([["modern", "Moderne"], ["classic", "Classique"]] as const).map(([val, label]) => (
                      <label key={val} className="flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={filterDesign.includes(val)}
                          onChange={() => toggleDesignFilter(val)}
                          className="mr-3 accent-purple-600"
                        />
                        <span className="text-gray-600 group-hover:text-gray-900 text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Colonnes</h4>
                  <div className="space-y-2">
                    {[1, 2, 3].map(n => (
                      <label key={n} className="flex items-center cursor-pointer group">
                        <input
                          type="radio"
                          name="columns"
                          checked={filterColumns.length === 0 ? false : filterColumns.includes(n)}
                          onChange={() => toggleColumnsFilter(n)}
                          className="mr-3 accent-purple-600"
                        />
                        <span className="text-gray-600 group-hover:text-gray-900 text-sm">{n} colonne{n > 1 ? "s" : ""}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Templates section */}
            <div className="flex-1">
              {/* Badge succès */}
              <div className="bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-4 mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Templates optimisés pour maximiser vos chances</p>
                    <p className="text-sm text-gray-600">Gagnez du temps avec nos modèles validés par des recruteurs</p>
                  </div>
                </div>
              </div>

              {/* Recommandés */}
              {recommendedTemplates.length > 0 && (
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Recommandés pour vous</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recommendedTemplates.map(tpl => (
                      <TemplateCard
                        key={tpl.id}
                        tpl={tpl}
                        selected={templateId === tpl.id}
                        onSelect={() => handleTemplateSelect(tpl.id)}
                        size="large"
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Tous nos modèles */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Tous nos modèles</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                  {filteredTemplates.map(tpl => (
                    <TemplateCard
                      key={tpl.id + "-all"}
                      tpl={tpl}
                      selected={templateId === tpl.id}
                      onSelect={() => handleTemplateSelect(tpl.id)}
                      size="small"
                    />
                  ))}
                  {ALL_TEMPLATES_EXTRA.map(tpl => (
                    <ExtraTemplateCard key={tpl.name} tpl={tpl} />
                  ))}
                </div>

                {/* CTA */}
                <div className="text-center">
                  <Button
                    size="lg"
                    onClick={handleContinue}
                    className="bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Continuer avec « {GALLERY_TEMPLATES.find(t => t.id === templateId)?.name || templateId} »
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </section>
            </div>
          </div>
        </main>

        {/* Footer standard du site */}
        <footer className="bg-card/50 border-t border-border/30 pt-12 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
              <div className="flex items-center gap-3 mb-6 md:mb-0">
                <img src={logoBlack} alt="Cronos" className="h-8 w-auto" />
                <span className="text-xl font-bold text-foreground font-display">Cronos</span>
              </div>
              <div className="flex gap-8">
                <Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Aide</Link>
                <Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Confidentialité</Link>
                <Link to="/terms-of-service" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Conditions</Link>
                <Link to="/mentions-legales" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Mentions légales</Link>
              </div>
            </div>
            <div className="text-center text-muted-foreground text-xs">
              © 2025 Cronos. Tous droits réservés.
            </div>
          </div>
        </footer>
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
              <img src={logoBlack} alt="Cronos" className="h-7 w-auto" />
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

// ─── Template Card (large & small variant) ────────────────────────────────────
const TemplateCard = ({
  tpl,
  selected,
  onSelect,
  size,
}: {
  tpl: TemplateGalleryItem;
  selected: boolean;
  onSelect: () => void;
  size: "large" | "small";
}) => (
  <div
    onClick={onSelect}
    className={`bg-white rounded-2xl border-2 cursor-pointer group transition-all ${
      selected
        ? "border-purple-600 shadow-xl shadow-purple-600/10"
        : "border-gray-200 hover:border-purple-600 hover:shadow-xl"
    }`}
  >
    <div className={`overflow-hidden rounded-t-2xl bg-gray-50 p-3 ${size === "large" ? "h-56" : "h-40"}`}>
      <img
        src={tpl.image}
        alt={tpl.name}
        className="w-full h-full object-cover rounded-xl"
        onError={e => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
      />
      {selected && (
        <div className="absolute top-3 right-3 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
          <Check className="h-4 w-4 text-white" />
        </div>
      )}
    </div>
    <div className={size === "large" ? "p-5" : "p-3"}>
      <div className="flex items-center justify-between mb-1">
        <h3 className={`font-semibold text-gray-900 ${size === "small" ? "text-sm" : ""}`}>{tpl.name}</h3>
        <span className="px-2 py-0.5 bg-green-500/10 text-green-600 text-xs font-semibold rounded-lg">{tpl.atsScore}%</span>
      </div>
      {size === "large" && <p className="text-sm text-gray-500 mb-3">{tpl.description}</p>}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1.5">
          {tpl.colors.map(c => (
            <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
          ))}
        </div>
        <button className="text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center gap-1 group-hover:underline">
          Utiliser <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  </div>
);

// ─── Extra Template Card (coming soon / locked) ────────────────────────────────
const ExtraTemplateCard = ({ tpl }: { tpl: { name: string; image: string; colors: string[]; score: number } }) => (
  <div className="bg-white rounded-2xl border-2 border-gray-200 opacity-70 cursor-not-allowed group relative">
    <div className="h-40 overflow-hidden rounded-t-2xl bg-gray-50 p-3">
      <img
        src={tpl.image}
        alt={tpl.name}
        className="w-full h-full object-cover rounded-xl grayscale-[30%]"
        onError={e => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
      />
      <div className="absolute top-3 right-3 bg-gray-100 text-gray-500 text-[10px] font-semibold px-2 py-0.5 rounded-full">
        Bientôt
      </div>
    </div>
    <div className="p-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-gray-900 text-sm">{tpl.name}</h3>
        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-lg">{tpl.score}%</span>
      </div>
      <div className="flex space-x-1">
        {tpl.colors.map(c => (
          <span key={c} className="w-2 h-2 rounded-full" style={{ background: c }} />
        ))}
      </div>
    </div>
  </div>
);

export default CVBuilder;
