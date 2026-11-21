import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { ResolvedActor } from "../lib/demoRole";
import { canViewReview, isEvaluator, isReviewed } from "../reviews/access";
import type { SignerRole } from "../reviews/signing";
import { MAX_SIGNED_FILE_BYTES } from "./pades";

export const scopeArg = v.union(v.literal("part_one"), v.literal("assessment"));

export const MESSAGES = {
  reviewNotFound: "Nie znaleziono oceny.",
  notSigner: "Tej oceny nie podpisujesz.",
  noSigningNow: "Na tym etapie oceny nie składa się podpisu.",
  fileMissing: "Nie znaleziono pliku. Wgraj go ponownie.",
  notPdf: "Wgraj plik PDF. Inne formaty nie są przyjmowane.",
  tooLarge: `Plik jest za duży. Największy dopuszczalny rozmiar to ${MAX_SIGNED_FILE_BYTES / 1024 / 1024} MB.`,
  notDetected:
    "Nie znaleziono podpisu. Podpisz plik PDF podpisem zaufanym, osobistym albo kwalifikowanym i wgraj go ponownie.",
  notDeemer: "Zapoznanie z oceną rejestruje oceniający albo kadry.",
} as const;

export const fail = (message: string): never => {
  throw new ConvexError(message);
};

export async function loadReview(
  ctx: Pick<QueryCtx, "db">,
  actor: ResolvedActor,
  reviewId: Id<"reviews">,
) {
  const review = await ctx.db.get(reviewId);
  if (!review || !canViewReview(actor, review)) {
    return fail(MESSAGES.reviewNotFound);
  }
  const employee = await ctx.db.get(review.employeeId);
  if (!employee) return fail(MESSAGES.reviewNotFound);
  return { review, employee };
}

// Only the evaluator and the reviewed employee sign, each for their own role.
export function signerRole(
  actor: ResolvedActor,
  review: Doc<"reviews">,
): SignerRole {
  if (isEvaluator(actor, review)) return "evaluator";
  if (isReviewed(actor, review)) return "employee";
  return fail(MESSAGES.notSigner);
}
