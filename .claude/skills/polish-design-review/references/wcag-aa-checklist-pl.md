# WCAG 2.1 AA Checklist — Polish Implementation

Quick-reference checklist for WCAG 2.1 Level AA compliance as required by
Polish law (Ustawa o dostępności cyfrowej, Dz.U. 2019 poz. 848).

---

## Perceivable (Postrzegalność)

### 1.1 Text Alternatives

- [ ] All `<img>` have meaningful `alt` in Polish, or `alt=""` if decorative
- [ ] Icon buttons have `aria-label` in Polish
- [ ] Complex images (charts, diagrams) have long descriptions
- [ ] SVG icons have `role="img"` + `aria-label` or `aria-hidden="true"`

### 1.2 Time-based Media

- [ ] Video has Polish captions (napisy)
- [ ] Audio has Polish transcript (transkrypcja)
- [ ] Live video has Polish captions if feasible

### 1.3 Adaptable

- [ ] Semantic HTML used (headings, lists, tables, landmarks)
- [ ] Heading hierarchy is logical (H1 → H2 → H3, no skips)
- [ ] Reading order matches visual order
- [ ] Form inputs programmatically associated with labels
- [ ] Tables have `<th>` with `scope` attributes
- [ ] `<html lang="pl">` is set

### 1.4 Distinguishable

- [ ] **Text contrast ≥ 4.5:1** (normal text on background)
- [ ] **Large text contrast ≥ 3:1** (≥18px or ≥14px bold)
- [ ] **UI component contrast ≥ 3:1** (borders, icons, focus rings)
- [ ] Text can be resized to 200% without loss of content
- [ ] Content reflows at 320px width (no horizontal scroll)
- [ ] Text spacing adjustable: line-height 1.5×, paragraph spacing 2×,
      letter spacing 0.12em, word spacing 0.16em — without breaking
- [ ] No images of text (use real text)
- [ ] Color is not the only means of conveying information

---

## Operable (Funkcjonalność)

### 2.1 Keyboard Accessible

- [ ] All functionality available from keyboard
- [ ] No keyboard traps
- [ ] Keyboard shortcuts (if any) can be turned off or remapped

### 2.2 Enough Time

- [ ] Time limits can be extended (at least 10× or turned off)
- [ ] Auto-updating content can be paused, stopped, or hidden
- [ ] No data loss on session timeout (warn beforehand)

### 2.3 Seizures and Physical Reactions

- [ ] No content flashes more than 3 times per second

### 2.4 Navigable

- [ ] Skip-to-content link: "Przejdź do treści" as first focusable element
- [ ] Page `<title>` is descriptive and in Polish
- [ ] Focus order is logical and predictable
- [ ] Link text is descriptive (not "kliknij tutaj" / "więcej")
- [ ] Multiple ways to find pages (nav, search, sitemap)
- [ ] Headings and labels describe content
- [ ] **Focus indicator is visible** on all interactive elements

### 2.5 Input Modalities

- [ ] Touch/click target minimum 44×44 CSS px
- [ ] Pointer gestures have single-pointer alternatives
- [ ] Dragging: provide non-dragging alternative
- [ ] Input not dependent on device motion

---

## Understandable (Zrozumiałość)

### 3.1 Readable

- [ ] `lang="pl"` on `<html>`
- [ ] Foreign words/phrases marked with `lang` attribute
- [ ] Text uses plain Polish (prosty język) where possible

### 3.2 Predictable

- [ ] No unexpected context changes on focus or input
- [ ] Navigation is consistent across pages
- [ ] Components behave consistently

### 3.3 Input Assistance

- [ ] Errors identified and described in Polish text
- [ ] Labels and instructions provided for inputs
- [ ] Error suggestions offered ("Podaj prawidłowy adres e-mail")
- [ ] Important submissions can be reviewed, confirmed, or reversed

---

## Robust (Solidność)

### 4.1 Compatible

- [ ] Valid HTML (no duplicate IDs, proper nesting)
- [ ] Custom components have correct ARIA roles, states, properties
- [ ] Status messages use `aria-live` or `role="status"`
- [ ] Works with screen readers (NVDA, JAWS, VoiceOver)

---

## Polish-specific legal requirements

### Deklaracja dostępności (Accessibility Declaration)

Every public-sector website MUST have an accessibility declaration page containing:

- [ ] Compliance status (pełna / częściowa / niezgodna)
- [ ] List of inaccessible elements with justification
- [ ] Date of publication and last update
- [ ] Contact information for accessibility issues
- [ ] Procedure for requesting accessible content
- [ ] Link to Rzecznik Praw Obywatelskich (Ombudsman) for complaints

### Feedback mechanism

- [ ] Users can report accessibility barriers
- [ ] Response required within 7 days
- [ ] Alternative access provided within 2 months if original cannot be fixed

---

## Testing tools recommended

| Tool                        | What it checks                    |
| :-------------------------- | :-------------------------------- |
| axe DevTools (browser ext.) | Automated WCAG violations         |
| WAVE                        | Visual accessibility overlay      |
| Lighthouse (Chrome)         | Performance + accessibility audit |
| Colour Contrast Analyser    | Manual contrast checking          |
| NVDA (Windows)              | Screen reader testing             |
| Keyboard-only navigation    | Tab through entire page manually  |
| Mobile device (real)        | Touch targets, reflow, zoom       |
