import React, { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sparkles, Plus, Trash2, Upload, FileText, X, Database } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { CVData } from "@/lib/cv-templates";

interface CVBuilderFormProps {
  cvData: CVData;
  onChange: (data: CVData) => void;
  onFileParsed: (file: File) => void;
  onLoadFromDB: (content: string, name: string) => void;
  isLoading: boolean;
  importedFileName: string | null;
  onClearImport: () => void;
}

export const CVBuilderForm = ({
  cvData,
  onChange,
  onFileParsed,
  onLoadFromDB,
  isLoading,
  importedFileName,
  onClearImport,
}: CVBuilderFormProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [savedCVs, setSavedCVs] = useState<{ id: string; name: string; content: string; updated_at: string }[]>([]);
  const [cvPopoverOpen, setCvPopoverOpen] = useState(false);

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileParsed(file);
  }, [onFileParsed]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileParsed(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Load saved CVs from DB
  const loadSavedCVs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_cv_profiles")
      .select("id, name, content, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (data) setSavedCVs(data);
    setCvPopoverOpen(true);
  };

  // Form update helpers
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
    <div className="space-y-5">
      {/* Drag & Drop Zone */}
      {!importedFileName ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200
            ${isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border hover:border-primary/50 hover:bg-accent/30"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Glissez votre CV ici
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOCX ou TXT — ou cliquez pour parcourir
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Popover open={cvPopoverOpen} onOpenChange={setCvPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadSavedCVs();
                  }}
                >
                  <Database className="h-3.5 w-3.5" />
                  Mes CVs
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" onClick={(e) => e.stopPropagation()}>
                <p className="text-xs font-semibold text-muted-foreground px-2 py-1">CVs sauvegardés</p>
                {savedCVs.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-3 text-center">Aucun CV sauvegardé</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {savedCVs.map((cv) => (
                      <button
                        key={cv.id}
                        className="w-full text-left px-2 py-2 rounded-md hover:bg-accent text-sm flex items-center gap-2 transition-colors"
                        onClick={() => {
                          onLoadFromDB(cv.content, cv.name);
                          setCvPopoverOpen(false);
                        }}
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-xs">{cv.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(cv.updated_at).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-accent/30 px-3 py-2">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm truncate flex-1">{importedFileName}</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClearImport}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Personal Info */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Informations personnelles</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Prénom</Label>
            <Input value={cvData.personalInfo.firstName} onChange={(e) => updatePersonalInfo("firstName", e.target.value)} className="h-8 text-sm" placeholder="Jean" />
          </div>
          <div>
            <Label className="text-xs">Nom</Label>
            <Input value={cvData.personalInfo.lastName} onChange={(e) => updatePersonalInfo("lastName", e.target.value)} className="h-8 text-sm" placeholder="Dupont" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Titre / Poste</Label>
            <Input value={cvData.personalInfo.title} onChange={(e) => updatePersonalInfo("title", e.target.value)} className="h-8 text-sm" placeholder="Analyste financier" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={cvData.personalInfo.email} onChange={(e) => updatePersonalInfo("email", e.target.value)} className="h-8 text-sm" placeholder="jean@email.com" />
          </div>
          <div>
            <Label className="text-xs">Téléphone</Label>
            <Input value={cvData.personalInfo.phone} onChange={(e) => updatePersonalInfo("phone", e.target.value)} className="h-8 text-sm" placeholder="06 12 34 56 78" />
          </div>
          <div>
            <Label className="text-xs">Adresse / Mobilité</Label>
            <Input value={cvData.personalInfo.address} onChange={(e) => updatePersonalInfo("address", e.target.value)} className="h-8 text-sm" placeholder="Paris, France" />
          </div>
          <div>
            <Label className="text-xs">LinkedIn</Label>
            <Input value={cvData.personalInfo.linkedin} onChange={(e) => updatePersonalInfo("linkedin", e.target.value)} className="h-8 text-sm" placeholder="linkedin.com/in/..." />
          </div>
        </div>
      </section>

      {/* Summary */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Accroche</h3>
        <Textarea value={cvData.summary} onChange={(e) => onChange({ ...cvData, summary: e.target.value })} className="text-sm min-h-[60px]" placeholder="Résumé professionnel percutant..." />
      </section>

      {/* Experiences */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expériences</h3>
          <Button variant="ghost" size="sm" onClick={addExperience} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" /> Ajouter
          </Button>
        </div>
        {cvData.experiences.map((exp, i) => (
          <div key={i} className="mb-3 p-3 rounded-lg border border-border/50 bg-card/30">
            <div className="flex justify-between items-start mb-2">
              <div className="grid grid-cols-2 gap-2 flex-1">
                <div>
                  <Label className="text-xs">Poste</Label>
                  <Input value={exp.role} onChange={(e) => updateExperience(i, "role", e.target.value)} className="h-7 text-xs" placeholder="Titre du poste" />
                </div>
                <div>
                  <Label className="text-xs">Entreprise</Label>
                  <Input value={exp.company} onChange={(e) => updateExperience(i, "company", e.target.value)} className="h-7 text-xs" placeholder="Nom de l'entreprise" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Dates</Label>
                  <Input value={exp.dates} onChange={(e) => updateExperience(i, "dates", e.target.value)} className="h-7 text-xs" placeholder="Jan 2022 - Présent" />
                </div>
              </div>
              {cvData.experiences.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeExperience(i)} className="h-7 w-7 p-0 text-destructive ml-2">
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            {exp.bullets.map((bullet, bi) => (
              <div key={bi} className="flex items-center gap-1 mb-1">
                <span className="text-muted-foreground text-xs">•</span>
                <Input value={bullet} onChange={(e) => updateBullet(i, bi, e.target.value)} className="h-7 text-xs flex-1" placeholder="Réalisation..." />
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
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Formation</h3>
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
                  <Input value={edu.degree} onChange={(e) => updateEducation(i, "degree", e.target.value)} className="h-7 text-xs" placeholder="Master Finance" />
                </div>
                <div>
                  <Label className="text-xs">École</Label>
                  <Input value={edu.school} onChange={(e) => updateEducation(i, "school", e.target.value)} className="h-7 text-xs" placeholder="HEC Paris" />
                </div>
                <div>
                  <Label className="text-xs">Dates</Label>
                  <Input value={edu.dates} onChange={(e) => updateEducation(i, "dates", e.target.value)} className="h-7 text-xs" placeholder="2018 - 2020" />
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
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Compétences</h3>
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Techniques (séparées par des virgules)</Label>
            <Input
              value={cvData.skills.technical.join(", ")}
              onChange={(e) => onChange({ ...cvData, skills: { ...cvData.skills, technical: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } })}
              className="h-8 text-sm"
              placeholder="Excel, Python, SQL..."
            />
          </div>
          <div>
            <Label className="text-xs">Soft skills (séparées par des virgules)</Label>
            <Input
              value={cvData.skills.soft.join(", ")}
              onChange={(e) => onChange({ ...cvData, skills: { ...cvData.skills, soft: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } })}
              className="h-8 text-sm"
              placeholder="Leadership, Communication..."
            />
          </div>
        </div>
      </section>

      {/* Languages */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Langues</h3>
          <Button variant="ghost" size="sm" onClick={addLanguage} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" /> Ajouter
          </Button>
        </div>
        {cvData.languages.map((lang, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <Input value={lang.name} onChange={(e) => updateLanguage(i, "name", e.target.value)} className="h-7 text-xs" placeholder="Français" />
            <Input value={lang.level} onChange={(e) => updateLanguage(i, "level", e.target.value)} className="h-7 text-xs" placeholder="Natif" />
            {cvData.languages.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => removeLanguage(i)} className="h-6 w-6 p-0 text-destructive">
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            )}
          </div>
        ))}
      </section>

      {/* Bottom padding for scroll */}
      <div className="h-8" />
    </div>
  );
};
