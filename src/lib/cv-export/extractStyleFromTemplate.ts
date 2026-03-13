// ══════════════════════════════════════════════════════════
// src/lib/cv-export/extractStyleFromTemplate.ts
// Parse le <style> du template HTML pour extraire les tokens
// de style et les passer à l'export DOCX
// ══════════════════════════════════════════════════════════

export interface DocxStyleConfig {
  /** Famille de police ex: "Arial" */
  fontFamily: string;
  /** Couleur hex des titres de section (sans #), ex: "1A3C72" */
  headingColor: string;
  /** Couleur hex du texte courant (sans #), ex: "333333" */
  textColor: string;
  /** true = ligne sous les h2 */
  headingBorder: boolean;
}

const DEFAULT_STYLE: DocxStyleConfig = {
  fontFamily: "Arial",
  headingColor: "1A3C72",
  textColor: "333333",
  headingBorder: true,
};

export function extractStyleFromTemplate(templateHtml: string): DocxStyleConfig {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(templateHtml, "text/html");
    const styleEl = doc.querySelector("style");
    if (!styleEl) return DEFAULT_STYLE;

    const css = styleEl.textContent || "";

    const result: DocxStyleConfig = { ...DEFAULT_STYLE };

    // ── Font family ──
    const fontMatch = css.match(/body\s*\{[^}]*font-family\s*:\s*([^;,}]+)/i);
    if (fontMatch) {
      // Nettoyer les quotes et prendre la première police
      const raw = fontMatch[1].trim().replace(/['"]/g, "").split(",")[0].trim();
      if (raw) result.fontFamily = raw;
    }

    // ── Couleur des headings (h2 border-bottom ou color) ──
    const h2Match = css.match(/h2\s*\{[^}]*/i);
    if (h2Match) {
      const h2Block = h2Match[0];

      // border-bottom: Xpx solid #RRGGBB
      const borderColorMatch = h2Block.match(/border(?:-bottom)?\s*:\s*[^;]*#([0-9a-fA-F]{3,8})/);
      if (borderColorMatch) {
        result.headingColor = borderColorMatch[1].padEnd(6, "0").slice(0, 6).toUpperCase();
        result.headingBorder = true;
      }

      // color: #RRGGBB
      const colorMatch = h2Block.match(/\bcolor\s*:\s*#([0-9a-fA-F]{3,8})/);
      if (colorMatch && !borderColorMatch) {
        result.headingColor = colorMatch[1].padEnd(6, "0").slice(0, 6).toUpperCase();
      }
    }

    // ── Couleur texte courant (body color) ──
    const bodyColorMatch = css.match(/body\s*\{[^}]*\bcolor\s*:\s*#([0-9a-fA-F]{3,8})/i);
    if (bodyColorMatch) {
      result.textColor = bodyColorMatch[1].padEnd(6, "0").slice(0, 6).toUpperCase();
    }

    return result;
  } catch {
    return DEFAULT_STYLE;
  }
}
