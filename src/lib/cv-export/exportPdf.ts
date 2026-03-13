// ══════════════════════════════════════════════════════════
// src/lib/cv-export/exportPdf.ts
// Export le CV en PDF A4 via capture du DOM React déjà rendu
// ══════════════════════════════════════════════════════════

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { injectCVData, type TemplateCVData } from "@/lib/cv-templates/injectCVData";

// ── Mode 1 : capture d'un élément DOM React déjà rendu ──────────────────────
export interface ExportPdfFromElementOptions {
  /** L'élément HTML déjà rendu dans le DOM (ex: le div 794×1123 du CVPreview) */
  element: HTMLElement;
  /** Nom du fichier (sans extension) */
  fileName?: string;
  /** Callback de progression */
  onProgress?: (step: "rendering" | "generating" | "done") => void;
}

export async function exportCVToPdfFromElement({
  element,
  fileName = "CV.pdf",
  onProgress,
}: ExportPdfFromElementOptions): Promise<void> {
  onProgress?.("rendering");

  // Attendre que les polices / images soient chargées
  await document.fonts.ready;
  await new Promise<void>((r) => setTimeout(r, 300));

  onProgress?.("generating");

  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;

  // Capturer le DOM rendu en canvas haute résolution
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
    // Forcer les dimensions A4 en pixels à 96dpi (794 × 1123)
    width: element.offsetWidth || 794,
    height: element.offsetHeight || 1123,
    scrollX: 0,
    scrollY: 0,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.98);

  // Créer le PDF A4
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const canvasWidthPx = canvas.width;
  const canvasHeightPx = canvas.height;

  // Calculer la hauteur en mm proportionnelle à la largeur A4
  const imgHeightMm = (canvasHeightPx * A4_WIDTH_MM) / canvasWidthPx;

  // Gestion multi-pages si le CV dépasse 1 page
  let remainingMm = imgHeightMm;
  let srcOffsetMm = 0;
  let pageIdx = 0;

  while (remainingMm > 0) {
    if (pageIdx > 0) pdf.addPage();

    const sliceHeightMm = Math.min(remainingMm, A4_HEIGHT_MM);
    // Coordonnée Y dans le canvas source (en pixels)
    const srcYPx = (srcOffsetMm * canvasWidthPx) / A4_WIDTH_MM;
    const sliceHeightPx = (sliceHeightMm * canvasWidthPx) / A4_WIDTH_MM;

    // Créer un canvas temporaire pour la tranche de page
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvasWidthPx;
    sliceCanvas.height = Math.round(sliceHeightPx);
    const ctx = sliceCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(
        canvas,
        0, Math.round(srcYPx),               // source x, y
        canvasWidthPx, Math.round(sliceHeightPx), // source w, h
        0, 0,                                  // dest x, y
        sliceCanvas.width, sliceCanvas.height  // dest w, h
      );
    }

    const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.98);
    pdf.addImage(sliceData, "JPEG", 0, 0, A4_WIDTH_MM, sliceHeightMm);

    remainingMm -= A4_HEIGHT_MM;
    srcOffsetMm += A4_HEIGHT_MM;
    pageIdx++;
  }

  pdf.save(fileName);
  onProgress?.("done");
}

// ── Mode 2 : fallback html-v1 (template HTML balisé) ────────────────────────
export interface ExportPdfOptions {
  /** HTML brut du template html-v1 (avec <style> intégré) */
  templateHtml: string;
  /** Données utilisateur à injecter */
  cvData: TemplateCVData;
  /** Nom du fichier (défaut: "CV.pdf") */
  fileName?: string;
  /** Callback progression */
  onProgress?: (step: "rendering" | "generating" | "done") => void;
}

export async function exportCVToPdf({
  templateHtml,
  cvData,
  fileName = "CV.pdf",
  onProgress,
}: ExportPdfOptions): Promise<void> {
  onProgress?.("rendering");

  // 1. Injecter les données dans le template html-v1
  const finalHtml = injectCVData(templateHtml, cvData);

  // 2. Parser pour extraire style + body
  const parser = new DOMParser();
  const parsed = parser.parseFromString(finalHtml, "text/html");
  const rawCss = parsed.querySelector("style")?.textContent || "";
  const bodyHtml = parsed.body.innerHTML;

  // 3. Créer conteneur hors-écran (SANS z-index négatif — requis pour html2canvas)
  const container = document.createElement("div");
  container.style.cssText = [
    "position: absolute",
    "left: -9999px",
    "top: 0",
    "width: 794px",
    "min-height: 1123px",
    "background: #fff",
    "overflow: visible",
  ].join("; ");

  const styleEl = document.createElement("style");
  // Scoper le CSS en remplaçant body/html/:root par le conteneur
  styleEl.textContent = rawCss
    .replace(/\bbody\b/g, "#__cv_pdf_scope__")
    .replace(/\bhtml\b/g, "#__cv_pdf_scope__")
    .replace(/:root/g, "#__cv_pdf_scope__");

  container.id = "__cv_pdf_scope__";
  container.appendChild(styleEl);

  const bodyDiv = document.createElement("div");
  bodyDiv.innerHTML = bodyHtml;
  container.appendChild(bodyDiv);

  document.body.appendChild(container);

  try {
    // Attendre fonts + paint
    await document.fonts.ready;
    await new Promise<void>((r) => setTimeout(r, 500));

    onProgress?.("generating");

    const cvPage = container.querySelector<HTMLElement>(".cv-page") || bodyDiv;

    const canvas = await html2canvas(cvPage, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const imgH = (canvas.height * 210) / canvas.width;
    pdf.addImage(imgData, "JPEG", 0, 0, 210, imgH);
    pdf.save(fileName);

    onProgress?.("done");
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
