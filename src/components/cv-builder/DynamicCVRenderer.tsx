import React from "react";
import type {
  TemplateConfig, TemplateSection, SectionId,
  CanvasConfig, CanvasElement,
} from "@/pages/Admin/AdminCVTemplateBuilder";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CVData {
  firstName?: string;
  lastName?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  address?: string;
  summary?: string;
  targetJobs?: string;
  experiences?: Array<{
    role?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    current?: boolean;
  }>;
  entrepreneurship?: Array<{
    projectName?: string;
    role?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  skills?: string[];
  education?: Array<{
    degree?: string;
    school?: string;
    year?: string;
    description?: string;
  }>;
  languages?: Array<{ language?: string; level?: string }>;
}

// DynamicCVRenderer accepts either the old TemplateConfig or the new CanvasConfig
type AnyConfig = TemplateConfig | CanvasConfig;

interface DynamicCVRendererProps {
  config: AnyConfig;
  cvData: CVData;
  scale?: number;
  /** Photo URL de l'utilisateur (pour les éléments type="image" content="[PHOTO]") */
  photoUrl?: string;
  /** Couleur principale (pour les sections canvas-v2) */
  primaryColor?: string;
  /** Couleur d'accent (pour les titres de section canvas-v2) */
  accentColor?: string;
}

// ─── Type guard ───────────────────────────────────────────────────────────────

function isCanvasConfig(c: AnyConfig): c is CanvasConfig {
  return (c as CanvasConfig).version === "canvas-v2" && Array.isArray((c as CanvasConfig).elements);
}

// ─── Section title helper ─────────────────────────────────────────────────────

const SectionTitle: React.FC<{ label: string; accentColor?: string; textColor?: string; fontSize?: number }> = ({
  label, accentColor = "#c9a84c", textColor, fontSize = 10,
}) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontWeight: 700, fontSize: fontSize + 1, letterSpacing: "0.03em", textTransform: "uppercase", color: textColor }}>{label}</div>
    <div style={{ height: 2, width: 32, background: accentColor, marginTop: 3, borderRadius: 1 }} />
  </div>
);

// ─── Section renderers (legacy layout) ───────────────────────────────────────

const renderContact = (cvData: CVData, section: TemplateSection) => {
  const { styles } = section;
  const name = [cvData.firstName, cvData.lastName].filter(Boolean).join(" ") || "Prénom Nom";
  return (
    <div style={{ padding: styles.padding }}>
      <div style={{ fontWeight: 700, fontSize: styles.fontSize + 4, lineHeight: 1.2 }}>{name}</div>
      {cvData.title && <div style={{ fontSize: styles.fontSize + 1, opacity: 0.85, marginTop: 3 }}>{cvData.title}</div>}
      <div style={{ marginTop: 8, fontSize: styles.fontSize - 1, opacity: 0.8, lineHeight: 1.8 }}>
        {cvData.email && <div>✉ {cvData.email}</div>}
        {cvData.phone && <div>☎ {cvData.phone}</div>}
        {cvData.linkedin && <div>in {cvData.linkedin}</div>}
        {cvData.address && <div>📍 {cvData.address}</div>}
      </div>
    </div>
  );
};

const renderSummary = (cvData: CVData, section: TemplateSection) => {
  if (!cvData.summary) return null;
  const { styles } = section;
  return (
    <div style={{ padding: styles.padding }}>
      <p style={{ fontSize: styles.fontSize, lineHeight: 1.6, margin: 0 }}>{cvData.summary}</p>
    </div>
  );
};

const renderTargetJobs = (cvData: CVData, section: TemplateSection, accentColor: string) => {
  if (!cvData.targetJobs) return null;
  const { styles } = section;
  return (
    <div style={{ padding: styles.padding }}>
      <SectionTitle label="Métiers recherchés" accentColor={accentColor} textColor={styles.textColor} fontSize={styles.fontSize} />
      <p style={{ fontSize: styles.fontSize, margin: 0, lineHeight: 1.6 }}>{cvData.targetJobs}</p>
    </div>
  );
};

