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

  // 2. Créer un conteneur hors-écran (PAS display:none → html2canvas ne rend rien si caché)
  const container = document.createElement("div");
  container.style.cssText = [
    "position: fixed",
    "left: -9999px",
    "top: 0",
    "width: 794px",
    "height: 1123px",
    "overflow: hidden",
    "z-index: -9999",
  ].join("; ");
  document.body.appendChild(container);

  // 3. Créer un iframe isolé pour que le CSS du template ne polue pas l'app
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "width: 794px; height: 1123px; border: none; display: block;";
  iframe.setAttribute("sandbox", "allow-same-origin");
  container.appendChild(iframe);

  try {
    // 4. Charger le HTML dans l'iframe et attendre rendu complet
    await new Promise<void>((resolve) => {
      iframe.onload = () => {
        // Attendre 500ms supplémentaires pour les polices / images CSS
        setTimeout(resolve, 500);
      };
      iframe.srcdoc = finalHtml;
    });

    onProgress?.("generating");

    // 5. Cibler .cv-page dans l'iframe (fallback sur body)
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error("Impossible d'accéder au contenu de l'iframe");

    const cvPage =
      iframeDoc.querySelector<HTMLElement>(".cv-page") ||
      iframeDoc.body;

    // 6. Lancer html2pdf avec les options recommandées
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
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(cvPage)
      .save();

    onProgress?.("done");
  } finally {
    // 7. Cleanup DOM
    document.body.removeChild(container);
  }
}
