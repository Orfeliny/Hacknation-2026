import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";

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

const pluralPl = new Intl.PluralRules("pl");
export const entryNoun = (n: number) => {
  const form = pluralPl.select(n);
  return form === "one" ? "wpis" : form === "few" ? "wpisy" : "wpisów";
};
export const observationNoun = (n: number) => {
  const form = pluralPl.select(n);
  return form === "one"
    ? "obserwację"
    : form === "few"
      ? "obserwacje"
      : "obserwacji";
};
export const monthsNoun = (n: number) => {
  const form = pluralPl.select(n);
  return form === "one" ? "miesiąca" : "miesięcy";
};

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
