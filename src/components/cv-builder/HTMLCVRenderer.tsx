// ══════════════════════════════════════════
// HTMLCVRenderer.tsx
// Composant de preview A4 qui injecte les données
// dans le template HTML balisé via un iframe isolé
// ══════════════════════════════════════════

import { useMemo } from "react";
import { injectCVData, type TemplateCVData } from "@/lib/cv-templates/injectCVData";

interface HTMLCVRendererProps {
  /** HTML brut du template (avec <style> intégré) */
  templateHtml: string;
  /** Données à injecter */
  cvData: TemplateCVData;
  /**
   * Échelle d'affichage (défaut 1).
   * Appliqué via transform: scale() avec transformOrigin top left.
   */
  scale?: number;
  /** Classe CSS sur le conteneur externe */
  className?: string;
}

// Dimensions A4 en mm → px à 96dpi
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export function HTMLCVRenderer({
  templateHtml,
  cvData,
  scale = 1,
  className = "",
}: HTMLCVRendererProps) {
  // Injection mémorisée : ne recalcule que si templateHtml ou cvData changent
  const renderedHtml = useMemo(
    () => injectCVData(templateHtml, cvData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [templateHtml, JSON.stringify(cvData)]
  );

  return (
    <div
      className={className}
      style={{
        width: `${A4_WIDTH_MM}mm`,
        height: `${A4_HEIGHT_MM}mm`,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        flexShrink: 0,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* iframe sandboxé pour isoler totalement le CSS du template */}
      <iframe
        srcDoc={renderedHtml}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
        sandbox="allow-same-origin"
        title="Aperçu CV"
      />
    </div>
  );
}

/** Hauteur réelle en px selon le scale */
export function getHTMLRendererHeight(scale = 1): number {
  // 297mm à 96dpi ≈ 1122px
  return Math.round(297 * 3.7795275591 * scale);
}

/** Largeur réelle en px selon le scale */
export function getHTMLRendererWidth(scale = 1): number {
  // 210mm à 96dpi ≈ 794px
  return Math.round(210 * 3.7795275591 * scale);
}
