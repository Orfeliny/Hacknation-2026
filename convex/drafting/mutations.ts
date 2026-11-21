import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
  internalMutation,
  mutation,
  type MutationCtx,
} from "../_generated/server";
import { demoActor, resolveActor, type DemoActor } from "../lib/demoRole";
import { requireEvaluator } from "./access";
import { denied, ONLY_EVALUATOR } from "./errors";
import { draftSection } from "./kinds";
import { MAX_DRAFT_TEXT } from "./limits";

const TEXT_ERROR = `Tekst musi mieć od 1 do ${MAX_DRAFT_TEXT} znaków.`;

function cleanText(text: string): string {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed.length > MAX_DRAFT_TEXT) {
    throw denied(TEXT_ERROR);
  }
  return trimmed;
}

async function ownDraft(
  ctx: MutationCtx,
  actor: DemoActor,
  draftId: Id<"drafts">,
) {
  const resolved = await resolveActor(ctx, actor);
  const draft = await ctx.db.get(draftId);
  if (!draft) throw denied(ONLY_EVALUATOR);
  const review = await ctx.db.get(draft.reviewId);
  if (!review) throw denied(ONLY_EVALUATOR);
  requireEvaluator(resolved, review);
  return draft;
}

export const setStatus = mutation({
  args: {
    actor: demoActor,
    draftId: v.id("drafts"),
    status: v.union(v.literal("accepted"), v.literal("rejected")),
  },
  handler: async (ctx, { actor, draftId, status }) => {
    const draft = await ownDraft(ctx, actor, draftId);
    await ctx.db.patch(draft._id, { status, updatedAt: Date.now() });
  },
});

// Changing the text of a fragment makes it the evaluator's own: status "edited".
export const edit = mutation({
  args: { actor: demoActor, draftId: v.id("drafts"), text: v.string() },
  handler: async (ctx, { actor, draftId, text }) => {
    const draft = await ownDraft(ctx, actor, draftId);
    await ctx.db.patch(draft._id, {
      text: cleanText(text),
      status: "edited",
      updatedAt: Date.now(),
    });
  },
});

// A fragment written by hand, so a failing model never blocks the evaluator.
export const addManual = mutation({
  args: {
    actor: demoActor,
    reviewId: v.id("reviews"),
    section: draftSection,
    text: v.string(),
    criterionId: v.optional(v.string()),
  },
  handler: async (ctx, { actor, reviewId, section, text, criterionId }) => {
    const resolved = await resolveActor(ctx, actor);
    const review = await ctx.db.get(reviewId);
    if (!review) throw denied(ONLY_EVALUATOR);
    requireEvaluator(resolved, review);
    return await ctx.db.insert("drafts", {
      reviewId,
      section,
      text: cleanText(text),
      status: "accepted",
      createdAt: Date.now(),
      criterionId,
    });
  },
});

const fragment = v.object({
  section: draftSection,
  text: v.string(),
  criterionId: v.optional(v.string()),
  observationIds: v.array(v.id("observations")),
  noEvidence: v.boolean(),
  inconsistency: v.optional(v.string()),
  // An area carries a key; an action names the key of its area.
  key: v.optional(v.string()),
  areaKey: v.optional(v.string()),
});

// Replaces the fragments still "proposed"; everything the evaluator already decided stays.
export const replaceProposed = internalMutation({
  args: { reviewId: v.id("reviews"), fragments: v.array(fragment) },
  handler: async (ctx, { reviewId, fragments }) => {
    const existing = await ctx.db
      .query("drafts")
      .withIndex("by_review", (q) => q.eq("reviewId", reviewId))
      .collect();
    for (const draft of existing) {
      if (draft.status === "proposed") await ctx.db.delete(draft._id);
    }
    const now = Date.now();
    const areaIds = new Map<string, Id<"drafts">>();
    let inserted = 0;
    let droppedActions = 0;
    const base = (f: (typeof fragments)[number]) => ({
      reviewId,
      section: f.section,
      text: f.text,
      status: "proposed" as const,
      createdAt: now,
      criterionId: f.criterionId,
      observationIds: f.observationIds,
      noEvidence: f.noEvidence,
      inconsistency: f.inconsistency,
    });
    for (const f of fragments) {
      if (f.section === "development_action") continue;
      const id = await ctx.db.insert("drafts", base(f));
      inserted += 1;
      if (f.section === "development_area" && f.key) areaIds.set(f.key, id);
    }
    for (const f of fragments) {
      if (f.section !== "development_action") continue;
      const area = f.areaKey ? areaIds.get(f.areaKey) : undefined;
      if (!area) {
        droppedActions += 1;
        continue;
      }
      await ctx.db.insert("drafts", { ...base(f), relatedDraftId: area });
      inserted += 1;
    }
    return { inserted, droppedActions };
  },
});
