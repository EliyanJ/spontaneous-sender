import React, { useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Save, ArrowLeft, User, FileText, Briefcase, GraduationCap,
  Star, Globe, Layers, Plus, X, GripVertical, Rocket, Target,
  ChevronLeft, ChevronRight, LayoutTemplate, Palette
} from "lucide-react";
import { DynamicCVRenderer } from "@/components/cv-builder/DynamicCVRenderer";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SectionId =
  | "contact" | "summary" | "target_jobs" | "experiences"
  | "entrepreneurship" | "skills" | "education" | "languages";

export interface SectionStyles {
  bg: string;
  textColor: string;
  fontSize: number;
  padding: number;
  borderBottom: string;
  borderBottomColor: string;
  borderBottomWidth: number;
  borderRadius: number;
}

export interface TemplateSection {
  id: SectionId;
  zone: "sidebar" | "main";
  order: number;
  enabled: boolean;
  required: boolean;
  styles: SectionStyles;
}

export interface TemplateConfig {
  layout: "sidebar" | "full";
  sidebarWidth: number;
  sidebarBg: string;
  mainBg: string;
  fontFamily: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  sections: TemplateSection[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_META: Record<SectionId, { label: string; icon: React.ElementType; required: boolean; description: string }> = {
  contact:        { label: "Coordonnées",              icon: User,        required: true,  description: "Nom, email, téléphone, LinkedIn" },
  summary:        { label: "Résumé / Bio",              icon: FileText,    required: true,  description: "Mini paragraphe de présentation" },
  experiences:    { label: "Expériences pro.",          icon: Briefcase,   required: true,  description: "Postes et missions" },
  skills:         { label: "Compétences clés",          icon: Star,        required: true,  description: "Hard & soft skills" },
  education:      { label: "Formations & certif.",      icon: GraduationCap, required: true, description: "Diplômes, certifications" },
  target_jobs:    { label: "Métiers cherchés",          icon: Target,      required: false, description: "Postes et secteurs visés" },
  entrepreneurship:{ label: "Parcours entrepreneur",   icon: Rocket,      required: false, description: "Projets, startups, création" },
  languages:      { label: "Langues",                  icon: Globe,       required: false, description: "Langues et niveaux" },
};

const DEFAULT_SECTION_STYLES: SectionStyles = {
  bg: "transparent",
  textColor: "#1a1a2e",
  fontSize: 10,
  padding: 16,
  borderBottom: "none",
  borderBottomColor: "#e5e7eb",
  borderBottomWidth: 1,
  borderRadius: 0,
};

const DEFAULT_TEMPLATE: TemplateConfig = {
  layout: "sidebar",
  sidebarWidth: 72,
  sidebarBg: "#0f1b3d",
  mainBg: "#ffffff",
  fontFamily: "Helvetica, Arial, sans-serif",
  primaryColor: "#0f1b3d",
  accentColor: "#c9a84c",
  textColor: "#1a1a2e",
  sections: [
    { id: "contact",     zone: "sidebar", order: 0, enabled: true, required: true,  styles: { ...DEFAULT_SECTION_STYLES, bg: "transparent", textColor: "#ffffff" } },
    { id: "summary",     zone: "sidebar", order: 1, enabled: true, required: true,  styles: { ...DEFAULT_SECTION_STYLES, bg: "transparent", textColor: "#e2e8f0" } },
    { id: "skills",      zone: "sidebar", order: 2, enabled: true, required: true,  styles: { ...DEFAULT_SECTION_STYLES, bg: "transparent", textColor: "#ffffff" } },
    { id: "languages",   zone: "sidebar", order: 3, enabled: false, required: false, styles: { ...DEFAULT_SECTION_STYLES, bg: "transparent", textColor: "#e2e8f0" } },
    { id: "experiences", zone: "main",    order: 0, enabled: true, required: true,  styles: { ...DEFAULT_SECTION_STYLES } },
    { id: "education",   zone: "main",    order: 1, enabled: true, required: true,  styles: { ...DEFAULT_SECTION_STYLES } },
    { id: "target_jobs", zone: "main",    order: 2, enabled: false, required: false, styles: { ...DEFAULT_SECTION_STYLES } },
    { id: "entrepreneurship", zone: "main", order: 3, enabled: false, required: false, styles: { ...DEFAULT_SECTION_STYLES } },
  ],
};

const FONT_OPTIONS = [
  { label: "Helvetica / Arial",   value: "Helvetica, Arial, sans-serif" },
  { label: "Georgia (serif)",      value: "Georgia, 'Times New Roman', serif" },
  { label: "Garamond (élégant)",   value: "'Garamond', Georgia, serif" },
  { label: "Courier (machine)",    value: "'Courier New', Courier, monospace" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center justify-between gap-3">
    <Label className="text-xs text-muted-foreground shrink-0">{label}</Label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent p-0.5"
      />
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-7 text-xs w-24 font-mono"
      />
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const AdminCVTemplateBuilder = () => {
  const { templateId } = useParams<{ templateId?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [templateName, setTemplateName] = useState("Nouveau template");
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_TEMPLATE);
  const [selectedSection, setSelectedSection] = useState<SectionId | null>(null);
  const [dragSource, setDragSource] = useState<{ type: "palette" | "canvas"; id: SectionId; zone?: "sidebar" | "main" } | null>(null);
  const [dragOverZone, setDragOverZone] = useState<"sidebar" | "main" | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
        try {
          const parsed = JSON.parse(data.html_template);
          if (parsed.sections) setConfig(parsed);
        } catch { /* fallback to default */ }
      }
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: templateName,
        html_template: JSON.stringify(config),
        css_styles: "",
        sector: "custom",
        is_active: true,
      };
      if (templateId) {
        const { error } = await supabase.from("cv_templates").update(payload).eq("id", templateId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cv_templates").insert(payload);
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

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const updateGlobal = useCallback(<K extends keyof TemplateConfig>(key: K, val: TemplateConfig[K]) => {
    setConfig(c => ({ ...c, [key]: val }));
  }, []);

  const updateSectionStyle = useCallback(<K extends keyof SectionStyles>(id: SectionId, key: K, val: SectionStyles[K]) => {
    setConfig(c => ({
      ...c,
      sections: c.sections.map(s => s.id === id ? { ...s, styles: { ...s.styles, [key]: val } } : s),
    }));
  }, []);

  const toggleSection = useCallback((id: SectionId) => {
    setConfig(c => ({
      ...c,
      sections: c.sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s),
    }));
  }, []);

  const removeSection = useCallback((id: SectionId) => {
    setConfig(c => ({
      ...c,
      sections: c.sections.map(s => s.id === id ? { ...s, enabled: false } : s),
    }));
    if (selectedSection === id) setSelectedSection(null);
  }, [selectedSection]);

  const selectedSectionData = config.sections.find(s => s.id === selectedSection);

  const sectionsInZone = (zone: "sidebar" | "main") =>
    config.sections
      .filter(s => s.zone === zone && s.enabled)
      .sort((a, b) => a.order - b.order);

  const disabledSections = config.sections.filter(s => !s.enabled);

  // ── Drag & Drop ───────────────────────────────────────────────────────────────

  const handleDragStartPalette = (id: SectionId) => {
    setDragSource({ type: "palette", id });
  };

  const handleDragStartCanvas = (id: SectionId, zone: "sidebar" | "main") => {
    setDragSource({ type: "canvas", id, zone });
  };

  const handleDropOnZone = (zone: "sidebar" | "main", insertIndex: number) => {
    if (!dragSource) return;
    setConfig(c => {
      const sections = [...c.sections];
      const sIdx = sections.findIndex(s => s.id === dragSource.id);
      if (sIdx === -1) return c;

      // Determine items in target zone (excluding the dragged item if it's already there)
      const zoneItems = sections
        .filter(s => s.zone === zone && s.enabled && s.id !== dragSource.id)
        .sort((a, b) => a.order - b.order);

      // Insert at position
      zoneItems.splice(insertIndex, 0, sections[sIdx]);

      // Reassign orders
      zoneItems.forEach((item, i) => {
        const idx = sections.findIndex(s => s.id === item.id);
        sections[idx] = { ...sections[idx], zone, order: i, enabled: true };
      });

      return { ...c, sections };
    });
    setDragSource(null);
    setDragOverZone(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, zone: "sidebar" | "main", index: number) => {
    e.preventDefault();
    setDragOverZone(zone);
    setDragOverIndex(index);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/cv-templates")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <LayoutTemplate className="h-5 w-5 text-primary" />
          <Input
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            className="h-8 text-sm font-medium w-56 border-transparent hover:border-border focus:border-border"
            placeholder="Nom du template..."
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/cv-templates")}>
            Annuler
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Palette ────────────────────────────────────────── */}
        <div className="w-56 shrink-0 border-r border-border bg-card/50 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Sections</p>
            <p className="text-xs text-muted-foreground mt-0.5">Glisser vers le canvas</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {disabledSections.map(section => {
              const meta = SECTION_META[section.id];
              const Icon = meta.icon;
              return (
                <div
                  key={section.id}
                  draggable
                  onDragStart={() => handleDragStartPalette(section.id)}
                  className="flex items-center gap-2 px-2 py-2 rounded-lg border border-dashed border-border bg-background hover:border-primary hover:bg-primary/5 cursor-grab active:cursor-grabbing transition-colors group"
                >
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground leading-tight truncate">{meta.label}</p>
                  </div>
                  {meta.required && <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">requis</Badge>}
                </div>
              );
            })}
            {disabledSections.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-4 text-center">Toutes les sections sont placées</p>
            )}
          </div>

          {/* Layout toggle */}
          <div className="p-3 border-t border-border space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Layout</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => updateGlobal("layout", "sidebar")}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 p-2 rounded-md border text-xs transition-colors",
                  config.layout === "sidebar"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80"
                )}
              >
                <div className="flex gap-0.5 w-full h-5">
                  <div className="w-2 h-full rounded-sm bg-current opacity-60" />
                  <div className="flex-1 h-full rounded-sm bg-current opacity-30" />
                </div>
                Sidebar
              </button>
              <button
                onClick={() => updateGlobal("layout", "full")}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 p-2 rounded-md border text-xs transition-colors",
                  config.layout === "full"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80"
                )}
              >
                <div className="w-full h-5 rounded-sm bg-current opacity-30" />
                Pleine larg.
              </button>
            </div>
          </div>
        </div>

