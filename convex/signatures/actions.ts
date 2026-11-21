import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { demoActor } from "../lib/demoRole";
import { MESSAGES, fail, scopeArg } from "./access";
import {
  MAX_SIGNED_FILE_BYTES,
  PDF_CONTENT_TYPE,
  detectPadesSignature,
  looksLikePdf,
} from "./pades";

// An action, not a mutation: only actions can read file bytes, and doing the check before the
// signature is stored means a file without a signature never counts as signed, not even briefly.
export const attachSignedFile = action({
  args: {
    actor: demoActor,
    reviewId: v.id("reviews"),
    scope: scopeArg,
    storageId: v.id("_storage"),
    place: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ subFilter: string }> => {
    const { actor, reviewId, scope, storageId } = args;
    const meta = await ctx.runQuery(internal.signatures.queries.checkUpload, {
      actor,
      reviewId,
      scope,
      storageId,
    });
    // From here on the caller may sign; a rejected file is deleted so no unsigned copy of the
    // sheet (personal data) stays in storage.
    const reject = async (message: string): Promise<never> => {
      await ctx.storage.delete(storageId);
      return fail(message);
    };
    if (meta.size > MAX_SIGNED_FILE_BYTES) return reject(MESSAGES.tooLarge);
    if (meta.contentType !== PDF_CONTENT_TYPE) return reject(MESSAGES.notPdf);
    const blob = await ctx.storage.get(storageId);
    if (!blob) return fail(MESSAGES.fileMissing);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (!looksLikePdf(bytes)) return reject(MESSAGES.notPdf);
    const detection = detectPadesSignature(bytes);
    if (!detection.detected) return reject(MESSAGES.notDetected);
    await ctx.runMutation(internal.signatures.mutations.recordSignedFile, args);
    return { subFilter: detection.subFilter };
  },
});
