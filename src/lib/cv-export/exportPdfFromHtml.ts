// ══════════════════════════════════════════════════════════
// exportPdfFromHtml.ts
// Génère un PDF A4 fidèle en rendant le HTML du template
// dans un container off-screen (hors iframe) via html2canvas
// puis jsPDF. Contourne la limitation iframe de html2canvas.
// ══════════════════════════════════════════════════════════

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { injectCVData, type TemplateCVData } from "@/lib/cv-templates/injectCVData";

// A4 dimensions at 96 dpi
const A4_PX_WIDTH  = Math.round(210 * 3.7795275591);  // ≈ 794
const A4_PX_HEIGHT = Math.round(297 * 3.7795275591);  // ≈ 1123

/**
 * Génère et télécharge un fichier PDF depuis le HTML du template CV.
 * Injecte les données, rend dans un container off-screen, capture
 * via html2canvas et encode dans jsPDF.
 */
export async function exportCVToPdf(
  templateHtml: string,
  cvData: TemplateCVData,
  fileName = "CV.pdf"
): Promise<void> {
  // 1 — Injecter les données
  const renderedHtml = injectCVData(templateHtml, cvData);

  // 2 — Container off-screen (hors DOM visible, mais attaché pour que
  //     html2canvas puisse mesurer les styles correctement)
  const wrapper = document.createElement("div");
  Object.assign(wrapper.style, {
    position: "fixed",
    top: "0",
    left: "-9999px",
    width: `${A4_PX_WIDTH}px`,
    height: `${A4_PX_HEIGHT}px`,
    overflow: "hidden",
    zIndex: "-1",
    background: "#fff",
  });

  const shadow = wrapper.attachShadow({ mode: "open" });
  const container = document.createElement("div");
  container.style.width = `${A4_PX_WIDTH}px`;
  container.style.height = `${A4_PX_HEIGHT}px`;
  container.innerHTML = renderedHtml;
  shadow.appendChild(container);
  document.body.appendChild(wrapper);

  try {
    // 3 — Attendre le rendu
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => setTimeout(r, 100));

    // 4 — Capturer via html2canvas (scale 2 pour netteté)
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: A4_PX_WIDTH,
      height: A4_PX_HEIGHT,
    });

    // 5 — Encoder en PDF A4
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
    pdf.save(fileName);
  } finally {
    document.body.removeChild(wrapper);
  }
}
