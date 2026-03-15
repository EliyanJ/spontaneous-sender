// ══════════════════════════════════════════════════════════════
// cvDataValidator.ts
// Valide les données CVData après import IA et détecte les
// champs qui dépassent les limites A4 autorisées.
// Propose des troncatures intelligentes (coupure à la dernière
// phrase ou mot complet avant la limite).
// ══════════════════════════════════════════════════════════════

import type { CVData } from "@/lib/cv-templates";

// ── Limites de caractères (A4 compliance) ─────────────────────
export const CV_FIELD_LIMITS = {
  summary: 400,
  full_name: 40,
  main_title: 60,
  location: 40,
  email: 45,
  phone: 20,
  linkedin: 50,
  bullet: 90,           // par bullet d'expérience
  exp_title: 60,        // company + role concaténés
  edu_label: 70,        // degree + school concaténés
  languages_content: 120,
  interests_content: 80,
  max_bullets_per_exp: 4,
  max_skills: 16,
} as const;

// ── Types ──────────────────────────────────────────────────────
export type CVFieldViolation = {
  /** Identifiant unique de la violation (pour l'UI) */
  id: string;
  /** Label lisible pour l'utilisateur */
  label: string;
  /** Valeur originale (trop longue) */
  original: string;
  /** Suggestion de troncature intelligente */
  suggested: string;
  /** Nombre de caractères original */
  originalLength: number;
  /** Limite autorisée */
  limit: number;
  /** Chemin dans CVData pour appliquer la correction */
  path: ViolationPath;
};

export type ViolationPath =
  | { type: "summary" }
  | { type: "personalInfo"; field: keyof CVData["personalInfo"] }
  | { type: "experience_title"; expIndex: number }
  | { type: "experience_bullet"; expIndex: number; bulletIndex: number }
  | { type: "education_label"; eduIndex: number }
  | { type: "skill"; skillIndex: number }
  | { type: "languages" }
  | { type: "interests" };

// ── Troncature intelligente ────────────────────────────────────

/**
 * Tronque un texte à la dernière phrase complète avant la limite.
 * Si aucune phrase complète ne tient dans la limite, coupe au dernier mot.
 */
export function smartTruncate(text: string, limit: number): string {
  if (text.length <= limit) return text;

  const truncated = text.slice(0, limit);

  // Essayer de couper à la dernière phrase (. ! ?)
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? "),
    truncated.lastIndexOf(".\n"),
  );

  if (lastSentenceEnd > limit * 0.6) {
    return truncated.slice(0, lastSentenceEnd + 1).trim();
  }

  // Sinon couper au dernier mot complet
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > limit * 0.7) {
    return truncated.slice(0, lastSpace).trim() + "...";
  }

  // En dernier recours, coupure brutale
  return truncated.trim() + "...";
}

// ── Fonction principale de validation ─────────────────────────

/**
 * Analyse un CVData et retourne la liste de toutes les violations
 * de longueur par rapport aux limites A4.
 *
 * @param cvData - Les données CVData retournées par l'IA
 * @returns Liste des violations avec suggestions de correction
 */