const renderExperiences = (cvData: CVData, section: TemplateSection, accentColor: string) => {
  const exps = (cvData.experiences || []).filter(e => e.role || e.company);
  if (!exps.length) return null;
  const { styles } = section;
  return (
    <div style={{ padding: styles.padding }}>
      <SectionTitle label="Expériences professionnelles" accentColor={accentColor} textColor={styles.textColor} fontSize={styles.fontSize} />
      {exps.map((exp, i) => (
        <div key={i} style={{ marginBottom: i < exps.length - 1 ? 12 : 0 }}>
          <div style={{ fontWeight: 600, fontSize: styles.fontSize + 0.5 }}>{exp.role}</div>
          <div style={{ fontSize: styles.fontSize - 0.5, opacity: 0.75, marginBottom: 3 }}>
            {exp.company}{exp.company && (exp.startDate || exp.endDate) ? " · " : ""}{exp.startDate}{exp.startDate && (exp.current ? " – Présent" : exp.endDate ? ` – ${exp.endDate}` : "")}
          </div>
          {exp.description && <p style={{ fontSize: styles.fontSize - 0.5, margin: 0, lineHeight: 1.5, opacity: 0.85 }}>{exp.description}</p>}
        </div>
      ))}
    </div>
  );
};

const renderEntrepreneurship = (cvData: CVData, section: TemplateSection, accentColor: string) => {
  const projects = (cvData.entrepreneurship || []).filter(e => e.projectName || e.role);
  if (!projects.length) return null;
  const { styles } = section;
  return (
    <div style={{ padding: styles.padding }}>
      <SectionTitle label="Parcours entrepreneurial" accentColor={accentColor} textColor={styles.textColor} fontSize={styles.fontSize} />
      {projects.map((proj, i) => (
        <div key={i} style={{ marginBottom: i < projects.length - 1 ? 10 : 0 }}>
          <div style={{ fontWeight: 600, fontSize: styles.fontSize + 0.5 }}>{proj.projectName}</div>
          <div style={{ fontSize: styles.fontSize - 0.5, opacity: 0.75, marginBottom: 2 }}>
            {proj.role}{proj.role && proj.startDate ? " · " : ""}{proj.startDate}{proj.endDate ? ` – ${proj.endDate}` : ""}
          </div>
          {proj.description && <p style={{ fontSize: styles.fontSize - 0.5, margin: 0, lineHeight: 1.5, opacity: 0.85 }}>{proj.description}</p>}
        </div>
      ))}
    </div>
  );
};

