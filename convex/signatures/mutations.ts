import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";
import { isEvaluator } from "../reviews/access";
import { SIGNING_STAGE, recordSignature } from "../reviews/signing";
import { MESSAGES, fail, loadReview, scopeArg, signerRole } from "./access";

export const generateUploadUrl = mutation({
  args: { actor: demoActor, reviewId: v.id("reviews") },
  handler: async (ctx, { actor, reviewId }) => {
    const resolved = await resolveActor(ctx, actor);
    const { review } = await loadReview(ctx, resolved, reviewId);
    signerRole(resolved, review);
    if (!Object.values(SIGNING_STAGE).includes(review.stage)) {
      return fail(MESSAGES.noSigningNow);
    }
    return await ctx.storage.generateUploadUrl();
  },
});

// Called by attachSignedFile only after the file passed the PAdES check.
export const recordSignedFile = internalMutation({
  args: {
    actor: demoActor,
    reviewId: v.id("reviews"),
    scope: scopeArg,
    storageId: v.id("_storage"),
    place: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveActor(ctx, args.actor);
    const { review, employee } = await loadReview(ctx, resolved, args.reviewId);
    // One file backs one signature: a file already attached anywhere cannot be reused.
    const reviews = await ctx.db.query("reviews").collect();
    if (
      reviews.some((r) =>
        (r.signatures ?? []).some((s) => s.fileId === args.storageId),
      )
    ) {
      fail(MESSAGES.fileReused);
    }
    await recordSignature(ctx, resolved, review, employee, {
      role: signerRole(resolved, review),
      signerId: resolved.employee!._id,
      scope: args.scope,
      place: args.place,
      method: "signed_file",
      fileId: args.storageId,
      signatureDetected: true,
    });
  },
});

// "Fikcja zapoznania z oceną": the employee does not sign, so the evaluator or HR records that the
// assessment was made known to them. It counts as the employee's § 12 signature.
export const recordDeemedAcknowledgement = mutation({
  args: {
    actor: demoActor,
    reviewId: v.id("reviews"),
    // Contract D5: the sheet records where the acknowledgement happened.
    place: v.string(),
  },
  handler: async (ctx, { actor, reviewId, place }) => {
    const resolved = await resolveActor(ctx, actor);
    const { review, employee } = await loadReview(ctx, resolved, reviewId);
    const allowed = isEvaluator(resolved, review) || resolved.role === "hr";
    if (!allowed || !resolved.employee) return fail(MESSAGES.notDeemer);
    await recordSignature(ctx, resolved, review, employee, {
      role: "employee",
      signerId: review.employeeId,
      scope: "assessment",
      place,
      deemedById: resolved.employee._id,
    });
  },
});
