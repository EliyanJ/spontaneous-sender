import React, { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Loader2, Check, ArrowRight, Camera, CameraOff, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CVBuilderEditor } from "@/components/cv-builder/CVBuilderEditor";
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

// Palettes de couleurs prédéfinies — chaque palette change les 3 couleurs du template
const COLOR_PALETTES = [
  { id: "violet", label: "Violet", primary: "#7C3AED", accent: "#A78BFA", text: "#1e1b4b" },
  { id: "green",  label: "Vert",   primary: "#16A34A", accent: "#4ADE80", text: "#14532D" },
  { id: "blue",   label: "Bleu",   primary: "#2563EB", accent: "#60A5FA", text: "#1e3a5f" },
  { id: "slate",  label: "Ardoise",primary: "#475569", accent: "#94A3B8", text: "#1e293b" },
  { id: "red",    label: "Rouge",  primary: "#DC2626", accent: "#FCA5A5", text: "#450a0a" },
  { id: "orange", label: "Orange", primary: "#EA580C", accent: "#FDBA74", text: "#431407" },
];

interface TemplateGalleryItem {
  id: TemplateId;
  name: string;
  description: string;
  image: string;
  hasPhoto: boolean;
  imageNoPhoto?: string; // image alternative sans photo
}

const GALLERY_TEMPLATES: TemplateGalleryItem[] = [
  {
    id: "modern",
    name: "Moderne Pro",
    description: "Design moderne avec sidebar, parfait pour les jeunes diplômés",
    image: "/images/cv-template-modern-pro.png",
    hasPhoto: true,
  },
  {
    id: "classic",
    name: "Classique Elite",
    description: "Template traditionnel, idéal pour tous secteurs",
    image: "/images/cv-template-classic-elite.png",
    hasPhoto: false,
  },
  {
    id: "geo",
    name: "Créatif Plus",
    description: "Design créatif pour les métiers artistiques",
    image: "/images/cv-template-creative-plus.png",
    hasPhoto: true,
  },
  {
    id: "dark",
    name: "Executive",
    description: "Sobre et percutant pour les profils seniors",
    image: "/images/cv-template-executive.png",
    hasPhoto: false,
  },
  {
    id: "minimal",
    name: "Minimaliste",
    description: "Épuré et élégant, typographie soignée",
    image: "/images/cv-template-minimal.png",
    hasPhoto: false,
  },
  {
    id: "light",
    name: "Étudiant",
    description: "Moderne et accessible pour les premières candidatures",
    image: "/images/cv-template-student.png",
    hasPhoto: true,
  },
];