        {/* ── CENTER: Canvas ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-6">
          <div
            className="bg-white shadow-2xl rounded overflow-hidden"
            style={{ width: 595, minHeight: 842, position: "relative" }}
          >
            <div style={{ display: "flex", minHeight: 842 }}>

              {/* Sidebar zone */}
              {config.layout === "sidebar" && (
                <div
                  style={{
                    width: config.sidebarWidth,
                    background: config.sidebarBg,
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 842,
                  }}
                  onDragOver={e => { e.preventDefault(); setDragOverZone("sidebar"); }}
                  onDrop={e => { e.preventDefault(); handleDropOnZone("sidebar", dragOverIndex ?? sectionsInZone("sidebar").length); }}
                >
                  {sectionsInZone("sidebar").map((section, i) => (
                    <React.Fragment key={section.id}>
                      {/* Drop indicator */}
                      {dragOverZone === "sidebar" && dragOverIndex === i && (
                        <div style={{ height: 3, background: "#6366f1", margin: "2px 4px", borderRadius: 2 }} />
                      )}
                      <CanvasBlock
                        section={section}
                        isSelected={selectedSection === section.id}
                        onSelect={() => setSelectedSection(section.id)}
                        onRemove={() => removeSection(section.id)}
                        onDragStart={() => handleDragStartCanvas(section.id, "sidebar")}
                        onDragOver={e => handleDragOver(e, "sidebar", i)}
                        zone="sidebar"
                        primaryColor={config.primaryColor}
                        accentColor={config.accentColor}
                      />
                    </React.Fragment>
                  ))}
                  {/* Drop zone at end */}
                  <div
                    style={{ flex: 1, minHeight: 40 }}
                    onDragOver={e => { e.preventDefault(); setDragOverZone("sidebar"); setDragOverIndex(sectionsInZone("sidebar").length); }}
                  >
                    {dragOverZone === "sidebar" && dragOverIndex === sectionsInZone("sidebar").length && (
                      <div style={{ height: 3, background: "#6366f1", margin: "2px 4px", borderRadius: 2 }} />
                    )}
                    {sectionsInZone("sidebar").length === 0 && (
                      <div style={{ padding: "16px 8px", textAlign: "center" }}>
                        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontFamily: "system-ui" }}>Glisser des sections ici</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Main zone */}
              <div
                style={{ flex: 1, background: config.mainBg, display: "flex", flexDirection: "column", minHeight: 842 }}
                onDragOver={e => { e.preventDefault(); setDragOverZone("main"); }}
                onDrop={e => { e.preventDefault(); handleDropOnZone("main", dragOverIndex ?? sectionsInZone("main").length); }}
              >
                {sectionsInZone("main").map((section, i) => (
                  <React.Fragment key={section.id}>
                    {dragOverZone === "main" && dragOverIndex === i && (
                      <div style={{ height: 3, background: "#6366f1", margin: "2px 8px", borderRadius: 2 }} />
                    )}
                    <CanvasBlock
                      section={section}
                      isSelected={selectedSection === section.id}
                      onSelect={() => setSelectedSection(section.id)}
                      onRemove={() => removeSection(section.id)}
                      onDragStart={() => handleDragStartCanvas(section.id, "main")}
                      onDragOver={e => handleDragOver(e, "main", i)}
                      zone="main"
                      primaryColor={config.primaryColor}
                      accentColor={config.accentColor}
                    />
                  </React.Fragment>
                ))}
                <div
                  style={{ flex: 1, minHeight: 40 }}
                  onDragOver={e => { e.preventDefault(); setDragOverZone("main"); setDragOverIndex(sectionsInZone("main").length); }}
                >
                  {dragOverZone === "main" && dragOverIndex === sectionsInZone("main").length && (
                    <div style={{ height: 3, background: "#6366f1", margin: "2px 8px", borderRadius: 2 }} />
                  )}
                  {sectionsInZone("main").length === 0 && (
                    <div style={{ padding: "24px 16px", textAlign: "center" }}>
                      <p style={{ fontSize: 10, color: "#9ca3af", fontFamily: "system-ui" }}>Glisser des sections ici</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Style Panel ─────────────────────────────────────── */}
        <div className="w-64 shrink-0 border-l border-border bg-card/50 flex flex-col overflow-hidden">
          <Tabs defaultValue="global" className="flex flex-col h-full">
            <TabsList className="w-full rounded-none border-b border-border shrink-0 h-9">
              <TabsTrigger value="global" className="flex-1 text-xs">
                <Palette className="h-3 w-3 mr-1.5" />
                Global
              </TabsTrigger>
              <TabsTrigger value="block" className="flex-1 text-xs" disabled={!selectedSection}>
                <Layers className="h-3 w-3 mr-1.5" />
                Bloc {selectedSection ? `(${SECTION_META[selectedSection].label.split(" ")[0]})` : ""}
              </TabsTrigger>
            </TabsList>

            {/* Global tab */}
            <TabsContent value="global" className="flex-1 overflow-y-auto p-3 space-y-4 mt-0">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Couleurs globales</p>
                <ColorInput label="Couleur primaire" value={config.primaryColor} onChange={v => updateGlobal("primaryColor", v)} />
                <ColorInput label="Couleur accent" value={config.accentColor} onChange={v => updateGlobal("accentColor", v)} />
                <ColorInput label="Texte principal" value={config.textColor} onChange={v => updateGlobal("textColor", v)} />
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Arrière-plans</p>
                <ColorInput label="Fond sidebar" value={config.sidebarBg} onChange={v => updateGlobal("sidebarBg", v)} />
                <ColorInput label="Fond principal" value={config.mainBg} onChange={v => updateGlobal("mainBg", v)} />
              </div>

              {config.layout === "sidebar" && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Largeur sidebar</p>
                      <span className="text-xs text-muted-foreground">{config.sidebarWidth}mm</span>
                    </div>
                    <Slider
                      min={55}
                      max={110}
                      step={1}
                      value={[config.sidebarWidth]}
                      onValueChange={([v]) => updateGlobal("sidebarWidth", v)}
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Police</p>
                <select
                  value={config.fontFamily}
                  onChange={e => updateGlobal("fontFamily", e.target.value)}
                  className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground"
                >
                  {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </TabsContent>

            {/* Block tab */}
            <TabsContent value="block" className="flex-1 overflow-y-auto p-3 space-y-4 mt-0">
              {selectedSectionData ? (
                <>
                  <div className="flex items-center gap-2">
                    {React.createElement(SECTION_META[selectedSection!].icon, { className: "h-4 w-4 text-primary" })}
                    <p className="text-sm font-medium">{SECTION_META[selectedSection!].label}</p>
                  </div>
                  <Separator />

                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Couleurs</p>
                    <ColorInput
                      label="Fond"
                      value={selectedSectionData.styles.bg === "transparent" ? "#transparent" : selectedSectionData.styles.bg}
                      onChange={v => updateSectionStyle(selectedSection!, "bg", v)}
                    />
                    <ColorInput
                      label="Texte"
                      value={selectedSectionData.styles.textColor}
                      onChange={v => updateSectionStyle(selectedSection!, "textColor", v)}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Taille texte</p>
                      <span className="text-xs text-muted-foreground">{selectedSectionData.styles.fontSize}pt</span>
                    </div>
                    <Slider
                      min={8} max={14} step={0.5}
                      value={[selectedSectionData.styles.fontSize]}
                      onValueChange={([v]) => updateSectionStyle(selectedSection!, "fontSize", v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Padding</p>
                      <span className="text-xs text-muted-foreground">{selectedSectionData.styles.padding}px</span>
                    </div>
                    <Slider
                      min={0} max={32} step={2}
                      value={[selectedSectionData.styles.padding]}
                      onValueChange={([v]) => updateSectionStyle(selectedSection!, "padding", v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Rayon de bordure</p>
                      <span className="text-xs text-muted-foreground">{selectedSectionData.styles.borderRadius}px</span>
                    </div>
                    <Slider
                      min={0} max={16} step={1}
                      value={[selectedSectionData.styles.borderRadius]}
                      onValueChange={([v]) => updateSectionStyle(selectedSection!, "borderRadius", v)}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Bordure basse</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateSectionStyle(selectedSection!, "borderBottom", "none")}
                        className={cn("flex-1 text-xs py-1 rounded border transition-colors",
                          selectedSectionData.styles.borderBottom === "none"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground")}
                      >Aucune</button>
                      <button
                        onClick={() => updateSectionStyle(selectedSection!, "borderBottom", "solid")}
                        className={cn("flex-1 text-xs py-1 rounded border transition-colors",
                          selectedSectionData.styles.borderBottom !== "none"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground")}
                      >Solide</button>
                    </div>
                    {selectedSectionData.styles.borderBottom !== "none" && (
                      <div className="space-y-2">
                        <ColorInput
                          label="Couleur bordure"
                          value={selectedSectionData.styles.borderBottomColor}
                          onChange={v => updateSectionStyle(selectedSection!, "borderBottomColor", v)}
                        />
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">Épaisseur</p>
                          <span className="text-xs text-muted-foreground">{selectedSectionData.styles.borderBottomWidth}px</span>
                        </div>
                        <Slider
                          min={1} max={4} step={0.5}
                          value={[selectedSectionData.styles.borderBottomWidth]}
                          onValueChange={([v]) => updateSectionStyle(selectedSection!, "borderBottomWidth", v)}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Layers className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground">Clique sur un bloc du canvas pour l'éditer</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

// ─── Canvas Block ──────────────────────────────────────────────────────────────

const SECTION_PLACEHOLDER: Record<SectionId, React.ReactNode> = {
  contact: <><div style={{ fontWeight: 700, fontSize: 14 }}>Jean Dupont</div><div style={{ fontSize: 9, opacity: 0.8, marginTop: 2 }}>Développeur Full Stack</div><div style={{ fontSize: 9, opacity: 0.7, marginTop: 4 }}>jean.dupont@email.com · 06 12 34 56 78</div><div style={{ fontSize: 9, opacity: 0.7 }}>linkedin.com/in/jeandupont</div></>,
  summary: <p style={{ fontSize: 9, lineHeight: 1.5, opacity: 0.8 }}>Développeur passionné avec 8 ans d'expérience en conception d'applications web modernes. Spécialisé React et Node.js.</p>,
  experiences: <><div style={{ fontSize: 10, fontWeight: 600 }}>Expériences professionnelles</div><div style={{ marginTop: 6 }}><div style={{ fontSize: 9, fontWeight: 600 }}>Senior Dev — TechCorp</div><div style={{ fontSize: 8, opacity: 0.6 }}>Jan 2021 – Présent</div></div></>,
  skills: <><div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4 }}>Compétences</div><div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{["React", "TypeScript", "Node.js", "PostgreSQL"].map(s => <span key={s} style={{ fontSize: 8, padding: "2px 6px", borderRadius: 10, background: "rgba(255,255,255,0.15)" }}>{s}</span>)}</div></>,
  education: <><div style={{ fontSize: 10, fontWeight: 600 }}>Formation</div><div style={{ marginTop: 4, fontSize: 9 }}>Master Informatique — Université Paris Saclay<br /><span style={{ opacity: 0.6, fontSize: 8 }}>2016 – 2018</span></div></>,
  target_jobs: <><div style={{ fontSize: 10, fontWeight: 600, marginBottom: 3 }}>Métiers cherchés</div><div style={{ fontSize: 9, opacity: 0.8 }}>Lead Developer · CTO · Architecte Logiciel</div></>,
  entrepreneurship: <><div style={{ fontSize: 10, fontWeight: 600, marginBottom: 3 }}>Parcours entrepreneur</div><div style={{ fontSize: 9 }}>Co-fondateur de StartupXYZ (2019–2021)<br /><span style={{ fontSize: 8, opacity: 0.6 }}>SaaS B2B · 50K ARR</span></div></>,
  languages: <><div style={{ fontSize: 10, fontWeight: 600, marginBottom: 3 }}>Langues</div><div style={{ fontSize: 9 }}>Français (natif) · Anglais (C1) · Espagnol (B1)</div></>,
};

interface CanvasBlockProps {
  section: TemplateSection;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  zone: "sidebar" | "main";
  primaryColor: string;
  accentColor: string;
}

const CanvasBlock: React.FC<CanvasBlockProps> = ({
  section, isSelected, onSelect, onRemove, onDragStart, onDragOver, zone, accentColor
}) => {
  const { styles } = section;
  const borderBottomStyle = styles.borderBottom !== "none"
    ? `${styles.borderBottomWidth}px ${styles.borderBottom} ${styles.borderBottomColor}`
    : undefined;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onClick={onSelect}
      style={{
        background: styles.bg === "transparent" ? "transparent" : styles.bg,
        color: styles.textColor,
        padding: styles.padding,
        borderBottom: borderBottomStyle,
        borderRadius: styles.borderRadius,
        fontFamily: "Helvetica, sans-serif",
        fontSize: styles.fontSize,
        cursor: "pointer",
        position: "relative",
        outline: isSelected ? `2px solid ${accentColor}` : "none",
        outlineOffset: -1,
        transition: "outline 0.1s",
      }}
    >
      {/* Controls */}
      <div
        style={{
          position: "absolute",
          top: 2, right: 2,
          display: "flex",
          gap: 2,
          opacity: 0,
          transition: "opacity 0.15s",
          zIndex: 10,
        }}
        className="canvas-block-controls"
        onMouseOver={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        onMouseOut={e => { (e.currentTarget as HTMLElement).style.opacity = "0"; }}
      >
        <GripVertical style={{ width: 12, height: 12, cursor: "grab", opacity: 0.5 }} />
        {!section.required && (
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            style={{
              width: 14, height: 14, borderRadius: "50%",
              background: "#ef4444", border: "none",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: 9,
            }}
          >×</button>
        )}
      </div>

      {/* Hover overlay to show controls */}
      <style>{`.canvas-block-controls { opacity: 0 !important; } div:hover > .canvas-block-controls { opacity: 1 !important; }`}</style>

      {/* Placeholder content */}
      <div style={{ pointerEvents: "none" }}>
        {SECTION_PLACEHOLDER[section.id]}
      </div>
    </div>
  );
};

// ─── Template List Page ────────────────────────────────────────────────────────

export const AdminCVTemplates = () => {
  const navigate = useNavigate();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["cv-templates-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cv_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const qc = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cv_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Template supprimé" });
      qc.invalidateQueries({ queryKey: ["cv-templates-admin"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("cv_templates").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cv-templates-admin"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Templates CV</h1>
          <p className="text-muted-foreground text-sm mt-1">Créez et gérez les templates disponibles dans le CV Builder</p>
        </div>
        <Button onClick={() => navigate("/admin/cv-templates/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau template
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(templates ?? []).map(t => {
            let isCustom = false;
            try { const p = JSON.parse(t.html_template); isCustom = !!p.sections; } catch {}
            return (
              <div key={t.id} className="rounded-xl border border-border bg-card overflow-hidden group">
                <div className="h-32 bg-muted flex items-center justify-center relative">
                  {t.thumbnail_url
                    ? <img src={t.thumbnail_url} alt={t.name} className="w-full h-full object-cover" />
                    : <LayoutTemplate className="h-12 w-12 text-muted-foreground/40" />
                  }
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Badge variant={t.is_active ? "default" : "secondary"} className="text-xs">
                      {t.is_active ? "Actif" : "Inactif"}
                    </Badge>
                    {isCustom && <Badge variant="outline" className="text-xs bg-background">Builder</Badge>}
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm text-foreground truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.sector}</p>
                  <div className="flex items-center gap-2 mt-3">
                    {isCustom && (
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs"
                        onClick={() => navigate(`/admin/cv-templates/${t.id}`)}>
                        Éditer
                      </Button>
                    )}
                    <Button
                      size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => toggleMutation.mutate({ id: t.id, is_active: !t.is_active })}
                    >
                      {t.is_active ? "Désactiver" : "Activer"}
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => { if (confirm("Supprimer ce template ?")) deleteMutation.mutate(t.id); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
