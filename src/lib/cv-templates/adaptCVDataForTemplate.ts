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

  const result: NonNullable<TemplateCVData["skills"]> = [];
  const tech = skills.technical || [];

  if (tech.length > 0) {
    // Répartition équilibrée en 2 colonnes (gauche / droite)
    const half = Math.ceil(tech.length / 2);
    const left = tech.slice(0, half);
    const right = tech.slice(half);

    for (let i = 0; i < left.length; i++) {
      result.push({
        category: i === 0 ? "Compétences techniques" : "",
        detail_1: left[i] || "",
        detail_2: right[i] || "",
      });
    }
  }

  return result;
}
