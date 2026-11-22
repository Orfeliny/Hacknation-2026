import { criteriaForSheet } from "../../../convex/rules/assessment";
import { RULES_2016 } from "../../../convex/rules/pack2016";

type CriteriaSource = {
  sheet: Parameters<typeof criteriaForSheet>[0] | null;
  expectations: { criterionId: string; text: string }[];
};

export function chosenCriteria(review: CriteriaSource) {
  const expectations = new Map(
    review.expectations.map((e) => [e.criterionId, e.text]),
  );
  const all = review.sheet ? criteriaForSheet(review.sheet, RULES_2016) : [];
  return {
    expectations,
    criteria: all.filter(
      (c) => c.kind === "mandatory" || expectations.has(c.id),
    ),
  };
}
