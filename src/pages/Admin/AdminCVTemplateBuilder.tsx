import React, { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Save, ArrowLeft, Upload, Loader2, Image, Eye,
  CheckCircle2, AlertTriangle, Info, FileCode2, RefreshCw,
  Sliders, Palette, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HTMLCVRenderer } from "@/components/cv-builder/HTMLCVRenderer";
import {
  extractSchema,
  getMissingStandardFields,
  type TemplateSchema,
} from "@/lib/cv-templates/extractSchema";
import { MOCK_CV_DATA } from "@/lib/cv-templates/injectCVData";
import {
  injectCSSVariables,
  extractDesignVars,
  DEFAULT_DESIGN_VARS,
  type DesignVars,
} from "@/lib/cv-templates/injectCSSVariables";
import { ConstraintsPanel, type ConstraintsMap } from "@/components/admin/template-builder/ConstraintsPanel";
import { DesignPanel } from "@/components/admin/template-builder/DesignPanel";
import { AIDesignChat } from "@/components/admin/template-builder/AIDesignChat";
import type { AIPatch } from "@/components/admin/template-builder/AIDesignChat";

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_DATA_WITH_PHOTO = {
  ...MOCK_CV_DATA,
  photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&face",
};

// ─── Default template ─────────────────────────────────────────────────────────
const DEFAULT_TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #000; line-height: 1.4; margin: 0; padding: 0; }
    .cv-page { width: 210mm; min-height: 297mm; background: white; margin: 0 auto; padding: 40px; box-sizing: border-box; overflow-x: hidden; max-width: 100%; }
    header { display: flex; margin-bottom: 30px; }
    .photo { width: 120px; height: 120px; background-color: #eee; margin-right: 25px; object-fit: cover; }
    .header-content { flex: 1; }
    .header-content h1 { margin: 0; font-size: 26px; text-transform: uppercase; }
    .job-title { font-weight: bold; font-size: 16px; margin: 5px 0; text-transform: uppercase; }
    .sub-job { font-size: 13px; margin-bottom: 10px; }
    .contact-info { font-size: 12px; display: flex; gap: 15px; flex-wrap: wrap; }
    .profile-summary { font-size: 13px; margin-bottom: 20px; }
    section { margin-bottom: 20px; }
    h2 { font-size: 16px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 3px; margin-bottom: 10px; }
    .item { margin-bottom: 15px; }
    .item-header { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; }
    ul { margin: 5px 0; padding-left: 20px; font-size: 13px; }
    li { margin-bottom: 4px; }
    .skills-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px 10px; font-size: 11px; }
    .skill-item { padding: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3; }
    [data-hidden="true"] { display: none !important; }
  </style>
</head>
<body>
<div class="cv-page">
  <header>
    <img class="photo" data-field-img="photo" src="" alt="Photo" />
    <div class="header-content">
      <h1 data-field="full_name">Prénom NOM</h1>
      <p class="job-title" data-field="main_title">Titre du poste</p>
      <div class="contact-info">
        <span data-field="phone">📞 Téléphone</span>
        <span data-field="email">✉ Email</span>
        <span data-field="location">📍 Ville</span>
      </div>
    </div>
  </header>

  <div class="profile-summary" data-field="summary">Résumé professionnel...</div>

  <section data-section="experiences">
    <h2>Expériences Professionnelles</h2>
    <div data-list="experiences">
      <div class="item">
        <div class="item-header">
          <span data-field="title">Poste</span>
          <span data-field="date">2020 - 2024</span>
        </div>
        <div data-field="company">Entreprise</div>
        <ul data-bullet-list="bullets"></ul>
      </div>
    </div>
  </section>

  <section data-section="skills">
    <h2>Compétences Clés</h2>
    <div class="skills-container" data-list="skills">
      <span class="skill-item" data-field="skill_name">Compétence</span>
    </div>
  </section>

  <section data-section="education">
    <h2>Formations et Certifications</h2>
    <div data-list="education">
      <div class="edu-item">
        <div data-field="date">2023 - 2026</div>
        <div data-field="label">Formation - École</div>
      </div>
    </div>
  </section>

  <div data-section="languages">
    <p><strong>Langues &amp; Soft Skills</strong></p>
    <div data-field="languages_content">Anglais: Professionnel / Français: Natif</div>
  </div>

  <div data-section="interests">
    <p><strong>Centres d'intérêt</strong></p>
    <div data-field="interests_content">Sport, Hobbies, Passions...</div>
  </div>

