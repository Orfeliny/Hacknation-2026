import type { Doc, Id } from "../_generated/dataModel";
import type { DatabaseReader } from "../_generated/server";
import { computeSignals, type SignalKind } from "./rules";

export type Recommendation = NonNullable<
  Doc<"hrSignals">["recommendations"]
>[number];

export type TeamSignal = {
  kind: SignalKind;
  reason: string;
  evidenceDate: string;
  signalId: Id<"hrSignals"> | null;
  recommendations: Recommendation[] | null;
};

// D11: an observation is read by its author, by HR and, after the author's consent, by the next
// evaluator. Signals and facts are derived from observations, so they follow the same rule: a new
// supervisor does not see what the previous one wrote until it is handed over.
export type Viewer = { hr: true } | { supervisorId: Id<"employees"> };

export function visibleTo(
  observation: Doc<"observations">,
  viewer: Viewer,
): boolean {
  if ("hr" in viewer) return true;
  return (
    observation.authorId === viewer.supervisorId ||
    observation.handover?.toEvaluatorId === viewer.supervisorId
  );
}

// A computed signal is matched to its stored row by (employee, kind, reason): the reason embeds the
// evidence, so a handled signal stays hidden until the evidence changes.
export async function signalsFor(
  ctx: { db: DatabaseReader },
  employee: Doc<"employees">,
  today: string,
  viewer: Viewer,
): Promise<TeamSignal[]> {
  const observations = (
    await ctx.db
      .query("observations")
      .withIndex("by_employee_date", (q) => q.eq("employeeId", employee._id))
      .collect()
  ).filter((o) => visibleTo(o, viewer));
  const computed = computeSignals(
    {
      observations: observations.map((o) => ({
        date: o.date,
        sentiment: o.sentiment,
        wellbeing: o.wellbeing === true,
        criterionId: o.criterionId,
      })),
      staffingEvents: (employee.staffingEvents ?? []).map((event) => ({
        kind: event.kind,
        from: event.from,
        to: event.to,
      })),
    },
    today,
  );
  const rows = await ctx.db
    .query("hrSignals")
    .withIndex("by_employee", (q) => q.eq("employeeId", employee._id))
    .collect();
  const result: TeamSignal[] = [];
  for (const signal of computed) {
    const row = rows.find(
      (r) => r.kind === signal.kind && r.reason === signal.reason,
    );
    if (row && (row.status === "dismissed" || row.status === "acted")) continue;
    result.push({
      kind: signal.kind,
      reason: signal.reason,
      evidenceDate: signal.evidenceDate,
      signalId: row?._id ?? null,
      recommendations: row?.recommendations ?? null,
    });
  }
  return result;
}

export async function findRow(
  ctx: { db: DatabaseReader },
  employeeId: Id<"employees">,
  kind: SignalKind,
  reason: string,
): Promise<Doc<"hrSignals"> | null> {
  const rows = await ctx.db
    .query("hrSignals")
    .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
    .collect();
  return rows.find((r) => r.kind === kind && r.reason === reason) ?? null;
}
