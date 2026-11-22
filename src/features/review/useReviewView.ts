import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useDemoRole } from "../../lib/demoRole";
import type { ReviewView } from "./types";

// The id comes from the query string. It is only sent to `get` once the role's own list
// contains it, so `abc`, a foreign or a deleted id never reaches the validator.
export function useReviewView(reviewId: string): ReviewView | null | undefined {
  const actor = { role: useDemoRole() };
  const reviews = useQuery(api.reviews.queries.list, { actor });
  const known = reviews?.some((r) => r._id === reviewId) ?? false;
  const view = useQuery(
    api.reviews.queries.get,
    known ? { actor, reviewId: reviewId as Id<"reviews"> } : "skip",
  );
  if (reviews === undefined) return undefined;
  return known ? view : null;
}
