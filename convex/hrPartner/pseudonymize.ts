// Stand-in for the pseudonymisation helper of #28: when it lands, this file becomes a thin wrapper.
// Limit: only the exact spelling of a name is replaced, so a Polish inflected form ("Joannie")
// slips through. That is why the prompts also carry no free text from observations.
export const PLACEHOLDER = "[PRACOWNIK]";

export type PersonName = { firstName: string; lastName: string };

const MIN_NAME_LENGTH = 3;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordPattern(word: string): RegExp {
  return new RegExp(`(?<![\\p{L}])${escapeRegExp(word)}(?![\\p{L}])`, "giu");
}

// Full names first, so "Joanna Mazur" becomes one placeholder, then the single words.
export function pseudonymize(text: string, people: PersonName[]): string {
  let result = text;
  for (const person of people) {
    result = result
      .replace(
        wordPattern(`${person.firstName} ${person.lastName}`),
        PLACEHOLDER,
      )
      .replace(
        wordPattern(`${person.lastName} ${person.firstName}`),
        PLACEHOLDER,
      );
  }
  for (const person of people) {
    for (const word of [person.lastName, person.firstName]) {
      if (word.length >= MIN_NAME_LENGTH) {
        result = result.replace(wordPattern(word), PLACEHOLDER);
      }
    }
  }
  return result;
}

// The placeholder in an answer stands for the one employee the question was about.
export function restore(text: string, person: PersonName): string {
  return text.split(PLACEHOLDER).join(`${person.firstName} ${person.lastName}`);
}
