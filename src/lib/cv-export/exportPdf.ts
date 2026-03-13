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

  // 2. Parser le HTML pour extraire style et body séparément
  const parser = new DOMParser();
  const parsed = parser.parseFromString(finalHtml, "text/html");

  // 3. Préfixer toutes les règles CSS du template avec un sélecteur unique
  //    pour éviter qu'elles ne "polluent" l'app hôte.
  const SCOPE_ID = "__cv_export_scope__";
  const rawCss = parsed.querySelector("style")?.textContent || "";
  const scopedCss = rawCss
    .split("}")
    .map((block) => {
      const braceIdx = block.indexOf("{");
      if (braceIdx === -1) return block;
      const selectors = block.slice(0, braceIdx);
      const rules = block.slice(braceIdx);
      // Préfixer chaque sélecteur
      const prefixed = selectors
        .split(",")
        .map((sel) => {
          const trimmed = sel.trim();
          if (!trimmed) return "";
          if (trimmed.startsWith("@") || trimmed.startsWith(":root")) return trimmed;
          return `#${SCOPE_ID} ${trimmed}`;
        })
        .filter(Boolean)
        .join(", ");
      return prefixed + rules;
    })
    .join("}");

  // 4. Créer le conteneur hors-écran (VISIBLE sinon html2canvas = blanc)
  const container = document.createElement("div");
  container.id = SCOPE_ID;
  container.style.cssText = [
    "position: fixed",
    "left: -99999px",
    "top: 0",
    "width: 794px",       // A4 @ 96dpi
    "min-height: 1123px",
    "background: #fff",
    "overflow: visible",
    "z-index: -9999",
  ].join("; ");

  // 5. Ajouter la feuille de style scopée + le contenu HTML
  const styleEl = document.createElement("style");
  styleEl.textContent = scopedCss;
  container.appendChild(styleEl);

  const bodyDiv = document.createElement("div");
  bodyDiv.innerHTML = parsed.body.innerHTML;
  container.appendChild(bodyDiv);

  document.body.appendChild(container);

  try {
    // 6. Attendre le paint + chargement des polices
    await new Promise<void>((resolve) => setTimeout(resolve, 700));

    onProgress?.("generating");

    // 7. Cibler .cv-page (fallback sur bodyDiv)
    const cvPage =
      container.querySelector<HTMLElement>(".cv-page") || bodyDiv;

    // 8. Lancer html2pdf
    await html2pdf()
      .set({
        margin: 0,
        filename: fileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          letterRendering: true,
          scrollX: 0,
          scrollY: 0,
          backgroundColor: "#ffffff",
          logging: false,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(cvPage)
      .save();

    onProgress?.("done");
  } finally {
    // 9. Cleanup DOM
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
