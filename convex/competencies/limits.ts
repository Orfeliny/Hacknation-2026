import { z } from "zod";

// Shared by the form and the backend, so both reject the same input.
export const JUSTIFICATION_MAX_LENGTH = 1000;

export const DEVIATION_MESSAGE =
  "Poziom różni się od sugerowanego: dopisz krótkie uzasadnienie.";

export const NO_SUGGESTION_MESSAGE =
  "System nie zasugerował poziomu: dopisz krótkie uzasadnienie wyboru.";

export function justificationSchema(emptyMessage: string) {
  return z
    .string()
    .trim()
    .min(1, emptyMessage)
    .max(
      JUSTIFICATION_MAX_LENGTH,
      `Uzasadnienie może mieć najwyżej ${JUSTIFICATION_MAX_LENGTH} znaków.`,
    );
}
