export interface CVDesignOptions {
  primaryColor: string;
  textColor: string;
  accentColor: string;
  photoUrl?: string;
}

export type TemplateId = "classic" | "dark" | "light" | "geo";

export interface CVTemplateConfig {
  id: TemplateId;
  name: string;
  defaultDesign: CVDesignOptions;
}

export const CV_TEMPLATES: CVTemplateConfig[] = [
  {
    id: "classic",
    name: "Classique",
    defaultDesign: { primaryColor: "#0f1b3d", textColor: "#1a1a2e", accentColor: "#c9a84c" },
  },
  {
    id: "dark",
    name: "Sombre",
    defaultDesign: { primaryColor: "#111827", textColor: "#e5e7eb", accentColor: "#10b981" },
  },
  {
    id: "light",
    name: "Clair",
    defaultDesign: { primaryColor: "#16a34a", textColor: "#1a1a1a", accentColor: "#15803d" },
  },
  {
    id: "geo",
    name: "Géométrique",
    defaultDesign: { primaryColor: "#475569", textColor: "#1e293b", accentColor: "#3b82f6" },
  },
];

// Legacy export kept for backward compat
export const financeTemplate = {
  name: "Finance & Corporate",
  sector: "finance",
  css: `
    .cv-page { width:210mm; min-height:297mm; padding:0; margin:0 auto; background:#fff; color:#1a1a2e; font-family:'Georgia','Times New Roman',serif; font-size:10pt; line-height:1.5; box-sizing:border-box; }
  `,
};

export interface CVData {
  personalInfo: {
    firstName: string;
    lastName: string;
    title: string;
    email: string;
    phone: string;
    address: string;
    linkedin: string;
  };
  summary: string;
  experiences: Array<{
    company: string;
    role: string;
    dates: string;
    bullets: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    dates: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
  };
  languages: Array<{
    name: string;
    level: string;
  }>;
  certifications?: string[];
  interests?: string[];
}

export const emptyCVData: CVData = {
  personalInfo: { firstName: "", lastName: "", title: "", email: "", phone: "", address: "", linkedin: "" },
  summary: "",
  experiences: [{ company: "", role: "", dates: "", bullets: [""] }],
  education: [{ school: "", degree: "", dates: "" }],
  skills: { technical: [], soft: [] },
  languages: [{ name: "", level: "" }],
  certifications: [],
  interests: [],
};
