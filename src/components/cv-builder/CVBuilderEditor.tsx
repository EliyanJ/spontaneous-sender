import React, { useState, useRef } from "react";
import {
  User, AlignLeft, Briefcase, GraduationCap, Star, Check,
  ChevronDown, ChevronUp, Plus, Trash2, Eye, X,
  Camera, Loader2, Sparkles, ArrowLeft, ArrowRight,
  Upload, FileText, Database, Download, FileDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CVPreview } from "./CVPreview";
import { CVExportButtons } from "./CVExportButtons";
import type { CVData, CVDesignOptions } from "@/lib/cv-templates";
import { adaptCVDataForTemplate } from "@/lib/cv-templates/adaptCVDataForTemplate";
import { Logo } from "@/components/Logo";
import { Link } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────
type EditorStep = "contact" | "profile" | "experience" | "education" | "skills" | "finalize";

interface CVBuilderEditorProps {
  cvData: CVData;
  onChange: (data: CVData) => void;
  onFileParsed: (file: File) => void;
  onLoadFromDB: (content: string, name: string) => void;
  isLoading: boolean;
  importedFileName: string | null;
  onClearImport: () => void;
  designOptions: CVDesignOptions;
  onDesignChange: (options: CVDesignOptions) => void;
  templateId: string;
  onSave: () => void;
  onBack: () => void;
  isOptimizing?: boolean;
  onOptimize?: () => void;
  jobDescription?: string;
  onJobDescriptionChange?: (v: string) => void;
}

// ─── Stepper config ───────────────────────────────────────────────────────────
const STEPS: { id: EditorStep; label: string; subtitle: string; icon: React.ReactNode }[] = [
  { id: "contact",    label: "Coordonnées",       subtitle: "Informations personnelles et contact", icon: <User className="h-3.5 w-3.5" /> },
  { id: "profile",    label: "Profil",             subtitle: "Description courte et objectifs",      icon: <AlignLeft className="h-3.5 w-3.5" /> },
  { id: "experience", label: "Expérience",         subtitle: "Parcours professionnel",               icon: <Briefcase className="h-3.5 w-3.5" /> },
  { id: "education",  label: "Formation",          subtitle: "Diplômes et certifications",           icon: <GraduationCap className="h-3.5 w-3.5" /> },
  { id: "skills",     label: "Compétences",        subtitle: "Skills techniques et soft skills",     icon: <Star className="h-3.5 w-3.5" /> },
  { id: "finalize",   label: "Finalisation",       subtitle: "Aperçu et téléchargement",             icon: <Check className="h-3.5 w-3.5" /> },
];

const STEP_ORDER = STEPS.map(s => s.id);

// ─── Skill suggestions ────────────────────────────────────────────────────────
const SKILL_SUGGESTIONS = [
  "Microsoft Office", "Excel", "PowerPoint", "Word", "Python", "JavaScript",
  "SQL", "Gestion de projet", "Agile", "Scrum", "Leadership", "Communication",
  "Photoshop", "Figma", "Analyse de données", "Négociation", "Anglais",
  "Espagnol", "Mandarin", "Java", "React", "Node.js", "Marketing Digital",
];

// ─── Accordion helper ─────────────────────────────────────────────────────────
const AccordionSection = ({
  title, number, defaultOpen = true, children
}: { title: string; number: number; defaultOpen?: boolean; children: React.ReactNode }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div
        className="p-4 sm:p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center cursor-pointer select-none"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-[hsl(var(--primary))] flex items-center justify-center font-bold text-sm border border-blue-200">
            {number}
          </div>
          <h3 className="font-bold text-slate-800 text-base">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded hidden sm:inline-block">
            {open ? "En cours d'édition" : "Réduit"}
          </span>
          {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </div>
      {open && <div className="p-5 sm:p-8 bg-white">{children}</div>}
    </div>
  );
};

