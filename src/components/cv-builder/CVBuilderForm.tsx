import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import type { CVData } from "@/lib/cv-templates";

interface CVBuilderFormProps {
  cvData: CVData;
  onChange: (data: CVData) => void;
  onRegenerateSection: (section: string, content: string) => void;
  isRegenerating: boolean;
}

export const CVBuilderForm = ({ cvData, onChange, onRegenerateSection, isRegenerating }: CVBuilderFormProps) => {
  const updatePersonalInfo = (field: string, value: string) => {
    onChange({ ...cvData, personalInfo: { ...cvData.personalInfo, [field]: value } });
  };

  const updateExperience = (index: number, field: string, value: any) => {
    const exps = [...cvData.experiences];
    exps[index] = { ...exps[index], [field]: value };
    onChange({ ...cvData, experiences: exps });
  };

  const addExperience = () => {
    onChange({ ...cvData, experiences: [...cvData.experiences, { company: "", role: "", dates: "", bullets: [""] }] });
  };

  const removeExperience = (index: number) => {
    onChange({ ...cvData, experiences: cvData.experiences.filter((_, i) => i !== index) });
  };

  const updateBullet = (expIdx: number, bulletIdx: number, value: string) => {
    const exps = [...cvData.experiences];
    const bullets = [...exps[expIdx].bullets];
    bullets[bulletIdx] = value;
    exps[expIdx] = { ...exps[expIdx], bullets };
    onChange({ ...cvData, experiences: exps });
  };

  const addBullet = (expIdx: number) => {
    const exps = [...cvData.experiences];
    exps[expIdx] = { ...exps[expIdx], bullets: [...exps[expIdx].bullets, ""] };
    onChange({ ...cvData, experiences: exps });
  };

  const removeBullet = (expIdx: number, bulletIdx: number) => {
    const exps = [...cvData.experiences];
    exps[expIdx] = { ...exps[expIdx], bullets: exps[expIdx].bullets.filter((_, i) => i !== bulletIdx) };
    onChange({ ...cvData, experiences: exps });
  };

  const updateEducation = (index: number, field: string, value: string) => {
    const edus = [...cvData.education];
    edus[index] = { ...edus[index], [field]: value };
    onChange({ ...cvData, education: edus });
  };

  const addEducation = () => {
    onChange({ ...cvData, education: [...cvData.education, { school: "", degree: "", dates: "" }] });
  };

  const removeEducation = (index: number) => {
    onChange({ ...cvData, education: cvData.education.filter((_, i) => i !== index) });
  };

  const updateLanguage = (index: number, field: string, value: string) => {
    const langs = [...cvData.languages];
    langs[index] = { ...langs[index], [field]: value };
    onChange({ ...cvData, languages: langs });
  };

  const addLanguage = () => {
    onChange({ ...cvData, languages: [...cvData.languages, { name: "", level: "" }] });
  };

  const removeLanguage = (index: number) => {
    onChange({ ...cvData, languages: cvData.languages.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
      {/* Personal Info */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Informations personnelles</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Prénom</Label>
            <Input value={cvData.personalInfo.firstName} onChange={(e) => updatePersonalInfo("firstName", e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Nom</Label>
            <Input value={cvData.personalInfo.lastName} onChange={(e) => updatePersonalInfo("lastName", e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Titre / Poste</Label>
            <Input value={cvData.personalInfo.title} onChange={(e) => updatePersonalInfo("title", e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={cvData.personalInfo.email} onChange={(e) => updatePersonalInfo("email", e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Téléphone</Label>
            <Input value={cvData.personalInfo.phone} onChange={(e) => updatePersonalInfo("phone", e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Adresse / Mobilité</Label>
            <Input value={cvData.personalInfo.address} onChange={(e) => updatePersonalInfo("address", e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">LinkedIn</Label>
            <Input value={cvData.personalInfo.linkedin} onChange={(e) => updatePersonalInfo("linkedin", e.target.value)} className="h-8 text-sm" />
          </div>
        </div>
      </section>

      {/* Summary */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Accroche</h3>
          <Button variant="ghost" size="sm" onClick={() => onRegenerateSection("summary", cvData.summary)} disabled={isRegenerating} className="h-7 text-xs gap-1">
            <Sparkles className="h-3 w-3" /> IA
          </Button>
        </div>
        <Textarea value={cvData.summary} onChange={(e) => onChange({ ...cvData, summary: e.target.value })} className="text-sm min-h-[60px]" placeholder="Accroche professionnelle..." />
      </section>

      {/* Experiences */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Expériences</h3>
          <Button variant="ghost" size="sm" onClick={addExperience} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" /> Ajouter
          </Button>
        </div>
        {cvData.experiences.map((exp, i) => (
          <div key={i} className="mb-4 p-3 rounded-lg border border-border/50 bg-card/30">
            <div className="flex justify-between items-start mb-2">
              <div className="grid grid-cols-2 gap-2 flex-1">
                <div>
                  <Label className="text-xs">Poste</Label>
                  <Input value={exp.role} onChange={(e) => updateExperience(i, "role", e.target.value)} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Entreprise</Label>
                  <Input value={exp.company} onChange={(e) => updateExperience(i, "company", e.target.value)} className="h-7 text-xs" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Dates</Label>
                  <Input value={exp.dates} onChange={(e) => updateExperience(i, "dates", e.target.value)} className="h-7 text-xs" />
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                <Button variant="ghost" size="sm" onClick={() => onRegenerateSection("experience", exp.bullets.join("\n"))} disabled={isRegenerating} className="h-7 w-7 p-0">
                  <Sparkles className="h-3 w-3" />
                </Button>
                {cvData.experiences.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeExperience(i)} className="h-7 w-7 p-0 text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            {exp.bullets.map((bullet, bi) => (
              <div key={bi} className="flex items-center gap-1 mb-1">
                <span className="text-muted-foreground text-xs">•</span>
                <Input value={bullet} onChange={(e) => updateBullet(i, bi, e.target.value)} className="h-7 text-xs flex-1" />
                {exp.bullets.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeBullet(i, bi)} className="h-6 w-6 p-0 text-destructive">
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => addBullet(i)} className="h-6 text-xs gap-1 mt-1">
              <Plus className="h-2.5 w-2.5" /> Point
            </Button>
          </div>
        ))}
      </section>

      {/* Education */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Formation</h3>
          <Button variant="ghost" size="sm" onClick={addEducation} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" /> Ajouter
          </Button>
        </div>
        {cvData.education.map((edu, i) => (
          <div key={i} className="mb-3 p-3 rounded-lg border border-border/50 bg-card/30">
            <div className="flex justify-between">
              <div className="grid grid-cols-2 gap-2 flex-1">
                <div>
                  <Label className="text-xs">Diplôme</Label>
                  <Input value={edu.degree} onChange={(e) => updateEducation(i, "degree", e.target.value)} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">École</Label>
                  <Input value={edu.school} onChange={(e) => updateEducation(i, "school", e.target.value)} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Dates</Label>
                  <Input value={edu.dates} onChange={(e) => updateEducation(i, "dates", e.target.value)} className="h-7 text-xs" />
                </div>
              </div>
              {cvData.education.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeEducation(i)} className="h-7 w-7 p-0 text-destructive ml-2">
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Skills */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">Compétences</h3>
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Techniques (séparées par des virgules)</Label>
            <Input 
              value={cvData.skills.technical.join(", ")} 
              onChange={(e) => onChange({ ...cvData, skills: { ...cvData.skills, technical: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } })} 
              className="h-8 text-sm" 
            />
          </div>
          <div>
            <Label className="text-xs">Soft skills (séparées par des virgules)</Label>
            <Input 
              value={cvData.skills.soft.join(", ")} 
              onChange={(e) => onChange({ ...cvData, skills: { ...cvData.skills, soft: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } })} 
              className="h-8 text-sm" 
            />
          </div>
        </div>
      </section>

      {/* Languages */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Langues</h3>
          <Button variant="ghost" size="sm" onClick={addLanguage} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" /> Ajouter
          </Button>
        </div>
        {cvData.languages.map((lang, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <Input value={lang.name} onChange={(e) => updateLanguage(i, "name", e.target.value)} className="h-7 text-xs" placeholder="Langue" />
            <Input value={lang.level} onChange={(e) => updateLanguage(i, "level", e.target.value)} className="h-7 text-xs" placeholder="Niveau" />
            {cvData.languages.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => removeLanguage(i)} className="h-6 w-6 p-0 text-destructive">
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
};
