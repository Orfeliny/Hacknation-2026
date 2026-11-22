import { ConvexError } from "convex/values";

export function errorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const data: unknown = error.data;
    if (typeof data === "string") return data;
    if (typeof data === "object" && data !== null && "message" in data) {
      if (typeof data.message === "string") return data.message;
    }
  }
  return "Nie udało się wykonać operacji. Spróbuj ponownie.";
}
