import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { financeTemplate, type CVData } from "@/lib/cv-templates";

interface CVPreviewProps {
  cvData: CVData;
  templateCss?: string;
}

export const CVPreview = ({ cvData, templateCss }: CVPreviewProps) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const css = templateCss || financeTemplate.css;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName} - CV</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { margin: 0; }
          ${css}
          @page { size: A4; margin: 0; }
        </style>
      </head>
      <body>${previewRef.current?.innerHTML || ""}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  const allSkills = [...cvData.skills.technical, ...cvData.skills.soft];

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
        <style>{css}</style>
        <div 
          ref={previewRef}
          className="cv-page shadow-xl mx-auto"
          style={{ transform: "scale(0.75)", transformOrigin: "top center", width: "210mm", minHeight: "297mm" }}
        >
          {/* Header */}
          <div className="cv-header">
            <div className="cv-name">
              {cvData.personalInfo.firstName} {cvData.personalInfo.lastName}
            </div>
            <div className="cv-title">{cvData.personalInfo.title}</div>
            <div className="cv-contact">
              {cvData.personalInfo.phone && <span>{cvData.personalInfo.phone}</span>}
              {cvData.personalInfo.email && <span>· {cvData.personalInfo.email}</span>}
              {cvData.personalInfo.address && <span>· {cvData.personalInfo.address}</span>}
              {cvData.personalInfo.linkedin && <span>· {cvData.personalInfo.linkedin}</span>}
            </div>
          </div>

          {/* Body */}
          <div className="cv-body">
            {/* Summary */}
            {cvData.summary && (
              <div className="cv-summary">{cvData.summary}</div>
            )}

            {/* Experiences */}
            {cvData.experiences.some(e => e.role || e.company) && (
              <div className="cv-section">
                <div className="cv-section-title">Expériences Professionnelles</div>
                {cvData.experiences.filter(e => e.role || e.company).map((exp, i) => (
                  <div key={i} className="cv-exp-item">
                    <div className="cv-exp-header">
                      <span className="cv-exp-role">{exp.role}</span>
                      <span className="cv-exp-dates">{exp.dates}</span>
                    </div>
                    <div className="cv-exp-company">{exp.company}</div>
                    {exp.bullets.filter(Boolean).length > 0 && (
                      <ul className="cv-exp-bullets">
                        {exp.bullets.filter(Boolean).map((b, bi) => (
                          <li key={bi}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Two-column: Education + Skills/Languages */}
            <div className="cv-two-col">
              <div>
                {/* Education */}
                {cvData.education.some(e => e.degree || e.school) && (
                  <div className="cv-section">
                    <div className="cv-section-title">Formation</div>
                    {cvData.education.filter(e => e.degree || e.school).map((edu, i) => (
                      <div key={i} className="cv-edu-item">
                        <div className="cv-edu-degree">{edu.degree}</div>
                        <div className="cv-edu-school">{edu.school}</div>
                        <div className="cv-edu-dates">{edu.dates}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                {/* Skills */}
                {allSkills.length > 0 && (
                  <div className="cv-section">
                    <div className="cv-section-title">Compétences</div>
                    <div className="cv-skills-grid">
                      {allSkills.map((s, i) => (
                        <span key={i} className="cv-skill-tag">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {cvData.languages.some(l => l.name) && (
                  <div className="cv-section">
                    <div className="cv-section-title">Langues</div>
                    <div className="cv-languages">
                      {cvData.languages.filter(l => l.name).map((l, i) => (
                        <div key={i} className="cv-lang-item">
                          <span className="cv-lang-name">{l.name}</span>{" "}
                          <span className="cv-lang-level">— {l.level}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
