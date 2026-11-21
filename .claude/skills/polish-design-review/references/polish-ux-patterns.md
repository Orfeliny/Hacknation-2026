# Polish UX Patterns & Conventions

Common UI patterns and conventions used on Polish websites, especially
government (gov.pl), banking, and civic-tech services.

---

## Page Structure (gov.pl standard)

```
┌─────────────────────────────────────────────────┐
│  Skip link: "Przejdź do treści" (sr-only)       │
├─────────────────────────────────────────────────┤
│  HEADER                                          │
│  ┌─ Logo ─────── Nav menu ────── [Zaloguj się] ┐ │
│  └──────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│  BREADCRUMB                                      │
│  Strona główna > Usługi > Nazwa usługi           │
├─────────────────────────────────────────────────┤
│  MAIN CONTENT                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  H1: Page Title                              │ │
│  │  Description / intro text                    │ │
│  │                                              │ │
│  │  Content sections with H2, H3...             │ │
│  │  Forms, tables, cards...                     │ │
│  └──────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│  FOOTER                                          │
│  ┌──────────────────────────────────────────────┐ │
│  │  Links: Deklaracja dostępności | Polityka    │ │
│  │  prywatności | RODO | BIP | Kontakt          │ │
│  │  © 2026 Nazwa instytucji                    │ │
│  └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## Common Polish UI text patterns

### Navigation

```
Strona główna          — Home
Zaloguj się            — Log in
Wyloguj się            — Log out
Zarejestruj się        — Sign up / Register
Moje konto             — My account
Ustawienia             — Settings
Powiadomienia          — Notifications
Pomoc                  — Help
Kontakt                — Contact
Wyszukaj / Szukaj      — Search
```

### Form labels & validation

```
Imię                   — First name
Nazwisko               — Last name
Adres e-mail           — Email address
Numer telefonu         — Phone number
Hasło                  — Password
Powtórz hasło          — Confirm password
PESEL                  — National ID number (11 digits)
NIP                    — Tax ID (10 digits)
REGON                  — Business registry number
Kod pocztowy           — Postal code (XX-XXX format)
Miejscowość            — City/Town
Ulica                  — Street
Nr domu / Nr lokalu    — Building / Apartment number
Województwo            — Voivodeship (region)
```

### Validation messages

```
To pole jest wymagane.
Podaj prawidłowy adres e-mail.
Hasło musi mieć co najmniej 8 znaków.
Hasła nie są identyczne.
PESEL musi mieć 11 cyfr.
NIP musi mieć 10 cyfr.
Podaj kod pocztowy w formacie XX-XXX.
Numer telefonu musi mieć 9 cyfr.
Zaakceptuj regulamin, aby kontynuować.
```

### Status labels

```
Nowy                   — New
W trakcie              — In progress
Oczekuje               — Pending / Waiting
Zatwierdzony           — Approved
Odrzucony              — Rejected
Zakończony             — Completed
Anulowany              — Cancelled
Wersja robocza         — Draft
```

### Action buttons

```
Wyślij                 — Send / Submit
Zapisz                 — Save
Zapisz zmiany          — Save changes
Anuluj                 — Cancel
Usuń                   — Delete
Edytuj                 — Edit
Dodaj                  — Add
Dalej                  — Next / Continue
Wstecz / Cofnij        — Back
Pobierz                — Download
Drukuj                 — Print
Udostępnij             — Share
Potwierdź              — Confirm
```

### Date and time (Polish formatting)

```
21 listopada 2026        — long date
21.11.2026             — short date
14:30                  — time (24h, always)
21.11.2026, 14:30      — datetime
poniedziałek           — Monday
wtorek                 — Tuesday
środa                  — Wednesday
czwartek               — Thursday
piątek                 — Friday
sobota                 — Saturday
niedziela              — Sunday
```

### Numbers and currency

```
1 000 000              — one million (space separator)
3,14                   — pi (comma decimal)
100,00 zł              — currency
1 234,56 PLN           — formal currency
```

---

## Polish postal code input pattern

Always validate as `XX-XXX` (two digits, dash, three digits):

```html
<label for="postal-code">Kod pocztowy</label>
<input
  id="postal-code"
  type="text"
  inputmode="numeric"
  pattern="[0-9]{2}-[0-9]{3}"
  placeholder="00-000"
  maxlength="6"
  aria-describedby="postal-help"
/>
<span id="postal-help" class="text-sm text-slate-600"> Format: XX-XXX </span>
```

---

## Phone number input pattern (Polish)

Polish mobile numbers: 9 digits, optionally with +48 prefix:

```html
<label for="phone">Numer telefonu</label>
<div class="flex gap-2">
  <span class="flex items-center rounded-l-md border bg-slate-100 px-3 text-sm">
    +48
  </span>
  <input
    id="phone"
    type="tel"
    inputmode="numeric"
    pattern="[0-9]{9}"
    placeholder="123 456 789"
    maxlength="11"
    class="rounded-r-md"
  />
</div>
```

---

## Alert / Banner patterns (gov.pl style)

```html
<!-- Info banner -->
<div
  role="alert"
  class="rounded-r-md border-l-4 border-blue-700 bg-blue-50 p-4"
>
  <div class="flex gap-3">
    <svg aria-hidden="true" class="mt-0.5 h-5 w-5 shrink-0 text-blue-700">
      ...
    </svg>
    <div>
      <p class="font-medium text-blue-800">Informacja</p>
      <p class="mt-1 text-sm text-blue-700">Treść komunikatu informacyjnego.</p>
    </div>
  </div>
</div>

<!-- Error banner -->
<div role="alert" class="rounded-r-md border-l-4 border-red-700 bg-red-50 p-4">
  <div class="flex gap-3">
    <svg aria-hidden="true" class="mt-0.5 h-5 w-5 shrink-0 text-red-700">
      ...
    </svg>
    <div>
      <p class="font-medium text-red-800">Błąd</p>
      <p class="mt-1 text-sm text-red-700">Opis błędu i jak go naprawić.</p>
    </div>
  </div>
</div>

<!-- Success banner -->
<div
  role="alert"
  class="rounded-r-md border-l-4 border-green-700 bg-green-50 p-4"
>
  <div class="flex gap-3">
    <svg aria-hidden="true" class="mt-0.5 h-5 w-5 shrink-0 text-green-700">
      ...
    </svg>
    <div>
      <p class="font-medium text-green-800">Sukces</p>
      <p class="mt-1 text-sm text-green-700">Operacja zakończona pomyślnie.</p>
    </div>
  </div>
</div>
```

---

## Table pattern (Polish)

```html
<div class="overflow-x-auto">
  <table class="w-full text-left text-sm">
    <caption class="sr-only">
      Lista wniosków
    </caption>
    <thead class="border-b border-slate-200 bg-slate-50">
      <tr>
        <th scope="col" class="px-4 py-3 font-medium text-slate-700">
          Nr wniosku
        </th>
        <th scope="col" class="px-4 py-3 font-medium text-slate-700">
          Data złożenia
        </th>
        <th scope="col" class="px-4 py-3 font-medium text-slate-700">Status</th>
        <th scope="col" class="px-4 py-3 font-medium text-slate-700">Akcje</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-200">
      <tr>
        <td class="px-4 py-3">WN/2026/001</td>
        <td class="px-4 py-3">21.11.2026</td>
        <td class="px-4 py-3">
          <span
            class="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
          >
            Zatwierdzony
          </span>
        </td>
        <td class="px-4 py-3">
          <a href="#" class="text-blue-700 hover:underline">Szczegóły</a>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```
