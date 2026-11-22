import { computeDeadlines } from "../../../convex/rules/deadlines";
import { RULES_2016 } from "../../../convex/rules/pack2016";
import { formatDate } from "../../lib/format";

export const OBJECTION_DAYS = RULES_2016.objectionDays;
export const OBJECTION_DECISION_DAYS = RULES_2016.objectionDecisionDays;

// Noon keeps the calendar day stable in any timezone.
export const formatIsoDay = (iso: string) => formatDate(`${iso}T12:00:00`);

function localIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// The filing deadline if the employee acknowledges on `day`, from the same rules the backend uses.
export function filingDeadlineIfAcknowledgedOn(day: Date): string {
  const iso = localIso(day);
  const deadline = computeDeadlines({
    cycleStart: iso,
    acknowledgedAt: iso,
  }).find((d) => d.kind === "objection");
  if (!deadline) throw new Error("The rules pack has no objection deadline.");
  return deadline.date;
}
