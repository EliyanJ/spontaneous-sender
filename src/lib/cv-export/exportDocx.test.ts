import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock file-saver
vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
}));

// Mock docx
vi.mock("docx", async () => {
  const actual = await vi.importActual("docx");
  return {
    ...actual,
    Packer: {
      toBlob: vi.fn().mockResolvedValue(new Blob(["mock docx content"], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })),
    },
  };
});

import { exportCVToDocx } from "@/lib/cv-export/exportDocx";
import { saveAs } from "file-saver";
import { Packer } from "docx";

const mockCVData = {
  full_name: "Jean Dupont",
  main_title: "Développeur Full Stack",
  sub_titles: "Expert React & TypeScript",
  phone: "0612345678",
  email: "jean@example.com",
  location: "Paris, France",
  summary: "Développeur passionné avec 5 ans d'expérience en React et Node.js.",
  experiences: [
    {
      title: "Développeur Senior - Acme Corp",
      date: "2020 - 2024",
      bullets: ["Développé des fonctionnalités critiques", "Mentorat de 3 développeurs juniors"],
    },
  ],
  entrepreneurship: [],
  skills: [
    { category: "Frontend", detail_1: "React, TypeScript", detail_2: "Next.js, Tailwind" },
    { category: "Backend", detail_1: "Node.js, PostgreSQL", detail_2: "" },
  ],
  education: [
    { label: "Master Informatique - Paris VI", date: "2017 - 2019" },
  ],
  languages_content: "Français natif, Anglais C1",
  interests_content: "Open source, Piano",
};

describe("exportCVToDocx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("appelle Packer.toBlob pour générer le document", async () => {
    await exportCVToDocx({ cvData: mockCVData });
    expect(Packer.toBlob).toHaveBeenCalled();
  });

  it("appelle saveAs avec le bon nom de fichier par défaut", async () => {
    await exportCVToDocx({ cvData: mockCVData });
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), "CV.docx");
  });

  it("utilise le nom de fichier personnalisé", async () => {
    await exportCVToDocx({ cvData: mockCVData, fileName: "Mon_CV.docx" });
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), "Mon_CV.docx");
  });

  it("fonctionne avec des données CV minimales (sans expériences ni formations)", async () => {
    const minimalCVData = {
      full_name: "Marie Curie",
      main_title: "Chercheuse",
      sub_titles: "",
      phone: "",
      email: "marie@example.com",
      location: "",
      summary: "",
      experiences: [],
      entrepreneurship: [],
      skills: [],
      education: [],
      languages_content: "",
      interests_content: "",
    };
    await expect(exportCVToDocx({ cvData: minimalCVData })).resolves.not.toThrow();
    expect(Packer.toBlob).toHaveBeenCalled();
  });

  it("utilise le style par défaut si aucun style n'est fourni", async () => {
    await exportCVToDocx({ cvData: mockCVData });
    // Vérifie simplement que le document est généré sans erreur
    expect(saveAs).toHaveBeenCalledTimes(1);
  });

  it("applique un style personnalisé", async () => {
    await exportCVToDocx({
      cvData: mockCVData,
      style: { fontFamily: "Times New Roman", headingColor: "FF0000", textColor: "000000", headingBorder: false },
    });
    expect(Packer.toBlob).toHaveBeenCalled();
  });
});
