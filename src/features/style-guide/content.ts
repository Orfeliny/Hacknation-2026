import type { ColorToken } from "../../lib/tokens";

export const PRINCIPLES: readonly { lead: string; text: string }[] = [
  {
    lead: "Najpierw termin.",
    text: "Pulpit zaczyna się od Twoich działań, posortowanych według terminu. Tabele też sortują się po dacie.",
  },
  {
    lead: "Jeden kolor akcji.",
    text: "Steel Azure #004E98 mają przyciski główne, linki, aktywna pozycja menu i obrys fokusu.",
  },
  {
    lead: "Kolor stanu tylko w tekście alertu.",
    text: "Czerwony, pomarańczowy, Cornflower i zielony mają wyłącznie tekst alertu i ikona obok niego. Karty, znaczniki, ramki, wypełnienia i paski boczne zostają neutralne.",
  },
  {
    lead: "Neutralne tło.",
    text: "Strona jest biała, bez gradientów. Obramowania mają kolor #767676, linie dekoracyjne #C0C0C0.",
  },
  {
    lead: "Widoczność przy polu.",
    text: "Obserwacje prowadzi przełożony i pracownik ich nie widzi. Notatki prowadzi pracownik i przełożony ich nie widzi. Kadry widzą jedne i drugie.",
  },
  {
    lead: "AI tylko podpowiada.",
    text: "W nagłówku jest znacznik „AI” z ikoną i opisem tekstowym. Pełny stan i rodzaj modelu podajemy w podpowiedzi i dla czytnika ekranu. Średnią liczy aplikacja, nie AI.",
  },
  {
    lead: "Krótkie etykiety.",
    text: "Przycisk ma 1–3 słowa i zaczyna się od czasownika. Znacznik ma 1–2 słowa. Szczegóły trafiają do tekstu pomocniczego.",
  },
  {
    lead: "Przepis jako link.",
    text: "Podstawa prawna prowadzi do ISAP i otwiera się w nowej karcie. Na osi etapów nie ma linków ani przepisów.",
  },
  {
    lead: "Dostępność.",
    text: "WCAG 2.1 AA: tekst co najmniej 4,5:1, krawędzie kontrolek 3:1. Kontrolki mają co najmniej 44 px wysokości, fokus to obrys 3 px, a każda strona ma link „Przejdź do treści”.",
  },
];

export const STAGES = [
  "Kryteria",
  "Rozmowa rozpoczynająca",
  "Obserwacja",
  "Rozmowa oceniająca",
  "Sporządzenie",
  "Zapoznanie",
  "Sprzeciw",
  "Zamknięta",
] as const;

export const GLOSSARY: readonly { term: string; definition: string }[] = [
  { term: "Obserwacje", definition: "Wpisy przełożonego o pracy pracownika." },
  { term: "Notatki", definition: "Wpisy pracownika o własnej pracy." },
  {
    term: "Pulpit",
    definition: "Pierwszy ekran każdej roli i początek ścieżki nawigacji.",
  },
];

export type PaletteEntry = {
  token: ColorToken;
  name: string;
  usage: string;
  onMuted: boolean;
};

export const PALETTE: readonly PaletteEntry[] = [
  {
    token: "primary",
    name: "Steel Azure",
    usage: "Przyciski główne, linki, aktywna nawigacja, fokus 3 px",
    onMuted: true,
  },
  {
    token: "primary-hover",
    name: "Cornflower",
    usage: "Najechany link i przycisk. Tylko tekst na białym",
    onMuted: false,
  },
  {
    token: "surface-muted",
    name: "Platinum",
    usage:
      "Tła sekcji i nagłówków tabel, bez tekstu pomarańczowego i Cornflower",
    onMuted: false,
  },
  {
    token: "border",
    name: "Obramowanie",
    usage: "Krawędzie pól, przycisków i kart",
    onMuted: false,
  },
  {
    token: "divider",
    name: "Silver",
    usage: "Tylko dekoracyjne linie podziału",
    onMuted: false,
  },
  {
    token: "ink",
    name: "Tekst",
    usage: "Tekst podstawowy",
    onMuted: true,
  },
  {
    token: "muted",
    name: "Tekst pomocniczy",
    usage: "Opisy i dane drugorzędne",
    onMuted: true,
  },
];

export const STATES = [
  { token: "danger", name: "Czerwony", usage: "Po terminie, blokuje, błąd" },
  { token: "warning", name: "Pomarańczowy", usage: "Wkrótce" },
  {
    token: "info",
    name: "Cornflower",
    usage: "Termin przesunięty, informacja",
  },
  { token: "success", name: "Zielony", usage: "Gotowe" },
] as const;

export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 100) / 100).toFixed(2).replace(".", ",")}:1`;
}
