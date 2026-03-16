import React from "react";
import { Info, List, Type, Hash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { TemplateSchema } from "@/lib/cv-templates/extractSchema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FieldConstraint {
  maxChars?: number;
  maxLines?: number;
  maxItems?: number;
  maxBulletsPerItem?: number;
  bulletMaxChars?: number;
}

export type ConstraintsMap = Record<string, FieldConstraint>;

interface Props {
  schema: TemplateSchema | null;
  constraints: ConstraintsMap;
  onChange: (updated: ConstraintsMap) => void;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

const HUMAN_LABELS: Record<string, string> = {
  full_name: "Nom complet",
  main_title: "Titre principal",
  phone: "Téléphone",
  email: "Email",
  location: "Localisation",
  summary: "Résumé / Accroche",
  experiences: "Expériences",
  education: "Formations",
  skills: "Compétences",
  title: "Intitulé du poste",
  company: "Nom de l'entreprise",
  date: "Période / Dates",
  description: "Description",
  label: "Diplôme / Formation",
  skill_name: "Compétence",
  languages_content: "Langues",
  interests_content: "Centres d'intérêt",
};

function humanize(id: string): string {
  return HUMAN_LABELS[id] ?? id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Sub-component: NumberInput ───────────────────────────────────────────────

function NumberInput({
  label, value, onChange, placeholder, icon: Icon,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-3 w-3 text-muted-foreground shrink-0" />}
      <Label className="text-xs text-muted-foreground w-40 shrink-0">{label}</Label>
      <Input
        type="number"
        min={1}
        max={9999}
        className="h-7 w-20 text-xs text-right"
        placeholder={placeholder ?? "—"}
        value={value ?? ""}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(isNaN(n) ? undefined : n);
        }}
      />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export const ConstraintsPanel: React.FC<Props> = ({ schema, constraints, onChange }) => {
  if (!schema) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div>
          <Info className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">Aucun schéma détecté.<br />Uploadez ou éditez un template HTML.</p>
        </div>
      </div>
    );
  }

  // Update helper
  function update(id: string, key: keyof FieldConstraint, value: number | undefined) {
    onChange({
      ...constraints,
      [id]: { ...(constraints[id] ?? {}), [key]: value },
    });
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      <p className="text-xs text-muted-foreground">
        Définissez les limites par section. Elles seront appliquées dans le CV Builder utilisateur.
      </p>

      {/* ── Champs simples ── */}
      {schema.fields.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Type className="h-3.5 w-3.5 text-primary" />
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">Champs simples</h4>
          </div>

          {schema.fields.map((field) => (
            <div key={field.id} className="pl-2 border-l-2 border-border space-y-1.5">
              <p className="text-xs font-medium text-foreground">{humanize(field.id)}</p>
              <NumberInput
                label="Max caractères"
                value={constraints[field.id]?.maxChars}
                onChange={(v) => update(field.id, "maxChars", v)}
                placeholder="illimité"
                icon={Hash}
              />
              <NumberInput
                label="Max lignes"
                value={constraints[field.id]?.maxLines}
                onChange={(v) => update(field.id, "maxLines", v)}
                placeholder="illimité"
                icon={List}
              />
            </div>
          ))}
        </div>
      )}

      {schema.fields.length > 0 && schema.lists.length > 0 && <Separator />}

      {/* ── Listes répétables ── */}
      {schema.lists.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <List className="h-3.5 w-3.5 text-primary" />
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">Listes répétables</h4>
          </div>

          {schema.lists.map((list) => (
            <div key={list.id} className="pl-2 border-l-2 border-primary/30 space-y-2">
              <p className="text-xs font-semibold text-foreground">{humanize(list.id)}</p>

              {/* Limite d'items */}
              <NumberInput
                label="Nb max d'éléments"
                value={constraints[list.id]?.maxItems}
                onChange={(v) => update(list.id, "maxItems", v)}
                placeholder="illimité"
                icon={Hash}
              />

              {/* Bullets */}
              {list.bulletLists.length > 0 && (
                <>
                  <NumberInput
                    label="Nb max de bullets / élément"
                    value={constraints[list.id]?.maxBulletsPerItem}
                    onChange={(v) => update(list.id, "maxBulletsPerItem", v)}
                    placeholder="illimité"
                    icon={List}
                  />
                  <NumberInput
                    label="Max caractères par bullet"
                    value={constraints[list.id]?.bulletMaxChars}
                    onChange={(v) => update(list.id, "bulletMaxChars", v)}
                    placeholder="illimité"
                    icon={Hash}
                  />
                </>
              )}

              {/* Champs enfant */}
              {list.itemFields.length > 0 && (
                <div className="pl-3 space-y-1.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Champs de chaque élément</p>
                  {list.itemFields.map((f) => (
                    <div key={`${list.id}.${f.id}`} className="flex items-center gap-2">
                      <code className="text-[10px] font-mono text-primary w-28 shrink-0">{f.id}</code>
                      <Input
                        type="number"
                        min={1}
                        max={9999}
                        className="h-6 w-20 text-xs text-right"
                        placeholder="max car."
                        value={constraints[`${list.id}.${f.id}`]?.maxChars ?? ""}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          onChange({
                            ...constraints,
                            [`${list.id}.${f.id}`]: {
                              ...(constraints[`${list.id}.${f.id}`] ?? {}),
                              maxChars: isNaN(n) ? undefined : n,
                            },
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {schema.fields.length === 0 && schema.lists.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Aucun champ <code className="text-xs">data-field</code> ou <code className="text-xs">data-list</code> détecté dans le template.
        </div>
      )}
    </div>
  );
};
