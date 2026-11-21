import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import type { api } from "../../../convex/_generated/api";

export type ReviewView = NonNullable<
  FunctionReturnType<typeof api.reviews.queries.get>
>;

export type ReviewPatch = {
  additionalCriteria?: string[];
  openingConversationDate?: string;
  expectations?: { criterionId: string; text: string }[];
  periodStart?: string;
  periodEnd?: string;
  evaluationConversationDate?: string;
  ratings?: { criterionId: string; levelId: string }[];
  overallJustification?: string;
  developmentPlan?: { summary?: string };
  promotionRequest?: { requested: boolean; justification?: string };
  staffingSituations?: ReviewView["review"]["staffingSituations"];
};

export type WizardActions = {
  save: (patch: ReviewPatch) => Promise<unknown>;
  advance: () => Promise<unknown>;
  sign: (scope: "part_one" | "assessment", place: string) => Promise<unknown>;
  close: () => Promise<unknown>;
};

export function errorMessage(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === "string") {
    return error.data;
  }
  return "Nie udało się wykonać operacji. Spróbuj ponownie.";
}
