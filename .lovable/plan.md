
## What needs to change in `src/components/Header.tsx`

### 1. Hover animation — trait violet sous les liens

Currently the nav links use a simple `hover:text-blue-600` color transition. The user wants a violet underline bar animating in on hover (like a sliding/growing underline), matching the brand purple `#7C3AED`.

Implementation: replace the color-only hover with a relative/after pseudo-element approach using Tailwind `after:` utilities — already used in the codebase as `.story-link` pattern from `index.css`:

```css
after:content-[''] after:absolute after:bottom-0 after:left-0
after:h-[2px] after:w-full after:bg-[#7C3AED]
after:scale-x-0 after:origin-right
hover:after:scale-x-100 hover:after:origin-left
after:transition-transform after:duration-300
```

Apply to: "Comment ça marche", "Tarif", "Outils", "Connexion" nav links.

### 2. ThemeToggle — identique au dashboard

The current `ThemeToggle` is a ghost icon-only button. The dashboard version is used the same way but the user wants a **visual pill toggle** like the one in the dashboard sidebar — a switch-style button showing Sun/Moon with a labeled pill background.

Looking at the codebase, the `ThemeToggle` component itself is the same everywhere. The request is to **redesign `ThemeToggle.tsx`** into a pill-style toggle with:
- A rounded pill background that shifts color (light = yellow-tinted, dark = slate)
- Sun icon on the left, Moon on the right (or a sliding indicator)
- Click toggles the entire app theme via `next-themes` `setTheme` — already working

### Files to modify
1. **`src/components/ThemeToggle.tsx`** — Redesign into a pill toggle (Sun | Moon) with sliding active indicator
2. **`src/components/Header.tsx`** — Replace plain hover color with violet underline bar on nav links

### Visual result
- Nav items: text stays slate, on hover a 2px purple line slides in from left under the text
- ThemeToggle: a compact pill showing ☀️ and 🌙, the active one highlighted — same component used everywhere so dashboard gets the same update too
