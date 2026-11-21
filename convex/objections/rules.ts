import type { Doc } from "../_generated/dataModel";
import { compareDates } from "../rules/dates";
import { computeDeadlines } from "../rules/deadlines";

type Review = Doc<"reviews">;

// The rules pack (#10) has no court appeal term yet, so it lives here.
export const COURT_APPEAL_DAYS = 14;

const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// The day the employee signed the assessment; a deemed acknowledgement is stored the same way.
export function acknowledgedAt(review: Pick<Review, "signatures">) {
  const signature = (review.signatures ?? []).find(
    (s) => s.role === "employee" && (s.scope ?? "assessment") === "assessment",
  );
  return signature ? isoOf(signature.signedAt) : undefined;
}

// computeDeadlines also returns the review date, so it needs a cycle start; only the objection terms are read.
export function filingDeadline(acknowledged: string): string {
  return computeDeadlines({
    cycleStart: acknowledged,
    acknowledgedAt: acknowledged,
  }).find((d) => d.kind === "objection")!.date;
}

export function decisionDeadline(filedAtMs: number): string {
  const filed = isoOf(filedAtMs);
  return computeDeadlines({
    cycleStart: filed,
    objectionFiledAt: filed,
  }).find((d) => d.kind === "objection_decision")!.date;
}

export type FilingCheck =
  { allowed: true } | { allowed: false; reason: string };

// A new objection is possible once per drawn-up assessment: only after `redo` does the stored one stand aside.
export function canFile(
  review: Pick<Review, "stage" | "signatures" | "objection">,
  today: string,
): FilingCheck {
  if (review.stage !== "objection_window") {
    return {
      allowed: false,
      reason:
        "Sprzeciw można wnieść po zapoznaniu się z oceną, w ciągu 7 dni, zanim ocena zostanie zamknięta.",
    };
  }
  if (review.objection && review.objection.decision !== "redo") {
    return {
      allowed: false,
      reason: "Sprzeciw od tej oceny został już rozpatrzony.",
    };
  }
  const acknowledged = acknowledgedAt(review);
  if (!acknowledged) {
    return {
      allowed: false,
      reason: "Brak potwierdzenia zapoznania się z oceną.",
    };
  }
  const deadline = filingDeadline(acknowledged);
  if (compareDates(today, deadline) > 0) {
    return {
      allowed: false,
      reason: `Minął termin 7 dni na wniesienie sprzeciwu (do ${deadline}).`,
    };
  }
  return { allowed: true };
}
