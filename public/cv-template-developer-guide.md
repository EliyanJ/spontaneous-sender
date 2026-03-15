# Guide développeur — Système de templates CV (html-v1)

> **Version** : 2.0 — Mars 2026  
> **Auteur** : Architecture Cronos  
> **Audience** : Développeurs, IA assistante (Cursor, Copilot, etc.), admins techniques

---

## Table des matières

1. [Architecture globale](#1-architecture-globale)
2. [Les deux types de templates](#2-les-deux-types-de-templates)
3. [Flux de données complet](#3-flux-de-données-complet)
4. [Table de correspondance CVData → TemplateCVData](#4-table-de-correspondance)
5. [Référence complète des balises data-*](#5-référence-des-balises-data-)
6. [Tous les champs disponibles avec limites](#6-tous-les-champs-avec-limites-de-caractères)
7. [Structure des listes répétables](#7-structure-des-listes-répétables)
8. [Contraintes CSS obligatoires](#8-contraintes-css-obligatoires)
9. [Limites de contenu A4 — récapitulatif](#9-limites-de-contenu-a4)
10. [Template de base minimal prêt à l'emploi](#10-template-de-base-minimal)
11. [Template deux colonnes (avec photo)](#11-template-deux-colonnes-avec-photo)
12. [Erreurs courantes et comment les éviter](#12-erreurs-courantes)
13. [Checklist de validation avant publication](#13-checklist-de-validation)

---

## 1. Architecture globale

Le système de création de CV Cronos repose sur trois couches distinctes :

```
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 1 — DONNÉES (TypeScript)                                │
│  src/lib/cv-templates.ts → interface CVData                     │
│  Format structuré typé : experiences[], skills{}, education[]   │
└────────────────────────────┬────────────────────────────────────┘
                             │ adaptCVDataForTemplate()
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 2 — ADAPTATION (TypeScript)                             │
│  src/lib/cv-templates/adaptCVDataForTemplate.ts                 │
│  Aplatit CVData → TemplateCVData (format plat clé:valeur)       │
│  Exemples : full_name, experiences[], skills[], etc.            │
└────────────────────────────┬────────────────────────────────────┘
                             │ injectCVData()
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 3 — RENDU (HTML/DOM)                                    │
│  src/lib/cv-templates/injectCVData.ts                           │
│  Parse le HTML template avec DOMParser                          │
│  Remplace les data-* attributs par les valeurs réelles          │
│  Retourne un string HTML complet                                │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTML injecté
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 4 — AFFICHAGE (React)                                   │
│  src/components/cv-builder/HTMLCVRenderer.tsx                   │
│  Iframe isolée (sandbox), scale CSS 0.348 dans l'éditeur        │
│  Scale 0.7 dans l'aperçu admin                                  │
│  Viewport interne : 794px × 1123px (équivalent A4 à 96dpi)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Les deux types de templates

### ❌ Legacy (React JSX) — NE PAS UTILISER pour les nouveaux templates

Fichier : `src/components/cv-builder/CVPreview.tsx`

- Composants React hardcodés : `ClassicTemplate`, `DarkTemplate`, `LightTemplate`, `GeoTemplate`, `ModernTemplate`, `MinimalTemplate`
- Reçoivent directement `CVData` en props
- Pas de balises `data-*`
- Pas stockés en base de données
- **Ne peuvent pas être créés/édités via l'admin**

### ✅ html-v1 (nouveau système) — SEUL SYSTÈME À UTILISER

- Fichier HTML avec balises `data-*` sémantiques
- Stocké en base de données dans `cv_templates.html_template`
- Créable et éditable via l'admin (`/admin/cv-templates`)
- Supporte la prévisualisation temps réel
- Supporte la photo (`has_photo: true` dans le JSON de html_template)

---

## 3. Flux de données complet

### Import d'un CV existant (PDF/DOCX/TXT)

```
Fichier utilisateur (PDF/DOCX/TXT)
    │
    ▼ Edge Function: parse-cv-document
    │ Extraction du texte brut via PDF.js ou mammoth.js
    │
    ▼ Edge Function: generate-cv-content
    │ Prompt Gemini 2.5 Pro → JSON structuré
    │ Retourne un objet CVData
    │
    ▼ cvDataValidator.ts (nouveau)
    │ Vérifie les limites de caractères
    │ Si violations → CVTruncationDialog → choix utilisateur
    │
    ▼ setCvData() dans CVBuilder.tsx
    │ Met à jour le state React
    │
    ▼ adaptCVDataForTemplate()
    │ CVData → TemplateCVData (format plat)
    │
    ▼ injectCVData()
    │ Template HTML + TemplateCVData → HTML final
    │
    ▼ HTMLCVRenderer
      Affichage dans iframe isolée (scale 0.348)
```

### Création manuelle étape par étape

```
CVBuilder.tsx (step = "editor")
    │
    ▼ CVBuilderEditor.tsx
    │ 7 étapes : Infos → Résumé → Expériences → Formation → Compétences → Langues → Design
    │
    ▼ Chaque changement → onChange(cvData)
    │
    ▼ adaptCVDataForTemplate() (temps réel)
    │
    ▼ injectCVData() (temps réel)
    │
    ▼ HTMLCVRenderer (prévisualisation droite, mise à jour instantanée)
```

---

## 4. Table de correspondance

### CVData → TemplateCVData (opérée par `adaptCVDataForTemplate.ts`)

| Champ TemplateCVData | Source dans CVData | Transformation |
|---|---|---|
| `full_name` | `personalInfo.firstName` + `personalInfo.lastName` | Concaténation avec espace |
| `main_title` | `personalInfo.title` | Direct |
| `sub_titles` | `(cvData as any).targetJobs` | Direct (optionnel) |
| `phone` | `personalInfo.phone` | Direct |
| `email` | `personalInfo.email` | Direct |
| `location` | `personalInfo.address` | Direct |
| `linkedin` | `personalInfo.linkedin` | Direct |
| `summary` | `summary` | Direct |
| `photo` | `designOptions.photoUrl` | Passé en 2e paramètre de `adaptCVDataForTemplate` |
| `experiences[].title` | `exp.company` + `exp.role` | Concaténation `"Entreprise - Poste"` |
| `experiences[].date` | `exp.dates` | Direct |
| `experiences[].bullets` | `exp.bullets` | Filtre les vides avec `.filter(Boolean)` |
| `education[].date` | `edu.dates` | Direct |
| `education[].label` | `edu.degree` + `edu.school` | Concaténation `"Diplôme - École"` |
| `skills[]` | `skills.technical` | Max 16, chaque skill = 1 item avec `skill_name` ET `name` ET `detail_1` |
| `languages_content` | `languages[]` + `skills.soft` | Format `"Anglais: Courant / Soft Skills: Leadership, ..."` |
| `interests_content` | `interests[]` | `.join(", ")` |

> **Note importante** : `languages_content` et `interests_content` sont des **chaînes de texte simples**, pas des listes. Ils sont injectés dans un `data-field` unique.

---

## 5. Référence des balises data-*

### 5.1 `data-field="id"` — Champ texte simple

Remplace le contenu textuel de l'élément par la valeur correspondante. Si la valeur est vide, ajoute `data-hidden="true"` qui masque l'élément via CSS.

```html
<span data-field="full_name">Prénom Nom</span>
<span data-field="main_title">TITRE DU POSTE</span>
<span data-field="phone">+33 6 00 00 00 00</span>
<span data-field="email">email@exemple.com</span>
<span data-field="location">Paris, France</span>
<span data-field="linkedin">linkedin.com/in/profil</span>
<p data-field="summary">Texte de profil...</p>
<span data-field="languages_content">Anglais: Courant / Espagnol: Intermédiaire</span>
<span data-field="interests_content">Veille, Sport, Lecture</span>
```

### 5.2 `data-field-img="id"` — Champ image

Remplace l'attribut `src` de l'élément `<img>`. Si la valeur est vide, l'image est masquée.

```html
<img 
  data-field-img="photo" 
  src="" 
  alt="Photo de profil"
  style="width:80px; height:80px; border-radius:50%; object-fit:cover;"
/>
```

### 5.3 `data-section="id"` — Section conditionnelle

Masque toute la section si elle est vide. Fonctionne en vérifiant si les `data-list` ou `data-field` enfants ont du contenu.

```html
<section data-section="experiences">
  <!-- ... contenu de la section ... -->
</section>

<section data-section="skills">
  <!-- ... contenu de la section ... -->
</section>
```

**Valeurs de `data-section` recommandées** :
- `experiences` — correspond à `data-list="experiences"`
- `skills` — correspond à `data-list="skills"`
- `education` — correspond à `data-list="education"`
- `languages` — correspond à `data-field="languages_content"`
- `interests` — correspond à `data-field="interests_content"`
- `entrepreneurship` — correspond à `data-list="entrepreneurship"`

### 5.4 `data-list="id"` — Conteneur répétable

**Le premier enfant direct** est utilisé comme template de répétition. Il est cloné pour chaque élément de la liste. Tous les éléments existants du conteneur sont supprimés puis recréés.

```html
<div data-list="experiences">
  <!-- Seul le PREMIER enfant direct est utilisé comme template -->
  <div class="exp-item">
    <!-- data-field et data-bullet-list ENFANTS sont remplis -->
  </div>
</div>
```

**⚠️ CRITIQUE** : Le conteneur `data-list` ne doit contenir qu'**un seul enfant direct** qui sert de template. Si vous en mettez plusieurs, seul le premier sera utilisé.

### 5.5 `data-bullet-list="id"` — Liste de puces dynamique

**Doit être à l'intérieur d'un item de `data-list`**. Le premier `<li>` est cloné pour chaque bullet. Masqué si la liste est vide.

```html
<ul data-bullet-list="bullets">
  <!-- Seul le PREMIER <li> est utilisé comme template -->
  <li>Réalisation exemple</li>
</ul>
```

**⚠️ CRITIQUE pour les expériences** : Si vous oubliez `data-bullet-list="bullets"`, les réalisations (bullets) ne s'afficheront jamais. C'est l'erreur la plus fréquente.

---

## 6. Tous les champs avec limites de caractères

### Champs simples (data-field)

| Champ `data-field` | Description | Limite max | Notes |
|---|---|---|---|
| `full_name` | Prénom + Nom | **40 car.** | Ex: "Marie-Christine Dupont-Lefebvre" |
| `main_title` | Titre du poste | **60 car.** | En MAJUSCULES recommandé |
| `sub_titles` | Sous-titre / métiers cibles | **80 car.** | Optionnel |
| `phone` | Numéro de téléphone | **20 car.** | Format libre |
| `email` | Adresse e-mail | **45 car.** | — |
| `location` | Ville, Pays | **40 car.** | Ex: "Paris, Île-de-France" |
| `linkedin` | URL LinkedIn | **50 car.** | Sans `https://` recommandé |
| `summary` | Résumé / accroche | **400 car.** | **Forcé côté UI** via maxLength |
| `languages_content` | Langues + soft skills | **120 car.** | Chaîne formatée automatiquement |
| `interests_content` | Centres d'intérêt | **80 car.** | Chaîne formatée automatiquement |

### Champs dans les listes (data-list items)

| Context | Champ `data-field` | Description | Limite max |
|---|---|---|---|
| `experiences` item | `title` | "Entreprise - Poste" concaténé | **60 car.** |
| `experiences` item | `date` | Période ex: "2022 - Présent" | **20 car.** |
| `experiences` item | `bullets` (via data-bullet-list) | Chaque réalisation | **90 car./bullet** |
| `education` item | `label` | "Diplôme - École" concaténé | **70 car.** |
| `education` item | `date` | Période ex: "2018 - 2020" | **20 car.** |
| `skills` item | `skill_name` | Nom de la compétence | **30 car.** |
| `skills` item | `name` | Alias de `skill_name` (rétrocompat) | **30 car.** |
| `entrepreneurship` item | `title` | Titre du projet | **60 car.** |
| `entrepreneurship` item | `bullets` (via data-bullet-list) | Description du projet | **90 car./bullet** |

### Image

| Champ `data-field-img` | Description | Notes |
|---|---|---|
| `photo` | URL de la photo de profil | JPG/PNG, idéalement carré |

---

## 7. Structure des listes répétables

### 7.1 Expériences professionnelles

```html
<!-- OBLIGATOIRE : data-section pour masquage si vide -->
<section data-section="experiences" style="margin-bottom: 18px;">
  <h2 class="section-title">Expériences professionnelles</h2>
  
  <!-- data-list : conteneur répétable -->
  <div data-list="experiences">
    <!-- UN SEUL item enfant direct = template de répétition -->
    <div class="exp-item" style="margin-bottom: 10px;">
      
      <!-- Ligne titre + date sur la même ligne -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <!-- OBLIGATOIRE : data-field="title" pour "Entreprise - Poste" -->
        <div data-field="title" style="font-weight: 700; font-size: 11px; color: var(--primary-color, #333);">
          Entreprise - Poste
        </div>
        <!-- OBLIGATOIRE : data-field="date" pour la période -->
        <div data-field="date" style="font-size: 10px; color: #666; white-space: nowrap; margin-left: 8px;">
          2022 - Présent
        </div>
      </div>
      
      <!-- OBLIGATOIRE : data-bullet-list="bullets" pour les réalisations -->
      <!-- Sans cette balise, les réalisations ne s'affichent PAS -->
      <ul data-bullet-list="bullets" style="margin: 4px 0 0 14px; padding: 0; list-style: disc;">
        <!-- UN SEUL <li> enfant direct = template de répétition -->
        <li style="font-size: 10px; line-height: 1.4; margin-bottom: 2px; color: #444;">
          Réalisation exemple (max 90 car.)
        </li>
      </ul>
      
    </div>
  </div>
</section>
```

### 7.2 Compétences techniques

```html
<section data-section="skills" style="margin-bottom: 18px;">
  <h2 class="section-title">Compétences</h2>
  
  <!-- Grille 4 colonnes recommandée pour tenir sur A4 -->
  <div data-list="skills" style="
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px 10px;
  ">
    <!-- UN SEUL item enfant direct = template -->
    <!-- Ici l'item EST lui-même le data-field (cas simplifié) -->
    <span 
      data-field="skill_name" 
      class="skill-item"
      style="
        font-size: 11px;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 1px 0;
      "
    >
      Compétence
    </span>
  </div>
</section>
```

> **Compatibilité** : Le champ `name` est un alias de `skill_name`. Les deux fonctionnent. Préférez `skill_name` pour les nouveaux templates.

### 7.3 Formations / Éducation

```html
<section data-section="education" style="margin-bottom: 18px;">
  <h2 class="section-title">Formation</h2>
  
  <div data-list="education">
    <div class="edu-item" style="
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    ">
      <!-- OBLIGATOIRE : data-field="label" pour "Diplôme - École" -->
      <div data-field="label" style="font-size: 11px; font-weight: 600; color: #333;">
        Master Finance - HEC Paris
      </div>
      <!-- OBLIGATOIRE : data-field="date" pour la période -->
      <div data-field="date" style="font-size: 10px; color: #666; white-space: nowrap; margin-left: 8px;">
        2018 - 2020
      </div>
    </div>
  </div>
</section>
```

### 7.4 Entrepreneuriat (optionnel)

```html
<section data-section="entrepreneurship" style="margin-bottom: 18px;">
  <h2 class="section-title">Entrepreneuriat</h2>
  
  <div data-list="entrepreneurship">
    <div class="entrep-item" style="margin-bottom: 8px;">
      <div data-field="title" style="font-weight: 700; font-size: 11px;">Projet / Entreprise</div>
      <ul data-bullet-list="bullets" style="margin: 4px 0 0 14px; padding: 0; list-style: disc;">
        <li style="font-size: 10px; line-height: 1.4; margin-bottom: 2px;">Description</li>
      </ul>
    </div>
  </div>
</section>
```

---

## 8. Contraintes CSS obligatoires

Chaque template **DOIT** respecter ces règles CSS pour garantir le rendu A4 correct.

```css
/* ═══════════════════════════════════════════════════════
   OBLIGATOIRE — Structure de page A4
   ═══════════════════════════════════════════════════════ */

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.cv-page {
  width: 210mm;             /* Largeur A4 exacte */
  min-height: 297mm;        /* Hauteur A4 minimale */
  max-height: 297mm;        /* CRITIQUE : limite stricte pour tenir sur 1 page */
  background: white;
  margin: 0 auto;
  padding: 30px 40px;       /* Marges standard (ajustables mais ~30px mini) */
  box-sizing: border-box;
  overflow: hidden;         /* CRITIQUE : cache tout débordement */
  max-width: 100%;          /* CRITIQUE : évite le scroll horizontal dans l'iframe */
  font-family: 'Arial', sans-serif; /* Police lisible et ATS-compatible */
  font-size: 11px;          /* Base recommandée : 10-12px */
  line-height: 1.4;         /* Interligne standard */
  color: #333;              /* Couleur texte par défaut */
  position: relative;       /* Pour les positionnements absolus éventuels */
}

/* ═══════════════════════════════════════════════════════
   OBLIGATOIRE — Masquage des champs vides
   Injecté automatiquement par injectCVData() mais 
   à inclure dans le template pour la preview admin
   ═══════════════════════════════════════════════════════ */

[data-hidden="true"] {
  display: none !important;
  margin: 0 !important;
  padding: 0 !important;
  line-height: 0 !important;
  height: 0 !important;
}

/* ═══════════════════════════════════════════════════════
   RECOMMANDÉ — Variables de couleur dynamiques
   Les couleurs sont injectées via inline style sur .cv-page
   par le design system du builder
   ═══════════════════════════════════════════════════════ */

/* Utiliser des variables CSS pour les couleurs dynamiques */
:root {
  --primary-color: #0f1b3d;   /* Remplacé dynamiquement par le builder */
  --accent-color: #c9a84c;    /* Remplacé dynamiquement */
  --text-color: #1a1a2e;      /* Remplacé dynamiquement */
}

/* ═══════════════════════════════════════════════════════
   RECOMMANDÉ — Titres de section
   ═══════════════════════════════════════════════════════ */

.section-title {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--primary-color, #333);
  border-bottom: 1.5px solid var(--primary-color, #333);
  padding-bottom: 3px;
  margin-bottom: 8px;
}

/* ═══════════════════════════════════════════════════════
   RECOMMANDÉ — Compétences en grille 4 colonnes
   ═══════════════════════════════════════════════════════ */

[data-list="skills"] {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px 10px;
}

[data-list="skills"] [data-field="skill_name"],
[data-list="skills"] [data-field="name"] {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  line-height: 1.3;
}

/* ═══════════════════════════════════════════════════════
   RECOMMANDÉ — Bullet lists d'expériences
   ═══════════════════════════════════════════════════════ */

[data-bullet-list="bullets"] {
  margin: 3px 0 0 14px;
  padding: 0;
  list-style: disc;
}

[data-bullet-list="bullets"] li {
  font-size: 10px;
  line-height: 1.4;
  margin-bottom: 2px;
  color: #444;
}

/* ═══════════════════════════════════════════════════════
   INTERDITS
   ═══════════════════════════════════════════════════════ */

/* ❌ NE PAS UTILISER :
   - overflow: visible sur .cv-page
   - margin négative qui sort du conteneur
   - position: fixed (ne respecte pas le viewport de l'iframe)
   - font-size > 13px pour le contenu principal
   - height: 100vh (ne fonctionne pas dans l'iframe scalée)
*/
```

---

## 9. Limites de contenu A4

Ces limites garantissent que le CV tient sur une seule page A4 avec une mise en page lisible.

```
┌──────────────────────────────┬───────────────┬────────────────────────────────┐
│ Section                      │ Limite        │ Notes                          │
├──────────────────────────────┼───────────────┼────────────────────────────────┤
│ Résumé / Accroche            │ 400 car. max  │ Forcé via maxLength dans le UI │
│ Nom complet                  │ 40 car. max   │ —                              │
│ Titre du poste               │ 60 car. max   │ —                              │
│ Ville / Localisation         │ 40 car. max   │ —                              │
│ Chaque bullet expérience     │ 90 car. max   │ ⚠️ Erreur la plus fréquente   │
│ Bullets par expérience       │ 4 max         │ 3 recommandé                   │
│ Expériences                  │ 3-4 max       │ 3 si bullets longs             │
│ Formations                   │ 3 max         │ —                              │
│ Compétences techniques       │ 16 max        │ Grille 4×4                     │
│ Langues + soft skills        │ 120 car. max  │ Chaîne texte unique            │
│ Centres d'intérêt            │ 80 car. max   │ —                              │
│ Entrepreneuriat              │ 2 max         │ Optionnel                      │
└──────────────────────────────┴───────────────┴────────────────────────────────┘
```

---

## 10. Template de base minimal

Template complet, fonctionnel, prêt à copier-coller dans l'admin.  
**Aucun élément de ce template n'est superflu.** Chaque balise est requise.

```html
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: white; }

.cv-page {
  width: 210mm;
  min-height: 297mm;
  max-height: 297mm;
  background: white;
  margin: 0 auto;
  padding: 28px 36px;
  overflow: hidden;
  max-width: 100%;
  font-family: Arial, sans-serif;
  font-size: 11px;
  line-height: 1.4;
  color: #1a1a2e;
  display: flex;
  flex-direction: column;
}

[data-hidden="true"] {
  display: none !important;
  margin: 0 !important;
  padding: 0 !important;
  line-height: 0 !important;
  height: 0 !important;
}

/* En-tête */
.cv-header {
  background: #0f1b3d;
  color: white;
  padding: 20px 28px;
  margin: -28px -36px 20px -36px;
}
.cv-header-name { font-size: 22px; font-weight: 800; letter-spacing: 0.04em; }
.cv-header-title { font-size: 11px; opacity: 0.85; margin-top: 3px; letter-spacing: 0.06em; }
.cv-header-contacts { display: flex; gap: 16px; margin-top: 8px; flex-wrap: wrap; }
.cv-header-contacts span { font-size: 9.5px; opacity: 0.8; }

/* Sections */
.section-title {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #0f1b3d;
  border-bottom: 1.5px solid #0f1b3d;
  padding-bottom: 3px;
  margin-bottom: 7px;
}

.cv-section { margin-bottom: 14px; }

/* Résumé */
.summary-text { font-size: 10.5px; line-height: 1.5; color: #333; }

/* Expériences */
.exp-item { margin-bottom: 9px; }
.exp-header { display: flex; justify-content: space-between; align-items: flex-start; }
.exp-title { font-weight: 700; font-size: 11px; color: #0f1b3d; flex: 1; }
.exp-date { font-size: 10px; color: #666; white-space: nowrap; margin-left: 8px; }
[data-bullet-list="bullets"] {
  margin: 3px 0 0 14px;
  padding: 0;
  list-style: disc;
}
[data-bullet-list="bullets"] li {
  font-size: 10px;
  line-height: 1.4;
  margin-bottom: 2px;
  color: #444;
}

/* Grille 2 colonnes pour Compétences + Formation / Langues */
.cv-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 28px; }

/* Compétences */
[data-list="skills"] {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px 8px;
}
[data-list="skills"] [data-field] {
  font-size: 10.5px;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 1px 0;
}

/* Formation */
.edu-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}
.edu-label { font-size: 10.5px; font-weight: 600; color: #1a1a2e; flex: 1; }
.edu-date { font-size: 10px; color: #666; white-space: nowrap; margin-left: 8px; }

/* Langues & Intérêts */
.lang-text { font-size: 10.5px; line-height: 1.5; color: #444; }

</style>
</head>
<body>
<div class="cv-page">

  <!-- ═══ EN-TÊTE ═══ -->
  <div class="cv-header">
    <div class="cv-header-name" data-field="full_name">Prénom Nom</div>
    <div class="cv-header-title" data-field="main_title">TITRE DU POSTE</div>
    <div class="cv-header-contacts">
      <span data-field="phone">📞 +33 6 00 00 00 00</span>
      <span data-field="email">✉ email@exemple.com</span>
      <span data-field="location">📍 Paris, France</span>
      <span data-field="linkedin">🔗 linkedin.com/in/profil</span>
    </div>
  </div>

  <!-- ═══ RÉSUMÉ ═══ -->
  <section data-section="summary" class="cv-section">
    <div class="section-title">Profil</div>
    <p class="summary-text" data-field="summary">
      Texte de présentation professionnel.
    </p>
  </section>

  <!-- ═══ EXPÉRIENCES ═══ -->
  <section data-section="experiences" class="cv-section">
    <div class="section-title">Expériences professionnelles</div>
    
    <div data-list="experiences">
      <div class="exp-item">
        <div class="exp-header">
          <div class="exp-title" data-field="title">Entreprise - Poste</div>
          <div class="exp-date" data-field="date">2022 - Présent</div>
        </div>
        <ul data-bullet-list="bullets">
          <li>Réalisation professionnelle (max 90 car.)</li>
        </ul>
      </div>
    </div>
  </section>

  <!-- ═══ COMPÉTENCES + FORMATION (2 colonnes) ═══ -->
  <div class="cv-two-col">

    <!-- Colonne gauche : Compétences -->
    <section data-section="skills" class="cv-section">
      <div class="section-title">Compétences</div>
      <div data-list="skills">
        <span data-field="skill_name" class="skill-item">Compétence</span>
      </div>
    </section>

    <!-- Colonne droite : Formation -->
    <section data-section="education" class="cv-section">
      <div class="section-title">Formation</div>
      <div data-list="education">
        <div class="edu-item">
          <div class="edu-label" data-field="label">Diplôme - École</div>
          <div class="edu-date" data-field="date">2018 - 2020</div>
        </div>
      </div>
    </section>

  </div>

  <!-- ═══ LANGUES & INTÉRÊTS ═══ -->
  <div class="cv-two-col">

    <section data-section="languages" class="cv-section">
      <div class="section-title">Langues & Soft Skills</div>
      <p class="lang-text" data-field="languages_content">
        Anglais: Courant / Soft Skills: Leadership, Communication
      </p>
    </section>

    <section data-section="interests" class="cv-section">
      <div class="section-title">Intérêts</div>
      <p class="lang-text" data-field="interests_content">
        Veille digitale, Course à pied, Photographie
      </p>
    </section>

  </div>

</div>
</body>
</html>
```

---

## 11. Template deux colonnes (avec photo)

Template avancé avec sidebar colorée + photo. Pour activer la photo dans l'admin, le JSON doit contenir `has_photo: true`.

```html
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: white; }

.cv-page {
  width: 210mm;
  min-height: 297mm;
  max-height: 297mm;
  background: white;
  margin: 0 auto;
  overflow: hidden;
  max-width: 100%;
  font-family: Arial, sans-serif;
  font-size: 11px;
  line-height: 1.4;
  color: #1a1a2e;
  display: flex;
  flex-direction: row;  /* Deux colonnes horizontales */
}

[data-hidden="true"] {
  display: none !important;
  margin: 0 !important;
  padding: 0 !important;
  line-height: 0 !important;
  height: 0 !important;
}

/* ── Sidebar gauche (colorée) ── */
.cv-sidebar {
  width: 72mm;
  min-height: 297mm;
  background: #0f1b3d;   /* Remplacé dynamiquement */
  color: white;
  padding: 28px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
}

.sidebar-photo-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.sidebar-photo {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255,255,255,0.3);
}

.sidebar-name { font-size: 16px; font-weight: 800; text-align: center; margin-bottom: 2px; }
.sidebar-title { font-size: 9px; opacity: 0.75; text-align: center; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; }

.sidebar-section-title {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.6;
  border-bottom: 1px solid rgba(255,255,255,0.25);
  padding-bottom: 3px;
  margin-bottom: 6px;
}

.sidebar-contact-item {
  font-size: 9.5px;
  opacity: 0.85;
  margin-bottom: 3px;
  word-break: break-all;
}

[data-list="skills"] {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
[data-list="skills"] [data-field] {
  font-size: 10px;
  line-height: 1.3;
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-lang { font-size: 10px; opacity: 0.85; line-height: 1.5; }
.sidebar-interests { font-size: 10px; opacity: 0.85; line-height: 1.5; }

/* ── Colonne principale droite ── */
.cv-main {
  flex: 1;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-title {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #0f1b3d;
  border-bottom: 1.5px solid #0f1b3d;
  padding-bottom: 3px;
  margin-bottom: 7px;
}

.cv-section { margin-bottom: 14px; }

.summary-text { font-size: 10.5px; line-height: 1.5; color: #444; }

.exp-item { margin-bottom: 9px; }
.exp-header { display: flex; justify-content: space-between; align-items: flex-start; }
.exp-title { font-weight: 700; font-size: 11px; color: #0f1b3d; flex: 1; }
.exp-date { font-size: 10px; color: #888; white-space: nowrap; margin-left: 8px; }

[data-bullet-list="bullets"] {
  margin: 3px 0 0 14px;
  list-style: disc;
  padding: 0;
}
[data-bullet-list="bullets"] li {
  font-size: 10px;
  line-height: 1.4;
  margin-bottom: 2px;
  color: #555;
}

.edu-item { display: flex; justify-content: space-between; margin-bottom: 5px; }
.edu-label { font-size: 10.5px; font-weight: 600; color: #1a1a2e; flex: 1; }
.edu-date { font-size: 10px; color: #888; white-space: nowrap; margin-left: 8px; }
</style>
</head>
<body>
<div class="cv-page">

  <!-- ═══ SIDEBAR GAUCHE ═══ -->
  <div class="cv-sidebar">

    <!-- Photo de profil (optionnelle) -->
    <div data-section="photo" class="sidebar-photo-wrapper">
      <img 
        data-field-img="photo"
        class="sidebar-photo"
        src="" 
        alt="Photo de profil"
      />
    </div>

    <!-- Nom + Titre dans la sidebar -->
    <div>
      <div class="sidebar-name" data-field="full_name">Prénom Nom</div>
      <div class="sidebar-title" data-field="main_title">TITRE DU POSTE</div>
    </div>

    <!-- Contacts -->
    <section data-section="phone">
      <div class="sidebar-section-title">Contact</div>
      <div class="sidebar-contact-item" data-field="phone">📞 +33 6 00 00 00 00</div>
      <div class="sidebar-contact-item" data-field="email">✉ email@exemple.com</div>
      <div class="sidebar-contact-item" data-field="location">📍 Paris, France</div>
      <div class="sidebar-contact-item" data-field="linkedin">🔗 linkedin.com/in/profil</div>
    </section>

    <!-- Compétences dans la sidebar (flux vertical, pas grille) -->
    <section data-section="skills">
      <div class="sidebar-section-title">Compétences</div>
      <div data-list="skills">
        <span data-field="skill_name" style="display:block;">Compétence</span>
      </div>
    </section>

    <!-- Langues & Soft Skills -->
    <section data-section="languages">
      <div class="sidebar-section-title">Langues & Soft Skills</div>
      <div class="sidebar-lang" data-field="languages_content">
        Anglais: Courant / Soft Skills: Leadership
      </div>
    </section>

    <!-- Intérêts -->
    <section data-section="interests">
      <div class="sidebar-section-title">Intérêts</div>
      <div class="sidebar-interests" data-field="interests_content">
        Veille, Sport, Lecture
      </div>
    </section>

  </div>

  <!-- ═══ COLONNE PRINCIPALE DROITE ═══ -->
  <div class="cv-main">

    <!-- Résumé -->
    <section data-section="summary" class="cv-section">
      <div class="section-title">Profil</div>
      <p class="summary-text" data-field="summary">
        Texte de présentation professionnel.
      </p>
    </section>

    <!-- Expériences -->
    <section data-section="experiences" class="cv-section">
      <div class="section-title">Expériences professionnelles</div>
      <div data-list="experiences">
        <div class="exp-item">
          <div class="exp-header">
            <div class="exp-title" data-field="title">Entreprise - Poste</div>
            <div class="exp-date" data-field="date">2022 - Présent</div>
          </div>
          <ul data-bullet-list="bullets">
            <li>Réalisation professionnelle</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Formation -->
    <section data-section="education" class="cv-section">
      <div class="section-title">Formation</div>
      <div data-list="education">
        <div class="edu-item">
          <div class="edu-label" data-field="label">Diplôme - École</div>
          <div class="edu-date" data-field="date">2018 - 2020</div>
        </div>
      </div>
    </section>

  </div>

</div>
</body>
</html>
```

---

## 12. Erreurs courantes

### ❌ Erreur 1 — Oublier `data-bullet-list="bullets"` dans les expériences

**Symptôme** : Les réalisations (puces) n'apparaissent jamais dans le CV rendu.

**Cause** : Sans `data-bullet-list="bullets"`, le moteur `injectCVData` ne sait pas où injecter les bullets.

```html
<!-- ❌ INCORRECT — les bullets ne s'afficheront jamais -->
<div data-list="experiences">
  <div class="exp-item">
    <div data-field="title">Entreprise - Poste</div>
    <div data-field="date">2022 - 2025</div>
    <!-- Manque data-bullet-list="bullets" ici ! -->
  </div>
</div>

<!-- ✅ CORRECT -->
<div data-list="experiences">
  <div class="exp-item">
    <div data-field="title">Entreprise - Poste</div>
    <div data-field="date">2022 - 2025</div>
    <ul data-bullet-list="bullets">
      <li>Réalisation</li>  <!-- ← UN seul <li> template -->
    </ul>
  </div>
</div>
```

---

### ❌ Erreur 2 — Plusieurs enfants directs dans `data-list`

**Symptôme** : Seul le premier item s'affiche correctement, les autres sont vides ou manquants.

**Cause** : `injectCVData` utilise **uniquement le premier enfant direct** comme template. Tous les éléments existants sont supprimés avant l'injection.

```html
<!-- ❌ INCORRECT — seul le premier <div> sera utilisé comme template -->
<div data-list="education">
  <div class="edu-item">...</div>
  <div class="edu-item">...</div>  <!-- ← ignoré -->
  <div class="edu-item">...</div>  <!-- ← ignoré -->
</div>

<!-- ✅ CORRECT — un seul enfant template -->
<div data-list="education">
  <div class="edu-item">
    <div data-field="label">...</div>
    <div data-field="date">...</div>
  </div>
</div>
```

---

### ❌ Erreur 3 — `data-field="name"` vs `data-field="skill_name"`

**Symptôme** : Les compétences n'apparaissent pas dans le template.

**Cause historique** : L'ancien format utilisait `name`, le nouveau utilise `skill_name`. Les deux sont maintenant supportés car `adaptCVDataForTemplate` génère les deux (`name` ET `skill_name`).

```html
<!-- ✅ Les deux fonctionnent maintenant -->
<span data-field="skill_name">Compétence</span>
<span data-field="name">Compétence</span>  <!-- rétrocompat -->
```

---

### ❌ Erreur 4 — `overflow: visible` sur `.cv-page`

**Symptôme** : Le contenu dépasse visuellement hors du cadre A4 dans la preview.

```css
/* ❌ INCORRECT */
.cv-page { overflow: visible; }

/* ✅ CORRECT */
.cv-page { overflow: hidden; }
```

---

### ❌ Erreur 5 — `font-size` trop grand

**Symptôme** : Le texte ne tient pas sur une page, les sections se chevauchent.

```css
/* ❌ INCORRECT — 14px pour le corps = trop grand */
.cv-page { font-size: 14px; }
p { font-size: 13px; }

/* ✅ CORRECT */
.cv-page { font-size: 11px; }     /* Base 10-12px */
.section-title { font-size: 12px; }  /* Titres : 11-13px */
li, p { font-size: 10px; }          /* Corps : 10-11px */
```

---

### ❌ Erreur 6 — Pas de `data-section` autour des sections

**Symptôme** : Les sections vides (ex: pas de centre d'intérêt) laissent un titre de section vide visible.

```html
<!-- ❌ INCORRECT — le titre "Intérêts" s'affichera même si le champ est vide -->
<div>
  <div class="section-title">Intérêts</div>
  <p data-field="interests_content">...</p>
</div>

<!-- ✅ CORRECT — toute la section est masquée si le champ est vide -->
<section data-section="interests">
  <div class="section-title">Intérêts</div>
  <p data-field="interests_content">...</p>
</section>
```

---

### ❌ Erreur 7 — Texte trop long non contraint

**Symptôme** : L'IA remplit les bullets avec des phrases de 150+ caractères qui débordent hors du template.

**Solution** : Le système `CVTruncationDialog` intercepte maintenant ces cas lors de l'import. Mais côté template, utiliser `overflow: hidden` sur les `<li>` évite aussi les débordements visuels.

---

## 13. Checklist de validation avant publication

Avant de publier un template dans l'admin, vérifier :

### Structure HTML
- [ ] `.cv-page` a `max-height: 297mm` et `overflow: hidden`
- [ ] `.cv-page` a `max-width: 100%` et `box-sizing: border-box`
- [ ] `[data-hidden="true"]` style est présent dans le CSS
- [ ] Chaque `data-list` n'a **qu'un seul enfant direct** (template d'item)
- [ ] Chaque section d'expérience contient `data-bullet-list="bullets"`
- [ ] Chaque section est enveloppée dans `data-section` pour le masquage conditionnel

### Champs requis
- [ ] `data-field="full_name"` présent
- [ ] `data-field="main_title"` présent
- [ ] `data-field="phone"`, `email`, `location` présents
- [ ] `data-field="summary"` présent (dans `data-section="summary"`)
- [ ] `data-list="experiences"` avec item ayant `title`, `date`, `data-bullet-list="bullets"`
- [ ] `data-list="skills"` avec item ayant `skill_name`
- [ ] `data-list="education"` avec item ayant `label` et `date`
- [ ] `data-field="languages_content"` présent
- [ ] `data-field="interests_content"` présent (optionnel)

### CSS
- [ ] `font-size` de base entre 10 et 12px
- [ ] Pas de `overflow: visible` sur `.cv-page`
- [ ] Pas de `margin` négatif hors des limites de `.cv-page`
- [ ] Pas de `height: 100vh` (ne fonctionne pas dans l'iframe)
- [ ] Grille compétences : `grid-template-columns: repeat(4, 1fr)` (ou `repeat(3, 1fr)` minimum)

### Test de contenu
- [ ] Prévisualiser avec les données mock de l'admin (Marie Dupont)
- [ ] Vérifier que les bullets s'affichent dans les expériences
- [ ] Vérifier que les compétences s'affichent en grille
- [ ] Vérifier qu'une section vide disparaît proprement (enlever les langues des données mock)
- [ ] Vérifier avec un long `full_name` (40 caractères)
- [ ] Vérifier avec 3 expériences + 4 bullets chacune (cas le plus chargé)

---

*Fin du guide. Dernière mise à jour : Mars 2026.*
