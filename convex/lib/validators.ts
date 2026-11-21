import { v, type Infer } from "convex/values";
import { z } from "zod";
import { RULES_2016 } from "../rules/pack2016";

// Calendar dates are YYYY-MM-DD strings, so deadline math has no time-zone drift.
// Convex validators cannot check a format, so every mutation that writes a date calls assertIsoDate.
export const isoDate = v.string();

const isoDateSchema = z.iso.date();

export function assertIsoDate(value: string, field: string): string {
  if (!isoDateSchema.safeParse(value).success) {
    throw new Error(`${field} must be a calendar date in YYYY-MM-DD format`);
  }
  return value;
}

export const sheetType = v.union(
  v.literal("A"),
  v.literal("B"),
  v.literal("C"),
);

// § 3 of the 2016 regulation: A only for the head of the office, B for posts that manage people.
export const positionKind = v.union(
  v.literal("office_head"),
  v.literal("managerial"),
  v.literal("non_managerial"),
);

export const reviewStage = v.union(
  v.literal("setup"),
  v.literal("opening"),
  v.literal("observation"),
  v.literal("evaluation"),
  v.literal("writing"),
  v.literal("signing"),
  v.literal("objection_window"),
  v.literal("objection"),
  v.literal("closed"),
);

export const demoRole = v.union(
  v.literal("supervisor"),
  v.literal("employee"),
  v.literal("hr"),
  v.literal("director"),
  v.literal("admin"),
);

export const staffingSituation = v.object({
  kind: v.union(
    v.literal("evaluator_change"),
    v.literal("duties_change"),
    v.literal("long_absence"),
  ),
  from: isoDate,
  to: v.optional(isoDate),
  previousEvaluatorId: v.optional(v.id("employees")),
  note: v.optional(v.string()),
});

export const signature = v.object({
  role: v.union(v.literal("evaluator"), v.literal("employee")),
  signerId: v.id("employees"),
  signedAt: v.number(),
  remarks: v.optional(v.string()),
  scope: v.optional(v.union(v.literal("part_one"), v.literal("assessment"))),
  place: v.optional(v.string()),
  // Deemed acknowledgement ("fikcja zapoznania"): recorded by this person, not by the signer.
  deemedById: v.optional(v.id("employees")),
  method: v.optional(v.union(v.literal("in_app"), v.literal("signed_file"))),
  fileId: v.optional(v.id("_storage")),
  signatureDetected: v.optional(v.boolean()),
});

export const deadlineChange = v.object({
  reason: v.union(
    v.literal("absence_extension"),
    v.literal("evaluator_change"),
    v.literal("employee_absence"),
    v.literal("evaluator_absence"),
    v.literal("employee_request"),
  ),
  status: v.union(
    v.literal("requested"),
    v.literal("approved"),
    v.literal("rejected"),
  ),
  previousDate: isoDate,
  newDate: isoDate,
  createdAt: v.number(),
  requestedById: v.optional(v.id("employees")),
  decidedAt: v.optional(v.number()),
  noticeSentAt: v.optional(v.number()),
  proposedDate: v.optional(isoDate),
  employeeReason: v.optional(v.string()),
  decisionJustification: v.optional(v.string()),
  decidedById: v.optional(v.id("employees")),
});

// One literal per catalog entry, so the database rejects a criterion id outside the 2016 pack.
export const criterionId = v.union(
  ...RULES_2016.catalog.map((entry) => v.literal(entry.id)),
);

export const stageEntry = v.object({ stage: v.string(), at: v.number() });

export type DemoRole = Infer<typeof demoRole>;