// ─── Template Card with hover overlay & live name preview ─────────────────────
const TemplateCard = ({
  tpl,
  selected,
  onSelect,
  firstName,
  lastName,
  primaryColor,
  withPhoto,
}: {
  tpl: TemplateGalleryItem;
  selected: boolean;
  onSelect: () => void;
  firstName: string;
  lastName: string;
  primaryColor: string;
  withPhoto: boolean;
}) => {
  const [hovered, setHovered] = useState(false);
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || "Votre Nom";

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden ${
        selected
          ? "border-primary shadow-2xl shadow-primary/20 scale-[1.02]"
          : "border-border hover:border-primary/60 hover:shadow-xl"
      }`}
    >
      {/* Template image with live name overlay */}
      <div className="relative h-64 bg-muted/30 overflow-hidden">
        <img
          src={tpl.image}
          alt={tpl.name}
          className="w-full h-full object-cover transition-transform duration-300"
          style={{ transform: hovered ? "scale(1.03)" : "scale(1)" }}
          onError={e => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
        />

        {/* Color tint overlay reflecting selected primary color */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none transition-opacity duration-300"
          style={{ background: primaryColor }}
        />

        {/* Live name preview — always visible */}
        <div
          className="absolute bottom-0 left-0 right-0 px-3 pt-6 pb-2 text-center text-white text-sm font-bold truncate"
          style={{ background: `linear-gradient(to top, ${primaryColor}F0 0%, transparent 100%)` }}
        >
          {displayName}
        </div>

        {/* Hover overlay with CTA */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-3 transition-all duration-200 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
          style={{ background: "rgba(0,0,0,0.52)" }}
        >
          <span className="text-white font-bold text-base">{tpl.name}</span>
          <button
            className="flex items-center gap-2 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-transform hover:scale-105"
            style={{ background: primaryColor }}
            onClick={e => { e.stopPropagation(); onSelect(); }}
          >
            <Check className="h-4 w-4" /> Choisir ce modèle
          </button>
        </div>

        {/* Selected badge */}
        {selected && (
          <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center shadow-lg" style={{ background: primaryColor }}>
            <Check className="h-4 w-4 text-white" />
          </div>
        )}

        {/* Photo indicator */}
        <div className="absolute top-2.5 left-2.5">
          {tpl.hasPhoto ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold bg-black/40 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
              <Camera className="h-2.5 w-2.5" /> Avec photo
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-semibold bg-black/40 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
              <CameraOff className="h-2.5 w-2.5" /> Sans photo
            </span>
          )}
        </div>
      </div>

      {/* Card footer */}
      <div className={`px-4 py-3 transition-colors ${selected ? "bg-primary/5" : "bg-card"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`font-semibold text-sm ${selected ? "text-primary" : "text-foreground"}`}>{tpl.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tpl.description}</p>
          </div>
          <div
            className="w-6 h-6 rounded-full border-2 border-border shrink-0 ml-2"
            style={{ background: primaryColor }}
          />
        </div>
      </div>
    </div>
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
  const [templateId, setTemplateId] = useState<TemplateId>("modern");
  const [selectedPalette, setSelectedPalette] = useState(COLOR_PALETTES[0]);
  const [designOptions, setDesignOptions] = useState<CVDesignOptions>({
    primaryColor: COLOR_PALETTES[0].primary,
    textColor: COLOR_PALETTES[0].text,
    accentColor: COLOR_PALETTES[0].accent,
  });

  // Hero form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [withPhoto, setWithPhoto] = useState(true);

  // Show all templates
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  const handlePaletteSelect = (palette: typeof COLOR_PALETTES[0]) => {
    setSelectedPalette(palette);
    setDesignOptions({ primaryColor: palette.primary, accentColor: palette.accent, textColor: palette.text });
  };

  const handleTemplateSelect = (id: TemplateId) => {
    setTemplateId(id);
  };

  // Filter templates based on photo toggle — strict match
  const visibleTemplates = GALLERY_TEMPLATES.filter(t => t.hasPhoto === withPhoto);

  const recommendedTemplates = visibleTemplates.slice(0, 3);
  const extraTemplates = visibleTemplates.slice(3);

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

  // ── STEP 1: Template selection ─────────────────────────────────────────────
  if (step === "select") {
    const selectedTplName = GALLERY_TEMPLATES.find(t => t.id === templateId)?.name || templateId;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        {/* Header unifié — même structure pour visiteurs et utilisateurs connectés */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-3">
                <img src={logoBlack} alt="Cronos" className="h-9 w-auto" />
                <span className="text-2xl font-bold tracking-tight text-gray-900">Cronos</span>
              </Link>

              {/* Nav desktop */}
              <nav className="hidden md:flex items-center gap-8">
                {[
                  { label: "Comparatif de CV", href: "/score-cv" },
                  { label: "Création de CV", href: "/cv-builder" },
                  { label: "Conseil personnalisé", href: "/blog" },
                  { label: "Offres d'emploi", href: "/offres-emploi" },
                  { label: "Tarifs", href: "/pricing" },
                ].map(l => (
                  <Link
                    key={l.href}
                    to={l.href}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>

              {/* Actions desktop */}
              <div className="hidden md:flex items-center gap-3">
                {user ? (
                  <Button size="sm" onClick={() => navigate("/dashboard")} className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 rounded-lg font-medium text-sm">
                    Tableau de bord
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-sm font-medium text-gray-700 hover:text-gray-900">
                      Se connecter
                    </Button>
                    <Button size="sm" onClick={() => navigate("/login")} className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 rounded-lg shadow-lg shadow-primary/20 font-medium text-sm">
                      Commencer
                    </Button>
                  </>
                )}
              </div>

              {/* Mobile */}
              <div className="md:hidden">
                <Button size="sm" onClick={() => navigate(user ? "/dashboard" : "/login")} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4 text-xs">
                  {user ? "Dashboard" : "Commencer"}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* ── Hero banner violet ── */}
        <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-10 px-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Créez votre CV parfait</h1>
            <p className="text-base text-white/80 mb-8">Personnalisez l'aperçu en temps réel avant de choisir votre modèle</p>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">

                {/* Prénom */}
                <div>
                  <label className="block text-sm font-medium mb-2">Prénom</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Ex : Marie"
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                  />
                </div>

                {/* Nom */}
                <div>
                  <label className="block text-sm font-medium mb-2">Nom</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Ex : Dupont"
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                  />
                </div>

                {/* Palette de couleurs */}
                <div>
                  <label className="block text-sm font-medium mb-2">Couleur principale</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_PALETTES.map(p => (
                      <button
                        key={p.id}
                        title={p.label}
                        onClick={() => handlePaletteSelect(p)}
                        className="w-9 h-9 rounded-xl shadow-md hover:scale-110 transition-transform"
                        style={{
                          background: p.primary,
                          outline: selectedPalette.id === p.id ? "3px solid white" : "3px solid transparent",
                          outlineOffset: "2px",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Boutons photo / sans photo */}
                <div>
                  <label className="block text-sm font-medium mb-2">Photo sur le CV</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setWithPhoto(true)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border transition-all text-sm font-medium flex-1 ${
                        withPhoto
                          ? "bg-white/30 border-white/70 text-white shadow-lg"
                          : "bg-white/10 border-white/20 text-white/60 hover:bg-white/15"
                      }`}
                    >
                      <Camera className="h-4 w-4" /> Avec photo
                    </button>
                    <button
                      onClick={() => setWithPhoto(false)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border transition-all text-sm font-medium flex-1 ${
                        !withPhoto
                          ? "bg-white/30 border-white/70 text-white shadow-lg"
                          : "bg-white/10 border-white/20 text-white/60 hover:bg-white/15"
                      }`}
                    >
                      <CameraOff className="h-4 w-4" /> Sans photo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <main className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex-1 w-full">

          {/* Badge succès */}
          <div className="bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-4 mb-10 flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center shrink-0">
              <Check className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Templates validés par des recruteurs professionnels</p>
              <p className="text-xs text-muted-foreground">Survolez un modèle pour l'aperçu — votre nom s'affiche en temps réel</p>
            </div>
          </div>

          {/* Recommandés — 3 templates */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Choisissez votre modèle</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedTemplates.map(tpl => (
                <TemplateCard
                  key={tpl.id}
                  tpl={tpl}
                  selected={templateId === tpl.id}
                  onSelect={() => handleTemplateSelect(tpl.id)}
                  firstName={firstName}
                  lastName={lastName}
                  primaryColor={selectedPalette.primary}
                  withPhoto={withPhoto}
                />
              ))}
            </div>
          </section>

          {/* Voir tous nos modèles — bouton toggle */}
          {extraTemplates.length > 0 && (
            <div className="text-center mb-6">
              <button
                onClick={() => setShowAllTemplates(v => !v)}
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm border border-primary/30 hover:border-primary/60 px-5 py-2.5 rounded-xl transition-all"
              >
                {showAllTemplates ? (
                  <><ChevronUp className="h-4 w-4" /> Masquer les autres modèles</>
                ) : (
                  <><ChevronDown className="h-4 w-4" /> Voir tous nos modèles ({extraTemplates.length} de plus)</>
                )}
              </button>
            </div>
          )}

          {/* Extra templates révélés */}
          {showAllTemplates && extraTemplates.length > 0 && (
            <section className="mb-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {extraTemplates.map(tpl => (
                  <TemplateCard
                    key={tpl.id + "-extra"}
                    tpl={tpl}
                    selected={templateId === tpl.id}
                    onSelect={() => handleTemplateSelect(tpl.id)}
                    firstName={firstName}
                    lastName={lastName}
                    primaryColor={selectedPalette.primary}
                    withPhoto={withPhoto}
                  />
                ))}
              </div>
            </section>
          )}

          {/* CTA continuer */}
          <div className="flex justify-center mt-6">
            <Button
              size="lg"
              onClick={handleContinue}
              className="gap-2 px-10 h-12 text-base font-semibold shadow-lg shadow-primary/20"
            >
              Créer mon CV — {selectedTplName}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </main>

        {/* ── SEO Content + FAQ ── */}
        <CVBuilderSEOSection />

        {/* Footer standard */}
        <footer className="bg-card/50 border-t border-border/30 pt-12 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
              <div className="flex items-center gap-3 mb-6 md:mb-0">
                <img src={logoBlack} alt="Cronos" className="h-8 w-auto" />
                <span className="text-xl font-bold text-foreground">Cronos</span>
              </div>
              <div className="flex gap-8">
                <Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Aide</Link>
                <Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Confidentialité</Link>
                <Link to="/terms-of-service" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Conditions</Link>
                <Link to="/mentions-legales" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Mentions légales</Link>
              </div>
            </div>
            <div className="text-center text-muted-foreground text-xs">© 2025 Cronos. Tous droits réservés.</div>
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

// ─── SEO Section + FAQ Accordion ──────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "Comment créer un CV professionnel gratuitement ?",
    a: "Avec Cronos, vous pouvez créer un CV professionnel en quelques minutes sans aucune compétence technique. Choisissez parmi nos modèles validés par des recruteurs, personnalisez les couleurs et le contenu, puis téléchargez votre CV en PDF. La création de base est entièrement gratuite.",
  },
  {
    q: "Qu'est-ce qu'un CV optimisé ATS ?",
    a: "Un ATS (Applicant Tracking System) est un logiciel utilisé par les recruteurs pour filtrer automatiquement les candidatures. Un CV optimisé ATS utilise des mots-clés adaptés au poste, une mise en page structurée lisible par les machines, et évite les éléments graphiques complexes. Tous nos templates sont conçus pour passer les filtres ATS.",
  },
  {
    q: "Comment adapter mon CV à une offre d'emploi ?",
    a: "Dans l'éditeur CV Builder de Cronos, activez le mode « Adapter à une offre » et collez la fiche de poste. Notre IA analyse les mots-clés du recruteur et reformule automatiquement vos expériences pour maximiser votre correspondance avec le poste visé.",
  },
  {
    q: "Quelle est la longueur idéale pour un CV ?",
    a: "Un CV tient idéalement sur une page (profils juniors) ou deux pages maximum (profils expérimentés avec plus de 10 ans d'expérience). L'essentiel est de prioriser les informations pertinentes pour le poste ciblé et d'éviter les répétitions. Nos modèles sont optimisés pour respecter ces standards.",
  },
  {
    q: "Faut-il mettre une photo sur son CV ?",
    a: "En France, la photo est facultative mais souvent appréciée dans les secteurs du commerce, de la communication ou des relations clients. Elle est déconseillée aux États-Unis et au Royaume-Uni. Cronos vous permet de choisir des templates avec ou sans photo pour s'adapter à vos préférences et au marché ciblé.",
  },
  {
    q: "Comment sauvegarder et télécharger mon CV ?",
    a: "Une fois votre CV créé, vous pouvez le sauvegarder dans votre espace Cronos en créant un compte gratuit. Vous pourrez ensuite le télécharger en PDF haute qualité, le modifier à tout moment et créer plusieurs versions de CV adaptées à différents postes.",
  },
  {
    q: "Puis-je importer mon CV existant ?",
    a: "Oui, Cronos accepte l'import de fichiers PDF, DOCX et TXT. Notre IA analyse automatiquement le contenu et remplit les champs de l'éditeur, ce qui vous fait gagner un temps précieux. Vous n'avez plus qu'à ajuster et mettre à jour.",
  },
];

const CVBuilderSEOSection = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section className="bg-muted/30 border-t border-border/50 py-16 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Texte SEO */}
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-5">
            Créez un CV professionnel en ligne — rapide, gratuit, optimisé
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed mb-4 max-w-3xl mx-auto">
            Le CV Builder Cronos vous permet de concevoir un curriculum vitae percutant en quelques minutes.
            Choisissez parmi plusieurs modèles professionnels validés par des recruteurs, personnalisez les couleurs
            et la mise en page, puis laissez notre intelligence artificielle reformuler vos expériences pour
            maximiser vos chances d'être sélectionné.
          </p>
          <p className="text-muted-foreground text-base leading-relaxed max-w-3xl mx-auto">
            Que vous soyez étudiant, cadre en reconversion ou professionnel expérimenté, nos templates s'adaptent
            à tous les secteurs — finance, tech, marketing, RH, commerce et bien d'autres. Importez votre CV existant
            (PDF, DOCX) ou repartez de zéro : notre éditeur intuitif vous guide à chaque étape.
          </p>
        </div>

        {/* Avantages en grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-14">
          {[
            { emoji: "🎯", title: "Optimisé ATS", desc: "Tous nos modèles passent les filtres des logiciels de recrutement" },
            { emoji: "🤖", title: "IA intégrée", desc: "Adaptez votre CV à n'importe quelle offre d'emploi en un clic" },
            { emoji: "⚡", title: "Rapide & gratuit", desc: "Créez votre premier CV professionnel en moins de 5 minutes" },
          ].map(({ emoji, title, desc }) => (
            <div key={title} className="bg-card rounded-2xl p-6 border border-border text-center">
              <div className="text-3xl mb-3">{emoji}</div>
              <h3 className="font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            Questions fréquentes sur la création de CV
          </h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground pr-4">{item.q}</span>
                  <span className={`shrink-0 w-6 h-6 rounded-full border border-border flex items-center justify-center text-muted-foreground font-bold text-base transition-transform duration-200 ${openFaq === i ? "rotate-45" : ""}`}>
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-muted-foreground text-sm leading-relaxed border-t border-border pt-4">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default CVBuilder;