</div>
</body>
</html>`;

// ─── Main component ───────────────────────────────────────────────────────────

export const AdminCVTemplateBuilder = () => {
  const { templateId } = useParams<{ templateId?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [templateName, setTemplateName] = useState("Nouveau template");
  const [htmlContent, setHtmlContent] = useState(DEFAULT_TEMPLATE_HTML);
  const [isActive, setIsActive] = useState(true);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [schema, setSchema] = useState<TemplateSchema | null>(null);
  const [useMockPhoto, setUseMockPhoto] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // ── New state for the 4-tab panel ──────────────────────────────────────────
  const [constraints, setConstraints] = useState<ConstraintsMap>({});
  const [designVars, setDesignVars] = useState<DesignVars>({ ...DEFAULT_DESIGN_VARS });
  const [rightTab, setRightTab] = useState("preview");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Re-extract schema when HTML changes
  useEffect(() => {
    try {
      const s = extractSchema(htmlContent);
      setSchema(s);
    } catch {
      setSchema(null);
    }
  }, [htmlContent]);

  // Load existing template
  useQuery({
    queryKey: ["cv-template", templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cv_templates")
        .select("*")
        .eq("id", templateId!)
        .single();
      if (error) throw error;
      if (data) {
        setTemplateName(data.name);
        setIsActive(data.is_active);
        setThumbnailUrl(data.thumbnail_url ?? null);

        const version = (data as any).template_version;
        if (version === "html-v1" || version === null || version === undefined) {
          try {
            const parsed = JSON.parse(data.html_template);
            if (parsed.version === "canvas-v2") {
              toast({
                title: "Template canvas-v2 détecté",
                description: "Uploadez un nouveau fichier HTML pour migrer vers le nouveau système.",
              });
            }
          } catch {
            setHtmlContent(data.html_template || DEFAULT_TEMPLATE_HTML);
            // Extract design vars & constraints from template_schema
            const ts = (data as any).template_schema as any;
            if (ts) {
              if (ts.designVars) setDesignVars({ ...DEFAULT_DESIGN_VARS, ...ts.designVars });
              if (ts.constraints) setConstraints(ts.constraints);
            }
            // Also extract CSS vars already embedded in HTML
            const embedded = extractDesignVars(data.html_template || "");
            if (embedded["--color-primary"] !== DEFAULT_DESIGN_VARS["--color-primary"] || embedded["--font-main"] !== DEFAULT_DESIGN_VARS["--font-main"]) {
              setDesignVars(embedded);
            }
          }
        } else {
          setHtmlContent(data.html_template || DEFAULT_TEMPLATE_HTML);
        }
      }
      return data;
    },
  });

  // ── Design vars change → inject in HTML ──────────────────────────────────
  const handleDesignVarsChange = useCallback((vars: DesignVars) => {
    setDesignVars(vars);
    setHtmlContent(prev => injectCSSVariables(prev, vars));
  }, []);

  // ── Apply AI patch ────────────────────────────────────────────────────────
  const handleApplyAIPatch = useCallback((patch: AIPatch) => {
    setHtmlContent(prev => {
      if (patch.type === "css_patch") {
        // Inject the CSS patch inside the first <style> tag, before </style>
        if (prev.includes("</style>")) {
          return prev.replace("</style>", `  /* AI patch */\n  ${patch.patch}\n</style>`);
        }
        return `<style>${patch.patch}</style>\n${prev}`;
      }
      if (patch.type === "html_patch") {
        // Format: "REMPLACER: <old> PAR: <new>"
        const replaceMatch = patch.patch.match(/REMPLACER:\s*([\s\S]*?)\s*PAR:\s*([\s\S]*)/i);
        if (replaceMatch) {
          return prev.replace(replaceMatch[1].trim(), replaceMatch[2].trim());
        }
        return prev;
      }
      if (patch.type === "design_vars") {
        try {
          const vars = JSON.parse(patch.patch);
          const newVars = { ...designVars, ...vars };
          setDesignVars(newVars);
          return injectCSSVariables(prev, newVars);
        } catch {
          return prev;
        }
      }
      return prev;
    });
  }, [designVars]);

  // ── Upload HTML ───────────────────────────────────────────────────────────
  const handleHTMLFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".html") && file.type !== "text/html") {
      toast({ title: "Fichier invalide", description: "Veuillez sélectionner un fichier .html", variant: "destructive" });
      return;
    }
    const text = await file.text();
    setHtmlContent(text);
    // Try to extract existing design vars from the HTML
    const embedded = extractDesignVars(text);
    setDesignVars(embedded);
    toast({ title: "Template chargé ✓", description: `Fichier "${file.name}" importé avec succès.` });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleHTMLFile(file);
  }, [handleHTMLFile]);

  // ── Upload thumbnail ──────────────────────────────────────────────────────
  const handleThumbnailUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Fichier invalide", description: "Image uniquement (PNG, JPG, WebP)", variant: "destructive" });
      return;
    }
    setIsUploadingThumb(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `cv-templates/thumb-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("cms-media").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("cms-media").getPublicUrl(path);
      setThumbnailUrl(urlData.publicUrl);
      toast({ title: "Miniature uploadée ✓" });
    } catch (e: any) {
      toast({ title: "Erreur upload", description: e.message, variant: "destructive" });
    } finally {
      setIsUploadingThumb(false);
    }
  };

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const schemaToSave = schema
        ? { ...schema, constraints, designVars }
        : { constraints, designVars };

      const payload = {
        name: templateName,
        html_template: htmlContent,
        css_styles: "",
        sector: "custom",
        is_active: isActive,
        thumbnail_url: thumbnailUrl ?? null,
        template_version: "html-v1",
        template_schema: JSON.parse(JSON.stringify(schemaToSave)),
        has_photo: schema?.hasPhoto ?? false,
      };
      if (templateId) {
        const { error } = await supabase.from("cv_templates").update(payload).eq("id", templateId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cv_templates").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Template sauvegardé ✓", description: "Disponible dans le CV Builder." });
      qc.invalidateQueries({ queryKey: ["cv-templates"] });
      navigate("/admin/cv-templates");
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const missingFields = schema ? getMissingStandardFields(schema) : [];
  const mockData = useMockPhoto ? MOCK_DATA_WITH_PHOTO : MOCK_CV_DATA;

  return (
    <div className="flex flex-col bg-background min-h-screen">
      {/* ── Toolbar ── */}
      <div className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/cv-templates")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>

        <div className="w-px h-6 bg-border" />

        <Input
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="h-8 w-48 text-sm font-medium"
          placeholder="Nom du template"
        />

        <div className="flex-1" />

        {/* Toggle photo mock */}
        <button
          onClick={() => setUseMockPhoto((v) => !v)}
          className={cn(
            "text-xs px-2.5 py-1 rounded border transition-colors",
            useMockPhoto
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-muted border-border text-muted-foreground"
          )}
          title="Afficher la photo dans la preview"
        >
          {useMockPhoto ? "Avec photo" : "Sans photo"}
        </button>

        {/* Toggle actif */}
        <button
          onClick={() => setIsActive((v) => !v)}
          className={cn(
            "text-xs px-3 py-1.5 rounded-full border font-medium transition-all",
            isActive
              ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "bg-muted border-border text-muted-foreground"
          )}
        >
          {isActive ? "● Actif" : "○ Inactif"}
        </button>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-1.5">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Sauvegarder
        </Button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Panneau gauche : éditeur ── */}
        <div
          className="flex flex-col border-r border-border bg-card overflow-y-auto min-h-0"
          style={{ width: "480px", minWidth: "380px" }}
        >
          {/* Zone upload */}
          <div className="p-4 border-b border-border space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-primary" />
              Fichier template HTML
            </h3>

            <div
              className={cn(
                "relative border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Glissez un fichier .html ici</p>
              <p className="text-xs text-muted-foreground mt-0.5">ou cliquez pour parcourir</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,text/html"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleHTMLFile(f); }}
              />
            </div>

            {/* Miniature */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Miniature</Label>
                <div className="flex items-center gap-2 mt-1">
                  {thumbnailUrl ? (
                    <img src={thumbnailUrl} alt="Miniature" className="h-10 w-8 object-cover rounded border border-border" />
                  ) : (
                    <div className="h-10 w-8 rounded border border-dashed border-border flex items-center justify-center bg-muted">
                      <Image className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                  <Button
                    variant="outline" size="sm"
                    onClick={() => thumbnailInputRef.current?.click()}
                    disabled={isUploadingThumb}
                    className="text-xs h-7"
                  >
                    {isUploadingThumb ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    <span className="ml-1">{thumbnailUrl ? "Changer" : "Upload"}</span>
                  </Button>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbnailUpload(f); }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Schéma détecté */}
          {schema && (
            <div className="p-4 border-b border-border space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Schéma détecté
              </h3>

              {missingFields.length > 0 ? (
                <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Champs standard manquants :</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{missingFields.join(", ")}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <p className="text-xs font-medium text-green-700 dark:text-green-300">Tous les champs standard présents</p>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {schema.hasPhoto && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">📷 Photo</Badge>
                )}
                {schema.fields.map((f) => (
                  <Badge key={f.id} variant="outline" className="text-[10px] px-1.5 py-0.5 font-mono">{f.id}</Badge>
                ))}
                {schema.lists.map((l) => (
                  <Badge key={l.id} className="text-[10px] px-1.5 py-0.5 font-mono bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200">
                    [{l.id}×{l.itemFields.length}]
                  </Badge>
                ))}
                {schema.sections.map((s) => (
                  <Badge key={s.id} variant="outline" className="text-[10px] px-1.5 py-0.5 font-mono text-muted-foreground">§{s.id}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Éditeur HTML */}
          <div className="flex-1 flex flex-col p-4 gap-2 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-primary" />
                Code HTML
              </h3>
              <Button
                variant="ghost" size="sm"
                onClick={() => {
                  setHtmlContent(DEFAULT_TEMPLATE_HTML);
                  setDesignVars({ ...DEFAULT_DESIGN_VARS });
                  setConstraints({});
                }}
                className="text-xs h-6 gap-1 text-muted-foreground"
              >
                <RefreshCw className="h-3 w-3" />
                Exemple
              </Button>
            </div>
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="flex-1 min-h-[200px] w-full font-mono text-[11px] leading-relaxed p-3 rounded-lg border border-border bg-muted/30 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              spellCheck={false}
              placeholder="Collez votre HTML ici ou uploadez un fichier..."
            />
          </div>

          {/* Convention */}
          <div className="p-4 border-t border-border">
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium text-foreground hover:text-primary transition-colors">
                Convention de balisage
              </summary>
              <div className="mt-3 space-y-1.5 font-mono bg-muted/50 p-3 rounded-lg">
                {[
                  ["data-field=\"id\"", "Champ texte simple"],
                  ["data-field-img=\"id\"", "Champ image (src)"],
                  ["data-section=\"id\"", "Section masquable si vide"],
                  ["data-list=\"id\"", "Conteneur répétable"],
                  ["data-bullet-list=\"id\"", "Liste <ul> générée dynamiquement"],
                ].map(([attr, desc]) => (
                  <div key={attr} className="flex gap-2">
                    <code className="text-primary shrink-0">{attr}</code>
                    <span className="text-muted-foreground">→ {desc}</span>
                  </div>
                ))}
                <div className="mt-2 text-muted-foreground">
                  CSS requis : <code className="text-primary">[data-hidden="true"] {"{"} display: none !important {"}"}</code>
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* ── Panneau droit : 4 onglets ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/10 min-h-0">
          <Tabs value={rightTab} onValueChange={setRightTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Tab bar */}
            <div className="border-b border-border bg-card px-4 pt-2 shrink-0">
              <TabsList className="h-9 bg-transparent p-0 gap-1">
                <TabsTrigger
                  value="preview"
                  className="h-8 px-3 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-sm"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Aperçu
                </TabsTrigger>
                <TabsTrigger
                  value="constraints"
                  className="h-8 px-3 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-sm"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Contraintes
                </TabsTrigger>
                <TabsTrigger
                  value="design"
                  className="h-8 px-3 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-sm"
                >
                  <Palette className="h-3.5 w-3.5" />
                  Design
                </TabsTrigger>
                <TabsTrigger
                  value="ai"
                  className="h-8 px-3 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-sm"
                >
                  <Bot className="h-3.5 w-3.5" />
                  IA Designer
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── Aperçu ── */}
            <TabsContent value="preview" className="flex-1 m-0 overflow-hidden flex flex-col min-h-0">
              {htmlContent.trim() ? (
                <div className="flex-1 overflow-auto min-h-0">
                  <div style={{
                    width: "100%",
                    minHeight: `${Math.round(1122 * 0.62) + 32}px`,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    padding: "16px",
                  }}>
                    <div style={{
                      transform: "scale(0.62)",
                      transformOrigin: "top center",
                      width: "210mm",
                      height: "297mm",
                      flexShrink: 0,
                    }}>
                      <HTMLCVRenderer
                        templateHtml={htmlContent}
                        cvData={mockData}
                        scale={1}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                  <div>
                    <FileCode2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-sm">Uploadez ou collez du HTML pour voir l'aperçu</p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Contraintes ── */}
            <TabsContent value="constraints" className="flex-1 overflow-hidden m-0 flex flex-col min-h-0">
              <ConstraintsPanel
                schema={schema}
                constraints={constraints}
                onChange={setConstraints}
              />
            </TabsContent>

            {/* ── Design ── */}
            <TabsContent value="design" className="flex-1 overflow-hidden m-0 flex flex-col min-h-0">
              <DesignPanel
                vars={designVars}
                onChange={handleDesignVarsChange}
              />
            </TabsContent>

            {/* ── IA Designer ── */}
            <TabsContent value="ai" className="flex-1 overflow-hidden m-0 flex flex-col min-h-0">
              <AIDesignChat
                templateHtml={htmlContent}
                templateSchema={schema}
                designVars={designVars}
                constraints={constraints}
                onApplyPatch={handleApplyAIPatch}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

// ─── Compat export ────────────────────────────────────────────────────────────
export type { TemplateSchema };
