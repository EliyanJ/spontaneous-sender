// ══════════════════════════════════════════
// injectCVData.ts
// Injecte les données utilisateur dans un
// template HTML balisé. AUCUNE IA impliquée.
// Fonction pure et déterministe.
// ══════════════════════════════════════════

export interface TemplateCVData {
  // Champs simples
  full_name?: string;
  main_title?: string;
  sub_titles?: string;
  phone?: string;
  email?: string;
  location?: string;
  summary?: string;
  photo?: string;
  languages_content?: string;
  interests_content?: string;

  // Listes répétables
  experiences?: Array<{
    title: string;
    date: string;
    bullets: string[];
  }>;
  entrepreneurship?: Array<{
    title: string;
    bullets: string[];
  }>;
  skills?: Array<{
    category: string;
    skill_name?: string;  // Nouveau format : 1 skill = 1 item (flux continu grid)
    detail_1: string;     // Rétrocompatibilité anciens templates
    detail_2: string;
    detail_3?: string;
  }>;
  education?: Array<{
    date: string;
    label: string;
  }>;

  // Champs supplémentaires libres
  [key: string]: any;
}

export function injectCVData(templateHtml: string, data: TemplateCVData): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(templateHtml, "text/html");

  // ── 1. Champs texte simples ──
  doc.querySelectorAll("[data-field]").forEach((el) => {
    if (el.closest("[data-list]")) return;

    const fieldId = el.getAttribute("data-field")!;
    const value = data[fieldId];

    if (value !== undefined && value !== null && value !== "") {
      el.textContent = String(value);
      el.removeAttribute("data-hidden");
    } else {
      el.setAttribute("data-hidden", "true");
    }
  });

  // ── 2. Champs image ──
  doc.querySelectorAll("[data-field-img]").forEach((el) => {
    if (el.closest("[data-list]")) return;

    const fieldId = el.getAttribute("data-field-img")!;
    const value = data[fieldId];

    if (value) {
      (el as HTMLImageElement).src = value;
      el.removeAttribute("data-hidden");
    } else {
      el.setAttribute("data-hidden", "true");
    }
  });

  // ── 3. Listes répétables ──
  doc.querySelectorAll("[data-list]").forEach((container) => {
    const listId = container.getAttribute("data-list")!;
    const items: any[] = data[listId];

    const templateItem = container.children[0];
    if (!templateItem) return;
    const templateClone = templateItem.cloneNode(true) as HTMLElement;

    container.innerHTML = "";

    if (!items || items.length === 0) return;

    items.forEach((itemData) => {
      const clone = templateClone.cloneNode(true) as HTMLElement;

      // Cas 1 : l'item template EST lui-même un data-field (ex: <span data-field="skill_name">)
      if (clone.hasAttribute("data-field")) {
        const fieldId = clone.getAttribute("data-field")!;
        const value = itemData[fieldId];
        if (value !== undefined && value !== null && value !== "") {
          clone.textContent = String(value);
          clone.removeAttribute("data-hidden");
        } else {
          clone.setAttribute("data-hidden", "true");
        }
        container.appendChild(clone);
        return;
      }

      // Cas 2 : l'item template contient des data-field enfants (ex: <div class="skill-row">)
      clone.querySelectorAll("[data-field]").forEach((el) => {
        const fieldId = el.getAttribute("data-field")!;
        const value = itemData[fieldId];

        if (value !== undefined && value !== null && value !== "") {
          el.textContent = String(value);
          el.removeAttribute("data-hidden");
        } else {
          el.setAttribute("data-hidden", "true");
        }
      });

      // Remplir les bullet lists du clone
      clone.querySelectorAll("[data-bullet-list]").forEach((ul) => {
        const bulletId = ul.getAttribute("data-bullet-list")!;
        const bullets: string[] = itemData[bulletId];

        if (!bullets || bullets.length === 0) {
          ul.setAttribute("data-hidden", "true");
          return;
        }

        const liTemplate = ul.querySelector("li");
        if (!liTemplate) return;
        const liClone = liTemplate.cloneNode(true) as HTMLElement;

        ul.innerHTML = "";

        bullets.forEach((text) => {
          if (!text?.trim()) return;
          const li = liClone.cloneNode(true) as HTMLElement;
          li.textContent = text;
          li.removeAttribute("data-hidden");
          ul.appendChild(li);
        });
      });

      container.appendChild(clone);
    });
  });

  // ── 4. Masquer les sections vides ──
  doc.querySelectorAll("[data-section]").forEach((section) => {
    const sectionId = section.getAttribute("data-section")!;
    const hasContent = checkSectionHasContent(section, data, sectionId);
    if (!hasContent) {
      section.setAttribute("data-hidden", "true");
    } else {
      section.removeAttribute("data-hidden");
    }
  });

  return doc.documentElement.outerHTML;
}