export function validateCVData(cvData: CVData): CVFieldViolation[] {
  const violations: CVFieldViolation[] = [];
  let idCounter = 0;

  const addViolation = (
    label: string,
    original: string,
    limit: number,
    path: ViolationPath
  ) => {
    if (original.length > limit) {
      violations.push({
        id: `violation-${++idCounter}`,
        label,
        original,
        suggested: smartTruncate(original, limit),
        originalLength: original.length,
        limit,
        path,
      });
    }
  };

  // ── Résumé ──
  if (cvData.summary) {
    addViolation(
      "Accroche / Résumé de profil",
      cvData.summary,
      CV_FIELD_LIMITS.summary,
      { type: "summary" }
    );
  }

  // ── Titre du poste ──
  if (cvData.personalInfo?.title) {
    addViolation(
      "Titre du poste",
      cvData.personalInfo.title,
      CV_FIELD_LIMITS.main_title,
      { type: "personalInfo", field: "title" }
    );
  }

  // ── Localisation ──
  if (cvData.personalInfo?.address) {
    addViolation(
      "Localisation",
      cvData.personalInfo.address,
      CV_FIELD_LIMITS.location,
      { type: "personalInfo", field: "address" }
    );
  }

  // ── Expériences ──
  cvData.experiences?.forEach((exp, expIndex) => {
    // Titre de l'expérience (company - role)
    const expTitle = [exp.company, exp.role].filter(Boolean).join(" - ");
    if (expTitle.length > CV_FIELD_LIMITS.exp_title) {
      // On signale sur le role car c'est généralement la partie la plus longue
      addViolation(
        `Expérience ${expIndex + 1} — Intitulé du poste (${exp.company || "?"} - ${exp.role || "?"})`,
        expTitle,
        CV_FIELD_LIMITS.exp_title,
        { type: "experience_title", expIndex }
      );
    }

    // Bullets de l'expérience
    exp.bullets?.forEach((bullet, bulletIndex) => {
      if (bullet && bullet.trim()) {
        addViolation(
          `Expérience ${expIndex + 1} — Réalisation ${bulletIndex + 1}`,
          bullet,
          CV_FIELD_LIMITS.bullet,
          { type: "experience_bullet", expIndex, bulletIndex }
        );
      }
    });
  });

  // ── Formations ──
  cvData.education?.forEach((edu, eduIndex) => {
    const eduLabel = [edu.degree, edu.school].filter(Boolean).join(" - ");
    if (eduLabel.length > CV_FIELD_LIMITS.edu_label) {
      addViolation(
        `Formation ${eduIndex + 1} — Intitulé (${edu.degree || "?"} - ${edu.school || "?"})`,
        eduLabel,
        CV_FIELD_LIMITS.edu_label,
        { type: "education_label", eduIndex }
      );
    }
  });

  // ── Langues + Soft Skills ──
  const languagesContent = [
    ...(cvData.languages?.map((l) => `${l.name}: ${l.level}`).filter((s) => s.trim() !== ": ") || []),
    ...(cvData.skills?.soft?.length
      ? [`Soft Skills: ${cvData.skills.soft.join(", ")}`]
      : []),
  ].join(" / ");

  if (languagesContent.length > CV_FIELD_LIMITS.languages_content) {
    addViolation(
      "Langues & Soft Skills",
      languagesContent,
      CV_FIELD_LIMITS.languages_content,
      { type: "languages" }
    );
  }

  // ── Centres d'intérêt ──
  const interestsContent = (cvData.interests || []).join(", ");
  if (interestsContent.length > CV_FIELD_LIMITS.interests_content) {
    addViolation(
      "Centres d'intérêt",
      interestsContent,
      CV_FIELD_LIMITS.interests_content,
      { type: "interests" }
    );
  }

  return violations;
}

// ── Applicateur de corrections ─────────────────────────────────

/**
 * Applique une correction (valeur finale choisie par l'utilisateur)
 * au CVData correspondant à un chemin de violation.
 *
 * @param cvData - Le CVData original
 * @param path - Le chemin de la violation
 * @param correctedValue - La valeur corrigée à appliquer
 * @returns Nouveau CVData avec la correction appliquée (immutable)
 */
export function applyCVCorrection(
  cvData: CVData,
  path: ViolationPath,
  correctedValue: string
): CVData {
  const updated = structuredClone(cvData);

  switch (path.type) {
    case "summary":
      updated.summary = correctedValue;
      break;

    case "personalInfo":
      updated.personalInfo = {
        ...updated.personalInfo,
        [path.field]: correctedValue,
      };
      break;

    case "experience_title": {
      // Le titre est "Entreprise - Poste". On tente de séparer les deux.
      const parts = correctedValue.split(" - ");
      if (parts.length >= 2) {
        updated.experiences[path.expIndex].company = parts.slice(0, -1).join(" - ");
        updated.experiences[path.expIndex].role = parts[parts.length - 1];
      } else {
        updated.experiences[path.expIndex].role = correctedValue;
      }
      break;
    }

    case "experience_bullet":
      if (updated.experiences[path.expIndex]?.bullets) {
        updated.experiences[path.expIndex].bullets[path.bulletIndex] = correctedValue;
      }
      break;

    case "education_label": {
      const parts = correctedValue.split(" - ");
      if (parts.length >= 2) {
        updated.education[path.eduIndex].degree = parts.slice(0, -1).join(" - ");
        updated.education[path.eduIndex].school = parts[parts.length - 1];
      } else {
        updated.education[path.eduIndex].degree = correctedValue;
      }
      break;
    }

    case "languages":
    case "interests":
      // Ces champs sont calculés dynamiquement — on ne peut pas les appliquer directement
      // sur CVData. Ils seront gérés différemment dans CVTruncationDialog.
      break;
  }

  return updated;
}

/**
 * Applique toutes les violations (avec leurs valeurs finales choisies)
 * en une seule passe sur le CVData.
 */
export function applyAllCorrections(
  cvData: CVData,
  resolvedViolations: Array<{ path: ViolationPath; finalValue: string }>
): CVData {
  let updated = structuredClone(cvData);
  for (const { path, finalValue } of resolvedViolations) {
    updated = applyCVCorrection(updated, path, finalValue);
  }
  return updated;
}
