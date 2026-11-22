export const REFUSAL_MESSAGE =
  "Nie wskazuję poziomu oceny konkretnej osoby: ocenę wystawia przełożony na podstawie obserwacji i kryteriów. Mogę natomiast wyjaśnić kryteria, skalę i tryb oceny okresowej.";

const LEVEL_WORDS =
  /(jak[aąi]\w*\s+(ocen|poziom|stopie)|ocen\w*\s+(powinien|powinna|dostanie|dostał|wystawi|wystawić|zasługuje)|czy(\s+\S+){1,4}\s+zasługuje|wystaw\w*\s+(mu|jej|im)\s+ocen|jak\s+ocenić)/i;

const PERSON_WORDS =
  /\b(pracownik\w*|podwładn\w*|kolega|koleżank\w*|pan|pani|jego|jej|mojego|mojej|moim|nim|niej|on|ona)\b/i;

const NAME = /(?:^|[\s,])\p{Lu}\p{Ll}{2,}\s+\p{Lu}\p{Ll}{2,}/u;

// A question about the rating level of a given person. A question about the scale itself
// ("jakie są poziomy oceny") is not refused. The backend guardrails stay the second line.
export function asksForPersonRating(question: string): boolean {
  if (!LEVEL_WORDS.test(question)) return false;
  const afterFirstWord = question.replace(/^\S+\s+/, "");
  return PERSON_WORDS.test(question) || NAME.test(afterFirstWord);
}
