export const REFUSAL_MESSAGE =
  "Nie wskazuję poziomu oceny konkretnej osoby: ocenę wystawia przełożony na podstawie obserwacji i kryteriów. Mogę natomiast wyjaśnić kryteria, skalę i tryb oceny okresowej.";

// \b works only for ASCII letters, so word edges are lookarounds on \p{L}.
const word = (pattern: string) => `(?<!\\p{L})(?:${pattern})(?!\\p{L})`;

const LEVEL_WORDS = new RegExp(
  [
    word(
      "jak[\\p{L}]*\\s+ocen[\\p{L}]*\\s+(?:powinien|powinna|dostanie|dostał|dostała|wystawi[\\p{L}]*|przyznasz|przyznać)",
    ),
    word(
      "jak[\\p{L}]*\\s+(?:poziom|stopie[\\p{L}]*)\\s+oceny\\s+(?:wystawi[\\p{L}]*|przyzna[\\p{L}]*|dla|jego|jej)",
    ),
    word("poziom[\\p{L}]*\\s+oceny\\s+(?:jego|jej|dla)"),
    word(
      "ocen[\\p{L}]*\\s+(?:powinien|powinna|dostanie|dostał|dostała|zasługuje)",
    ),
    word("czy(?:\\s+\\S+){1,4}\\s+zasługuje"),
    word("wystaw[\\p{L}]*\\s+(?:mu|jej|im)\\s+ocen[\\p{L}]*"),
  ].join("|"),
  "iu",
);

// A person is named by a possessive or a form of address, or by a capitalised word that does not open
// the sentence. A bare "pracownik" is not enough: "Jaką ocenę może dostać pracownik?" asks about the scale.
const PERSON_WORDS = new RegExp(
  word(
    "jego|jej|mojego|mojej|moim|moją|moja|mój|naszego|naszej|pan|pani|panu|pani[\\p{L}]*",
  ),
  "iu",
);

const LEGAL_WORDS =
  /^(Ustaw|Rozporządz|Kodeks|Karta|Prezes|Rad[ay]|Minist|Służb|Urz|Dz|Art|Zarządz)/u;

function namesSomeone(question: string): boolean {
  const afterFirstWord = question.replace(/^\S+\s+/, "");
  const words = afterFirstWord.match(/\p{Lu}\p{Ll}{2,}/gu) ?? [];
  return words.some((w) => !LEGAL_WORDS.test(w));
}

// A question about the rating level of a given person. A question about the scale itself
// ("jakie są poziomy oceny", "jaką ocenę może dostać pracownik") is not refused. The backend
// guardrails stay the second line.
export function asksForPersonRating(question: string): boolean {
  if (!LEVEL_WORDS.test(question)) return false;
  return PERSON_WORDS.test(question) || namesSomeone(question);
}
