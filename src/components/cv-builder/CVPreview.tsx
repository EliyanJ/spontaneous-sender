import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { financeTemplate, type CVData } from "@/lib/cv-templates";

interface CVPreviewProps {
  cvData: CVData;
  templateCss?: string;
}

export const CVPreview = ({ cvData, templateCss }: CVPreviewProps) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const css = templateCss || financeTemplate.css;

  const isEmpty = !cvData.personalInfo.firstName && !cvData.personalInfo.lastName && !cvData.summary && !cvData.experiences.some(e => e.role || e.company);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8" />
      <title>${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName} - CV</title>
      <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { margin: 0; } ${css} @page { size: A4; margin: 0; }</style>
      </head><body>${previewRef.current?.innerHTML || ""}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const allSkills = [...cvData.skills.technical, ...cvData.skills.soft];
  const placeholder = (text: string) => <span style={{ color: "#bbb", fontStyle: "italic" }}>{text}</span>;

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
          style={{ transform: "scale(0.7)", transformOrigin: "top center", width: "210mm", minHeight: "297mm" }}
        >
          {/* Header */}
          <div className="cv-header">
            <div className="cv-name">
              {cvData.personalInfo.firstName || cvData.personalInfo.lastName
                ? `${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`
                : placeholder("Prénom Nom")}
            </div>
            <div className="cv-title">
              {cvData.personalInfo.title || placeholder("Titre du poste")}
            </div>
            <div className="cv-contact">
              {cvData.personalInfo.phone ? <span>{cvData.personalInfo.phone}</span> : <span style={{ color: "#8888aa" }}>Téléphone</span>}
              <span>·</span>
              {cvData.personalInfo.email ? <span>{cvData.personalInfo.email}</span> : <span style={{ color: "#8888aa" }}>Email</span>}
              {(cvData.personalInfo.address || isEmpty) && (
                <><span>·</span>{cvData.personalInfo.address ? <span>{cvData.personalInfo.address}</span> : <span style={{ color: "#8888aa" }}>Adresse</span>}</>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="cv-body">
            {/* Summary */}
            <div className="cv-summary">
              {cvData.summary || placeholder("Votre accroche professionnelle apparaîtra ici. Décrivez en quelques lignes votre profil, vos compétences clés et vos objectifs.")}
            </div>

            {/* Experiences */}
            <div className="cv-section">
              <div className="cv-section-title">Expériences Professionnelles</div>
              {cvData.experiences.some(e => e.role || e.company) ? (
                cvData.experiences.filter(e => e.role || e.company).map((exp, i) => (
                  <div key={i} className="cv-exp-item">
                    <div className="cv-exp-header">
                      <span className="cv-exp-role">{exp.role || placeholder("Poste")}</span>
                      <span className="cv-exp-dates">{exp.dates || placeholder("Dates")}</span>
                    </div>
                    <div className="cv-exp-company">{exp.company || placeholder("Entreprise")}</div>
                    {exp.bullets.filter(Boolean).length > 0 && (
                      <ul className="cv-exp-bullets">
                        {exp.bullets.filter(Boolean).map((b, bi) => <li key={bi}>{b}</li>)}
                      </ul>
                    )}
                  </div>
                ))
              ) : (
                <div className="cv-exp-item">
                  <div className="cv-exp-header">
                    <span className="cv-exp-role">{placeholder("Titre du poste")}</span>
                    <span className="cv-exp-dates">{placeholder("Jan 2022 - Présent")}</span>
                  </div>
                  <div className="cv-exp-company">{placeholder("Nom de l'entreprise")}</div>
                  <ul className="cv-exp-bullets">
                    <li>{placeholder("Réalisation ou responsabilité clé")}</li>
                    <li>{placeholder("Résultat quantifié ou impact")}</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Two-column */}
            <div className="cv-two-col">
              <div>
                <div className="cv-section">
                  <div className="cv-section-title">Formation</div>
                  {cvData.education.some(e => e.degree || e.school) ? (
                    cvData.education.filter(e => e.degree || e.school).map((edu, i) => (
                      <div key={i} className="cv-edu-item">
                        <div className="cv-edu-degree">{edu.degree}</div>
                        <div className="cv-edu-school">{edu.school}</div>
                        <div className="cv-edu-dates">{edu.dates}</div>
                      </div>
                    ))
                  ) : (
                    <div className="cv-edu-item">
                      <div className="cv-edu-degree">{placeholder("Diplôme")}</div>
                      <div className="cv-edu-school">{placeholder("École")}</div>
                      <div className="cv-edu-dates">{placeholder("2018 - 2020")}</div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="cv-section">
                  <div className="cv-section-title">Compétences</div>
                  <div className="cv-skills-grid">
                    {allSkills.length > 0
                      ? allSkills.map((s, i) => <span key={i} className="cv-skill-tag">{s}</span>)
                      : ["Compétence 1", "Compétence 2", "Compétence 3"].map((s, i) => (
                          <span key={i} className="cv-skill-tag" style={{ color: "#bbb" }}>{s}</span>
                        ))
                    }
                  </div>
                </div>

                <div className="cv-section">
                  <div className="cv-section-title">Langues</div>
                  <div className="cv-languages">
                    {cvData.languages.some(l => l.name) ? (
                      cvData.languages.filter(l => l.name).map((l, i) => (
                        <div key={i} className="cv-lang-item">
                          <span className="cv-lang-name">{l.name}</span>{" "}
                          <span className="cv-lang-level">— {l.level}</span>
                        </div>
                      ))
                    ) : (
                      <div className="cv-lang-item">
                        <span className="cv-lang-name" style={{ color: "#bbb" }}>Français</span>{" "}
                        <span className="cv-lang-level" style={{ color: "#bbb" }}>— Natif</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
