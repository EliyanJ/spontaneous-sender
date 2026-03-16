import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_DESIGN_VARS, type DesignVars } from "@/lib/cv-templates/injectCSSVariables";

// ─── Config ───────────────────────────────────────────────────────────────────

const DESIGN_FIELDS: { key: keyof DesignVars; label: string; type: "color" | "font" }[] = [
  { key: "--color-header-bg", label: "Fond de l'en-tête", type: "color" },
  { key: "--color-primary",   label: "Titres de section",  type: "color" },
  { key: "--color-text",      label: "Texte courant",       type: "color" },
  { key: "--color-accent",    label: "Éléments d'accent",  type: "color" },
  { key: "--font-main",       label: "Police d'écriture",   type: "font"  },
];

const FONTS = [
  "Inter", "Arial", "Georgia", "Montserrat", "Roboto",
  "Playfair Display", "Lato", "Open Sans", "Raleway",
];

interface Props {
  vars: DesignVars;
  onChange: (updated: DesignVars) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DesignPanel: React.FC<Props> = ({ vars, onChange }) => {
  function updateVar(key: keyof DesignVars, value: string) {
    onChange({ ...vars, [key]: value });
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Les changements sont appliqués instantanément dans l'aperçu via des variables CSS.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-muted-foreground shrink-0"
          onClick={() => onChange({ ...DEFAULT_DESIGN_VARS })}
          title="Réinitialiser aux valeurs par défaut"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-3.5 w-3.5 text-primary" />
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">Couleurs &amp; Police</h4>
        </div>

        {DESIGN_FIELDS.map(({ key, label, type }) => (
          <div key={key} className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground w-40 shrink-0">{label}</Label>

            {type === "color" ? (
              <div className="flex items-center gap-2">
                <div className="relative w-8 h-8 rounded border border-border overflow-hidden cursor-pointer">
                  <input
                    type="color"
                    value={vars[key] as string}
                    onChange={(e) => updateVar(key, e.target.value)}
                    className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                    title={label}
                  />
                  <div
                    className="w-full h-full rounded"
                    style={{ backgroundColor: vars[key] as string }}
                  />
                </div>
                <input
                  type="text"
                  value={vars[key] as string}
                  onChange={(e) => updateVar(key, e.target.value)}
                  className="h-7 w-24 text-xs font-mono border border-border rounded px-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="#000000"
                  maxLength={7}
                />
              </div>
            ) : (
              <Select value={vars[key] as string} onValueChange={(v) => updateVar(key, v)}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((f) => (
                    <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
      </div>

      {/* Preview swatch */}
      <div
        className="rounded-lg overflow-hidden border border-border shadow-sm"
        style={{ fontFamily: vars["--font-main"] as string }}
      >
        <div
          className="px-4 py-3"
          style={{ backgroundColor: vars["--color-header-bg"] as string }}
        >
          <p className="text-white text-sm font-semibold">Jean Dupont</p>
          <p className="text-white/80 text-xs">Développeur Full Stack</p>
        </div>
        <div className="bg-white px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="h-0.5 flex-1"
              style={{ backgroundColor: vars["--color-primary"] as string }}
            />
            <p
              className="text-xs font-bold uppercase"
              style={{ color: vars["--color-primary"] as string }}
            >
              Expériences
            </p>
            <div
              className="h-0.5 flex-1"
              style={{ backgroundColor: vars["--color-primary"] as string }}
            />
          </div>
          <p
            className="text-xs"
            style={{ color: vars["--color-text"] as string }}
          >
            Développement d'applications web en React &amp; Node.js.
          </p>
          <div className="flex gap-1.5">
            {["React", "Node.js", "SQL"].map((s) => (
              <span
                key={s}
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${vars["--color-accent"]}22`,
                  color: vars["--color-accent"] as string,
                  border: `1px solid ${vars["--color-accent"]}44`,
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
