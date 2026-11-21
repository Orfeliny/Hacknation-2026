---
name: polish-design-review
description: >-
  Review and build UI that follows Polish official/government design standards
  (gov.pl Design System), WCAG 2.1 AA accessibility requirements mandated by
  Polish law, and Polish typographic and visual conventions. Use when creating,
  reviewing, or restyling any screen, page, form, or component that targets
  Polish users — especially for public-sector, urzędowy, or civic-tech projects.
  Also use when the user says the design "looks bad" or "not Polish enough."
---

# Polish Design Review — gov.pl & WCAG 2.1 AA

This skill enforces Polish official design standards and accessibility law.
Apply it whenever you generate, review, or modify UI for a Polish audience.
Read the [references/](references/) folder for deep-dive checklists.

> **Legal basis:** Ustawa z dnia 4 kwietnia 2019 r. o dostępności cyfrowej stron
> internetowych i aplikacji mobilnych podmiotów publicznych (Dz.U. 2019 poz. 848)
> mandates WCAG 2.1 Level AA for all public-sector digital products. The European
> Accessibility Act (EAA) extends similar requirements to private-sector services.

---

## 1. Color Palette (gov.pl-inspired)

Use restrained, high-contrast, official-feeling colors. Avoid flashy gradients,
neons, or overly saturated palettes. The tone is **serious, trustworthy, clean**.

| Role                | Color                            | Tailwind class                                                            | Notes                                             |
| :------------------ | :------------------------------- | :------------------------------------------------------------------------ | :------------------------------------------------ |
| **Primary**         | Deep navy / granat               | `bg-[#003366]` or `bg-blue-900`                                           | Official gov.pl primary; conveys authority        |
| **Primary hover**   | Slightly lighter navy            | `bg-blue-800`                                                             |                                                   |
| **Accent**          | Polish red (nawiązanie do flagi) | `bg-[#DC143C]` or `bg-red-700`                                            | Use sparingly — CTAs, badges, alerts              |
| **Background**      | White / very light gray          | `bg-white` / `bg-slate-50`                                                | Clean, readable                                   |
| **Surface (cards)** | White with subtle border         | `bg-white border border-slate-200`                                        |                                                   |
| **Text primary**    | Near-black                       | `text-slate-900`                                                          | WCAG AAA on white                                 |
| **Text secondary**  | Dark gray                        | `text-slate-600`                                                          | Min WCAG AA (4.5:1). Never lighter than slate-500 |
| **Success**         | Forest green                     | `text-green-700` / `bg-green-50`                                          |                                                   |
| **Error**           | Deep red                         | `text-red-700` / `bg-red-50`                                              |                                                   |
| **Warning**         | Amber                            | `text-amber-800` / `bg-amber-50`                                          |                                                   |
| **Focus ring**      | Blue outline                     | `focus-visible:outline-2 focus-visible:outline-blue-700 outline-offset-2` | Must be visible                                   |

### Contrast rules (WCAG 2.1 AA — Polish law)

- **Normal text** (< 18px or < 14px bold): minimum **4.5:1** contrast ratio.
- **Large text** (≥ 18px or ≥ 14px bold): minimum **3:1**.
- **UI components & graphical objects**: minimum **3:1**.
- Never rely on color alone to convey information — always pair with text, icon, or pattern.

---

## 2. Typography — Polish conventions

| Element          | Style                                                   | Notes                                                              |
| :--------------- | :------------------------------------------------------ | :----------------------------------------------------------------- |
| **Font family**  | System sans-serif stack (Tailwind default)              | Alternatively: `Inter`, `Source Sans 3`, `Lato` (Polish-designed!) |
| **Page title**   | `text-2xl font-bold tracking-tight` (mobile: `text-xl`) | One per page                                                       |
| **Section head** | `text-lg font-semibold`                                 |                                                                    |
| **Body**         | `text-base` (16px min)                                  | Never smaller for body content                                     |
| **Labels**       | `text-sm font-medium`                                   |                                                                    |
| **Caption/help** | `text-sm text-slate-600`                                | Still must pass 4.5:1                                              |
| **Line height**  | `leading-relaxed` (1.625) for body                      | Polish law: adequate interline for readability                     |
| **Line length**  | `max-w-prose` or `max-w-3xl`                            | 60–80 characters per line                                          |

### Polish-specific typography

- **Polish diacritics must render correctly:** ą, ć, ę, ł, ń, ó, ś, ź, ż. Test with: "Zażółć gęślą jaźń".
- **Quotation marks:** Use Polish „cudzysłów" (not "English quotes").
- **Date format:** DD.MM.YYYY or D MMMM YYYY (e.g., "21 listopada 2026").
- **Number format:** Thousands separator is a space (1 000 000), decimal is a comma (3,14).
- **Currency:** Always "zł" or "PLN" after the number (100,00 zł).
- **Time:** 24-hour format (14:30, not 2:30 PM).

---

## 3. Layout & Spacing

