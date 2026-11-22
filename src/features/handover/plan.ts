import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { plural } from "../../lib/plural";

export type PersonPlan = FunctionReturnType<
  typeof api.observations.queries.handoverPlan
>[number];

export type Choice = "before" | "successor";

export const total = (p: PersonPlan) => p.observationIds.length;

// An excluded or revoked entry looks like one never handed over, so once any entry is handed over
// this screen must not send the rest: the package screen owns every later change.
export const packageStarted = (p: PersonPlan) => p.handedOver > 0;

export const canSend = (p: PersonPlan) => !packageStarted(p) && total(p) > 0;

export const defaultChoice = (p: PersonPlan): Choice =>
  p.early.available ? "before" : "successor";

export const entryNoun = (n: number) =>
  plural(n, { one: "wpis", few: "wpisy", many: "wpisów" });
export const observationNoun = (n: number) =>
  plural(n, { one: "obserwację", few: "obserwacje", many: "obserwacji" });
export const monthsNoun = (n: number) =>
  plural(n, { one: "miesiąca", few: "miesięcy", many: "miesięcy" });
export const peopleNoun = (n: number) =>
  plural(n, { one: "osoba", few: "osoby", many: "osób" });

export function groupBySuccessor(people: PersonPlan[]) {
  const groups = new Map<
    PersonPlan["successorId"],
    { name: string; people: PersonPlan[] }
  >();
  for (const p of people) {
    const group = groups.get(p.successorId) ?? {
      name: p.successorName,
      people: [],
    };
    group.people.push(p);
    groups.set(p.successorId, group);
  }
  return groups;
}
