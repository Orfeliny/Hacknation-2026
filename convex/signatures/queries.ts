import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";
import { RULES_2016 } from "../rules/pack2016";
import { canViewReview } from "../reviews/access";
import { assertCanSign } from "../reviews/signing";
import { MESSAGES, fail, loadReview, scopeArg, signerRole } from "./access";

// Runs every check that does not need the file bytes, so the action never reads or deletes a file
// the caller may not sign with.
export const checkUpload = internalQuery({
  args: {
    actor: demoActor,
    reviewId: v.id("reviews"),
    scope: scopeArg,
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { actor, reviewId, scope, storageId }) => {
    const resolved = await resolveActor(ctx, actor);
    const { review } = await loadReview(ctx, resolved, reviewId);
    assertCanSign(review, signerRole(resolved, review), scope);
    const file = await ctx.db.system.get(storageId);
    if (!file) return fail(MESSAGES.fileMissing);
    return { contentType: file.contentType ?? null, size: file.size };
  },
});

const SCOPES = [
  {
    scope: "part_one",
    label: "Część I: rozmowa rozpoczynająca i zapoznanie z kryteriami",
    source: RULES_2016.sources.openingSignatures ?? RULES_2016.source,
  },
  {
    scope: "assessment",
    label: "Zapoznanie z oceną",
    source: RULES_2016.sources.acknowledgement ?? RULES_2016.source,
  },
] as const;

const ROLES = ["evaluator", "employee"] as const;

export const listForReview = query({
  args: { actor: demoActor, reviewId: v.id("reviews") },
  handler: async (ctx, { actor, reviewId }) => {
    const resolved = await resolveActor(ctx, actor);
    const review = await ctx.db.get(reviewId);
    if (!review || !canViewReview(resolved, review)) return null;
    const signatures = review.signatures ?? [];
    const names = new Map<string, string>();
    for (const id of new Set(
      signatures.flatMap((s) => [s.signerId, s.deemedById ?? s.signerId]),
    )) {
      const person = await ctx.db.get(id);
      if (person) names.set(id, `${person.firstName} ${person.lastName}`);
    }
    const moments = [];
    for (const { scope, label, source } of SCOPES) {
      const entries = [];
      for (const role of ROLES) {
        const s = signatures.find(
          (x) => x.role === role && (x.scope ?? "assessment") === scope,
        );
        if (!s) {
          entries.push({
            role,
            signed: false as const,
            status: "Brak podpisu",
          });
          continue;
        }
        const method = s.deemedById
          ? ("deemed" as const)
          : (s.method ?? "in_app");
        entries.push({
          role,
          signed: true as const,
          signerName: names.get(s.signerId) ?? null,
          signedAt: s.signedAt,
          place: s.place ?? null,
          method,
          status:
            method === "deemed"
              ? `Fikcja zapoznania z oceną, odnotował(a): ${names.get(s.deemedById!) ?? "nieznana osoba"}`
              : method === "signed_file"
                ? s.signatureDetected
                  ? "Podpis elektroniczny wykryty w pliku"
                  : "Nie znaleziono podpisu"
                : "Potwierdzenie w aplikacji",
          signatureDetected: s.signatureDetected ?? null,
          fileUrl: s.fileId ? await ctx.storage.getUrl(s.fileId) : null,
        });
      }
      moments.push({ scope, label, source, entries });
    }
    return { stage: review.stage, moments };
  },
});
