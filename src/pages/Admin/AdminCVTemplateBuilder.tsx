import React, { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Save, ArrowLeft, Type, Square, Minus, LayoutTemplate,
  Trash2, Copy, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, ChevronUp, ChevronDown, User, Briefcase,
  GraduationCap, Star, Globe, FileText, Target, Rocket,
  Plus, Lock, Unlock, Eye, EyeOff, Upload, Loader2, Code2, Image,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SectionId =
  | "contact" | "summary" | "target_jobs" | "experiences"
  | "entrepreneurship" | "skills" | "education" | "languages";

export type ElementType = "text" | "cv-section" | "shape" | "divider" | "image";

export interface ElementStyles {
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  fontFamily?: string;
  borderRadius?: number;
  border?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: string;
  opacity?: number;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  padding?: number;
  zIndex?: number;
  rotation?: number;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  sectionId?: SectionId;
  content?: string;
  locked?: boolean;
  visible?: boolean;
  styles: ElementStyles;
}

export interface CanvasConfig {
  version: "canvas-v2";
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  fontFamily: string;
  elements: CanvasElement[];
  /** Si true : le template est conçu pour accueillir une photo de profil */
  has_photo?: boolean;
}

// ─── Legacy types (for backward compat) ──────────────────────────────────────

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

const CANVAS_W = 595;
const CANVAS_H = 842;

const SECTION_META: Record<SectionId, { label: string; icon: React.ElementType; description: string }> = {
  contact:          { label: "Coordonnées",         icon: User,           description: "Nom, email, téléphone, LinkedIn" },
  summary:          { label: "Résumé / Bio",         icon: FileText,       description: "Présentation en quelques lignes" },
  experiences:      { label: "Expériences",          icon: Briefcase,      description: "Postes et missions" },
  skills:           { label: "Compétences",          icon: Star,           description: "Hard & soft skills" },
  education:        { label: "Formations",           icon: GraduationCap,  description: "Diplômes, certifications" },
  target_jobs:      { label: "Métiers cherchés",     icon: Target,         description: "Postes et secteurs visés" },
  entrepreneurship: { label: "Entrepreneuriat",      icon: Rocket,         description: "Projets, startups, création" },
  languages:        { label: "Langues",              icon: Globe,          description: "Langues et niveaux" },
};

const FONT_OPTIONS = [
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Georgia",   value: "Georgia, serif" },
  { label: "Garamond",  value: "Garamond, Georgia, serif" },
  { label: "Courier",   value: "'Courier New', monospace" },
  { label: "Verdana",   value: "Verdana, sans-serif" },
  { label: "Trebuchet", value: "'Trebuchet MS', sans-serif" },
];

const DEFAULT_CONFIG: CanvasConfig = {
  version: "canvas-v2",
  canvasWidth: CANVAS_W,
  canvasHeight: CANVAS_H,
  backgroundColor: "#ffffff",
  fontFamily: "Helvetica, Arial, sans-serif",
  elements: [],
};

// ─── Placeholder renderers for cv-section ─────────────────────────────────────

const SECTION_PLACEHOLDERS: Record<SectionId, React.FC<{ styles: ElementStyles }>> = {
  contact: ({ styles }) => (
    <div style={{ padding: styles.padding ?? 12, color: styles.color, fontFamily: styles.fontFamily, fontSize: styles.fontSize ?? 10 }}>
      <div style={{ fontWeight: 700, fontSize: (styles.fontSize ?? 10) + 4, marginBottom: 4 }}>Jean Dupont</div>
      <div style={{ opacity: 0.8, marginBottom: 6, fontSize: (styles.fontSize ?? 10) + 1 }}>Développeur Full Stack</div>
      <div style={{ opacity: 0.75, lineHeight: 1.8 }}>
        <div>✉ jean.dupont@email.com</div>
        <div>☎ 06 12 34 56 78</div>
        <div>in linkedin.com/in/jeandupont</div>
        <div>📍 Paris, France</div>
      </div>
    </div>
  ),
  summary: ({ styles }) => (
    <div style={{ padding: styles.padding ?? 12, color: styles.color, fontFamily: styles.fontFamily, fontSize: styles.fontSize ?? 10 }}>
      <div style={{ fontWeight: 700, fontSize: (styles.fontSize ?? 10) + 1, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Profil</div>
      <p style={{ margin: 0, lineHeight: 1.6, opacity: 0.85 }}>
        Développeur passionné avec 5 ans d'expérience en développement web full stack. Spécialisé dans les technologies React et Node.js avec une forte orientation résultats.
      </p>
    </div>
  ),
  experiences: ({ styles }) => (
    <div style={{ padding: styles.padding ?? 12, color: styles.color, fontFamily: styles.fontFamily, fontSize: styles.fontSize ?? 10 }}>
      <div style={{ fontWeight: 700, fontSize: (styles.fontSize ?? 10) + 1, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Expériences</div>
      {[{ role: "Lead Developer", company: "Tech Corp", dates: "2022 – Présent" }, { role: "Développeur Frontend", company: "StartupXYZ", dates: "2020 – 2022" }].map((e, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600 }}>{e.role}</div>
          <div style={{ opacity: 0.7, fontSize: (styles.fontSize ?? 10) - 0.5, marginBottom: 2 }}>{e.company} · {e.dates}</div>
          <div style={{ opacity: 0.8, lineHeight: 1.5 }}>Développement et maintenance des applications, collaboration avec les équipes produit.</div>
        </div>
      ))}
    </div>
  ),
  skills: ({ styles }) => (
    <div style={{ padding: styles.padding ?? 12, color: styles.color, fontFamily: styles.fontFamily, fontSize: styles.fontSize ?? 10 }}>
      <div style={{ fontWeight: 700, fontSize: (styles.fontSize ?? 10) + 1, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Compétences</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "Git"].map(s => (
          <span key={s} style={{ padding: "2px 8px", borderRadius: 10, background: "rgba(0,0,0,0.08)", fontSize: (styles.fontSize ?? 10) - 1 }}>{s}</span>
        ))}
      </div>
    </div>
  ),
  education: ({ styles }) => (
    <div style={{ padding: styles.padding ?? 12, color: styles.color, fontFamily: styles.fontFamily, fontSize: styles.fontSize ?? 10 }}>
      <div style={{ fontWeight: 700, fontSize: (styles.fontSize ?? 10) + 1, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Formation</div>
      {[{ degree: "Master Informatique", school: "École Polytechnique", year: "2019" }, { degree: "Licence Mathématiques", school: "Université Paris VI", year: "2017" }].map((e, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <div style={{ fontWeight: 600 }}>{e.degree}</div>
          <div style={{ opacity: 0.7, fontSize: (styles.fontSize ?? 10) - 0.5 }}>{e.school} · {e.year}</div>
        </div>
      ))}
    </div>
  ),
  languages: ({ styles }) => (
    <div style={{ padding: styles.padding ?? 12, color: styles.color, fontFamily: styles.fontFamily, fontSize: styles.fontSize ?? 10 }}>
      <div style={{ fontWeight: 700, fontSize: (styles.fontSize ?? 10) + 1, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Langues</div>
      {[{ lang: "Français", level: "Natif" }, { lang: "Anglais", level: "Courant (C1)" }, { lang: "Espagnol", level: "Intermédiaire (B2)" }].map((l, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span>{l.lang}</span>
          <span style={{ opacity: 0.7 }}>{l.level}</span>
        </div>
      ))}
    </div>
  ),
  target_jobs: ({ styles }) => (
    <div style={{ padding: styles.padding ?? 12, color: styles.color, fontFamily: styles.fontFamily, fontSize: styles.fontSize ?? 10 }}>
      <div style={{ fontWeight: 700, fontSize: (styles.fontSize ?? 10) + 1, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Métiers recherchés</div>
      <div style={{ opacity: 0.85, lineHeight: 1.6 }}>Développeur Full Stack · Tech Lead · Architecte Logiciel</div>
    </div>
  ),
  entrepreneurship: ({ styles }) => (
    <div style={{ padding: styles.padding ?? 12, color: styles.color, fontFamily: styles.fontFamily, fontSize: styles.fontSize ?? 10 }}>
      <div style={{ fontWeight: 700, fontSize: (styles.fontSize ?? 10) + 1, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Entrepreneuriat</div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>Co-fondateur — AppStartup</div>
        <div style={{ opacity: 0.7, fontSize: (styles.fontSize ?? 10) - 0.5, marginBottom: 2 }}>2021 – 2023</div>
        <div style={{ opacity: 0.8, lineHeight: 1.5 }}>Création d'une application SaaS B2B dans la logistique.</div>
      </div>
    </div>
  ),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// ─── ColorInput ───────────────────────────────────────────────────────────────

const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center justify-between gap-2">
    <Label className="text-xs text-muted-foreground shrink-0">{label}</Label>
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={value || "#000000"}
        onChange={e => onChange(e.target.value)}
        className="w-7 h-7 rounded cursor-pointer border border-border bg-transparent p-0.5"
      />
      <Input
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        className="h-6 text-xs w-20 font-mono px-1.5"
        placeholder="#000000"
      />
    </div>
  </div>
);

// ─── NumInput ─────────────────────────────────────────────────────────────────

const NumInput = ({ label, value, onChange, min = 0, max = 9999, unit = "" }: {
  label: string; value: number | undefined; onChange: (v: number) => void;
  min?: number; max?: number; unit?: string;
}) => (
  <div className="flex items-center justify-between gap-2">
    <Label className="text-xs text-muted-foreground shrink-0">{label}</Label>
    <div className="flex items-center gap-1">
      <Input
        type="number"
        value={value ?? ""}
        onChange={e => onChange(clamp(Number(e.target.value), min, max))}
        className="h-6 text-xs w-16 font-mono px-1.5"
        min={min}
        max={max}
      />
      {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
    </div>
  </div>
);

// ─── SelectInput ──────────────────────────────────────────────────────────────

const SelectInput = ({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) => (
  <div className="flex items-center justify-between gap-2">
    <Label className="text-xs text-muted-foreground shrink-0">{label}</Label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-6 text-xs border border-border rounded px-1.5 bg-background text-foreground w-32"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const AdminCVTemplateBuilder = () => {
  const { templateId } = useParams<{ templateId?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [templateName, setTemplateName] = useState("Nouveau template");
  const [config, setConfig] = useState<CanvasConfig>(DEFAULT_CONFIG);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingHTML, setIsImportingHTML] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Drag / resize state
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const htmlFileInputRef = useRef<HTMLInputElement>(null);
  const interactionRef = useRef<{
    mode: "move" | "resize";
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    elementId: string;
    handle?: string;
  } | null>(null);

  // (drag-and-drop removed — click-to-add only)

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
        setThumbnailUrl(data.thumbnail_url ?? null);
        try {
          const parsed = JSON.parse(data.html_template);
          if (parsed.version === "canvas-v2" && parsed.elements) {
            setConfig(parsed as CanvasConfig);
          }
        } catch { /* keep default */ }
      }
      return data;
    },
  });

  // ── Upload thumbnail ────────────────────────────────────────────────────────
  const handleThumbnailUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Fichier invalide", description: "Veuillez sélectionner une image (PNG, JPG, WebP)", variant: "destructive" });
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
      toast({ title: "Image uploadée ✓", description: "Elle sera enregistrée avec le template." });
    } catch (e: any) {
      toast({ title: "Erreur upload", description: e.message, variant: "destructive" });
    } finally {
      setIsUploadingThumb(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: templateName,
        html_template: JSON.stringify(config),
        css_styles: "",
        sector: "custom",
        is_active: true,
        thumbnail_url: thumbnailUrl ?? undefined,
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

  // ── Element helpers ───────────────────────────────────────────────────────

  const selectedEl = config.elements.find(e => e.id === selectedId) ?? null;

  const updateElement = useCallback((id: string, patch: Partial<CanvasElement>) => {
    setConfig(c => ({
      ...c,
      elements: c.elements.map(el => el.id === id ? { ...el, ...patch } : el),
    }));
  }, []);

  const updateStyle = useCallback((id: string, stylePatch: Partial<ElementStyles>) => {
    setConfig(c => ({
      ...c,
      elements: c.elements.map(el => el.id === id ? { ...el, styles: { ...el.styles, ...stylePatch } } : el),
    }));
  }, []);

  const addElement = useCallback((el: Omit<CanvasElement, "id">) => {
    const newEl = { ...el, id: genId() };
    setConfig(c => ({ ...c, elements: [...c.elements, newEl] }));
    setSelectedId(newEl.id);
    return newEl.id;
  }, []);

  const deleteElement = useCallback((id: string) => {
    setConfig(c => ({ ...c, elements: c.elements.filter(el => el.id !== id) }));
    setSelectedId(null);
  }, []);

  const duplicateElement = useCallback((id: string) => {
    const el = config.elements.find(e => e.id === id);
    if (!el) return;
    const newEl = { ...el, id: genId(), x: el.x + 15, y: el.y + 15 };
    setConfig(c => ({ ...c, elements: [...c.elements, newEl] }));
    setSelectedId(newEl.id);
  }, [config.elements]);

  const moveZ = useCallback((id: string, dir: "up" | "down") => {
    setConfig(c => {
      const els = [...c.elements];
      const idx = els.findIndex(e => e.id === id);
      if (dir === "up" && idx < els.length - 1) {
        [els[idx], els[idx + 1]] = [els[idx + 1], els[idx]];
      } else if (dir === "down" && idx > 0) {
        [els[idx], els[idx - 1]] = [els[idx - 1], els[idx]];
      }
      return { ...c, elements: els };
    });
  }, []);

  // ── Quick add helpers ─────────────────────────────────────────────────────

  const addText = () => addElement({
    type: "text",
    x: 50, y: 50, width: 200, height: 40,
    content: "Double-cliquez pour éditer",
    visible: true, locked: false,
    styles: { color: "#1a1a2e", fontSize: 12, fontFamily: "Helvetica, Arial, sans-serif", textAlign: "left", backgroundColor: "transparent" },
  });

  const addShape = (filled = true) => addElement({
    type: "shape",
    x: 80, y: 80, width: 200, height: 100,
    visible: true, locked: false,
    styles: {
      backgroundColor: filled ? "#0f1b3d" : "transparent",
      borderRadius: 0,
      border: filled ? "none" : "2px solid #0f1b3d",
      borderColor: "#0f1b3d",
      borderWidth: 2,
      borderStyle: filled ? "none" : "solid",
    },
  });

  const addDivider = () => addElement({
    type: "divider",
    x: 40, y: 100, width: 515, height: 2,
    visible: true, locked: false,
    styles: { backgroundColor: "#cccccc" },
  });

  const addSection = (sectionId: SectionId) => {
    // Check if already exists
    const exists = config.elements.some(e => e.type === "cv-section" && e.sectionId === sectionId);
    if (exists) {
      toast({ title: "Section déjà présente", description: "Cette section est déjà sur le canvas." });
      return;
    }
    addElement({
      type: "cv-section",
      sectionId,
      x: 40, y: 60, width: 515, height: 140,
      visible: true, locked: false,
      styles: {
        backgroundColor: "transparent",
        color: "#1a1a2e",
        fontSize: 10,
        fontFamily: "Helvetica, Arial, sans-serif",
        padding: 12,
      },
    });
  };

  // ── PDF Import ──────────────────────────────────────────────────────────

  const handleImportPDF = useCallback(async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Fichier trop lourd", description: "Le PDF doit faire moins de 10 MB.", variant: "destructive" });
      return;
    }
    setIsImporting(true);
    try {
      // Convert to base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const fileBase64 = btoa(binary);

      // Use supabase.functions.invoke() — handles large payloads reliably
      const { data: result, error } = await supabase.functions.invoke("ai-template-from-pdf", {
        body: { fileBase64, fileName: file.name },
      });

      if (error) throw new Error(error.message || "Erreur lors de l'analyse IA.");
      if (!result?.success) throw new Error(result?.error || "Erreur lors de l'analyse IA.");

      setConfig(result.config);
      setSelectedId(null);
      toast({
        title: `✨ Template généré — ${result.elementCount} éléments`,
        description: "Ajustez le design selon vos besoins.",
      });
    } catch (err: any) {
      toast({
        title: "Erreur d'import",
        description: err.message || "Impossible d'analyser le PDF.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  // ── HTML Import ──────────────────────────────────────────────────────────

  const handleImportHTML = useCallback(async (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Fichier trop lourd", description: "Le fichier HTML doit faire moins de 2 MB.", variant: "destructive" });
      return;
    }
    setIsImportingHTML(true);
    try {
      const htmlContent = await file.text();

      const { data: result, error } = await supabase.functions.invoke("html-to-canvas-template", {
        body: { htmlContent, fileName: file.name },
      });

      if (error) throw new Error(error.message || "Erreur lors de l'analyse IA.");
      if (!result?.success) throw new Error(result?.error || "Erreur lors de l'analyse IA.");

      setConfig(result.config);
      setSelectedId(null);
      toast({
        title: `✨ Template généré — ${result.elementCount} éléments`,
        description: "Design importé depuis le HTML. Ajustez selon vos besoins.",
      });
    } catch (err: any) {
      toast({
        title: "Erreur d'import HTML",
        description: err.message || "Impossible d'analyser le HTML.",
        variant: "destructive",
      });
    } finally {
      setIsImportingHTML(false);
      if (htmlFileInputRef.current) htmlFileInputRef.current.value = "";
    }
  }, []);

  // ── Keyboard shortcut ─────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingTextId) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        const el = config.elements.find(x => x.id === selectedId);
        if (el && !el.locked) deleteElement(selectedId);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && selectedId) {
        e.preventDefault();
        duplicateElement(selectedId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, editingTextId, config.elements, deleteElement, duplicateElement]);

  // ── Mouse interactions (drag + resize) ───────────────────────────────────

  const getCanvasPos = (e: MouseEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top),
    };
  };

  const onElementMouseDown = useCallback((
    e: React.MouseEvent,
    elementId: string,
    mode: "move" | "resize",
    handle?: string,
  ) => {
    const el = config.elements.find(x => x.id === elementId);
    if (!el || el.locked) return;
    if (editingTextId === elementId) return; // don't drag while editing
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(elementId);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    interactionRef.current = {
      mode,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      origX: el.x,
      origY: el.y,
      origW: el.width,
      origH: el.height,
      elementId,
      handle,
    };
  }, [config.elements, editingTextId]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const inter = interactionRef.current;
      if (!inter) return;
      const pos = getCanvasPos(e);
      if (!pos) return;
      const dx = pos.x - inter.startX;
      const dy = pos.y - inter.startY;
      if (inter.mode === "move") {
        updateElement(inter.elementId, {
          x: clamp(inter.origX + dx, 0, CANVAS_W - 10),
          y: clamp(inter.origY + dy, 0, CANVAS_H - 10),
        });
      } else if (inter.mode === "resize") {
        const h = inter.handle || "se";
        let x = inter.origX, y = inter.origY, w = inter.origW, ht = inter.origH;
        if (h.includes("e")) w = clamp(inter.origW + dx, 20, CANVAS_W);
        if (h.includes("s")) ht = clamp(inter.origH + dy, 10, CANVAS_H);
        if (h.includes("w")) { x = inter.origX + dx; w = clamp(inter.origW - dx, 20, CANVAS_W); }
        if (h.includes("n")) { y = inter.origY + dy; ht = clamp(inter.origH - dy, 10, CANVAS_H); }
        updateElement(inter.elementId, { x, y, width: w, height: ht });
      }
    };
    const onMouseUp = () => { interactionRef.current = null; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [updateElement]);

  // ── Canvas drop ───────────────────────────────────────────────────────────

  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const drag = paletteDragRef.current;
    if (!drag) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left - 60, 0, CANVAS_W - 120);
    const y = clamp(e.clientY - rect.top - 20, 0, CANVAS_H - 40);
    if (drag.type === "section") {
      const exists = config.elements.some(el => el.type === "cv-section" && el.sectionId === drag.sectionId);
      if (exists) { toast({ title: "Section déjà présente" }); return; }
      addElement({
        type: "cv-section", sectionId: drag.sectionId,
        x, y, width: 250, height: 140,
        visible: true, locked: false,
        styles: { backgroundColor: "transparent", color: "#1a1a2e", fontSize: 10, fontFamily: "Helvetica, Arial, sans-serif", padding: 12 },
      });
    } else if (drag.type === "element") {
      if (drag.elType === "text") {
        addElement({ type: "text", x, y, width: 200, height: 40, content: "Nouveau texte", visible: true, locked: false, styles: { color: "#1a1a2e", fontSize: 12, backgroundColor: "transparent" } });
      } else if (drag.elType === "shape") {
        addElement({ type: "shape", x, y, width: 150, height: 80, visible: true, locked: false, styles: { backgroundColor: "#0f1b3d" } });
      } else if (drag.elType === "divider") {
        addElement({ type: "divider", x, y, width: 400, height: 2, visible: true, locked: false, styles: { backgroundColor: "#cccccc" } });
      }
    }
    paletteDragRef.current = null;
  };

  // ─── Render element on canvas ─────────────────────────────────────────────

  const renderCanvasElement = (el: CanvasElement) => {
    if (!el.visible && el.visible !== undefined) return null;
    const isSelected = selectedId === el.id;
    const isEditingText = editingTextId === el.id;

    const handleStyle: React.CSSProperties = {
      position: "absolute", width: 8, height: 8,
      background: "white", border: "1.5px solid #3b82f6",
      borderRadius: 2, zIndex: 9999,
    };

    const handles = isSelected && !isEditingText ? (
      <>
        <div style={{ ...handleStyle, top: -4, left: -4, cursor: "nw-resize" }} onMouseDown={e => onElementMouseDown(e, el.id, "resize", "nw")} />
        <div style={{ ...handleStyle, top: -4, left: "50%", transform: "translateX(-50%)", cursor: "n-resize" }} onMouseDown={e => onElementMouseDown(e, el.id, "resize", "n")} />
        <div style={{ ...handleStyle, top: -4, right: -4, cursor: "ne-resize" }} onMouseDown={e => onElementMouseDown(e, el.id, "resize", "ne")} />
        <div style={{ ...handleStyle, top: "50%", right: -4, transform: "translateY(-50%)", cursor: "e-resize" }} onMouseDown={e => onElementMouseDown(e, el.id, "resize", "e")} />
        <div style={{ ...handleStyle, bottom: -4, right: -4, cursor: "se-resize" }} onMouseDown={e => onElementMouseDown(e, el.id, "resize", "se")} />
        <div style={{ ...handleStyle, bottom: -4, left: "50%", transform: "translateX(-50%)", cursor: "s-resize" }} onMouseDown={e => onElementMouseDown(e, el.id, "resize", "s")} />
        <div style={{ ...handleStyle, bottom: -4, left: -4, cursor: "sw-resize" }} onMouseDown={e => onElementMouseDown(e, el.id, "resize", "sw")} />
        <div style={{ ...handleStyle, top: "50%", left: -4, transform: "translateY(-50%)", cursor: "w-resize" }} onMouseDown={e => onElementMouseDown(e, el.id, "resize", "w")} />
      </>
    ) : null;

    const wrapperStyle: React.CSSProperties = {
      position: "absolute",
      left: el.x,
      top: el.y,
      width: el.width,
      height: el.height,
      cursor: el.locked ? "default" : (isEditingText ? "text" : "move"),
      outline: isSelected ? "2px solid #3b82f6" : "none",
      outlineOffset: 1,
      userSelect: isEditingText ? "text" : "none",
      overflow: "hidden",
      zIndex: el.styles.zIndex ?? "auto",
      opacity: el.styles.opacity ?? 1,
    };

    let content: React.ReactNode = null;

    if (el.type === "text") {
      content = (
        <div
          contentEditable={isEditingText}
          suppressContentEditableWarning
          onDoubleClick={() => { if (!el.locked) setEditingTextId(el.id); }}
          onBlur={e => {
            updateElement(el.id, { content: e.currentTarget.textContent || "" });
            setEditingTextId(null);
          }}
          style={{
            width: "100%",
            height: "100%",
            outline: "none",
            color: el.styles.color ?? "#1a1a2e",
            fontSize: el.styles.fontSize ?? 12,
            fontWeight: el.styles.fontWeight ?? "normal",
            fontStyle: el.styles.fontStyle ?? "normal",
            fontFamily: el.styles.fontFamily ?? "Helvetica, Arial, sans-serif",
            textAlign: el.styles.textAlign ?? "left",
            lineHeight: el.styles.lineHeight ?? 1.4,
            letterSpacing: el.styles.letterSpacing ? `${el.styles.letterSpacing}em` : "normal",
            backgroundColor: el.styles.backgroundColor ?? "transparent",
            padding: el.styles.padding ? `${el.styles.padding}px` : "4px",
            borderRadius: el.styles.borderRadius ? `${el.styles.borderRadius}px` : 0,
            border: el.styles.border ?? "none",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "flex-start",
          }}
          dangerouslySetInnerHTML={!isEditingText ? { __html: el.content ?? "" } : undefined}
        >
          {isEditingText ? el.content : undefined}
        </div>
      );
    } else if (el.type === "shape") {
      content = (
        <div style={{
          width: "100%",
          height: "100%",
          backgroundColor: el.styles.backgroundColor ?? "#cccccc",
          borderRadius: el.styles.borderRadius ? `${el.styles.borderRadius}px` : 0,
          border: el.styles.borderStyle && el.styles.borderStyle !== "none"
            ? `${el.styles.borderWidth ?? 1}px ${el.styles.borderStyle} ${el.styles.borderColor ?? "#000"}`
            : (el.styles.border ?? "none"),
        }} />
      );
    } else if (el.type === "divider") {
      content = (
        <div style={{
          width: "100%",
          height: "100%",
          backgroundColor: el.styles.backgroundColor ?? "#cccccc",
          borderRadius: el.styles.borderRadius ? `${el.styles.borderRadius}px` : 0,
        }} />
      );
    } else if (el.type === "image") {
      // Photo placeholder — rendered as a gray block with a user icon and label
      const isPhotoPlaceholder = el.content === "[PHOTO]";
      content = (
        <div style={{
          width: "100%",
          height: "100%",
          backgroundColor: el.styles.backgroundColor ?? "#e0e0e0",
          borderRadius: el.styles.borderRadius ? `${el.styles.borderRadius}px` : 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          border: "1.5px dashed #aaa",
          boxSizing: "border-box",
        }}>
          <User style={{ width: 28, height: 28, color: "#888", opacity: 0.7 }} />
          {isPhotoPlaceholder && (
            <span style={{ fontSize: 9, color: "#888", fontFamily: "Arial, sans-serif", textAlign: "center", lineHeight: 1.3 }}>
              Photo<br />profil
            </span>
          )}
        </div>
      );
    } else if (el.type === "cv-section" && el.sectionId) {
      const Placeholder = SECTION_PLACEHOLDERS[el.sectionId];
      content = (
        <div style={{
          width: "100%",
          height: "100%",
          backgroundColor: el.styles.backgroundColor ?? "transparent",
          overflow: "hidden",
          boxSizing: "border-box",
        }}>
          <Placeholder styles={el.styles} />
        </div>
      );
    }

    return (
      <div
        key={el.id}
        style={wrapperStyle}
        onMouseDown={e => {
          if (!isEditingText) onElementMouseDown(e, el.id, "move");
        }}
        onClick={e => { e.stopPropagation(); setSelectedId(el.id); }}
      >
        {content}
        {handles}
      </div>
    );
  };

  // ─── Right panel ──────────────────────────────────────────────────────────

  const renderRightPanel = () => {
    if (!selectedEl) {
      return (
        <div className="flex flex-col h-full">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Canvas</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <ColorInput label="Fond du canvas" value={config.backgroundColor} onChange={v => setConfig(c => ({ ...c, backgroundColor: v }))} />
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs text-muted-foreground shrink-0">Police globale</Label>
              <select
                value={config.fontFamily}
                onChange={e => setConfig(c => ({ ...c, fontFamily: e.target.value }))}
                className="h-6 text-xs border border-border rounded px-1.5 bg-background text-foreground w-32"
              >
                {FONT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* ── Toggle avec/sans photo ─────────────────────────────────── */}
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Photo de profil</p>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">Template avec photo</Label>
                <button
                  onClick={() => setConfig(c => ({ ...c, has_photo: !c.has_photo }))}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors",
                    config.has_photo ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span className={cn(
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform mt-0.5",
                    config.has_photo ? "translate-x-4 ml-0.5" : "translate-x-0.5"
                  )} />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {config.has_photo ? "✓ Ce template inclut une photo de profil" : "Ce template n'utilise pas de photo"}
              </p>
            </div>

            {/* ── Couverture / Thumbnail ──────────────────────────────────── */}
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Image de couverture</p>
              <p className="text-[10px] text-muted-foreground">Affichée dans la galerie du CV Builder</p>
              {thumbnailUrl ? (
                <div className="relative group">
                  <img src={thumbnailUrl} alt="Couverture" className="w-full h-28 object-cover rounded-md border border-border" />
                  <button
                    onClick={() => setThumbnailUrl(null)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Supprimer
                  </button>
                </div>
              ) : (
                <div
                  className="w-full h-20 border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  onClick={() => thumbnailInputRef.current?.click()}
                >
                  {isUploadingThumb ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Cliquer pour uploader</span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleThumbnailUpload(f); }}
              />
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">Sélectionnez un élément pour modifier ses propriétés</p>
            </div>
          </div>
        </div>
      );
    }

    const el = selectedEl;

    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
            {el.type === "text" ? "Texte" : el.type === "shape" ? "Forme" : el.type === "divider" ? "Ligne" : el.type === "cv-section" ? `Section CV` : "Élément"}
          </p>
          <div className="flex items-center gap-1">
            <button
              title={el.locked ? "Déverrouiller" : "Verrouiller"}
              onClick={() => updateElement(el.id, { locked: !el.locked })}
              className="p-1 rounded hover:bg-muted text-muted-foreground"
            >
              {el.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            </button>
            <button
              title={el.visible === false ? "Afficher" : "Masquer"}
              onClick={() => updateElement(el.id, { visible: el.visible === false ? true : false })}
              className="p-1 rounded hover:bg-muted text-muted-foreground"
            >
              {el.visible === false ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
            <button title="Dupliquer" onClick={() => duplicateElement(el.id)} className="p-1 rounded hover:bg-muted text-muted-foreground">
              <Copy className="h-3 w-3" />
            </button>
            <button title="Ordre ↑" onClick={() => moveZ(el.id, "up")} className="p-1 rounded hover:bg-muted text-muted-foreground">
              <ChevronUp className="h-3 w-3" />
            </button>
            <button title="Ordre ↓" onClick={() => moveZ(el.id, "down")} className="p-1 rounded hover:bg-muted text-muted-foreground">
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">

          {/* Position & Size */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Position & Taille</p>
            <div className="grid grid-cols-2 gap-2">
              <NumInput label="X" value={el.x} onChange={v => updateElement(el.id, { x: v })} max={CANVAS_W} />
              <NumInput label="Y" value={el.y} onChange={v => updateElement(el.id, { y: v })} max={CANVAS_H} />
              <NumInput label="L" value={el.width} onChange={v => updateElement(el.id, { width: v })} min={10} max={CANVAS_W} unit="px" />
              <NumInput label="H" value={el.height} onChange={v => updateElement(el.id, { height: v })} min={5} max={CANVAS_H} unit="px" />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Colors */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Couleurs</p>
            <ColorInput
              label="Fond"
              value={el.styles.backgroundColor ?? "transparent"}
              onChange={v => updateStyle(el.id, { backgroundColor: v })}
            />
            {(el.type === "text" || el.type === "cv-section") && (
              <ColorInput
                label="Texte"
                value={el.styles.color ?? "#1a1a2e"}
                onChange={v => updateStyle(el.id, { color: v })}
              />
            )}
          </div>

          {/* Typography */}
          {(el.type === "text" || el.type === "cv-section") && (
            <>
              <div className="border-t border-border" />
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Typographie</p>
                <SelectInput
                  label="Police"
                  value={el.styles.fontFamily ?? "Helvetica, Arial, sans-serif"}
                  onChange={v => updateStyle(el.id, { fontFamily: v })}
                  options={FONT_OPTIONS}
                />
                <NumInput label="Taille" value={el.styles.fontSize ?? 12} onChange={v => updateStyle(el.id, { fontSize: v })} min={6} max={72} unit="pt" />
                <NumInput label="Hauteur" value={el.styles.lineHeight ?? 1.4} onChange={v => updateStyle(el.id, { lineHeight: v })} min={1} max={3} />
                <NumInput label="Espacement" value={el.styles.letterSpacing ?? 0} onChange={v => updateStyle(el.id, { letterSpacing: v })} min={-0.1} max={1} />
                <NumInput label="Padding" value={el.styles.padding ?? 4} onChange={v => updateStyle(el.id, { padding: v })} min={0} max={60} unit="px" />

                {/* Bold / Italic / Align */}
                <div className="flex items-center gap-1 pt-1">
                  <button
                    onClick={() => updateStyle(el.id, { fontWeight: el.styles.fontWeight === "bold" || el.styles.fontWeight === "700" ? "normal" : "bold" })}
                    className={cn("p-1.5 rounded border text-xs", (el.styles.fontWeight === "bold" || el.styles.fontWeight === "700") ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}
                    title="Gras"
                  ><Bold className="h-3 w-3" /></button>
                  <button
                    onClick={() => updateStyle(el.id, { fontStyle: el.styles.fontStyle === "italic" ? "normal" : "italic" })}
                    className={cn("p-1.5 rounded border text-xs", el.styles.fontStyle === "italic" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}
                    title="Italique"
                  ><Italic className="h-3 w-3" /></button>
                  <div className="w-px h-5 bg-border mx-0.5" />
                  {(["left", "center", "right"] as const).map(align => {
                    const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
                    return (
                      <button
                        key={align}
                        onClick={() => updateStyle(el.id, { textAlign: align })}
                        className={cn("p-1.5 rounded border text-xs", el.styles.textAlign === align ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}
                      ><Icon className="h-3 w-3" /></button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Border */}
          <div className="border-t border-border" />
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Bordure & Forme</p>
            <NumInput label="Radius" value={el.styles.borderRadius ?? 0} onChange={v => updateStyle(el.id, { borderRadius: v })} min={0} max={200} unit="px" />
            <SelectInput
              label="Style bordure"
              value={el.styles.borderStyle ?? "none"}
              onChange={v => updateStyle(el.id, { borderStyle: v })}
              options={[
                { label: "Aucune", value: "none" },
                { label: "Solide", value: "solid" },
                { label: "Tirets", value: "dashed" },
                { label: "Pointillés", value: "dotted" },
              ]}
            />
            {el.styles.borderStyle && el.styles.borderStyle !== "none" && (
              <>
                <ColorInput label="Couleur" value={el.styles.borderColor ?? "#000000"} onChange={v => updateStyle(el.id, { borderColor: v })} />
                <NumInput label="Épaisseur" value={el.styles.borderWidth ?? 1} onChange={v => updateStyle(el.id, { borderWidth: v })} min={1} max={20} unit="px" />
              </>
            )}
          </div>

          {/* Opacity */}
          <div className="border-t border-border" />
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Opacité</p>
            <div className="flex items-center gap-2">
              <input
                type="range" min={0} max={1} step={0.05}
                value={el.styles.opacity ?? 1}
                onChange={e => updateStyle(el.id, { opacity: Number(e.target.value) })}
                className="flex-1 h-1.5 accent-primary"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">{Math.round((el.styles.opacity ?? 1) * 100)}%</span>
            </div>
          </div>

          {/* Delete */}
          <div className="border-t border-border pt-3">
            <Button
              variant="destructive" size="sm" className="w-full"
              onClick={() => deleteElement(el.id)}
              disabled={el.locked}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Supprimer l'élément
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-background overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0 gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/admin/cv-templates")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <LayoutTemplate className="h-4 w-4 text-primary" />
          <Input
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            className="h-7 text-sm font-medium w-48 border-transparent hover:border-border focus:border-border"
            placeholder="Nom du template..."
          />
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {/* Add text */}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"
            onClick={addText}
            draggable
            onDragStart={() => { paletteDragRef.current = { type: "element", elType: "text" }; }}
          >
            <Type className="h-3.5 w-3.5" /> Texte
          </Button>
          {/* Add shape filled */}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"
            onClick={() => addShape(true)}
            draggable
            onDragStart={() => { paletteDragRef.current = { type: "element", elType: "shape" }; }}
          >
            <Square className="h-3.5 w-3.5 fill-current" /> Forme pleine
          </Button>
          {/* Add shape outline */}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"
            onClick={() => addShape(false)}
          >
            <Square className="h-3.5 w-3.5" /> Forme vide
          </Button>
          {/* Add divider */}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"
            onClick={addDivider}
            draggable
            onDragStart={() => { paletteDragRef.current = { type: "element", elType: "divider" }; }}
          >
            <Minus className="h-3.5 w-3.5" /> Ligne
          </Button>

          {/* Separator */}
          <div className="w-px h-5 bg-border mx-1" />

          {/* PDF Import button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleImportPDF(file);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting || isImportingHTML}
            title="Analyser un CV PDF et reproduire son design"
          >
            {isImporting ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyse IA...</>
            ) : (
              <><Upload className="h-3.5 w-3.5" /> Importer PDF IA</>
            )}
          </Button>

          {/* HTML Import button */}
          <input
            ref={htmlFileInputRef}
            type="file"
            accept=".html,.htm"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleImportHTML(file);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 border-green-500/40 text-green-600 hover:bg-green-500/5"
            onClick={() => htmlFileInputRef.current?.click()}
            disabled={isImporting || isImportingHTML}
            title="Importer un template HTML et convertir en canvas éditable"
          >
            {isImportingHTML ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Conversion...</>
            ) : (
              <><Code2 className="h-3.5 w-3.5" /> Importer HTML IA</>
            )}
          </Button>

          {/* Selection actions */}
          {selectedEl && (
            <>
              <div className="w-px h-5 bg-border mx-1" />
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => duplicateElement(selectedEl.id)}>
                <Copy className="h-3 w-3" /> Dupliquer
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => moveZ(selectedEl.id, "up")}>
                <ChevronUp className="h-3 w-3" /> Avant
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => moveZ(selectedEl.id, "down")}>
                <ChevronDown className="h-3 w-3" /> Arrière
              </Button>
              <Button variant="destructive" size="sm" className="h-7 text-xs gap-1" onClick={() => deleteElement(selectedEl.id)} disabled={selectedEl.locked}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate("/admin/cv-templates")}>
            Annuler
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saveMutation.isPending ? "..." : "Sauvegarder"}
          </Button>
        </div>
      </div>

      {/* ── 3-column body ──────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Sections palette */}
        <div className="w-48 shrink-0 border-r border-border bg-card/50 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wide">Sections CV</p>
            <p className="text-[10px] text-muted-foreground">Clic ou glisser sur le canvas</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {(Object.entries(SECTION_META) as [SectionId, typeof SECTION_META[SectionId]][]).map(([id, meta]) => {
              const Icon = meta.icon;
              const placed = config.elements.some(e => e.type === "cv-section" && e.sectionId === id);
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => { paletteDragRef.current = { type: "section", sectionId: id }; }}
                  onClick={() => addSection(id)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer transition-colors group select-none",
                    placed
                      ? "border-primary/30 bg-primary/5 text-primary"
                      : "border-dashed border-border bg-background hover:border-primary hover:bg-primary/5 hover:text-primary"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium leading-tight truncate">{meta.label}</p>
                  </div>
                  {placed && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Layers list */}
          <div className="border-t border-border px-3 py-2">
            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wide mb-1.5">Calques</p>
            <div className="space-y-0.5 max-h-32 overflow-y-auto">
              {[...config.elements].reverse().map((el, i) => (
                <div
                  key={el.id}
                  onClick={() => setSelectedId(el.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] cursor-pointer",
                    selectedId === el.id ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  {el.type === "text" ? <Type className="h-2.5 w-2.5 shrink-0" /> :
                   el.type === "shape" ? <Square className="h-2.5 w-2.5 shrink-0" /> :
                   el.type === "divider" ? <Minus className="h-2.5 w-2.5 shrink-0" /> :
                   el.type === "cv-section" ? <FileText className="h-2.5 w-2.5 shrink-0" /> : null}
                  <span className="truncate flex-1">
                    {el.type === "text" ? (el.content?.slice(0, 15) || "Texte") :
                     el.type === "cv-section" ? SECTION_META[el.sectionId!]?.label :
                     el.type === "shape" ? "Forme" : "Ligne"}
                  </span>
                  {el.locked && <Lock className="h-2 w-2 shrink-0 text-muted-foreground" />}
                </div>
              ))}
              {config.elements.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-2">Canvas vide</p>
              )}
            </div>
          </div>
        </div>

        {/* CENTER: Canvas */}
        <div
          className="flex-1 overflow-auto bg-muted/40 flex items-start justify-center p-8"
          onClick={() => { setSelectedId(null); setEditingTextId(null); }}
        >
          <div className="relative shadow-2xl" style={{ width: CANVAS_W, height: CANVAS_H, flexShrink: 0 }}>
            {/* The A4 canvas */}
            <div
              ref={canvasRef}
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                backgroundColor: config.backgroundColor,
                position: "relative",
                overflow: "hidden",
                fontFamily: config.fontFamily,
              }}
              onDragOver={e => e.preventDefault()}
              onDrop={onCanvasDrop}
            >
              {/* Render all elements */}
              {config.elements.map(renderCanvasElement)}

              {/* Empty state */}
              {config.elements.length === 0 && !isImporting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
                  <Plus className="h-12 w-12 mb-3 opacity-40" />
                  <p className="text-sm font-medium opacity-60">Canvas vide</p>
                  <p className="text-xs opacity-40 mt-1">Ajoutez des éléments via la toolbar ou glissez depuis le panneau gauche</p>
                  <p className="text-xs opacity-30 mt-2">💡 Ou cliquez sur <strong>Importer PDF IA</strong> pour reproduire un CV existant</p>
                </div>
              )}

              {/* AI Import overlay */}
              {isImporting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50 pointer-events-none">
                  <div className="flex flex-col items-center gap-4 bg-card border border-border rounded-xl px-8 py-6 shadow-xl">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">Analyse IA en cours...</p>
                      <p className="text-xs text-muted-foreground mt-1">Gemini Vision analyse le design de votre CV</p>
                      <p className="text-xs text-muted-foreground">Cela peut prendre 15-30 secondes</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
            {/* A4 dimensions indicator */}
            <div className="absolute -bottom-6 left-0 right-0 flex justify-center">
              <span className="text-[10px] text-muted-foreground">A4 · 595 × 842 px</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Properties panel */}
        <div className="w-56 shrink-0 border-l border-border bg-card/50 overflow-hidden flex flex-col">
          {renderRightPanel()}
        </div>
      </div>
    </div>
  );
};
