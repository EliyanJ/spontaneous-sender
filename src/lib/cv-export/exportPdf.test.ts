import { describe, it, expect, vi, beforeEach } from "vitest";
import "@/test/mocks/supabase";
import { supabaseMock } from "@/test/mocks/supabase";

// Mock jsPDF et html2canvas (APIs navigateur non dispo dans jsdom)
vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    addImage: vi.fn(),
    addPage: vi.fn(),
    save: vi.fn(),
  })),
}));

vi.mock("html2canvas", () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: vi.fn().mockReturnValue("data:image/jpeg;base64,mock"),
    width: 1588,
    height: 2246,
    getContext: vi.fn().mockReturnValue({
      fillStyle: "",
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    }),
  }),
}));

vi.mock("@/lib/cv-templates/injectCVData", () => ({
  injectCVData: vi.fn().mockReturnValue("<html><body><div class='cv-page'>mock</div></body></html>"),
}));

// Mock document.fonts
Object.defineProperty(document, "fonts", {
  value: { ready: Promise.resolve() },
  writable: true,
});

// Mock document.createElement pour canvas
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn().mockReturnValue({
    fillStyle: "",
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  }),
  toDataURL: vi.fn().mockReturnValue("data:image/jpeg;base64,mock"),
};
vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
  if (tag === "canvas") return mockCanvas as unknown as HTMLElement;
  return (document.createElement as typeof document.createElement)(tag);
});

import { exportCVToPdf } from "@/lib/cv-export/exportPdf";

describe("exportCVToPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("appelle onProgress avec les bonnes étapes", async () => {
    const onProgress = vi.fn();

    // Mock de l'élément DOM
    const el = document.createElement("div");
    Object.defineProperty(el, "offsetWidth", { value: 794 });
    Object.defineProperty(el, "offsetHeight", { value: 1123 });
    document.body.appendChild(el);

    await exportCVToPdf({
      templateHtml: "<html><body><div class='cv-page'>Test</div></body></html>",
      cvData: {
        full_name: "Jean Dupont",
        main_title: "Développeur",
        sub_titles: "",
        phone: "0612345678",
        email: "jean@example.com",
        location: "Paris",
        summary: "Résumé",
        experiences: [],
        entrepreneurship: [],
        skills: [],
        education: [],
        languages_content: "",
        interests_content: "",
      },
      fileName: "test.pdf",
      onProgress,
    });

    expect(onProgress).toHaveBeenCalledWith("rendering");
    expect(onProgress).toHaveBeenCalledWith("generating");
    expect(onProgress).toHaveBeenCalledWith("done");
  });
});
