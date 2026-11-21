import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { demoActor, resolveActor, type ResolvedActor } from "../lib/demoRole";
import { assertIsoDate } from "../lib/validators";
import { todayIso } from "../reviews/context";
import {
  canRecordForEmployee,
  isFirstReviewEvaluator,
  isFirstReviewed,
} from "./access";
import { STAGE_LABELS, hasSigned, pushStage, stageOf } from "./flow";
import { FIRST_REVIEW_RULES, computeFirstReviewWindow } from "./rules";
import { startableNewEmployees } from "./queries";

const fail = (message: string): never => {
  throw new ConvexError(message);
};

async function load(
  ctx: {
    db: {
      get: (
        id: Doc<"firstReviews">["_id"],
      ) => Promise<Doc<"firstReviews"> | null>;
    };
  },
  id: Doc<"firstReviews">["_id"],
) {
  const row = await ctx.db.get(id);
  return row ?? fail("Nie znaleziono pierwszej oceny.");
}

function requireEvaluator(actor: ResolvedActor, row: Doc<"firstReviews">) {
  if (!isFirstReviewEvaluator(actor, row)) {
    fail("Ten krok wykonuje oceniający (bezpośredni przełożony).");
  }
}

function requireStage(
  row: Doc<"firstReviews">,
  stage: Doc<"firstReviews">["stage"],
) {
  if (row.stage !== stage) {
    fail(
      `Ten krok jest na etapie „${STAGE_LABELS[stageOf({ stage })]}”, a ocena jest na etapie „${STAGE_LABELS[stageOf(row)]}”.`,
    );
  }
}

export const start = mutation({
  args: {
    actor: demoActor,
    employeeId: v.id("employees"),
    employmentStart: v.optional(v.string()),
    contractEnd: v.optional(v.string()),
  },
  handler: async (ctx, { actor, employeeId, employmentStart, contractEnd }) => {
    const resolved = await resolveActor(ctx, actor);
    const allowed = (await startableNewEmployees(ctx, resolved)).find(
      (e) => e._id === employeeId,
    );
    if (!allowed?.supervisorId) {
      return fail(
        "Nie można rozpocząć pierwszej oceny: brak uprawnień, pracownik nie jest nowy w służbie cywilnej, nie ma przełożonego albo ocena jest w toku.",
      );
    }
    const startDate = assertIsoDate(
      employmentStart ?? allowed.indefiniteEmploymentSince ?? todayIso(),
      "employmentStart",
    );
    const end = contractEnd
      ? assertIsoDate(contractEnd, "contractEnd")
      : undefined;
    let window;
    try {
      window = computeFirstReviewWindow(startDate, end);
    } catch (e) {
      return fail(e instanceof Error ? e.message : "Nieprawidłowe daty.");
    }
    const now = Date.now();
    return ctx.db.insert("firstReviews", {
      employeeId,
      evaluatorId: allowed.supervisorId,
      stage: "report",
      createdAt: now,
      updatedAt: now,
      rulesVersion: FIRST_REVIEW_RULES.version,
      startDate,
      dueDate: window.latest,
      stageHistory: [{ stage: "report", at: now }],
    });
  },
});

export const confirmReport = mutation({
  args: {
    actor: demoActor,
    firstReviewId: v.id("firstReviews"),
    reportReceived: v.boolean(),
  },
  handler: async (ctx, { actor, firstReviewId, reportReceived }) => {
    const resolved = await resolveActor(ctx, actor);
    const row = await load(ctx, firstReviewId);
    requireEvaluator(resolved, row);
    requireStage(row, "report");
    if (!reportReceived) {
      fail(
        "Potwierdź, że otrzymałeś sprawozdanie pracownika (art. 38 ust. 2 pkt 3).",
      );
    }
    await ctx.db.patch(row._id, {
      stage: "assessment",
      stageHistory: pushStage(row, "assessment"),
      updatedAt: Date.now(),
    });
  },
});

export const conclude = mutation({
  args: {
    actor: demoActor,
    firstReviewId: v.id("firstReviews"),
    result: v.union(v.literal("positive"), v.literal("negative")),
    unitHeadAgreed: v.boolean(),
  },
  handler: async (ctx, { actor, firstReviewId, result, unitHeadAgreed }) => {
    const resolved = await resolveActor(ctx, actor);
    const row = await load(ctx, firstReviewId);
    requireEvaluator(resolved, row);
    requireStage(row, "assessment");
    if (!unitHeadAgreed) {
      fail(
        "Ocenę dokonuje się w porozumieniu z kierującym komórką organizacyjną (art. 38 ust. 2).",
      );
    }
    await ctx.db.patch(row._id, {
      result,
      stage: "signing",
      stageHistory: pushStage(row, "signing"),
      updatedAt: Date.now(),
    });
  },
});

export const sign = mutation({
  args: {
    actor: demoActor,
    firstReviewId: v.id("firstReviews"),
    role: v.union(v.literal("evaluator"), v.literal("employee")),
    place: v.string(),
  },
  handler: async (ctx, { actor, firstReviewId, role, place }) => {
    const resolved = await resolveActor(ctx, actor);
    const row = await load(ctx, firstReviewId);
    requireStage(row, "signing");
    if (!place.trim()) fail("Podaj miejscowość.");
    if (hasSigned(row, role)) fail("Ten podpis został już złożony.");
    const me = resolved.employee?._id;
    if (!me) fail("Brak przypisanej osoby dla tej roli.");
    let onBehalf = false;
    if (role === "evaluator") {
      requireEvaluator(resolved, row);
    } else {
      if (!hasSigned(row, "evaluator"))
        fail("Oceniany podpisuje dopiero po oceniającym.");
      onBehalf = !isFirstReviewed(resolved, row);
      if (onBehalf && !canRecordForEmployee(resolved)) {
        fail("Podpis ocenianego składa oceniany albo kadry w jego imieniu.");
      }
    }
    const signatures = [
      ...(row.signatures ?? []),
      {
        role,
        signerId: onBehalf ? row.employeeId : (me as Doc<"employees">["_id"]),
        signedAt: Date.now(),
        scope: "assessment" as const,
        place: place.trim(),
        method: "in_app" as const,
        deemedById: onBehalf ? me : undefined,
      },
    ];
    const closing = role === "employee";
    await ctx.db.patch(row._id, {
      signatures,
      updatedAt: Date.now(),
      ...(closing
        ? {
            stage: "closed",
            closedAt: Date.now(),
            stageHistory: pushStage(row, "closed"),
          }
        : {}),
    });
  },
});
