import { describe, it, expect } from "vitest";
import {
  smartTruncate,
  validateCVData,
  applyCVCorrection,
  applyAllCorrections,
  CV_FIELD_LIMITS,
} from "@/lib/cv-export/cvDataValidator";
import type { CVData } from "@/lib/cv-templates";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCVData(overrides: Partial<CVData> = {}): CVData {
  return {
    personalInfo: {
      name: "Jean Dupont",
      title: "Développeur Full Stack",
      email: "jean@example.com",
      phone: "0612345678",
      address: "Paris, France",
      linkedin: "linkedin.com/in/jean",
    },
    summary: "Développeur passionné avec 5 ans d'expérience.",
    experiences: [],
    education: [],
    skills: { technical: [], soft: [] },
    languages: [],
    interests: [],
    ...overrides,
  };
}

// ── smartTruncate ─────────────────────────────────────────────────────────────

describe("smartTruncate", () => {
  it("retourne le texte inchangé s'il est dans la limite", () => {
    expect(smartTruncate("Bonjour", 20)).toBe("Bonjour");
  });

  it("coupe à la dernière phrase complète", () => {
    const text = "Première phrase. Deuxième phrase trop longue pour la limite.";
    const result = smartTruncate(text, 20);
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result).toBe("Première phrase.");
  });

  it("coupe au dernier mot si pas de phrase complète", () => {
    const text = "Un texte assez long sans ponctuation finale ici";
    const result = smartTruncate(text, 30);
    expect(result.length).toBeLessThanOrEqual(33); // + "..."
    expect(result.endsWith("...")).toBe(true);
  });

  it("fait une coupure brute en dernier recours", () => {
    const text = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // sans espace ni ponctuation
    const result = smartTruncate(text, 10);
    expect(result.startsWith("aaaaaaaaaa")).toBe(true);
  });
});

// ── validateCVData ────────────────────────────────────────────────────────────

describe("validateCVData", () => {
  it("retourne un tableau vide pour un CV valide", () => {
    const cv = makeCVData();
    expect(validateCVData(cv)).toHaveLength(0);
  });

  it("détecte un résumé trop long", () => {
    const cv = makeCVData({ summary: "A".repeat(CV_FIELD_LIMITS.summary + 10) });
    const violations = validateCVData(cv);
    expect(violations.some(v => v.path.type === "summary")).toBe(true);
  });

  it("détecte un titre de poste trop long", () => {
    const cv = makeCVData({
      personalInfo: {
        name: "Jean",
        title: "T".repeat(CV_FIELD_LIMITS.main_title + 5),
        email: "a@b.com",
        phone: "0600000000",
        address: "Paris",
        linkedin: "",
      },
    });
    const violations = validateCVData(cv);
    expect(violations.some(v => v.path.type === "personalInfo" && (v.path as any).field === "title")).toBe(true);
  });

  it("détecte un bullet d'expérience trop long", () => {
    const cv = makeCVData({
      experiences: [
        {
          company: "Acme",
          role: "Dev",
          period: "2020-2021",
          bullets: ["B".repeat(CV_FIELD_LIMITS.bullet + 20)],
        },
      ],
    });
    const violations = validateCVData(cv);
    expect(violations.some(v => v.path.type === "experience_bullet")).toBe(true);
  });

  it("détecte une formation trop longue", () => {
    const cv = makeCVData({
      education: [
        {
          degree: "D".repeat(40),
          school: "S".repeat(40),
          period: "2018-2020",
        },
      ],
    });
    const violations = validateCVData(cv);
    expect(violations.some(v => v.path.type === "education_label")).toBe(true);
  });

  it("inclut une suggestion tronquée dans la violation", () => {
    const longSummary = "A".repeat(500);
    const cv = makeCVData({ summary: longSummary });
    const violations = validateCVData(cv);
    const summaryViolation = violations.find(v => v.path.type === "summary");
    expect(summaryViolation?.suggested.length).toBeLessThanOrEqual(CV_FIELD_LIMITS.summary + 3);
  });
});

// ── applyCVCorrection ─────────────────────────────────────────────────────────

describe("applyCVCorrection", () => {
  it("corrige le résumé", () => {
    const cv = makeCVData({ summary: "Trop long..." });
    const updated = applyCVCorrection(cv, { type: "summary" }, "Court");
    expect(updated.summary).toBe("Court");
    expect(cv.summary).toBe("Trop long..."); // immutabilité
  });

  it("corrige un champ personalInfo", () => {
    const cv = makeCVData();
    const updated = applyCVCorrection(cv, { type: "personalInfo", field: "title" }, "Nouveau titre");
    expect(updated.personalInfo.title).toBe("Nouveau titre");
  });

  it("corrige un bullet d'expérience", () => {
    const cv = makeCVData({
      experiences: [{ company: "X", role: "Dev", period: "2020", bullets: ["Bullet original"] }],
    });
    const updated = applyCVCorrection(cv, { type: "experience_bullet", expIndex: 0, bulletIndex: 0 }, "Nouveau bullet");
    expect(updated.experiences[0].bullets[0]).toBe("Nouveau bullet");
  });

  it("sépare correctement entreprise - poste dans experience_title", () => {
    const cv = makeCVData({
      experiences: [{ company: "Acme Corp", role: "Senior Dev", period: "2021", bullets: [] }],
    });
    const updated = applyCVCorrection(cv, { type: "experience_title", expIndex: 0 }, "Acme Corp - Dev");
    expect(updated.experiences[0].company).toBe("Acme Corp");
    expect(updated.experiences[0].role).toBe("Dev");
  });
});

// ── applyAllCorrections ───────────────────────────────────────────────────────

describe("applyAllCorrections", () => {
  it("applique plusieurs corrections en une passe", () => {
    const cv = makeCVData({
      summary: "Résumé original",
      experiences: [{ company: "X", role: "Dev", period: "2020", bullets: ["Bullet original"] }],
    });
    const updated = applyAllCorrections(cv, [
      { path: { type: "summary" }, finalValue: "Résumé corrigé" },
      { path: { type: "experience_bullet", expIndex: 0, bulletIndex: 0 }, finalValue: "Bullet corrigé" },
    ]);
    expect(updated.summary).toBe("Résumé corrigé");
    expect(updated.experiences[0].bullets[0]).toBe("Bullet corrigé");
    // Immutabilité du CV original
    expect(cv.summary).toBe("Résumé original");
  });
});
