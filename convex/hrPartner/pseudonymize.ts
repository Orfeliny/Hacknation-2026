// Stand-in for the pseudonymisation helper of #28: when it lands, this file becomes a thin wrapper.
// Limit: only the exact spelling of a name is replaced, so a Polish inflected form ("Joannie")
// slips through. That is why the prompts also carry no free text from observations.
export const PLACEHOLDER = "[PRACOWNIK]";

export type PersonName = { firstName: string; lastName: string };

const MIN_NAME_LENGTH = 3;

// The first person (the one a question is about) is [PRACOWNIK]; the others are numbered, so an
// answer that mentions two people can be mapped back to the right two.
export function placeholderFor(index: number): string {
  return index === 0 ? PLACEHOLDER : `[PRACOWNIK_${index + 1}]`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordPattern(word: string): RegExp {
  return new RegExp(`(?<![\\p{L}])${escapeRegExp(word)}(?![\\p{L}])`, "giu");
}

// Full names first, so "Joanna Mazur" becomes one placeholder, then the single words.
export function pseudonymize(text: string, people: PersonName[]): string {
  let result = text;
  people.forEach((person, index) => {
    const placeholder = placeholderFor(index);
    result = result
      .replace(
        wordPattern(`${person.firstName} ${person.lastName}`),
        placeholder,
      )
      .replace(
        wordPattern(`${person.lastName} ${person.firstName}`),
        placeholder,
      );
  });
  people.forEach((person, index) => {
    for (const word of [person.lastName, person.firstName]) {
      if (word.length >= MIN_NAME_LENGTH) {
        result = result.replace(wordPattern(word), placeholderFor(index));
      }
    }
  });
  return result;
}

// Takes the same ordered list that was given to pseudonymize.
export function restore(text: string, people: PersonName[]): string {
  let result = text;
  people.forEach((person, index) => {
    result = result
      .split(placeholderFor(index))
      .join(`${person.firstName} ${person.lastName}`);
  });
  return result;
}
