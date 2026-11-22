import { z } from "zod";
import { RULES_2016 } from "../rules/pack2016";
import { MODEL_DATA } from "./modelData";

const text = z.string().trim().min(1);

const levelSchema = z.object({
  id: text,
  label: text,
  description: text.optional(),
});

const indicatorSchema = z.object({
  id: text,
  text,
  // Behaviour description per level id; every level of the model must be described.
  levels: z.record(z.string(), text),
});

const competencySchema = z.object({
  id: text,
  // Links a competency to a review criterion (annex 1), so its final level can feed the review.
  criterionId: text.optional(),
  name: text,
  indicators: z.array(indicatorSchema).min(1),
});

export const competencyModelSchema = z
  .object({
    modelVersion: text,
    name: text,
    // "demo" until the organizer's model replaces the data; the UI must label demo data.
    source: z.enum(["demo", "official"]),
    sourceNote: text,
    // Ordered from the lowest to the highest level; the suggestion algorithm relies on the order.
    levels: z.array(levelSchema).min(2),
    suggestion: z.object({
      rule: z.literal("median"),
      minObservedShare: z.number().gt(0).max(1),
      anchorLevelId: text,
    }),
    competencies: z.array(competencySchema).min(1),
  })
  .superRefine((model, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    const levelIds = model.levels.map((l) => l.id);
    const duplicates = (ids: string[]) =>
      [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))].join(", ");
    if (duplicates(levelIds)) {
      issue(`Duplicate level ids: ${duplicates(levelIds)}`);
    }
    if (!levelIds.includes(model.suggestion.anchorLevelId)) {
      issue(`Unknown anchor level: ${model.suggestion.anchorLevelId}`);
    }
    const competencyIds = model.competencies.map((c) => c.id);
    if (duplicates(competencyIds)) {
      issue(`Duplicate competency ids: ${duplicates(competencyIds)}`);
    }
    const indicatorIds = model.competencies.flatMap((c) =>
      c.indicators.map((i) => i.id),
    );
    if (duplicates(indicatorIds)) {
      issue(`Duplicate indicator ids: ${duplicates(indicatorIds)}`);
    }
    const criterionIds = model.competencies.flatMap((c) =>
      c.criterionId ? [c.criterionId] : [],
    );
    if (duplicates(criterionIds)) {
      issue(`Duplicate criterion ids: ${duplicates(criterionIds)}`);
    }
    const criteria = new Set<string>(RULES_2016.catalog.map((c) => c.id));
    for (const competency of model.competencies) {
      if (competency.criterionId && !criteria.has(competency.criterionId)) {
        issue(
          `Competency ${competency.id}: unknown criterion ${competency.criterionId}`,
        );
      }
      for (const indicator of competency.indicators) {
        const described = Object.keys(indicator.levels);
        const missing = levelIds.filter((id) => !described.includes(id));
        const extra = described.filter((id) => !levelIds.includes(id));
        if (missing.length > 0 || extra.length > 0) {
          issue(
            `Indicator ${indicator.id}: missing levels [${missing.join(", ")}], unknown levels [${extra.join(", ")}]`,
          );
        }
      }
    }
  });

export type CompetencyModel = z.infer<typeof competencyModelSchema>;
export type Competency = CompetencyModel["competencies"][number];
export type ModelLevel = CompetencyModel["levels"][number];

export function loadModel(raw: unknown): CompetencyModel {
  const parsed = competencyModelSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Invalid competency model:\n${z.prettifyError(parsed.error)}`,
    );
  }
  return parsed.data;
}

export const COMPETENCY_MODEL: CompetencyModel = loadModel(MODEL_DATA);

export function findCompetency(
  competencyId: string,
  model: CompetencyModel = COMPETENCY_MODEL,
): Competency | undefined {
  return model.competencies.find((c) => c.id === competencyId);
}

export function levelLabel(
  levelId: string | undefined,
  model: CompetencyModel = COMPETENCY_MODEL,
): string | null {
  return model.levels.find((l) => l.id === levelId)?.label ?? null;
}