- **Page structure:** Header → Breadcrumb → Main content → Footer. This is the standard gov.pl pattern.
- **Content width:** `max-w-5xl mx-auto` for page container, `max-w-3xl` for text-heavy content.
- **Spacing scale:** Use Tailwind's 4px grid. Prefer `gap-4` / `p-6` between sections, `gap-2` within components.
- **Whitespace over borders:** Separate content with generous spacing before adding dividers.
- **Cards:** `rounded-lg border border-slate-200 bg-white p-6 shadow-sm`. Do not nest cards.
- **Mobile first:** Base layout for 320px+. Add `sm:` / `md:` / `lg:` only where needed.

---

## 4. Forms — Polish official style

Polish government forms follow strict patterns:

- Every `<input>` has a visible `<label>` above it (not placeholder-only).
- Required fields: mark with `*` and `aria-required="true"`.
- Error messages appear **below** the field in `text-red-700 text-sm`, with an icon or prefix "Błąd:".
- Group related fields with `<fieldset>` and `<legend>`.
- Form validation messages in Polish: "To pole jest wymagane", "Podaj prawidłowy adres e-mail", "PESEL musi mieć 11 cyfr".
- For official forms: include NIP, REGON, PESEL field validators where applicable.
- Submit buttons: clear action label in Polish ("Wyślij formularz", "Zapisz", "Dalej"), never just "Submit".

---

## 5. Navigation — Polish conventions

- **Breadcrumbs** (`aria-label="Ścieżka nawigacji"`): required on multi-level pages. Format: `Strona główna > Sekcja > Podsekcja`.
- **Skip-to-content link:** First focusable element. Text: "Przejdź do treści".
- **Footer must contain** (legal requirement for public sites):
  - Deklaracja dostępności (Accessibility Declaration) link
  - Polityka prywatności / RODO
  - BIP link (if applicable)
  - Contact information
- **Language attribute:** `<html lang="pl">` always set.
- **Page titles:** Descriptive, in Polish, format: `Nazwa strony — Nazwa serwisu`.

---

## 6. Accessibility — WCAG 2.1 AA (Polish law)

This is **legally required**, not optional.

### Keyboard

- All interactive elements reachable and operable via Tab / Enter / Space / Arrows.
- Visible focus indicator on every focusable element: `focus-visible:outline-2 focus-visible:outline-blue-700 outline-offset-2`.
- No keyboard traps. Logical tab order matching visual order.

### Screen readers

- Semantic HTML: `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`, `<article>`.
- All landmarks have `aria-label` (in Polish).
- Images: meaningful `alt` text in Polish, or `alt=""` for decorative.
- Dynamic content: `aria-live="polite"` regions for updates, `aria-busy` during loading.
- Form errors linked with `aria-describedby`.

### Visual

- Text resizable to 200% without loss of content or functionality.
- Content reflows at 400% zoom / 320px viewport.
- No information conveyed by color alone.
- Minimum touch target: 44×44 CSS pixels on mobile.

### Content

- Reading level: use plain Polish (prosty język / plain language).
- Error messages must identify the problem AND suggest how to fix it.
- Time limits: warn and allow extension. No auto-advancing content without controls.

---

## 7. Official / Urzędowy tone

When the UI needs to feel "urzędowy" (official/governmental):

- **Formal language:** Use "Pan/Pani" forms, formal Polish.
- **No slang, emoji, or casual tone** in official communications.
- **Godło (Polish eagle emblem):** Only if legally authorized. Never use decoratively.
- **Barwy RP (white-red):** Use respectfully if applicable, following heraldic rules.
- **Document-style layout:** Left-aligned, structured with clear headers, numbered lists for procedures.
- **Status indicators:** "Wniosek złożony", "W trakcie rozpatrywania", "Zatwierdzony", "Odrzucony" with appropriate colors.

---

## 8. Component checklist

Before marking any screen as done, verify:

- [ ] `<html lang="pl">` is set
- [ ] Skip-to-content link present ("Przejdź do treści")
- [ ] Page title is descriptive and in Polish
- [ ] All text passes WCAG AA contrast (4.5:1 body, 3:1 large)
- [ ] Polish diacritics render correctly (test: "Zażółć gęślą jaźń")
- [ ] Dates in DD.MM.YYYY format, numbers with space thousands separator
- [ ] Every form input has a visible label
- [ ] Error/success/warning states are present and use correct colors
- [ ] All interactive elements have visible focus indicators
- [ ] Keyboard navigation works correctly (no traps)
- [ ] Landmarks have Polish `aria-label`s
- [ ] Images have Polish `alt` text
- [ ] Empty, loading, and error states exist for every async view
- [ ] Mobile layout works at 320px
- [ ] Footer contains required legal links (dostępność, prywatność)
- [ ] No color-only information — text/icon always accompanies color
- [ ] Formal Polish language used where appropriate
- [ ] Touch targets ≥ 44×44px on mobile

---

## 9. Review prompt template

When reviewing an existing design, evaluate it against each section above and
produce a report with:

1. **Ocena ogólna** (Overall score: 1–10, where 10 = fully compliant gov.pl)
2. **Kolory** — contrast issues, palette problems
3. **Typografia** — font, sizes, Polish formatting
4. **Układ** — layout, spacing, responsiveness
5. **Formularze** — labels, validation, Polish messages
6. **Dostępność** — WCAG violations found
7. **Ton i język** — formality level, Polish correctness
8. **Konkretne poprawki** — ordered list of changes to make, most critical first
