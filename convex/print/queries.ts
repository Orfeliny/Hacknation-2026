import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { demoActor, resolveActor, type ResolvedActor } from "../lib/demoRole";

// tsconfig.app.json typechecks this file via _generated/api.d.ts; Node types there would hide browser-only bugs in src/.
declare const process: { env: Record<string, string | undefined> };

export const MAX_LISTED = 50;

const DEFAULT_OFFICE_NAME = "Nazwa urzędu";
const READS_ALL: ReadonlySet<string> = new Set(["hr", "director", "admin"]);

function canRead(actor: ResolvedActor, review: Doc<"reviews">): boolean {
  if (READS_ALL.has(actor.role)) return true;
  const id = actor.employee?._id;
  return (
    id !== undefined && (review.employeeId === id || review.evaluatorId === id)
  );
}

// Calendar day in Poland, so a signature at 00:30 local time keeps its local date.
function warsawDate(ms: number): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(
    ms,
  );
}

function person(employee: Doc<"employees">) {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    position: employee.position,
    unit: employee.unit,
  };
}

export const listPrintable = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const resolved = await resolveActor(ctx, actor);
    let reviews: Doc<"reviews">[];
    if (READS_ALL.has(resolved.role)) {
      reviews = await ctx.db.query("reviews").order("desc").take(MAX_LISTED);
    } else if (resolved.employee) {
      const id = resolved.employee._id;
      const [asEmployee, asEvaluator] = await Promise.all([
        ctx.db
          .query("reviews")
          .withIndex("by_employee", (q) => q.eq("employeeId", id))
          .order("desc")
          .take(MAX_LISTED),
        ctx.db
          .query("reviews")
          .withIndex("by_evaluator", (q) => q.eq("evaluatorId", id))
          .order("desc")
          .take(MAX_LISTED),
      ]);
      const byId = new Map(
        [...asEmployee, ...asEvaluator].map((review) => [review._id, review]),
      );
      reviews = [...byId.values()]
        .sort((a, b) => b._creationTime - a._creationTime)
        .slice(0, MAX_LISTED);
    } else {
      reviews = [];
    }
    return await Promise.all(
      reviews.map(async (review) => {
        const employee = await ctx.db.get(review.employeeId);
        return {
          reviewId: review._id,
          stage: review.stage,
          sheet: review.sheet ?? null,
          round: review.round ?? 1,
          employeeName: employee
            ? `${employee.firstName} ${employee.lastName}`
            : "",
        };
      }),
    );
  },
});

export const getSheet = query({
  args: { actor: demoActor, reviewId: v.id("reviews") },
  handler: async (ctx, { actor, reviewId }) => {
    const resolved = await resolveActor(ctx, actor);
    const review = await ctx.db.get(reviewId);
    if (!review) throw new Error("Review not found");
    if (!canRead(resolved, review)) {
      throw new Error("Not allowed to print this review");
    }
    const [employee, evaluator] = await Promise.all([
      ctx.db.get(review.employeeId),
      ctx.db.get(review.evaluatorId),
    ]);
    if (!employee || !evaluator) {
      throw new Error("The review points to a missing employee");
    }
    const promotion = review.promotionRequest;
    return {
      reviewId: review._id,
      officeName: process.env.OFFICE_NAME?.trim() || DEFAULT_OFFICE_NAME,
      rulesVersion: review.rulesVersion ?? null,
      sheet: review.sheet ?? null,
      stage: review.stage,
      round: review.round ?? 1,
      employee: {
        ...person(employee),
        isOfficial: employee.corpsRole === "official",
      },
      evaluator: person(evaluator),
      dueDate: review.dueDate ?? null,
      openingConversationDate: review.openingConversationDate ?? null,
      evaluationConversationDate: review.evaluationConversationDate ?? null,
      periodStart: review.periodStart ?? null,
      periodEnd: review.periodEnd ?? null,
      additionalCriteria: review.additionalCriteria ?? [],
      ratings: (review.ratings ?? []).map((rating) => ({
        criterionId: rating.criterionId,
        levelId: rating.levelId,
        justification: rating.justification ?? null,
      })),
      averageScore: review.averageScore ?? null,
      overallResult: review.overallResult ?? null,
      overallLevelId: review.overallLevelId ?? null,
      overallJustification: review.overallJustification ?? null,
      previousReview: review.previousReview ?? null,
      developmentPlan: review.developmentPlan
        ? {
            summary: review.developmentPlan.summary ?? null,
            strengths: review.developmentPlan.strengths ?? [],
            areas: review.developmentPlan.areas ?? [],
            actions: review.developmentPlan.actions ?? [],
          }
        : null,
      promotionRequest: promotion
        ? {
            requested: promotion.requested,
            justification: promotion.justification ?? null,
            appointmentYear:
              promotion.appointmentYear ?? employee.appointmentYear ?? null,
            currentGrade:
              promotion.currentGrade ?? employee.serviceGrade ?? null,
            currentGradeSince:
              promotion.currentGradeSince ?? employee.serviceGradeSince ?? null,
          }
        : null,
      signatures: (review.signatures ?? []).map((signature) => ({
        role: signature.role,
        scope: signature.scope ?? null,
        place: signature.place ?? null,
        date: warsawDate(signature.signedAt),
        deemedAcknowledgement: signature.deemedById !== undefined,
      })),
      objectionAddressee: review.objection?.addressee ?? null,
    };
  },
});