function checkSectionHasContent(
  sectionEl: Element,
  data: TemplateCVData,
  sectionId: string
): boolean {
  const listContainer = sectionEl.querySelector("[data-list]");
  if (listContainer) {
    const listId = listContainer.getAttribute("data-list")!;
    const items = data[listId];
    return Array.isArray(items) && items.length > 0;
  }

  const fields = sectionEl.querySelectorAll("[data-field]");
  for (const field of fields) {
    const fieldId = field.getAttribute("data-field")!;
    const value = data[fieldId];
    if (value !== undefined && value !== null && value !== "") {
      return true;
    }
  }

  return false;
}

/** Données fictives pour la preview admin */
export const MOCK_CV_DATA: TemplateCVData = {
  full_name: "Marie Dupont",
  main_title: "CHEF DE PROJET DIGITAL",
  sub_titles: "Marketing digital, Communication, E-business",
  phone: "+33 6 12 34 56 78",
  email: "marie.dupont@email.com",
  location: "Paris, France",
  summary:
    "Professionnelle du digital avec 5 ans d'expérience en gestion de projets web et stratégie de croissance. Orientée résultats avec une forte capacité à fédérer des équipes pluridisciplinaires.",
  photo: "",
  experiences: [
    {
      title: "Agence Digitale XYZ - Chef de projet",
      date: "2022 - 2025",
      bullets: [
        "Gestion de 12 projets web avec un budget total de 500k€",
        "Augmentation du taux de conversion de 25% via A/B testing",
        "Management d'une équipe de 5 personnes",
      ],
    },
    {
      title: "Startup ABC - Chargée de marketing",
      date: "2020 - 2022",
      bullets: [
        "Mise en place d'une stratégie SEO (+40% trafic organique)",
        "Création et gestion des campagnes Google Ads et Meta Ads",
      ],
    },
  ],
  skills: [
    { category: "Compétences techniques", skill_name: "SEO / SEA", detail_1: "SEO / SEA", detail_2: "", detail_3: "" },
    { category: "", skill_name: "Google Ads", detail_1: "Google Ads", detail_2: "", detail_3: "" },
    { category: "", skill_name: "Analytics", detail_1: "Analytics", detail_2: "", detail_3: "" },
    { category: "", skill_name: "Tag Manager", detail_1: "Tag Manager", detail_2: "", detail_3: "" },
    { category: "", skill_name: "Trello / Notion", detail_1: "Trello / Notion", detail_2: "", detail_3: "" },
    { category: "", skill_name: "Figma", detail_1: "Figma", detail_2: "", detail_3: "" },
    { category: "", skill_name: "Adobe Suite", detail_1: "Adobe Suite", detail_2: "", detail_3: "" },
    { category: "", skill_name: "HubSpot", detail_1: "HubSpot", detail_2: "", detail_3: "" },
    { category: "", skill_name: "Agile / Scrum", detail_1: "Agile / Scrum", detail_2: "", detail_3: "" },
  ],
  education: [
    { date: "2017 - 2020", label: "Master Marketing Digital - Grande École" },
    {
      date: "2014 - 2017",
      label: "Licence Économie-Gestion - Université Paris",
    },
  ],
  entrepreneurship: [
    {
      title: "Co-fondatrice — Bloom Agency",
      bullets: [
        "Création d'une agence de conseil en communication digitale",
        "10 clients PME accompagnés sur 2 ans",
      ],
    },
  ],
  languages_content: "Anglais: Courant (TOEIC 920) / Espagnol: Intermédiaire",
  interests_content: "Veille digitale, UX Design, Course à pied",
};
