import { z } from "zod";
import type { SheetModel } from "./sheetModel";

export const EXPORT_SCHEMA_VERSION = 1;

const isoDate = z.iso.date();

const person = z.object({
  firstName: z.string(),
  lastName: z.string(),
  position: z.string(),
  unit: z.string(),
});

const criterion = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["mandatory", "additional"]),
  levelId: z.string().nullable(),
  points: z.number().nullable(),
  levelLabel: z.string().nullable(),
  justification: z.string().nullable(),
});

const signature = z.object({
  scope: z.enum(["part_one", "assessment"]),
  role: z.enum(["evaluator", "employee"]),
  place: z.string(),
  date: isoDate,
});

// Documented export of one review, the seed of an EZD / HR-system integration.
// Bump schemaVersion on any breaking change; adding an optional field is not breaking.
export const reviewExportSchema = z.object({
  schemaVersion: z.literal(EXPORT_SCHEMA_VERSION),
  exportedAt: z.iso.datetime(),
  rulesVersion: z.string().nullable(),
  reviewId: z.string(),
  officeName: z.string(),
  sheet: z.enum(["A", "B", "C"]),
  stage: z.string(),
  round: z.number().int().min(1),
  employee: person.extend({ isOfficial: z.boolean() }),
  evaluator: person,
  dueDate: isoDate.nullable(),
  openingConversationDate: isoDate.nullable(),
  evaluationConversationDate: isoDate.nullable(),
  periodStart: isoDate.nullable(),
  periodEnd: isoDate.nullable(),
  criteria: z.array(criterion),
  averageScore: z.number().nullable(),
  overall: z.object({
    levelId: z.string().nullable(),
    result: z.enum(["positive", "negative"]).nullable(),
    justification: z.string().nullable(),
  }),
  developmentPlan: z.object({
    summary: z.string().nullable(),
    strengths: z.array(z.string()),
    areas: z.array(z.string()),
    actions: z.array(z.string()),
  }),
  previousReview: z
    .object({
      result: z.enum(["positive", "negative", "none"]),
      levelLabel: z.string().nullable(),
      date: isoDate.nullable(),
    })
    .nullable(),
  promotionRequest: z
    .object({
      appointmentYear: z.number().nullable(),
      currentGrade: z.number().nullable(),
      currentGradeSince: isoDate.nullable(),
      nextGrade: z.number().nullable(),
      justification: z.string().nullable(),
    })
    .nullable(),
  signatures: z.array(signature),
  deemedAcknowledgement: z.boolean(),
  objectionAddressee: z.string().nullable(),
});

export type ReviewExport = z.infer<typeof reviewExportSchema>;

export function buildExport(model: SheetModel, exportedAt: Date): ReviewExport {
  const signatures: ReviewExport["signatures"] = [];
  for (const scope of ["partOne", "assessment"] as const) {
    for (const role of ["evaluator", "employee"] as const) {
      const block = model.signatures[scope][role];
      if (block) {
        signatures.push({
          scope: scope === "partOne" ? "part_one" : "assessment",
          role,
          place: block.place,
          date: block.date,
        });
      }
    }
  }
  return reviewExportSchema.parse({
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    rulesVersion: model.rulesVersion,
    reviewId: model.reviewId,
    officeName: model.officeName,
    sheet: model.sheet,
    stage: model.stage,
    round: model.round,
    employee: { ...model.employee, isOfficial: model.isOfficial },
    evaluator: model.evaluator,
    dueDate: model.dueDate,
    openingConversationDate: model.openingConversationDate,
    evaluationConversationDate: model.evaluationConversationDate,
    periodStart: model.periodStart,
    periodEnd: model.periodEnd,
    criteria: [...model.mandatory, ...model.additional],
    averageScore: model.average,
    overall: {
      levelId: model.overallLevelId,
      result: model.result,
      justification: model.justification,
    },
    developmentPlan: model.development,
    previousReview: model.previousReview,
    promotionRequest: model.promotion,
    signatures,
    deemedAcknowledgement: model.signatures.assessment.deemedAcknowledgement,
    objectionAddressee: model.objection.addressee,
  });
}
