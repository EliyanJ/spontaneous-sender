// ── Types legacy canvas-v2 (conservés pour la rétrocompatibilité) ──────────────

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
  has_photo?: boolean;
}

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
