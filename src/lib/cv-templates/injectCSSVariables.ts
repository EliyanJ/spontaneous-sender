// ══════════════════════════════════════════════════════
// injectCSSVariables.ts
// Injecte / remplace un bloc de variables CSS cronos
// dans le <style> d'un template HTML
// ══════════════════════════════════════════════════════

export interface DesignVars {
  "--color-header-bg": string;
  "--color-primary": string;
  "--color-text": string;
  "--color-accent": string;
  "--font-main": string;
  [key: string]: string;
}

export const DEFAULT_DESIGN_VARS: DesignVars = {
  "--color-header-bg": "#1A3C72",
  "--color-primary": "#1A3C72",
  "--color-text": "#333333",
  "--color-accent": "#C9A84C",
  "--font-main": "Inter",
};

const BLOCK_START = "/* cronos-design-vars:start */";
const BLOCK_END   = "/* cronos-design-vars:end */";

/**
 * Construit le bloc de variables CSS à injecter.
 */
function buildVarsBlock(vars: DesignVars): string {
  const lines = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");

  const fontImport = vars["--font-main"] && vars["--font-main"] !== "Arial" && vars["--font-main"] !== "Georgia"
    ? `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(vars["--font-main"]).replace(/%20/g, "+")}:wght@300;400;500;600;700&display=swap');\n  `
    : "";

  return `${BLOCK_START}\n  ${fontImport}:root {\n${lines}\n  }\n  * { font-family: var(--font-main, sans-serif); }\n  ${BLOCK_END}`;
}

/**
 * Injecte ou remplace le bloc cronos-design-vars dans le HTML.
 * Si aucun <style> n'existe, en crée un dans le <head>.
 */
export function injectCSSVariables(html: string, vars: DesignVars): string {
  const block = buildVarsBlock(vars);

  // Replace existing block
  if (html.includes(BLOCK_START)) {
    const regex = new RegExp(
      `${escapeRegex(BLOCK_START)}[\\s\\S]*?${escapeRegex(BLOCK_END)}`,
      "g"
    );
    return html.replace(regex, block);
  }

  // Inject at beginning of first <style> tag
  const styleMatch = html.match(/<style[^>]*>/i);
  if (styleMatch) {
    return html.replace(styleMatch[0], `${styleMatch[0]}\n  ${block}`);
  }

  // Inject a new <style> tag before </head>
  if (html.includes("</head>")) {
    return html.replace("</head>", `  <style>\n  ${block}\n  </style>\n</head>`);
  }

  // Last resort: prepend a <style> at the top
  return `<style>\n  ${block}\n</style>\n${html}`;
}

/**
 * Extrait les variables cronos-design-vars du HTML s'il en contient.
 * Retourne les valeurs par défaut sinon.
 */
export function extractDesignVars(html: string): DesignVars {
  const result: DesignVars = { ...DEFAULT_DESIGN_VARS };

  if (!html.includes(BLOCK_START)) return result;

  const blockRegex = new RegExp(
    `${escapeRegex(BLOCK_START)}[\\s\\S]*?${escapeRegex(BLOCK_END)}`
  );
  const block = html.match(blockRegex)?.[0] ?? "";

  // Parse CSS variable declarations
  const varRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = varRegex.exec(block)) !== null) {
    result[m[1]] = m[2].trim();
  }

  return result;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
