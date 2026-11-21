import { ConvexError } from "convex/values";

// Only a ConvexError carries a message the backend meant for the user; any other error text is
// hidden by Convex in production, so the caller's fallback is shown instead.
export function errorText(error: unknown, fallback: string): string {
  if (error instanceof ConvexError) {
    const data: unknown = error.data;
    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  }
  return fallback;
}