const renderSkills = (cvData: CVData, section: TemplateSection, accentColor: string) => {
  const skills = cvData.skills || [];
  if (!skills.length) return null;
  const { styles } = section;
  return (
    <div style={{ padding: styles.padding }}>
      <SectionTitle label="Compétences" accentColor={accentColor} textColor={styles.textColor} fontSize={styles.fontSize} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {skills.map((skill, i) => (
          <span key={i} style={{ fontSize: styles.fontSize - 1.5, padding: "2px 8px", borderRadius: 10, background: `${accentColor}25`, color: styles.textColor, border: `1px solid ${accentColor}40` }}>
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
};

const renderEducation = (cvData: CVData, section: TemplateSection, accentColor: string) => {
  const edu = (cvData.education || []).filter(e => e.degree || e.school);
  if (!edu.length) return null;
  const { styles } = section;
  return (
    <div style={{ padding: styles.padding }}>
      <SectionTitle label="Formation & Certifications" accentColor={accentColor} textColor={styles.textColor} fontSize={styles.fontSize} />
      {edu.map((e, i) => (
        <div key={i} style={{ marginBottom: i < edu.length - 1 ? 8 : 0 }}>
          <div style={{ fontWeight: 600, fontSize: styles.fontSize }}>{e.degree}</div>
          <div style={{ fontSize: styles.fontSize - 0.5, opacity: 0.75 }}>{e.school}{e.school && e.year ? " · " : ""}{e.year}</div>
          {e.description && <p style={{ fontSize: styles.fontSize - 1, margin: "2px 0 0", lineHeight: 1.4, opacity: 0.8 }}>{e.description}</p>}
        </div>
      ))}
    </div>
  );
};

const renderLanguages = (cvData: CVData, section: TemplateSection, accentColor: string) => {
  const langs = (cvData.languages || []).filter(l => l.language);
  if (!langs.length) return null;
  const { styles } = section;
  return (
    <div style={{ padding: styles.padding }}>
      <SectionTitle label="Langues" accentColor={accentColor} textColor={styles.textColor} fontSize={styles.fontSize} />
      {langs.map((l, i) => (
        <div key={i} style={{ fontSize: styles.fontSize, display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
          <span>{l.language}</span>
          {l.level && <span style={{ opacity: 0.7 }}>{l.level}</span>}
        </div>
      ))}
    </div>
  );
};

// ─── Section dispatcher (legacy) ──────────────────────────────────────────────

const renderSection = (section: TemplateSection, cvData: CVData, config: TemplateConfig): React.ReactNode => {
  const { styles } = section;
  const borderStyle = styles.borderBottom !== "none"
    ? `${styles.borderBottomWidth}px ${styles.borderBottom} ${styles.borderBottomColor}`
    : undefined;
  const wrapperStyle: React.CSSProperties = {
    background: styles.bg === "transparent" ? "transparent" : styles.bg,
    color: styles.textColor,
    borderBottom: borderStyle,
    borderRadius: styles.borderRadius ? styles.borderRadius : undefined,
    fontFamily: config.fontFamily,
    fontSize: styles.fontSize,
  };
  let content: React.ReactNode = null;
  switch (section.id as SectionId) {
    case "contact":          content = renderContact(cvData, section); break;
    case "summary":          content = renderSummary(cvData, section); break;
    case "target_jobs":      content = renderTargetJobs(cvData, section, config.accentColor); break;
    case "experiences":      content = renderExperiences(cvData, section, config.accentColor); break;
    case "entrepreneurship": content = renderEntrepreneurship(cvData, section, config.accentColor); break;
    case "skills":           content = renderSkills(cvData, section, config.accentColor); break;
    case "education":        content = renderEducation(cvData, section, config.accentColor); break;
    case "languages":        content = renderLanguages(cvData, section, config.accentColor); break;
  }
  if (!content) return null;
  return <div key={section.id} style={wrapperStyle}>{content}</div>;
};

// ─── Canvas element renderer (new v2) ─────────────────────────────────────────

const renderCanvasElementForExport = (
  el: CanvasElement,
  cvData: CVData,
  photoUrl?: string,
  accentColor?: string,
): React.ReactNode => {
  if (el.visible === false) return null;
  const style: React.CSSProperties = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    opacity: el.styles.opacity ?? 1,
    zIndex: el.styles.zIndex ?? "auto",
    overflow: "hidden",
  };

  if (el.type === "text") {
    return (
      <div key={el.id} style={{
        ...style,
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
        border: el.styles.borderStyle && el.styles.borderStyle !== "none"
          ? `${el.styles.borderWidth ?? 1}px ${el.styles.borderStyle} ${el.styles.borderColor ?? "#000"}`
          : (el.styles.border ?? "none"),
        wordBreak: "break-word",
        whiteSpace: "pre-wrap",
        boxSizing: "border-box",
      }}>
        {el.content ?? ""}
      </div>
    );
  }

  if (el.type === "shape") {
    return (
      <div key={el.id} style={{
        ...style,
        backgroundColor: el.styles.backgroundColor ?? "#cccccc",
        borderRadius: el.styles.borderRadius ? `${el.styles.borderRadius}px` : 0,
        border: el.styles.borderStyle && el.styles.borderStyle !== "none"
          ? `${el.styles.borderWidth ?? 1}px ${el.styles.borderStyle} ${el.styles.borderColor ?? "#000"}`
          : (el.styles.border ?? "none"),
      }} />
    );
  }

  if (el.type === "divider") {
    return (
      <div key={el.id} style={{
        ...style,
        backgroundColor: el.styles.backgroundColor ?? "#cccccc",
        borderRadius: el.styles.borderRadius ? `${el.styles.borderRadius}px` : 0,
      }} />
    );
  }

  // ── Photo placeholder → rendu de la vraie photo utilisateur ──────────────────
  if (el.type === "image") {
    const isPhoto = el.content === "[PHOTO]";
    if (isPhoto && photoUrl) {
      return (
        <div key={el.id} style={{ ...style, borderRadius: el.styles.borderRadius ? `${el.styles.borderRadius}px` : "50%" }}>
          <img
            src={photoUrl}
            alt="Photo profil"
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit", display: "block" }}
          />
        </div>
      );
    }
    // Pas de photo : placeholder neutre (transparent, invisible dans le rendu final)
    return (
      <div key={el.id} style={{
        ...style,
        backgroundColor: "transparent",
        borderRadius: el.styles.borderRadius ? `${el.styles.borderRadius}px` : "50%",
      }} />
    );
  }

  if (el.type === "cv-section" && el.sectionId) {
    const sectionId = el.sectionId as SectionId;
    // Utiliser accentColor de designOptions si disponible, sinon fallback sur styles de l'élément
    const resolvedAccent = accentColor ?? el.styles.backgroundColor ?? "#c9a84c";

    const sectionStyle: React.CSSProperties = {
      ...style,
      backgroundColor: el.styles.backgroundColor ?? "transparent",
      color: el.styles.color ?? "#1a1a2e",
      fontFamily: el.styles.fontFamily ?? "Helvetica, Arial, sans-serif",
      fontSize: el.styles.fontSize ?? 10,
      boxSizing: "border-box",
    };

    const legacySection: TemplateSection = {
      id: sectionId,
      zone: "main",
      order: 0,
      enabled: true,
      required: false,
      styles: {
        bg: el.styles.backgroundColor ?? "transparent",
        textColor: el.styles.color ?? "#1a1a2e",
        fontSize: el.styles.fontSize ?? 10,
        padding: el.styles.padding ?? 12,
        borderBottom: "none",
        borderBottomColor: "#e5e7eb",
        borderBottomWidth: 1,
        borderRadius: el.styles.borderRadius ?? 0,
      },
    };

    const legacyConfig: TemplateConfig = {
      layout: "full",
      sidebarWidth: 0,
      sidebarBg: "#ffffff",
      mainBg: "#ffffff",
      fontFamily: el.styles.fontFamily ?? "Helvetica, Arial, sans-serif",
      primaryColor: "#0f1b3d",
      accentColor: resolvedAccent,
      textColor: el.styles.color ?? "#1a1a2e",
      sections: [legacySection],
    };

    return (
      <div key={el.id} style={sectionStyle}>
        {renderSection(legacySection, cvData, legacyConfig)}
      </div>
    );
  }

  return null;
};

// ─── Main renderer ────────────────────────────────────────────────────────────

export const DynamicCVRenderer: React.FC<DynamicCVRendererProps> = ({
  config, cvData, scale = 1, photoUrl, primaryColor, accentColor,
}) => {

  // ── New canvas v2 format ──
  if (isCanvasConfig(config)) {
    return (
      <div style={{
        width: config.canvasWidth,
        height: config.canvasHeight,
        backgroundColor: config.backgroundColor,
        position: "relative",
        overflow: "hidden",
        fontFamily: config.fontFamily,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: scale !== 1 ? "top left" : undefined,
      }}>
        {config.elements.map(el => renderCanvasElementForExport(el, cvData, photoUrl, accentColor))}
      </div>
    );
  }

  // ── Legacy format (sections-based) ──
  const legacyConfig = config as TemplateConfig;

  const sidebarSections = legacyConfig.sections
    .filter(s => s.zone === "sidebar" && s.enabled)
    .sort((a, b) => a.order - b.order);

  const mainSections = legacyConfig.sections
    .filter(s => s.zone === "main" && s.enabled)
    .sort((a, b) => a.order - b.order);

  const allSections = legacyConfig.sections
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <div style={{
      width: 595,
      minHeight: 842,
      fontFamily: legacyConfig.fontFamily,
      color: legacyConfig.textColor,
      transform: scale !== 1 ? `scale(${scale})` : undefined,
      transformOrigin: scale !== 1 ? "top left" : undefined,
      display: "flex",
    }}>
      {legacyConfig.layout === "sidebar" ? (
        <>
          <div style={{ width: legacyConfig.sidebarWidth, background: legacyConfig.sidebarBg, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 842 }}>
            {sidebarSections.map(section => renderSection(section, cvData, legacyConfig))}
          </div>
          <div style={{ flex: 1, background: legacyConfig.mainBg, display: "flex", flexDirection: "column", minHeight: 842 }}>
            {mainSections.map(section => renderSection(section, cvData, legacyConfig))}
          </div>
        </>
      ) : (
        <div style={{ flex: 1, background: legacyConfig.mainBg, display: "flex", flexDirection: "column", minHeight: 842 }}>
          {allSections.map(section => renderSection(section, cvData, legacyConfig))}
        </div>
      )}
    </div>
  );
};
