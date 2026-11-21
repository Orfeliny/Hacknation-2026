import { ConvexError, type Infer } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { logAudit } from "../audit/log";
import type { ResolvedActor } from "../lib/demoRole";
import type { signature } from "../lib/validators";
import { reviewContext, todayIso } from "./context";
import { STAGE_LABELS, blockingGaps, formatGaps, stepGaps } from "./stages";

type Signature = Infer<typeof signature>;
export type SignatureScope = NonNullable<Signature["scope"]>;
export type SignerRole = Signature["role"];

const fail = (message: string): never => {
  throw new ConvexError(message);
};

export function pushStage(
  review: Doc<"reviews">,
  stage: Doc<"reviews">["stage"],
) {
  return [...(review.stageHistory ?? []), { stage, at: Date.now() }];
}

export const SIGNING_STAGE: Record<SignatureScope, Doc<"reviews">["stage"]> = {
  part_one: "opening",
  assessment: "signing",
};

export function hasSigned(
  review: Pick<Doc<"reviews">, "signatures">,
  role: SignerRole,
  scope: SignatureScope,
): boolean {
  return (review.signatures ?? []).some(
    (s) => s.role === role && (s.scope ?? "assessment") === scope,
  );
}

// Checks that do not change between validating an upload and recording it.
export function assertCanSign(
  review: Doc<"reviews">,
  role: SignerRole,
  scope: SignatureScope,
): void {
  const stage = SIGNING_STAGE[scope];
  if (review.stage !== stage) {
    fail(
      `Ten podpis składa się na etapie „${STAGE_LABELS[stage]}”, a ocena jest na etapie „${STAGE_LABELS[review.stage]}”.`,
    );
  }
  if (hasSigned(review, role, scope)) fail("Ten podpis został już złożony.");
  if (scope === "part_one") {
    const gaps = stepGaps(review);
    if (gaps.length > 0) {
      fail(
        `Przed potwierdzeniem części I uzupełnij:\n${gaps.map((g) => `- ${g.message}`).join("\n")}`,
      );
    }
  } else if (role === "employee" && !hasSigned(review, "evaluator", scope)) {
    fail("Oceniany podpisuje dopiero po oceniającym.");
  }
}

export type SignatureInput = Omit<Signature, "signedAt" | "scope"> & {
  scope: SignatureScope;
};

// One path for every way of signing (in-app button, signed file, deemed acknowledgement), so the
// stage rules and the move to the objection window stay in one place.
export async function recordSignature(
  ctx: MutationCtx,
  actor: ResolvedActor,
  review: Doc<"reviews">,
  employee: Doc<"employees">,
  input: SignatureInput,
): Promise<void> {
  assertCanSign(review, input.role, input.scope);
  if (input.place !== undefined && !input.place.trim()) {
    fail("Podaj miejscowość.");
  }
  const next = [
    ...(review.signatures ?? []),
    {
      ...input,
      place: input.place?.trim(),
      remarks: input.remarks?.trim() || undefined,
      signedAt: Date.now(),
    },
  ];
  const patch: Partial<Doc<"reviews">> = {
    signatures: next,
    updatedAt: Date.now(),
  };
  if (input.scope === "assessment" && input.role === "employee") {
    const context = await reviewContext(ctx, review, employee, todayIso());
    const gaps = blockingGaps(
      { ...review, signatures: next, stage: "signing" },
      employee,
      context,
    );
    if (gaps.length > 0) fail(formatGaps(gaps));
    patch.stage = "objection_window";
    patch.stageHistory = pushStage(review, "objection_window");
  }
  await ctx.db.patch(review._id, patch);
  const how = input.deemedById
    ? "deemed"
    : input.method === "signed_file"
      ? "signed_file"
      : undefined;
  await logAudit(ctx, {
    actor,
    action: "sign",
    entity: "review",
    entityId: review._id,
    reviewId: review._id,
    details: [input.role, input.scope, how].filter(Boolean).join(":"),
  });
  if (patch.stage) {
    await logAudit(ctx, {
      actor,
      action: "stage_change",
      entity: "review",
      entityId: review._id,
      reviewId: review._id,
      details: `${review.stage}->${patch.stage}`,
    });
  }
}
