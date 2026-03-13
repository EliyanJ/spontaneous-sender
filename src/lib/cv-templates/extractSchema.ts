// ══════════════════════════════════════════
// extractSchema.ts
// Parse un template HTML balisé et retourne
// son schéma structuré
// ══════════════════════════════════════════

export interface FieldSchema {
  id: string;
  type: "text" | "image";
  /** Texte placeholder du template original */
  placeholder: string;
}

export interface ListSchema {
  id: string;
  /** Champs présents dans chaque item répété */
  itemFields: FieldSchema[];
  /** Bullet lists imbriquées dans chaque item */
  bulletLists: string[];
}

export interface SectionSchema {
  id: string;
  optional: boolean;
}

export interface TemplateSchema {
  fields: FieldSchema[];
  lists: ListSchema[];
  sections: SectionSchema[];
  /** true si le template contient un data-field-img="photo" */
  hasPhoto: boolean;
}

/** Champs standard attendus dans tous les templates */
export const STANDARD_FIELDS = [
  "full_name", "main_title", "phone", "email", "location", "summary",
];

export const STANDARD_LISTS = ["experiences", "education", "skills"];

export function extractSchema(html: string): TemplateSchema {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // 1. Champs simples (hors data-list)
  const fields: FieldSchema[] = [];
  doc.querySelectorAll("[data-field]").forEach((el) => {
    if (el.closest("[data-list]")) return;
    fields.push({
      id: el.getAttribute("data-field")!,
      type: "text",
      placeholder: el.textContent?.trim() || "",
    });
  });

  // Champs image
  doc.querySelectorAll("[data-field-img]").forEach((el) => {
    if (el.closest("[data-list]")) return;
    fields.push({
      id: el.getAttribute("data-field-img")!,
      type: "image",
      placeholder: (el as HTMLImageElement).src || "",
    });
  });

  // 2. Listes répétables
  const lists: ListSchema[] = [];
  doc.querySelectorAll("[data-list]").forEach((container) => {
    const listId = container.getAttribute("data-list")!;
    const templateItem = container.children[0];
    if (!templateItem) return;

    const itemFields: FieldSchema[] = [];
    templateItem.querySelectorAll("[data-field]").forEach((el) => {
      itemFields.push({
        id: el.getAttribute("data-field")!,
        type: "text",
        placeholder: el.textContent?.trim() || "",
      });
    });

    const bulletLists: string[] = [];
    templateItem.querySelectorAll("[data-bullet-list]").forEach((el) => {
      bulletLists.push(el.getAttribute("data-bullet-list")!);
    });

    lists.push({ id: listId, itemFields, bulletLists });
  });

  // 3. Sections optionnelles
  const sections: SectionSchema[] = [];
  doc.querySelectorAll("[data-section]").forEach((el) => {
    sections.push({
      id: el.getAttribute("data-section")!,
      optional: true,
    });
  });

  // 4. Photo
  const hasPhoto = doc.querySelector("[data-field-img='photo']") !== null;

  return { fields, lists, sections, hasPhoto };
}

/** Retourne la liste des champs standard manquants */
export function getMissingStandardFields(schema: TemplateSchema): string[] {
  const allFieldIds = [
    ...schema.fields.map((f) => f.id),
    ...schema.lists.map((l) => l.id),
  ];
  return STANDARD_FIELDS.filter((f) => !allFieldIds.includes(f));
}
