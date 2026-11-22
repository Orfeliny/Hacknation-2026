import { ConvexError } from "convex/values";

// A ConvexError with a Polish sentence as data: production hides a plain Error's text, and the
// UI helpers (e.g. review/types.ts messageOf) show `error.data` when it is a string.
export function refusal(message: string): ConvexError<string> {
  return new ConvexError(message);
}
