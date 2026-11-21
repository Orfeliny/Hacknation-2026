import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  deadlineChange,
  isoDate,
  reviewStage,
  sheetType,
  signature,
  staffingSituation,
  stageEntry,
} from "../lib/validators";

export const reviewsTables = {
  reviews: defineTable({
    employeeId: v.id("employees"),
    evaluatorId: v.id("employees"),
    stage: reviewStage,
    createdAt: v.number(),
    sheet: v.optional(sheetType),
    rulesVersion: v.optional(v.string()),
    // The cycle this one follows (BPMN step 32); feeds previousReview and art. 89 ust. 2.
    previousReviewId: v.optional(v.id("reviews")),
    // 2 = drawn up again after an upheld objection (art. 83 ust. 4).
    round: v.optional(v.number()),
    dueDate: v.optional(isoDate),
    periodStart: v.optional(isoDate),
    periodEnd: v.optional(isoDate),
    openingConversationDate: v.optional(isoDate),
    evaluationConversationDate: v.optional(isoDate),
    deadlineChanges: v.optional(v.array(deadlineChange)),
    additionalCriteria: v.optional(v.array(v.string())),
    expectations: v.optional(
      v.array(v.object({ criterionId: v.string(), text: v.string() })),
    ),
    ratings: v.optional(
      v.array(
        v.object({
          criterionId: v.string(),
          levelId: v.string(),
          justification: v.optional(v.string()),
        }),
      ),
    ),
    averageScore: v.optional(v.number()),
    overallResult: v.optional(
      v.union(v.literal("positive"), v.literal("negative")),
    ),
    overallLevelId: v.optional(v.string()),
    overallJustification: v.optional(v.string()),
    previousReview: v.optional(
      v.object({
        result: v.union(
          v.literal("positive"),
          v.literal("negative"),
          v.literal("none"),
        ),
        levelId: v.optional(v.string()),
        date: v.optional(isoDate),
      }),
    ),
    objection: v.optional(
      v.object({
        filedAt: v.number(),
        text: v.string(),
        addressee: v.optional(v.string()),
        decision: v.optional(
          v.union(v.literal("amend"), v.literal("redo"), v.literal("rejected")),
        ),
        decidedAt: v.optional(v.number()),
        decidedById: v.optional(v.id("employees")),
      }),
    ),
    developmentPlan: v.optional(
      v.object({
        summary: v.optional(v.string()),
        strengths: v.optional(v.array(v.string())),
        areas: v.optional(
          v.array(
            v.object({
              id: v.string(),
              criterionId: v.optional(v.string()),
              text: v.string(),
            }),
          ),
        ),
        actions: v.optional(
          v.array(
            v.object({
              areaId: v.optional(v.string()),
              kind: v.optional(
                v.union(
                  v.literal("training"),
                  v.literal("mentoring"),
                  v.literal("task"),
                  v.literal("other"),
                ),
              ),
              text: v.string(),
            }),
          ),
        ),
      }),
    ),
    promotionRequest: v.optional(
      v.object({
        requested: v.boolean(),
        justification: v.optional(v.string()),
        appointmentYear: v.optional(v.number()),
        currentGrade: v.optional(v.number()),
        currentGradeSince: v.optional(isoDate),
        decision: v.optional(
          v.union(v.literal("granted"), v.literal("refused")),
        ),
        decidedAt: v.optional(v.number()),
      }),
    ),
    signatures: v.optional(v.array(signature)),
    staffingSituations: v.optional(v.array(staffingSituation)),
    stageHistory: v.optional(v.array(stageEntry)),
    closedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_employee", ["employeeId"])
    .index("by_evaluator", ["evaluatorId"])
    .index("by_stage", ["stage"]),
};
