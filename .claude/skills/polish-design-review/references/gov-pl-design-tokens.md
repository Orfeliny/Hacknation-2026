# gov.pl Design Tokens Reference

Detailed design tokens inspired by the official Polish government digital
design system. Use these as the definitive reference when building or reviewing
UI for Polish official / civic-tech projects.

---

## Color Tokens

### Brand / Primary

```
--color-primary:         #003366   /* deep navy / granat */
--color-primary-hover:   #1a4d80   /* lighter navy */
--color-primary-active:  #002244   /* darker navy */
--color-primary-text:    #ffffff   /* white on primary bg */
```

### Accent (Polish flag red — use sparingly)

```
--color-accent:          #DC143C   /* crimson red */
--color-accent-hover:    #b81133
--color-accent-text:     #ffffff
```

### Neutral / Gray scale

```
--color-bg-page:         #ffffff
--color-bg-secondary:    #f8fafc   /* slate-50 */
--color-bg-tertiary:     #f1f5f9   /* slate-100 */
--color-border:          #e2e8f0   /* slate-200 */
--color-border-strong:   #cbd5e1   /* slate-300 */
--color-text-primary:    #0f172a   /* slate-900 — near black */
--color-text-secondary:  #475569   /* slate-600 */
--color-text-disabled:   #94a3b8   /* slate-400 — only for disabled */
```

### Semantic / Functional

```
/* Success */
--color-success-bg:      #f0fdf4   /* green-50 */
--color-success-border:  #bbf7d0   /* green-200 */
--color-success-text:    #15803d   /* green-700 */

/* Error */
--color-error-bg:        #fef2f2   /* red-50 */
--color-error-border:    #fecaca   /* red-200 */
--color-error-text:      #b91c1c   /* red-700 */

/* Warning */
--color-warning-bg:      #fffbeb   /* amber-50 */
--color-warning-border:  #fde68a   /* amber-200 */
--color-warning-text:    #92400e   /* amber-800 */

/* Info */
--color-info-bg:         #eff6ff   /* blue-50 */
--color-info-border:     #bfdbfe   /* blue-200 */
--color-info-text:       #1d4ed8   /* blue-700 */
```

### Focus

```
--color-focus-ring:      #1d4ed8   /* blue-700 */
--focus-ring-width:      2px
--focus-ring-offset:     2px
```

---

## Typography Tokens

### Font stack

```
--font-sans: "Inter", "Lato", "Source Sans 3", ui-sans-serif, system-ui,
             -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif,
             "Apple Color Emoji", "Segoe UI Emoji";
```

> **Note:** `Lato` is designed by Polish typographer Łukasz Dziedzic and is
> widely used on Polish government and institutional websites.

### Scale

```
--text-xs:    0.75rem / 1rem      /* 12px — captions only */
--text-sm:    0.875rem / 1.25rem  /* 14px — labels, help text */
--text-base:  1rem / 1.5rem       /* 16px — body (minimum for body!) */
--text-lg:    1.125rem / 1.75rem  /* 18px — section headers */
--text-xl:    1.25rem / 1.75rem   /* 20px — subsection titles */
--text-2xl:   1.5rem / 2rem       /* 24px — page titles */
--text-3xl:   1.875rem / 2.25rem  /* 30px — hero / landing only */
```

### Weight

```
--font-normal:    400   /* body */
--font-medium:    500   /* labels, emphasis */
--font-semibold:  600   /* section headers */
--font-bold:      700   /* page titles */
```

---

## Spacing Tokens (4px grid)

```
--space-1:   0.25rem   /*  4px */
--space-2:   0.5rem    /*  8px */
--space-3:   0.75rem   /* 12px */
--space-4:   1rem      /* 16px — component internal */
--space-5:   1.25rem   /* 20px */
--space-6:   1.5rem    /* 24px — card padding */
--space-8:   2rem      /* 32px — section gap */
--space-10:  2.5rem    /* 40px */
--space-12:  3rem      /* 48px — page padding */
--space-16:  4rem      /* 64px — large sections */
```

---

## Border & Radius Tokens

```
--radius-sm:   0.25rem   /* 4px — small elements */
--radius-md:   0.375rem  /* 6px — buttons, inputs */
--radius-lg:   0.5rem    /* 8px — cards */
--radius-xl:   0.75rem   /* 12px — modals */
--radius-full: 9999px    /* pills, avatars */

--border-width:  1px
--border-color:  var(--color-border)
```

---

## Shadow Tokens

```
--shadow-sm:   0 1px 2px 0 rgb(0 0 0 / 0.05)
--shadow-md:   0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
```

> Keep shadows minimal. Polish official design is flat and clean.

---

## Breakpoints

```
--bp-sm:   640px    /* landscape phone */
--bp-md:   768px    /* tablet */
--bp-lg:   1024px   /* laptop */
--bp-xl:   1280px   /* desktop */
```

---

## Component-specific tokens

### Buttons

```
Primary:    bg-[#003366] text-white hover:bg-blue-800 rounded-md px-4 py-2.5 text-sm font-medium
Secondary:  bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 rounded-md px-4 py-2.5
Danger:     bg-red-700 text-white hover:bg-red-800 rounded-md px-4 py-2.5
Disabled:   opacity-50 cursor-not-allowed
Focus:      focus-visible:outline-2 focus-visible:outline-blue-700 outline-offset-2
```

### Inputs

```
Default:    border border-slate-300 rounded-md px-3 py-2 text-base bg-white
Focus:      border-blue-700 ring-1 ring-blue-700
Error:      border-red-700 ring-1 ring-red-700
Disabled:   bg-slate-100 text-slate-400 cursor-not-allowed
```

### Alerts / Banners

```
Info:       bg-blue-50 border-l-4 border-blue-700 text-blue-800 p-4
Success:    bg-green-50 border-l-4 border-green-700 text-green-800 p-4
Warning:    bg-amber-50 border-l-4 border-amber-800 text-amber-900 p-4
Error:      bg-red-50 border-l-4 border-red-700 text-red-800 p-4
```

> Left border accent (border-l-4) is the gov.pl pattern for alerts.
