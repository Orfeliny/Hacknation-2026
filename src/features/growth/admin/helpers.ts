import { ConvexError } from "convex/values";

export const selectClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600";

export const textareaClass = `${selectClass} min-h-24`;

// The backend and the shared validators throw a ConvexError with a Polish sentence.
export function messageOf(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === "string") {
    return error.data;
  }
  return "Nie udało się zapisać. Sprawdź pola i spróbuj ponownie.";
}
