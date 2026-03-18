import { describe, it, expect, vi, beforeEach } from "vitest";

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
  }),
}));

vi.mock("@/lib/cv-templates/injectCVData", () => ({
  injectCVData: vi.fn().mockReturnValue("<html><body><div class='cv-page'>mock</div></body></html>"),
}));

Object.defineProperty(document, "fonts", { value: { ready: Promise.resolve() }, writable: true });

// Mock canvas getContext pour sliceCanvas
const origCreateElement = document.createElement.bind(document);
vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
  if (tag === "canvas") {
    const c = origCreateElement("canvas");
    (c as HTMLCanvasElement).getContext = vi.fn().mockReturnValue({
      fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn(),
    });
    (c as HTMLCanvasElement).toDataURL = vi.fn().mockReturnValue("data:image/jpeg;base64,mock");
    return c;
  }
  return origCreateElement(tag);
});

import { exportCVToPdf } from "@/lib/cv-export/exportPdf";

const mockCVData = {
  full_name: "Jean Dupont", main_title: "Dev", sub_titles: "",
  phone: "0600000000", email: "j@e.com", location: "Paris", summary: "Résumé",
  experiences: [], entrepreneurship: [], skills: [], education: [],
  languages_content: "", interests_content: "",
};

describe("exportCVToPdf", () => {
  beforeEach(() => vi.clearAllMocks());

  it("appelle onProgress avec rendering → generating → done", async () => {
    const onProgress = vi.fn();
    await exportCVToPdf({
      templateHtml: "<html><body><div class='cv-page'>Test</div></body></html>",
      cvData: mockCVData,
      fileName: "test.pdf",
      onProgress,
    });
    expect(onProgress).toHaveBeenCalledWith("rendering");
    expect(onProgress).toHaveBeenCalledWith("generating");
    expect(onProgress).toHaveBeenCalledWith("done");
  });
});
