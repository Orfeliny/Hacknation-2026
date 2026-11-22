import { addDays } from "../../../convex/rules/dates";
import { today } from "../../lib/format";

export type ShortAbsence = { id: string; from: string; to: string };

const isoToday = () => today().toISOString().slice(0, 10);

// Absences shorter than a month are not part of the backend model: they never move a deadline.
export function shortAbsences(): ShortAbsence[] {
  const now = isoToday();
  return [
    { id: "a1", from: addDays(now, -150), to: addDays(now, -137) },
    { id: "a2", from: addDays(now, -120), to: addDays(now, -107) },
  ];
}
