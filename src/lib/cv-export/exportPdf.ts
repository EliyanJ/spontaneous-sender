// ══════════════════════════════════════════════════════════
// src/lib/cv-export/exportPdf.ts
// Export le CV en PDF A4 pixel-perfect côté client
// ══════════════════════════════════════════════════════════

import html2pdf from "html2pdf.js";
import { injectCVData, type TemplateCVData } from "@/lib/cv-templates/injectCVData";

export interface ExportPdfOptions {
  /** HTML brut du template (avec <style> intégré) */
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

  // 1. Injecter les données dans le template
  const finalHtml = injectCVData(templateHtml, cvData);

  // 2. Parser le HTML final pour extraire le <style> et le <body>
  const parser = new DOMParser();
  const doc = parser.parseFromString(finalHtml, "text/html");

  // 3. Créer un conteneur hors-écran visible (PAS display:none → html2canvas vide)
  const wrapper = document.createElement("div");
  wrapper.style.cssText = [
    "position: fixed",
    "left: -99999px",
    "top: 0",
    "width: 794px",     // A4 @ 96dpi
    "min-height: 1123px",
    "overflow: visible",
    "z-index: -9999",
    "background: white",
  ].join("; ");
  document.body.appendChild(wrapper);

  // 4. Créer un shadow root pour isoler les styles du template de l'app
  const shadow = wrapper.attachShadow({ mode: "open" });

  // 5. Injecter style + contenu dans le shadow DOM
  //    (le shadow DOM est visible pour html2canvas avec "useCORS: true")
  const styleEl = doc.querySelector("style");
  if (styleEl) {
    const clonedStyle = document.createElement("style");
    clonedStyle.textContent = styleEl.textContent || "";
    shadow.appendChild(clonedStyle);
  }

  // Cloner le contenu body dans le shadow
  const contentDiv = document.createElement("div");
  contentDiv.innerHTML = doc.body.innerHTML;
  // Forcer width A4
  contentDiv.style.cssText = "width: 794px; min-height: 1123px; background: white;";
  shadow.appendChild(contentDiv);

  try {
    onProgress?.("generating");

    // 6. Attendre le paint + polices
    await new Promise<void>((resolve) => setTimeout(resolve, 600));

    // 7. Cibler .cv-page dans le shadow (fallback sur contentDiv)
    const cvPage =
      (shadow.querySelector<HTMLElement>(".cv-page")) || contentDiv;

    // 8. Lancer html2pdf
    await html2pdf()
      .set({
        margin: 0,
        filename: fileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          scrollX: 0,
          scrollY: 0,
          backgroundColor: "#ffffff",
          // Cibler l'élément directement (pas d'iframe)
          foreignObjectRendering: false,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(cvPage)
      .save();

    onProgress?.("done");
  } finally {
    // 9. Cleanup DOM
    document.body.removeChild(wrapper);
  }
}
