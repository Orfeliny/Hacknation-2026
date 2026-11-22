import { ConvexError } from "convex/values";
import { mutation, type MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { logAudit } from "../audit/log";
import { resolveActor, type ResolvedActor } from "../lib/demoRole";
import {
  SHIFT_LIMITS,
  decideContract,
  markNoticeSentContract,
} from "../lib/contracts/deadlineShift";
import { assertIsoDate } from "../lib/validators";
import { reviewContext, todayIso } from "../reviews/context";
import { compareDates } from "../rules/dates";
import { currentDueDate, isEvaluatorOf, isHr, shiftCondition } from "./shared";

const fail = (message: string): never => {
  throw new ConvexError(message);
};

async function entryOf(
  ctx: MutationCtx,
  reviewId: Doc<"reviews">["_id"],
  changeIndex: number,
) {
  const review = await ctx.db.get(reviewId);
  const entry = review?.deadlineChanges?.[changeIndex];
  if (!review || !entry)
    return fail("Nie znaleziono wniosku o przesunięcie terminu.");
  return { review, entry };
}

function replaceEntry(
  review: Doc<"reviews">,
  index: number,
  entry: NonNullable<Doc<"reviews">["deadlineChanges"]>[number],
) {
  return (review.deadlineChanges ?? []).map((e, i) =>
    i === index ? entry : e,
  );
}

function audit(
  ctx: MutationCtx,
  actor: ResolvedActor,
  review: Doc<"reviews">,
  index: number,
  details: string,
) {
  return logAudit(ctx, {
    actor,
    action: "update",
    entity: "deadlineChange",
    entityId: `${review._id}:${index}`,
    reviewId: review._id,
    details,
  });
}

export const decide = mutation({
  ...decideContract,
  handler: async (
    ctx,
    { actor, reviewId, changeIndex, accepted, justification, newDate },
  ) => {
    const resolved = await resolveActor(ctx, actor);
    const { review, entry } = await entryOf(ctx, reviewId, changeIndex);
    if (!isEvaluatorOf(resolved, review)) {
      return fail("Decyzję podejmuje przełożony oceniający tego pracownika.");
    }
    if (entry.status !== "requested") {
      return fail("Ten wniosek został już rozpatrzony.");
    }
    const text = justification.trim();
    if (!text) return fail("Podaj uzasadnienie decyzji.");
    if (text.length > SHIFT_LIMITS.justification) {
      return fail(
        `Uzasadnienie może mieć najwyżej ${SHIFT_LIMITS.justification} znaków.`,
      );
    }
    let finalDate = entry.newDate;
    if (accepted) {
      if (!newDate) return fail("Podaj nową datę terminu oceny.");
      finalDate = assertIsoDate(newDate, "newDate");
      if (compareDates(finalDate, entry.previousDate) <= 0) {
        return fail("Nowy termin musi przypadać po dotychczasowym.");
      }
      const employee = await ctx.db.get(review.employeeId);
      if (!employee) return fail("Nie znaleziono pracownika.");
      const today = todayIso();
      const { cycleStart } = await reviewContext(ctx, review, employee, today);
      const condition = shiftCondition(cycleStart, today);
      if (!condition.allowed)
        return fail(condition.reason ?? "Przesunięcie niedozwolone.");
    }
    const now = Date.now();
    await ctx.db.patch(review._id, {
      deadlineChanges: replaceEntry(review, changeIndex, {
        ...entry,
        status: accepted ? "approved" : "rejected",
        newDate: finalDate,
        decisionJustification: text,
        decidedById: resolved.employee?._id,
        decidedAt: now,
      }),
      updatedAt: now,
    });
    await audit(
      ctx,
      resolved,
      review,
      changeIndex,
      accepted ? "approved" : "rejected",
    );
    return null;
  },
});

export const markNoticeSent = mutation({
  ...markNoticeSentContract,
  handler: async (ctx, { actor, reviewId, changeIndex }) => {
    const resolved = await resolveActor(ctx, actor);
    if (!isHr(resolved)) return fail("Pismo o terminie wysyłają kadry.");
    const { review, entry } = await entryOf(ctx, reviewId, changeIndex);
    if (entry.status === "requested") {
      return fail("Wniosek czeka jeszcze na decyzję przełożonego.");
    }
    if (entry.noticeSentAt !== undefined) {
      return fail("Pismo zostało już wysłane.");
    }
    const now = Date.now();
    const approved = entry.status === "approved";
    const updated = {
      ...review,
      deadlineChanges: replaceEntry(review, changeIndex, {
        ...entry,
        noticeSentAt: now,
      }),
      ...(approved ? { dueDate: entry.newDate } : {}),
    };
    await ctx.db.patch(review._id, {
      deadlineChanges: updated.deadlineChanges,
      ...(approved ? { dueDate: entry.newDate } : {}),
      updatedAt: now,
    });
    await audit(ctx, resolved, review, changeIndex, "notice_sent");
    return { dueDate: currentDueDate(updated) };
  },
});
