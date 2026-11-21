import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import type { api } from "../../../convex/_generated/api";

export type FirstReviewView = NonNullable<
  FunctionReturnType<typeof api.firstReview.queries.get>
>;

export type FirstReviewActions = {
  confirmReport: () => Promise<unknown>;
  conclude: (
    result: "positive" | "negative",
    unitHeadAgreed: boolean,
  ) => Promise<unknown>;
  sign: (role: "evaluator" | "employee", place: string) => Promise<unknown>;
};

export function errorMessage(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === "string") {
    return error.data;
  }
  return "Nie udało się wykonać operacji. Spróbuj ponownie.";
}
