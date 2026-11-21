export const ACTION_LABEL: Record<string, string> = {
  view: "otworzył(a) ocenę",
  create: "utworzył(a)",
  update: "zmienił(a)",
  stage_change: "zmienił(a) etap",
  sign: "podpisał(a)",
  export: "wydrukował(a) lub pobrał(a) arkusz",
  correction: "poprawił(a)",
};

export const DECISION_LABEL: Record<string, string> = {
  pending: "czeka na decyzję",
  accepted: "przyjęta",
  edited: "przyjęta ze zmianami",
  rejected: "odrzucona",
};
