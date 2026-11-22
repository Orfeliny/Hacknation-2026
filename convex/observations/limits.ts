import { z } from "zod";

// Shared by the form and the backend, so both reject the same input.
export const OBSERVATION_MAX_LENGTH = 1000;

export const OBSERVATION_HINT =
  "Opisuj tylko to, jak pracownik wykonuje obowiązki. Nie wpisuj spraw prywatnych ani zdrowotnych.";

export const observationText = z
  .string()
  .trim()
  .min(1, "Treść obserwacji nie może być pusta.")
  .max(
    OBSERVATION_MAX_LENGTH,
    `Treść obserwacji może mieć najwyżej ${OBSERVATION_MAX_LENGTH} znaków.`,
  );
