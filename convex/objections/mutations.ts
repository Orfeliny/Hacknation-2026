import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
  mutation,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import { logAudit } from "../audit/log";
import { fullName } from "../employees/access";
import { demoActor, resolveActor, type ResolvedActor } from "../lib/demoRole";
import { enqueueMail } from "../mail/queue";
import { canViewReview, isReviewed } from "../reviews/access";
import { todayIso } from "../reviews/context";
import { MAX_OBJECTION_LENGTH } from "./limits";
import { canFile } from "./rules";

const fail = (message: string): never => {
  throw new ConvexError(message);
};

async function loadReview(
  ctx: MutationCtx,
  actor: ResolvedActor,
  reviewId: Id<"reviews">,
) {
  const review = await ctx.db.get(reviewId);
  if (!review || !canViewReview(actor, review)) {
    return fail("Nie znaleziono oceny.");
  }
  return review;
}

async function directorOf(ctx: Pick<QueryCtx, "db">) {
  const matches = await ctx.db
    .query("employees")
    .withIndex("by_demoPersona", (q) => q.eq("demoPersona", "director"))
    .take(1);
  return matches[0] ?? null;
}

const pushStage = (review: Doc<"reviews">, stage: Doc<"reviews">["stage"]) => [
  ...(review.stageHistory ?? []),
  { stage, at: Date.now() },
];

export const file = mutation({
  args: { actor: demoActor, reviewId: v.id("reviews"), text: v.string() },
  handler: async (ctx, { actor, reviewId, text }) => {
    const resolved = await resolveActor(ctx, actor);
    const review = await loadReview(ctx, resolved, reviewId);
    if (!isReviewed(resolved, review)) {
      return fail("Sprzeciw wnosi tylko oceniany.");
    }
    const check = canFile(review, todayIso());
    if (!check.allowed) return fail(check.reason);
    const trimmed = text.trim();
    if (!trimmed) return fail("Podaj uzasadnienie sprzeciwu.");
    if (trimmed.length > MAX_OBJECTION_LENGTH) {
      return fail(
        `Uzasadnienie sprzeciwu może mieć najwyżej ${MAX_OBJECTION_LENGTH} znaków.`,
      );
    }
    const director = await directorOf(ctx);
    const now = Date.now();
    await ctx.db.patch(reviewId, {
      objection: {
        filedAt: now,
        text: trimmed,
        addressee: director ? fullName(director) : undefined,
      },
      stage: "objection",
      stageHistory: pushStage(review, "objection"),
      updatedAt: now,
    });
    await logAudit(ctx, {
      actor: resolved,
      action: "create",
      entity: "objection",
      entityId: reviewId,
      reviewId,
      details: `round:${review.round ?? 1}`,
    });
    await logAudit(ctx, {
      actor: resolved,
      action: "stage_change",
      entity: "review",
      entityId: reviewId,
      reviewId,
      details: `${review.stage}->objection`,
    });
    if (director) {
      await enqueueMail(ctx, {
        recipientId: director._id,
        kind: "objection",
        subject: "Wniesiono sprzeciw od oceny okresowej",
        body: "Do rozpatrzenia czeka sprzeciw od oceny okresowej. Decyzję podejmujesz w zakładce „Sprzeciwy”, w ciągu 14 dni od wniesienia.",
        reviewId,
      });
    }
  },
});

const OUTCOME = {
  rejected: { stage: "closed", label: "nieuwzględniony" },
  amend: { stage: "writing", label: "uwzględniony: oceniający zmieni ocenę" },
  redo: {
    stage: "evaluation",
    label: "uwzględniony: ocena zostanie sporządzona ponownie",
  },
} as const;

export const decide = mutation({
  args: {
    actor: demoActor,
    reviewId: v.id("reviews"),
    decision: v.union(
      v.literal("amend"),
      v.literal("redo"),
      v.literal("rejected"),
    ),
    justification: v.string(),
  },
  handler: async (ctx, { actor, reviewId, decision, justification }) => {
    const resolved = await resolveActor(ctx, actor);
    if (resolved.role !== "director") {
      return fail("Sprzeciw rozpatruje tylko dyrektor generalny.");
    }
    const review = await loadReview(ctx, resolved, reviewId);
    if (review.stage !== "objection" || !review.objection) {
      return fail("Ta ocena nie ma sprzeciwu do rozpatrzenia.");
    }
    const reason = justification.trim();
    if (!reason) return fail("Podaj uzasadnienie rozstrzygnięcia.");
    const now = Date.now();
    const target = OUTCOME[decision].stage;
    const patch: Partial<Doc<"reviews">> = {
      objection: {
        ...review.objection,
        decision,
        decidedAt: now,
        justification: reason,
        decidedById: resolved.employee?._id,
      },
      stage: target,
      stageHistory: pushStage(review, target),
      updatedAt: now,
    };
    if (decision === "rejected") {
      patch.closedAt = now;
      patch.endReason = "completed";
    } else {
      // The assessment is signed again; part I stays confirmed.
      patch.signatures = (review.signatures ?? []).filter(
        (s) => s.scope === "part_one",
      );
      if (decision === "redo") patch.round = (review.round ?? 1) + 1;
    }
    await ctx.db.patch(reviewId, patch);
    await logAudit(ctx, {
      actor: resolved,
      action: "stage_change",
      entity: "review",
      entityId: reviewId,
      reviewId,
      details: `objection:${decision};objection->${target}`,
    });
    await enqueueMail(ctx, {
      recipientId: review.employeeId,
      kind: "objection",
      subject: "Rozstrzygnięcie sprzeciwu od oceny okresowej",
      body: `Sprzeciw został rozpatrzony: ${OUTCOME[decision].label}. Szczegóły są w zakładce „Moja ocena”.`,
      reviewId,
    });
  },
});
