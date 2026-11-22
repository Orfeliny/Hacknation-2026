import { ConvexError } from "convex/values";

// Convex shows a client only the data of a ConvexError; the text of a plain Error is hidden in
// production. Every refusal the user should read is therefore a ConvexError with a "denied" code.
export function denied(message: string) {
  return new ConvexError({ code: "denied" as const, message });
}

export function deniedMessage(error: unknown): string | null {
  if (!(error instanceof ConvexError)) return null;
  const data: unknown = error.data;
  if (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    data.code === "denied" &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    return data.message;
  }
  return null;
}

export const ONLY_EVALUATOR = "Projekt treści oceny widzi tylko oceniający.";
export const NO_RATINGS =
  "Najpierw wybierz oceny kryteriów, potem poproś o projekt.";
