// ══════════════════════════════════════════
// adaptCVDataForTemplate.ts
// Convertit le format du CVBuilderEditor
// vers le format attendu par les templates HTML balisés
// ══════════════════════════════════════════

import type { CVData } from "@/lib/cv-templates";
import type { TemplateCVData } from "./injectCVData";

export function adaptCVDataForTemplate(
  builder: CVData,
  photoUrl?: string
): TemplateCVData {
  return {
    full_name: [builder.personalInfo?.firstName, builder.personalInfo?.lastName]
      .filter(Boolean)
      .join(" "),

    main_title: builder.personalInfo?.title || "",
    sub_titles: (builder as any).targetJobs || "",

    phone: builder.personalInfo?.phone || "",
    email: builder.personalInfo?.email || "",
    location: builder.personalInfo?.address || "",
    linkedin: builder.personalInfo?.linkedin || "",

    summary: builder.summary || "",
    photo: photoUrl || "",

    experiences:
      builder.experiences?.map((exp) => ({
        title: [exp.company, exp.role].filter(Boolean).join(" - "),
        date: exp.dates || "",
        bullets: (exp.bullets || []).filter(Boolean),
      })) || [],

    education:
      builder.education?.map((edu) => ({
        date: edu.dates || "",
        label: [edu.degree, edu.school].filter(Boolean).join(" - "),
      })) || [],

    skills: formatSkillsForTemplate(builder.skills),

    // Langues & soft skills combinés dans un champ texte
    languages_content: [
      ...(builder.languages?.map((l) => `${l.name}: ${l.level}`).filter(
        (s) => s.trim() !== ": "
      ) || []),
      ...(builder.skills?.soft?.length
        ? [`Soft Skills: ${builder.skills.soft.join(", ")}`]
        : []),
    ].join(" / "),

    interests_content: (builder.interests || []).join(", "),

    // Entrepreneurship (si présent dans les données)
    entrepreneurship: (builder as any).entrepreneurship || [],
  };
}

function formatSkillsForTemplate(
  skills?: { technical: string[]; soft: string[] }
): TemplateCVData["skills"] {
  if (!skills) return [];

  const tech = skills.technical || [];
  if (tech.length === 0) return [];

  // Chaque compétence = 1 item indépendant avec skill_name.
  // Le CSS grid repeat(3, 1fr) sur le container gère le flux naturel
  // gauche→droite sans trous ni lignes vides.
  return tech
    .filter((s) => s?.trim())
    .slice(0, 16) // Max 16 compétences = 4 colonnes × 4 rangées
    .map((skill) => ({
      category: "", // Vide pour tous — le <h2> du template suffit comme titre
      name: skill,       // Compatibilité templates BDD avec data-field="name"
      skill_name: skill, // Compatibilité templates avec data-field="skill_name"
      // Rétrocompatibilité avec les anciens templates detail_1/2/3
      detail_1: skill,
      detail_2: "",
      detail_3: "",
    }));
}
