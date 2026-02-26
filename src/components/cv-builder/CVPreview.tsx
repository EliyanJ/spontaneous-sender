import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { type CVData, type CVDesignOptions, type TemplateId } from "@/lib/cv-templates";

interface CVPreviewProps {
  cvData: CVData;
  templateId?: TemplateId;
  designOptions?: CVDesignOptions;
}

const placeholder = (text: string) => (
  <span style={{ color: "#bbb", fontStyle: "italic" }}>{text}</span>
);

// ─── TEMPLATE: CLASSIC ──────────────────────────────────────────────────────
const ClassicTemplate = ({ cvData, d }: { cvData: CVData; d: CVDesignOptions }) => {
  const allSkills = [...cvData.skills.technical, ...cvData.skills.soft];
  return (
    <div className="cv-page" style={{ display: "flex", minHeight: "297mm", fontFamily: "'Georgia', serif", fontSize: "10pt", color: d.textColor, background: "#fff" }}>
      {/* Sidebar */}
      <div style={{ width: "72mm", background: d.primaryColor, color: "#fff", padding: "28px 20px", display: "flex", flexDirection: "column", gap: "20px", flexShrink: 0 }}>
        {d.photoUrl && (
          <div style={{ textAlign: "center" }}>
            <img src={d.photoUrl} alt="Photo" style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: `3px solid ${d.accentColor}` }} />
          </div>
        )}
        <div>
          <p style={{ fontSize: "18pt", fontWeight: 700, lineHeight: 1.2, marginBottom: 4 }}>
            {cvData.personalInfo.firstName || cvData.personalInfo.lastName
              ? `${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`
              : placeholder("Prénom Nom")}
          </p>
          <p style={{ fontSize: "9pt", color: d.accentColor, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>
            {cvData.personalInfo.title || placeholder("Titre")}
          </p>
          <div style={{ fontSize: "8pt", color: "#ccc", lineHeight: 1.8 }}>
            {cvData.personalInfo.email && <div>{cvData.personalInfo.email}</div>}
            {cvData.personalInfo.phone && <div>{cvData.personalInfo.phone}</div>}
            {cvData.personalInfo.address && <div>{cvData.personalInfo.address}</div>}
            {cvData.personalInfo.linkedin && <div>{cvData.personalInfo.linkedin}</div>}
          </div>
        </div>
        {allSkills.length > 0 && (
          <div>
            <div style={{ fontSize: "8.5pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", borderBottom: `1px solid ${d.accentColor}`, paddingBottom: 4, marginBottom: 8, color: d.accentColor }}>Compétences</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {allSkills.map((s, i) => <span key={i} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 3, padding: "2px 6px", fontSize: "7.5pt" }}>{s}</span>)}
            </div>
          </div>
        )}
        {cvData.languages.some(l => l.name) && (
          <div>
            <div style={{ fontSize: "8.5pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", borderBottom: `1px solid ${d.accentColor}`, paddingBottom: 4, marginBottom: 8, color: d.accentColor }}>Langues</div>
            {cvData.languages.filter(l => l.name).map((l, i) => (
              <div key={i} style={{ fontSize: "8.5pt", marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{l.name}</span>
                {l.level && <span style={{ color: "#aaa" }}> — {l.level}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "28px 24px" }}>
        {cvData.summary && (
          <div style={{ borderLeft: `3px solid ${d.accentColor}`, paddingLeft: 12, marginBottom: 20, fontStyle: "italic", fontSize: "9.5pt", color: "#444", lineHeight: 1.6 }}>
            {cvData.summary}
          </div>
        )}
        <SectionTitle label="Expériences Professionnelles" color={d.primaryColor} accentColor={d.accentColor} />
        {cvData.experiences.filter(e => e.role || e.company).map((exp, i) => (
          <ExpItem key={i} exp={exp} accentColor={d.accentColor} />
        ))}
        <SectionTitle label="Formation" color={d.primaryColor} accentColor={d.accentColor} />
        {cvData.education.filter(e => e.degree || e.school).map((edu, i) => (
          <EduItem key={i} edu={edu} />
        ))}
      </div>
    </div>
  );
};

// ─── TEMPLATE: DARK ─────────────────────────────────────────────────────────
const DarkTemplate = ({ cvData, d }: { cvData: CVData; d: CVDesignOptions }) => {
  const allSkills = [...cvData.skills.technical, ...cvData.skills.soft];
  return (
    <div className="cv-page" style={{ display: "flex", minHeight: "297mm", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "10pt", color: d.textColor, background: d.primaryColor }}>
      {/* Sidebar */}
      <div style={{ width: "70mm", background: "rgba(0,0,0,0.4)", color: d.textColor, padding: "28px 20px", borderRight: `2px solid ${d.accentColor}`, flexShrink: 0 }}>
        {d.photoUrl && (
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <img src={d.photoUrl} alt="Photo" style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: `3px solid ${d.accentColor}` }} />
          </div>
        )}
        <p style={{ fontSize: "18pt", fontWeight: 700, lineHeight: 1.2, marginBottom: 4 }}>
          {cvData.personalInfo.firstName}<br />{cvData.personalInfo.lastName}
        </p>
        <p style={{ fontSize: "9pt", color: d.accentColor, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16 }}>
          {cvData.personalInfo.title || placeholder("Titre")}
        </p>
        <div style={{ fontSize: "8pt", opacity: 0.7, lineHeight: 1.9, marginBottom: 20 }}>
          {cvData.personalInfo.email && <div>{cvData.personalInfo.email}</div>}
          {cvData.personalInfo.phone && <div>{cvData.personalInfo.phone}</div>}
          {cvData.personalInfo.address && <div>{cvData.personalInfo.address}</div>}
        </div>
        {allSkills.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: "8pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: d.accentColor, marginBottom: 8 }}>Compétences</div>
            {allSkills.map((s, i) => (
              <div key={i} style={{ fontSize: "8pt", padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{s}</div>
            ))}
          </div>
        )}
        {cvData.languages.some(l => l.name) && (
          <div>
            <div style={{ fontSize: "8pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: d.accentColor, marginBottom: 8 }}>Langues</div>
            {cvData.languages.filter(l => l.name).map((l, i) => (
              <div key={i} style={{ fontSize: "8.5pt", marginBottom: 4 }}>{l.name}{l.level ? ` — ${l.level}` : ""}</div>
            ))}
          </div>
        )}
      </div>
      {/* Main */}
      <div style={{ flex: 1, padding: "28px 24px" }}>
        {cvData.summary && (
          <p style={{ fontSize: "9.5pt", opacity: 0.8, lineHeight: 1.7, marginBottom: 24, borderLeft: `3px solid ${d.accentColor}`, paddingLeft: 12 }}>{cvData.summary}</p>
        )}
        <DarkSectionTitle label="Expériences" accentColor={d.accentColor} />
        {cvData.experiences.filter(e => e.role || e.company).map((exp, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontWeight: 700, fontSize: "10pt" }}>{exp.role}</span>
              <span style={{ fontSize: "8pt", opacity: 0.6 }}>{exp.dates}</span>
            </div>
            <div style={{ color: d.accentColor, fontSize: "9pt", marginBottom: 4 }}>{exp.company}</div>
            {exp.bullets.filter(Boolean).length > 0 && (
              <ul style={{ paddingLeft: 16, margin: 0 }}>
                {exp.bullets.filter(Boolean).map((b, bi) => <li key={bi} style={{ fontSize: "8.5pt", marginBottom: 2, opacity: 0.8 }}>{b}</li>)}
              </ul>
            )}
          </div>
        ))}
        <DarkSectionTitle label="Formation" accentColor={d.accentColor} />
        {cvData.education.filter(e => e.degree || e.school).map((edu, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: "9.5pt" }}>{edu.degree}</div>
            <div style={{ fontSize: "9pt", opacity: 0.7 }}>{edu.school} {edu.dates && `· ${edu.dates}`}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── TEMPLATE: LIGHT ────────────────────────────────────────────────────────
const LightTemplate = ({ cvData, d }: { cvData: CVData; d: CVDesignOptions }) => {
  const allSkills = [...cvData.skills.technical, ...cvData.skills.soft];
  return (
    <div className="cv-page" style={{ minHeight: "297mm", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "10pt", color: d.textColor, background: "#fff" }}>
      {/* Header */}
      <div style={{ background: d.primaryColor, color: "#fff", padding: "28px 36px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {d.photoUrl && (
            <img src={d.photoUrl} alt="Photo" style={{ width: "70px", height: "70px", borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.5)" }} />
          )}
          <div>
            <p style={{ fontSize: "22pt", fontWeight: 700 }}>
              {cvData.personalInfo.firstName || cvData.personalInfo.lastName
                ? `${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`
                : placeholder("Prénom Nom")}
            </p>
            <p style={{ fontSize: "11pt", opacity: 0.85, marginTop: 2 }}>{cvData.personalInfo.title || placeholder("Titre du poste")}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, fontSize: "8.5pt", opacity: 0.85 }}>
          {cvData.personalInfo.email && <span>{cvData.personalInfo.email}</span>}
          {cvData.personalInfo.phone && <span>· {cvData.personalInfo.phone}</span>}
          {cvData.personalInfo.address && <span>· {cvData.personalInfo.address}</span>}
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: "24px 36px" }}>
        {cvData.summary && (
          <div style={{ background: `${d.primaryColor}15`, borderLeft: `4px solid ${d.primaryColor}`, padding: "10px 14px", marginBottom: 20, fontSize: "9.5pt", lineHeight: 1.6, borderRadius: "0 6px 6px 0" }}>
            {cvData.summary}
          </div>
        )}
        <LightSectionTitle label="Expériences Professionnelles" color={d.primaryColor} />
        {cvData.experiences.filter(e => e.role || e.company).map((exp, i) => (
          <ExpItem key={i} exp={exp} accentColor={d.primaryColor} />
        ))}
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ flex: 1 }}>
            <LightSectionTitle label="Formation" color={d.primaryColor} />
            {cvData.education.filter(e => e.degree || e.school).map((edu, i) => (
              <EduItem key={i} edu={edu} />
            ))}
          </div>
          <div style={{ flex: 1 }}>
            {allSkills.length > 0 && (
              <>
                <LightSectionTitle label="Compétences" color={d.primaryColor} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {allSkills.map((s, i) => (
                    <span key={i} style={{ background: `${d.primaryColor}15`, border: `1px solid ${d.primaryColor}30`, borderRadius: 4, padding: "2px 8px", fontSize: "8pt" }}>{s}</span>
                  ))}
                </div>
              </>
            )}
            {cvData.languages.some(l => l.name) && (
              <>
                <LightSectionTitle label="Langues" color={d.primaryColor} />
                {cvData.languages.filter(l => l.name).map((l, i) => (
                  <div key={i} style={{ fontSize: "9pt", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{l.name}</span>{l.level && <span style={{ color: "#666" }}> — {l.level}</span>}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── TEMPLATE: GEO ──────────────────────────────────────────────────────────
const GeoTemplate = ({ cvData, d }: { cvData: CVData; d: CVDesignOptions }) => {
  const allSkills = [...cvData.skills.technical, ...cvData.skills.soft];
  return (
    <div className="cv-page" style={{ minHeight: "297mm", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: "10pt", color: d.textColor, background: "#fff" }}>
      {/* Geometric header */}
      <div style={{ background: d.primaryColor, padding: "24px 36px", position: "relative", overflow: "hidden", minHeight: "100px" }}>
        {/* Geometric shapes */}
        <div style={{ position: "absolute", top: -20, right: 120, width: 100, height: 100, background: "rgba(255,255,255,0.08)", transform: "rotate(45deg)" }} />
        <div style={{ position: "absolute", top: 10, right: 60, width: 60, height: 60, background: "rgba(255,255,255,0.06)", transform: "rotate(30deg)" }} />
        <div style={{ position: "absolute", bottom: -30, right: 180, width: 80, height: 80, background: "rgba(255,255,255,0.05)", transform: "rotate(20deg)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <div style={{ color: "#fff" }}>
            <p style={{ fontSize: "22pt", fontWeight: 700, lineHeight: 1.2 }}>
              {cvData.personalInfo.firstName || cvData.personalInfo.lastName
                ? `${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`
                : placeholder("Prénom Nom")}
            </p>
            <p style={{ fontSize: "10pt", color: d.accentColor, letterSpacing: "3px", textTransform: "uppercase", marginTop: 4, filter: "brightness(2)" }}>
              {cvData.personalInfo.title || placeholder("Titre")}
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: "8.5pt", opacity: 0.8 }}>
              {cvData.personalInfo.email && <span>{cvData.personalInfo.email}</span>}
              {cvData.personalInfo.phone && <span>· {cvData.personalInfo.phone}</span>}
              {cvData.personalInfo.address && <span>· {cvData.personalInfo.address}</span>}
            </div>
          </div>
          {d.photoUrl && (
            <img src={d.photoUrl} alt="Photo" style={{ width: "75px", height: "75px", objectFit: "cover", border: `3px solid ${d.accentColor}`, flexShrink: 0 }} />
          )}
        </div>
      </div>
      {/* Accent bar */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${d.accentColor}, ${d.primaryColor})` }} />
      {/* Body 2 cols */}
      <div style={{ display: "flex", padding: "20px 36px", gap: 24 }}>
        <div style={{ flex: 2 }}>
          {cvData.summary && (
            <p style={{ fontSize: "9.5pt", lineHeight: 1.7, marginBottom: 18, color: "#555" }}>{cvData.summary}</p>
          )}
          <GeoSectionTitle label="Expériences" accentColor={d.accentColor} />
          {cvData.experiences.filter(e => e.role || e.company).map((exp, i) => (
            <ExpItem key={i} exp={exp} accentColor={d.accentColor} />
          ))}
          <GeoSectionTitle label="Formation" accentColor={d.accentColor} />
          {cvData.education.filter(e => e.degree || e.school).map((edu, i) => (
            <EduItem key={i} edu={edu} />
          ))}
        </div>
        <div style={{ flex: 1 }}>
          {allSkills.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <GeoSectionTitle label="Compétences" accentColor={d.accentColor} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {allSkills.map((s, i) => (
                  <div key={i} style={{ fontSize: "8.5pt", padding: "3px 8px", background: `${d.accentColor}15`, borderLeft: `3px solid ${d.accentColor}`, borderRadius: "0 4px 4px 0" }}>{s}</div>
                ))}
              </div>
            </div>
          )}
          {cvData.languages.some(l => l.name) && (
            <div>
              <GeoSectionTitle label="Langues" accentColor={d.accentColor} />
              {cvData.languages.filter(l => l.name).map((l, i) => (
                <div key={i} style={{ fontSize: "8.5pt", marginBottom: 6 }}>
                  <div style={{ fontWeight: 700 }}>{l.name}</div>
                  {l.level && <div style={{ fontSize: "8pt", color: "#666" }}>{l.level}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Shared sub-components ───────────────────────────────────────────────────
const SectionTitle = ({ label, color, accentColor }: { label: string; color: string; accentColor: string }) => (
  <div style={{ fontSize: "10pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color, borderBottom: `2px solid ${color}`, paddingBottom: 3, marginBottom: 10, marginTop: 16 }}>{label}</div>
);

const DarkSectionTitle = ({ label, accentColor }: { label: string; accentColor: string }) => (
  <div style={{ fontSize: "9pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "3px", color: accentColor, marginBottom: 10, marginTop: 18 }}>{label}</div>
);

const LightSectionTitle = ({ label, color }: { label: string; color: string }) => (
  <div style={{ fontSize: "10pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color, borderBottom: `2px solid ${color}30`, paddingBottom: 3, marginBottom: 10, marginTop: 16 }}>{label}</div>
);

const GeoSectionTitle = ({ label, accentColor }: { label: string; accentColor: string }) => (
  <div style={{ fontSize: "9pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: accentColor, display: "flex", alignItems: "center", gap: 6, marginBottom: 10, marginTop: 14 }}>
    <div style={{ width: 16, height: 2, background: accentColor }} />{label}
  </div>
);

const ExpItem = ({ exp, accentColor }: { exp: CVData["experiences"][0]; accentColor: string }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontWeight: 700, fontSize: "10pt" }}>{exp.role}</span>
      <span style={{ fontSize: "8.5pt", color: "#888", fontStyle: "italic" }}>{exp.dates}</span>
    </div>
    <div style={{ color: accentColor, fontSize: "9pt", fontWeight: 600, marginBottom: 4 }}>{exp.company}</div>
    {exp.bullets.filter(Boolean).length > 0 && (
      <ul style={{ paddingLeft: 16, margin: 0 }}>
        {exp.bullets.filter(Boolean).map((b, bi) => <li key={bi} style={{ fontSize: "9pt", marginBottom: 2, lineHeight: 1.5 }}>{b}</li>)}
      </ul>
    )}
  </div>
);

const EduItem = ({ edu }: { edu: CVData["education"][0] }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontWeight: 700, fontSize: "9.5pt" }}>{edu.degree}</div>
    <div style={{ fontSize: "9pt", color: "#555" }}>{edu.school}</div>
    <div style={{ fontSize: "8.5pt", color: "#888", fontStyle: "italic" }}>{edu.dates}</div>
  </div>
);

// ─── Main CVPreview component ────────────────────────────────────────────────
export const CVPreview = ({ cvData, templateId = "classic", designOptions }: CVPreviewProps) => {
  const previewRef = useRef<HTMLDivElement>(null);

  const defaultDesigns: Record<TemplateId, CVDesignOptions> = {
    classic: { primaryColor: "#0f1b3d", textColor: "#1a1a2e", accentColor: "#c9a84c" },
    dark: { primaryColor: "#111827", textColor: "#e5e7eb", accentColor: "#10b981" },
    light: { primaryColor: "#16a34a", textColor: "#1a1a1a", accentColor: "#15803d" },
    geo: { primaryColor: "#475569", textColor: "#1e293b", accentColor: "#3b82f6" },
  };

  const d: CVDesignOptions = { ...defaultDesigns[templateId], ...designOptions };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8" />
      <title>${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName} - CV</title>
      <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { margin: 0; } .cv-page { width:210mm; min-height:297mm; } @page { size: A4; margin: 0; }</style>
      </head><body>${previewRef.current?.innerHTML || ""}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const renderTemplate = () => {
    switch (templateId) {
      case "dark": return <DarkTemplate cvData={cvData} d={d} />;
      case "light": return <LightTemplate cvData={cvData} d={d} />;
      case "geo": return <GeoTemplate cvData={cvData} d={d} />;
      default: return <ClassicTemplate cvData={cvData} d={d} />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Aperçu A4</h3>
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 h-8 text-xs">
          <Printer className="h-3.5 w-3.5" />
          Imprimer / PDF
        </Button>
      </div>
      <div className="flex-1 overflow-auto bg-muted/30 rounded-xl p-4">
        <div
          ref={previewRef}
          style={{ transform: "scale(0.7)", transformOrigin: "top center", width: "210mm", minHeight: "297mm" }}
          className="shadow-xl mx-auto"
        >
          {renderTemplate()}
        </div>
      </div>
    </div>
  );
};