// ─── Field wrapper ─────────────────────────────────────────────────────────────
const Field = ({ label, required, icon, children, className = "" }: {
  label: string; required?: boolean; icon?: React.ReactNode; children: React.ReactNode; className?: string
}) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    <label className="text-sm font-bold text-slate-700">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {icon ? (
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</div>
        <div className="[&>input]:pl-11 [&>textarea]:pl-11 [&>select]:pl-11">{children}</div>
      </div>
    ) : children}
  </div>
);

// ─── Styled Input ──────────────────────────────────────────────────────────────
const StyledInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] outline-none text-slate-700 bg-white placeholder-slate-400 transition-all ${className}`}
      {...props}
    />
  )
);

const StyledTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`w-full p-4 rounded-xl border border-slate-300 focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] outline-none text-slate-700 bg-gray-50 focus:bg-white placeholder-slate-400 transition-all shadow-sm resize-none leading-relaxed ${className}`}
      {...props}
    />
  )
);

// ─── Step: Contact ────────────────────────────────────────────────────────────
const StepContact = ({ cvData, onChange, designOptions, onDesignChange }: {
  cvData: CVData; onChange: (d: CVData) => void;
  designOptions: CVDesignOptions; onDesignChange: (d: CVDesignOptions) => void;
}) => {
  const photoRef = useRef<HTMLInputElement>(null);
  const up = (field: string, value: string) => onChange({ ...cvData, personalInfo: { ...cvData.personalInfo, [field]: value } });

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onDesignChange({ ...designOptions, photoUrl: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Photo + Nom */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
          {/* Photo upload */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-[hsl(var(--primary))] hover:bg-blue-50 transition-all relative group overflow-hidden"
              onClick={() => photoRef.current?.click()}
            >
              {designOptions.photoUrl ? (
                <img src={designOptions.photoUrl} alt="Photo" className="w-full h-full object-cover" />
              ) : (
                <Camera className="h-8 w-8 text-slate-300 group-hover:text-[hsl(var(--primary))] transition-colors" />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </div>
            <span className="text-xs font-medium text-[hsl(var(--primary))] cursor-pointer hover:underline" onClick={() => photoRef.current?.click()}>
              {designOptions.photoUrl ? "Changer la photo" : "Ajouter une photo"}
            </span>
            {designOptions.photoUrl && (
              <button className="text-xs text-red-500 hover:underline" onClick={() => onDesignChange({ ...designOptions, photoUrl: undefined })}>
                Supprimer
              </button>
            )}
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Prénom <span className="text-red-500">*</span></label>
              <StyledInput placeholder="Ex: Jean" value={cvData.personalInfo.firstName} onChange={e => up("firstName", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Nom <span className="text-red-500">*</span></label>
              <StyledInput placeholder="Ex: Dupont" value={cvData.personalInfo.lastName} onChange={e => up("lastName", e.target.value)} />
            </div>
            <div className="col-span-1 sm:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Titre du CV / Intitulé de poste</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <StyledInput className="pl-11" placeholder="Ex: Chef de Projet Marketing Digital" value={cvData.personalInfo.title} onChange={e => up("title", e.target.value)} />
              </div>
              <p className="text-xs text-slate-500">Ce titre apparaîtra en haut de votre CV.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Coordonnées */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
          <User className="h-4 w-4 text-blue-500" /> Coordonnées
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">Email <span className="text-red-500">*</span></label>
            <StyledInput type="email" placeholder="jean.dupont@email.com" value={cvData.personalInfo.email} onChange={e => up("email", e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">Téléphone</label>
            <StyledInput placeholder="06 12 34 56 78" value={cvData.personalInfo.phone} onChange={e => up("phone", e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">Adresse / Ville</label>
            <StyledInput placeholder="Paris, France" value={cvData.personalInfo.address} onChange={e => up("address", e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">LinkedIn</label>
            <StyledInput placeholder="linkedin.com/in/votre-profil" value={cvData.personalInfo.linkedin} onChange={e => up("linkedin", e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Step: Profile ────────────────────────────────────────────────────────────
const StepProfile = ({ cvData, onChange }: { cvData: CVData; onChange: (d: CVData) => void }) => {
  const charCount = cvData.summary.length;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 mt-1">
          <AlignLeft className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <label className="block text-lg font-bold text-slate-800 mb-2">Votre accroche professionnelle</label>
          <p className="text-sm text-slate-500 mb-4">
            Rédigez 2 à 4 lignes qui résument votre profil, vos objectifs et votre valeur ajoutée.
          </p>
          <div className="relative">
            <StyledTextarea
              rows={6}
              maxLength={600}
              placeholder="Ex: Diplômé d'un Master en Finance de HEC Paris, je dispose de 3 ans d'expérience en analyse financière et gestion d'actifs. Rigoureux et analytique, je recherche un poste de Analyste Senior pour accompagner la croissance d'une structure ambitieuse..."
              value={cvData.summary}
              onChange={e => onChange({ ...cvData, summary: e.target.value })}
            />
            <div className={`absolute bottom-4 right-4 text-xs font-medium bg-white/80 px-2 py-1 rounded backdrop-blur-sm ${charCount > 550 ? "text-orange-500" : "text-slate-400"}`}>
              {charCount}/600
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-50/60 rounded-xl border border-blue-100">
            <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-500" /> Conseils
            </p>
            <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
              <li>Commencez par votre titre ou votre formation la plus récente</li>
              <li>Mentionnez vos points forts et compétences clés</li>
              <li>Adaptez votre accroche à chaque candidature</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Step: Experience ─────────────────────────────────────────────────────────
const StepExperience = ({ cvData, onChange }: { cvData: CVData; onChange: (d: CVData) => void }) => {
  const updateExp = (idx: number, field: string, val: any) => {
    const exps = [...cvData.experiences];
    exps[idx] = { ...exps[idx], [field]: val };
    onChange({ ...cvData, experiences: exps });
  };
  const updateBullet = (ei: number, bi: number, val: string) => {
    const exps = [...cvData.experiences];
    const bullets = [...exps[ei].bullets];
    bullets[bi] = val;
    exps[ei] = { ...exps[ei], bullets };
    onChange({ ...cvData, experiences: exps });
  };
  const addExp = () => onChange({ ...cvData, experiences: [...cvData.experiences, { company: "", role: "", dates: "", bullets: [""] }] });
  const removeExp = (i: number) => onChange({ ...cvData, experiences: cvData.experiences.filter((_, j) => j !== i) });
  const addBullet = (i: number) => { const exps = [...cvData.experiences]; exps[i] = { ...exps[i], bullets: [...exps[i].bullets, ""] }; onChange({ ...cvData, experiences: exps }); };
  const removeBullet = (ei: number, bi: number) => { const exps = [...cvData.experiences]; exps[ei] = { ...exps[ei], bullets: exps[ei].bullets.filter((_, j) => j !== bi) }; onChange({ ...cvData, experiences: exps }); };

  return (
    <div className="space-y-6">
      {cvData.experiences.map((exp, i) => (
        <AccordionSection key={i} title={exp.role || `Expérience ${i + 1}`} number={i + 1}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="col-span-1 sm:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Intitulé du poste <span className="text-red-500">*</span></label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <StyledInput className="pl-11" placeholder="Ex: Chef de Projet Senior" value={exp.role} onChange={e => updateExp(i, "role", e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Entreprise <span className="text-red-500">*</span></label>
              <StyledInput placeholder="Ex: Google Inc." value={exp.company} onChange={e => updateExp(i, "company", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Dates</label>
              <StyledInput placeholder="Jan 2022 – Présent" value={exp.dates} onChange={e => updateExp(i, "dates", e.target.value)} />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="text-sm font-bold text-slate-700 block mb-3">Réalisations / Missions</label>
              <div className="space-y-2">
                {exp.bullets.map((bullet, bi) => (
                  <div key={bi} className="flex items-center gap-2">
                    <span className="text-slate-300 font-bold text-base shrink-0">•</span>
                    <StyledInput placeholder="Ex: Réduction des coûts de 20% en 6 mois" value={bullet} onChange={e => updateBullet(i, bi, e.target.value)} />
                    {exp.bullets.length > 1 && (
                      <button onClick={() => removeBullet(i, bi)} className="shrink-0 w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-red-400 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => addBullet(i)}
                className="mt-3 flex items-center gap-2 text-sm text-[hsl(var(--primary))] hover:underline font-medium"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter une réalisation
              </button>
            </div>
          </div>
          {cvData.experiences.length > 1 && (
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
              <button onClick={() => removeExp(i)} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium">
                <Trash2 className="h-3.5 w-3.5" /> Supprimer cette expérience
              </button>
            </div>
          )}
        </AccordionSection>
      ))}
      <button
        onClick={addExp}
        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-slate-500 hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-all font-medium flex items-center justify-center gap-2"
      >
        <Plus className="h-5 w-5" /> Ajouter une expérience
      </button>
    </div>
  );
};

// ─── Step: Education ──────────────────────────────────────────────────────────
const StepEducation = ({ cvData, onChange }: { cvData: CVData; onChange: (d: CVData) => void }) => {
  const updateEdu = (i: number, field: string, val: string) => {
    const edus = [...cvData.education];
    edus[i] = { ...edus[i], [field]: val };
    onChange({ ...cvData, education: edus });
  };
  const addEdu = () => onChange({ ...cvData, education: [...cvData.education, { school: "", degree: "", dates: "" }] });
  const removeEdu = (i: number) => onChange({ ...cvData, education: cvData.education.filter((_, j) => j !== i) });

  return (
    <div className="space-y-6">
      {cvData.education.map((edu, i) => (
        <AccordionSection key={i} title={edu.degree || `Formation ${i + 1}`} number={i + 1}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="col-span-1 sm:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Nom de l'établissement <span className="text-red-500">*</span></label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <StyledInput className="pl-11" placeholder="Ex: Université Paris Dauphine" value={edu.school} onChange={e => updateEdu(i, "school", e.target.value)} />
              </div>
            </div>
            <div className="col-span-1 sm:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Diplôme <span className="text-red-500">*</span></label>
              <StyledInput placeholder="Ex: Master 2 Finance" value={edu.degree} onChange={e => updateEdu(i, "degree", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Dates</label>
              <StyledInput placeholder="2018 – 2020" value={edu.dates} onChange={e => updateEdu(i, "dates", e.target.value)} />
            </div>
          </div>
          {cvData.education.length > 1 && (
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
              <button onClick={() => removeEdu(i)} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium">
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </button>
            </div>
          )}
        </AccordionSection>
      ))}
      <button
        onClick={addEdu}
        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-slate-500 hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-all font-medium flex items-center justify-center gap-2"
      >
        <Plus className="h-5 w-5" /> Ajouter une formation
      </button>
    </div>
  );
};

// ─── Skill Input (defined at module level to preserve ref identity) ───────────
const SkillInput = ({ value, onChange: onInputChange, onAdd, placeholder }: {
  value: string; onChange: (v: string) => void; onAdd: (v: string) => void; placeholder: string;
}) => (
  <div className="flex gap-3">
    <div className="relative flex-1">
      <Plus className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input
        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] outline-none text-slate-700 bg-gray-50 focus:bg-white placeholder-slate-400 transition-all"
        placeholder={placeholder}
        value={value}
        onChange={e => onInputChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onAdd(value); } }}
      />
    </div>
    <button
      type="button"
      onClick={() => onAdd(value)}
      className="bg-[hsl(var(--primary))] hover:opacity-90 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 whitespace-nowrap"
    >
      Ajouter
    </button>
  </div>
);

// ─── Step: Skills ─────────────────────────────────────────────────────────────
const StepSkills = ({ cvData, onChange }: { cvData: CVData; onChange: (d: CVData) => void }) => {
  const [inputTech, setInputTech] = useState("");
  const [inputSoft, setInputSoft] = useState("");

  const addTech = (skill: string) => {
    const s = skill.trim();
    if (s && !cvData.skills.technical.includes(s)) {
      onChange({ ...cvData, skills: { ...cvData.skills, technical: [...cvData.skills.technical, s] } });
    }
    setInputTech("");
  };
  const addSoft = (skill: string) => {
    const s = skill.trim();
    if (s && !cvData.skills.soft.includes(s)) {
      onChange({ ...cvData, skills: { ...cvData.skills, soft: [...cvData.skills.soft, s] } });
    }
    setInputSoft("");
  };
  const removeTech = (s: string) => onChange({ ...cvData, skills: { ...cvData.skills, technical: cvData.skills.technical.filter(x => x !== s) } });
  const removeSoft = (s: string) => onChange({ ...cvData, skills: { ...cvData.skills, soft: cvData.skills.soft.filter(x => x !== s) } });

  return (
    <div className="space-y-8">
      {/* Technical */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-[hsl(var(--primary))]" />
        <h3 className="text-lg font-bold text-slate-800 mb-4">Compétences techniques</h3>
        <SkillInput value={inputTech} onChange={setInputTech} onAdd={addTech} placeholder="Ex: Excel, Python, SQL..." />
        {cvData.skills.technical.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {cvData.skills.technical.map(s => (
              <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm font-medium text-blue-800">
                {s}
                <button onClick={() => removeTech(s)} className="hover:text-red-500 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {/* Suggestions */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Suggestions populaires</p>
          <div className="flex flex-wrap gap-2">
            {SKILL_SUGGESTIONS.filter(s => !cvData.skills.technical.includes(s) && !cvData.skills.soft.includes(s)).slice(0, 8).map(s => (
              <button
                key={s}
                onClick={() => addTech(s)}
                className="px-3 py-1.5 rounded-full border border-slate-200 bg-gray-50 text-sm text-slate-600 hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] hover:bg-blue-50 transition-all"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Languages */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Langues</h3>
        <div className="space-y-3">
          {cvData.languages.map((lang, i) => (
            <div key={i} className="flex gap-3 items-center">
              <StyledInput placeholder="Ex: Anglais" value={lang.name} onChange={e => {
                const langs = [...cvData.languages]; langs[i] = { ...langs[i], name: e.target.value }; onChange({ ...cvData, languages: langs });
              }} />
              <select
                className="w-40 shrink-0 px-3 py-3 rounded-lg border border-slate-300 focus:border-[hsl(var(--primary))] outline-none text-slate-700 bg-white"
                value={lang.level}
                onChange={e => {
                  const langs = [...cvData.languages]; langs[i] = { ...langs[i], level: e.target.value }; onChange({ ...cvData, languages: langs });
                }}
              >
                <option value="">Niveau</option>
                <option value="Natif">Natif</option>
                <option value="Bilingue">Bilingue</option>
                <option value="Courant">Courant (C1/C2)</option>
                <option value="Avancé">Avancé (B2)</option>
                <option value="Intermédiaire">Intermédiaire (B1)</option>
                <option value="Notions">Notions (A1/A2)</option>
              </select>
              {cvData.languages.length > 1 && (
                <button onClick={() => onChange({ ...cvData, languages: cvData.languages.filter((_, j) => j !== i) })} className="shrink-0 w-9 h-9 rounded-full hover:bg-red-50 flex items-center justify-center text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => onChange({ ...cvData, languages: [...cvData.languages, { name: "", level: "" }] })}
          className="mt-4 flex items-center gap-2 text-sm text-[hsl(var(--primary))] hover:underline font-medium"
        >
          <Plus className="h-4 w-4" /> Ajouter une langue
        </button>
      </div>

      {/* Soft skills */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-600" />
        <h3 className="text-lg font-bold text-slate-800 mb-4">Soft skills</h3>
        <SkillInput value={inputSoft} onChange={setInputSoft} onAdd={addSoft} placeholder="Ex: Leadership, Communication..." />
        {cvData.skills.soft.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {cvData.skills.soft.map(s => (
              <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-sm font-medium text-green-800">
                {s}
                <button onClick={() => removeSoft(s)} className="hover:text-red-500 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Step: Finalize ───────────────────────────────────────────────────────────
const StepFinalize = ({ cvData, templateId, designOptions, onSave }: {
  cvData: CVData; templateId: string; designOptions: CVDesignOptions; onSave: () => void;
}) => (
  <div className="space-y-6">
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 flex items-start gap-4">
      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shrink-0">
        <Check className="h-6 w-6 text-white" />
      </div>
      <div>
        <h3 className="font-bold text-slate-800 text-lg mb-1">Votre CV est prêt !</h3>
        <p className="text-slate-600 text-sm">Téléchargez votre CV en PDF ou Word via les boutons ci-dessous.</p>
      </div>
    </div>

    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-100">
        <h3 className="font-bold text-slate-700">Aperçu de votre CV</h3>
      </div>
      <div className="p-4 overflow-auto max-h-[500px]">
        <div className="scale-75 origin-top-left" style={{ width: "133%" }}>
          <CVPreview cvData={cvData} templateId={templateId} designOptions={designOptions} />
        </div>
      </div>
    </div>
  </div>
);

// ─── Main Editor Layout ───────────────────────────────────────────────────────
export const CVBuilderEditor = ({
  cvData, onChange, onFileParsed, onLoadFromDB, isLoading,
  importedFileName, onClearImport, designOptions, onDesignChange,
  templateId, onSave, onBack,
}: CVBuilderEditorProps) => {
  const [currentStep, setCurrentStep] = useState<EditorStep>("contact");
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savedCVs, setSavedCVs] = useState<any[]>([]);
  const [cvPopoverOpen, setCvPopoverOpen] = useState(false);

  const currentIdx = STEP_ORDER.indexOf(currentStep);
  const progress = ((currentIdx + 1) / STEPS.length) * 100;

  const stepStatus = (id: EditorStep) => {
    const idx = STEP_ORDER.indexOf(id);
    if (idx < currentIdx) return "done";
    if (idx === currentIdx) return "active";
    return "pending";
  };

  const goNext = () => {
    if (currentIdx < STEPS.length - 1) setCurrentStep(STEP_ORDER[currentIdx + 1]);
  };
  const goPrev = () => {
    if (currentIdx > 0) setCurrentStep(STEP_ORDER[currentIdx - 1]);
    else onBack();
  };

  const loadSavedCVs = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_cv_profiles").select("id, name, content, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false });
    if (data) setSavedCVs(data);
    setCvPopoverOpen(true);
  };

  const currentStepConfig = STEPS[currentIdx];

  const renderStep = () => {
    switch (currentStep) {
      case "contact":    return <StepContact cvData={cvData} onChange={onChange} designOptions={designOptions} onDesignChange={onDesignChange} />;
      case "profile":    return <StepProfile cvData={cvData} onChange={onChange} />;
      case "experience": return <StepExperience cvData={cvData} onChange={onChange} />;
      case "education":  return <StepEducation cvData={cvData} onChange={onChange} />;
      case "skills":     return <StepSkills cvData={cvData} onChange={onChange} />;
      case "finalize":   return <StepFinalize cvData={cvData} templateId={templateId} designOptions={designOptions} onSave={onSave} />;
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col lg:flex-row overflow-x-hidden">

      {/* ── Mobile Header ── */}
      <div className="lg:hidden bg-white border-b border-gray-200 p-4 sticky top-0 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center text-white">
            <FileText className="h-4 w-4" />
          </div>
          <span className="font-bold text-lg text-[hsl(var(--primary))]">CV Builder</span>
        </div>
        <button
          onClick={() => setShowMobilePreview(true)}
          className="text-blue-600 text-sm font-bold flex items-center gap-1"
        >
          <Eye className="h-4 w-4" /> Aperçu
        </button>
      </div>

      {/* ── Mobile Preview Modal ── */}
      {showMobilePreview && (
        <div className="fixed inset-0 bg-white z-[80] flex flex-col lg:hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
            <h2 className="font-bold text-[hsl(var(--primary))]">Aperçu du CV</h2>
            <button onClick={() => setShowMobilePreview(false)} className="p-2 text-slate-500">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
            <div className="scale-75 origin-top-left" style={{ width: "133%" }}>
              <CVPreview cvData={cvData} templateId={templateId} designOptions={designOptions} />
            </div>
          </div>
        </div>
      )}

      {/* ── LEFT SIDEBAR / STEPPER (Desktop) ── */}
      <aside className="hidden lg:flex flex-col w-[280px] xl:w-[320px] bg-[#F8FAFC] border-r border-[#E2E8F0] h-screen sticky top-0 overflow-y-auto p-6 xl:p-8 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <Link to="/" className="flex items-center gap-2.5">
                <Logo height={32} />
                <span className="font-bold text-lg text-slate-900 tracking-tight">Cronos</span>
          </Link>
          <span className="ml-2 text-xs font-semibold text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-full">CV Builder</span>
        </div>

        {/* Import CV section */}
        {!importedFileName ? (
          <div className="mb-8">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-slate-200 cursor-pointer hover:border-[hsl(var(--primary))] hover:bg-blue-50/40 transition-all text-slate-500 hover:text-[hsl(var(--primary))]"
            >
              <Upload className="h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs font-semibold">Importer un CV existant</p>
                <p className="text-[10px] text-slate-400">PDF, DOCX ou TXT</p>
              </div>
              <Popover open={cvPopoverOpen} onOpenChange={setCvPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="ml-auto flex items-center gap-1 text-[10px] font-medium bg-white border border-slate-200 rounded-lg px-2 py-1 hover:border-[hsl(var(--primary))] transition-colors"
                    onClick={e => { e.stopPropagation(); loadSavedCVs(); }}
                  >
                    <Database className="h-3 w-3" /> Mes CVs
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" onClick={e => e.stopPropagation()}>
                  <p className="text-xs font-semibold text-muted-foreground px-2 py-1">CVs sauvegardés</p>
                  {savedCVs.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-3 text-center">Aucun CV sauvegardé</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {savedCVs.map(cv => (
                        <button key={cv.id} className="w-full text-left px-2 py-2 rounded hover:bg-accent text-xs flex items-center gap-2" onClick={() => { onLoadFromDB(cv.content, cv.name); setCvPopoverOpen(false); }}>
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{cv.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" onChange={e => { const f = e.target.files?.[0]; if (f) onFileParsed(f); }} className="hidden" />
          </div>
        ) : (
          <div className="mb-8 flex items-center gap-2 rounded-lg border border-border bg-accent/30 px-3 py-2">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs truncate flex-1">{importedFileName}</span>
            <button onClick={onClearImport} className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Stepper */}
        <div className="flex flex-col gap-1 relative flex-1">
          {STEPS.map((step, i) => {
            const status = stepStatus(step.id);
            return (
              <div
                key={step.id}
                className="relative pb-7 last:pb-0 group cursor-pointer"
                onClick={() => setCurrentStep(step.id)}
              >
                {/* Vertical line */}
                {i < STEPS.length - 1 && (
                  <div className={`absolute left-[15px] top-9 bottom-0 w-0.5 ${status === "done" ? "bg-[hsl(var(--primary))]" : "bg-[#E2E8F0]"}`} />
                )}
                <div className="flex gap-4 relative z-10">
                  {/* Step dot */}
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                    status === "done"   ? "bg-[hsl(var(--primary))] text-white shadow-md" :
                    status === "active" ? "bg-[hsl(var(--primary))] text-white shadow-md ring-4 ring-white ring-offset-0" :
                    "bg-white border-2 border-slate-300 text-slate-400"
                  }`}>
                    {status === "done" ? <Check className="h-3.5 w-3.5" /> : step.icon}
                  </div>
                  <div className="pt-1">
                    <p className={`font-semibold text-sm leading-none mb-1 ${status !== "pending" ? "text-[hsl(var(--primary))]" : "text-slate-500"}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-slate-400">{step.subtitle}</p>
                  </div>
                  {status === "active" && (
                    <div className="ml-auto pt-1">
                      <div className="w-4 h-4 rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-200 mt-auto">
          <p className="text-xs text-slate-400">© 2025 Cronos</p>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 lg:h-screen lg:overflow-y-auto bg-white relative">

        {/* Sticky top bar */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center border-b border-gray-100">
          <button
            onClick={goPrev}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[hsl(var(--primary))] transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
            </div>
            <span className="hidden sm:inline">
              {currentIdx === 0 ? "Retour aux modèles" : `Retour — ${STEPS[currentIdx - 1]?.label}`}
            </span>
          </button>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Progression</p>
              <p className="text-xs font-bold text-[hsl(var(--primary))]">Étape {currentIdx + 1} sur {STEPS.length}</p>
            </div>
            <div className="w-20 sm:w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[hsl(var(--primary))] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 pt-6 lg:pt-10">

          {/* Step header */}
          <div className="mb-8 lg:mb-10">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
              {{
                contact:    "Vos coordonnées",
                profile:    "Votre profil",
                experience: "Expérience Professionnelle",
                education:  "Formation & Diplômes",
                skills:     "Vos Compétences",
                finalize:   "Finalisez votre CV",
              }[currentStep]}
            </h1>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
              {{
                contact:    "Commencez par vous présenter. Ces informations apparaîtront en tête de votre CV.",
                profile:    "Rédigez une accroche percutante qui donne envie de lire la suite.",
                experience: "Détaillez votre parcours. Concentrez-vous sur vos réalisations concrètes.",
                education:  "Indiquez votre parcours académique, vos diplômes et vos formations pertinentes.",
                skills:     "Mettez en avant vos atouts techniques et vos qualités humaines.",
                finalize:   "Vérifiez votre CV avant de le sauvegarder et de le télécharger.",
              }[currentStep]}
            </p>
          </div>

          {/* Loading overlay (IA parsing) */}
          {isLoading && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 shrink-0" />
              <p className="text-sm font-medium text-blue-700">Analyse et structuration de votre CV en cours...</p>
            </div>
          )}

          {/* Step content */}
          {renderStep()}
        </div>

        {/* ── Sticky bottom navigation ── */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-[280px] xl:left-[320px] xl:right-[360px] bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 sm:px-8 lg:px-8 py-4 z-20">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            {currentStep !== "finalize" ? (
              <>
                <button
                  onClick={goPrev}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-slate-600 hover:border-slate-400 font-medium text-sm transition-all"
                >
                  <ArrowLeft className="h-4 w-4" /> Précédent
                </button>
                <button
                  onClick={goNext}
                  className="flex items-center gap-2 px-8 py-3 bg-[hsl(var(--primary))] hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-lg shadow-[hsl(var(--primary))]/20 text-sm"
                >
                  Continuer — {STEPS[currentIdx + 1]?.label}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="w-full flex gap-3">
                <button
                  onClick={onSave}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-[hsl(var(--primary))] hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-lg text-sm"
                >
                  <Download className="h-4 w-4" /> Télécharger en PDF
                </button>
                <button
                  onClick={onSave}
                  className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))] font-bold rounded-xl transition-all hover:bg-blue-50 text-sm"
                >
                  <FileDown className="h-4 w-4" /> Télécharger en Word
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── RIGHT PREVIEW PANEL (xl+ screens) ── */}
      <aside className="hidden xl:flex flex-col w-[360px] shrink-0 bg-[#F8FAFC] border-l border-[#E2E8F0] h-screen sticky top-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#E2E8F0] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aperçu en temps réel</span>
          </div>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Format A4</span>
        </div>

        {/* Scrollable preview area */}
        {/* Column inner width = 360px - 24px padding = 336px → scale = 336/794 ≈ 0.423 */}
        <div className="flex-1 overflow-y-auto bg-slate-100 px-3 py-4">
          {/* Outer wrapper: exact size of the scaled A4 sheet, centered */}
          <div style={{ width: "336px", height: `${Math.round(1123 * 0.423)}px`, overflow: "hidden", position: "relative", margin: "0 auto", boxShadow: "0 2px 16px 0 rgba(0,0,0,0.10)", borderRadius: "4px", background: "#fff" }}>
            {/* Inner div: full A4 size, scaled down from top-left */}
            <div style={{ transformOrigin: "top left", transform: "scale(0.423)", width: "794px", minHeight: "1123px", position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
              <CVPreview cvData={cvData} templateId={templateId} designOptions={designOptions} standalone={false} />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
