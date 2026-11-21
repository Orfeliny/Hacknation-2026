export type MatrixRow = {
  sourceKey: string;
  requirement: string;
  functions: string[];
  issues: string[];
};

// Keys are the keys of `RulesPack.sources`; regulations.test.ts fails when one has no row here or
// when a listed function is not exported by convex/rules.
export const MATRIX: MatrixRow[] = [
  {
    sourceKey: "subject",
    requirement: "Kto podlega ocenie okresowej",
    functions: ["isSubjectToReview", "validateReview"],
    issues: ["#10"],
  },
  {
    sourceKey: "sheet",
    requirement: "Wybór arkusza A, B albo C według stanowiska",
    functions: ["pickSheet", "validateReview"],
    issues: ["#10"],
  },
  {
    sourceKey: "additionalCriteria",
    requirement: "Kryteria dodatkowe: limit, brak duplikatów i obowiązkowych",
    functions: ["validateAdditionalCriteria", "criteriaForSheet"],
    issues: ["#10"],
  },
  {
    sourceKey: "partialScale",
    requirement: "Skala ocen cząstkowych",
    functions: ["ratingScale", "validateReview"],
    issues: ["#10"],
  },
  {
    sourceKey: "overallLevel",
    requirement: "Poziom oceny ogólnej ze średniej",
    functions: ["computeAssessment"],
    issues: ["#10"],
  },
  {
    sourceKey: "result",
    requirement: "Wynik pozytywny albo negatywny",
    functions: ["computeAssessment"],
    issues: ["#10"],
  },
  {
    sourceKey: "justification",
    requirement: "Uzasadnienie oceny negatywnej",
    functions: ["validateReview"],
    issues: ["#10"],
  },
  {
    sourceKey: "developmentConclusions",
    requirement: "Wnioski dotyczące rozwoju zawodowego (IPRZ)",
    functions: ["validateReview"],
    issues: ["#10", "#15"],
  },
  {
    sourceKey: "promotionRequest",
    requirement: "Wniosek o awans",
    functions: ["validateReview"],
    issues: ["#10"],
  },
  {
    sourceKey: "opening",
    requirement: "Termin rozmowy otwierającej",
    functions: ["computeDeadlines", "validateReview"],
    issues: ["#10"],
  },
  {
    sourceKey: "openingSignatures",
    requirement: "Podpisy po rozmowie otwierającej",
    functions: ["validateReview"],
    issues: ["#10"],
  },
  {
    sourceKey: "reviewPeriod",
    requirement: "Okres między ocenami",
    functions: ["computeDeadlines", "validateReview"],
    issues: ["#10"],
  },
  {
    sourceKey: "absenceExtension",
    requirement: "Wydłużenie terminu o długą nieobecność",
    functions: ["absenceExtensionDays", "computeDeadlines", "validateReview"],
    issues: ["#10"],
  },
  {
    sourceKey: "reevaluation",
    requirement: "Ponowna ocena po ocenie negatywnej",
    functions: ["reevaluationDate", "computeDeadlines"],
    issues: ["#10"],
  },
  {
    sourceKey: "deadlineChange",
    requirement: "Zmiana terminu oceny",
    functions: ["deadlineChangeAllowed"],
    issues: ["#10"],
  },
  {
    sourceKey: "acknowledgement",
    requirement: "Zapoznanie się z oceną",
    functions: ["validateReview"],
    issues: ["#10"],
  },
  {
    sourceKey: "objection",
    requirement: "Termin na sprzeciw",
    functions: ["computeDeadlines"],
    issues: ["#10", "#36"],
  },
  {
    sourceKey: "objectionDecision",
    requirement: "Termin rozstrzygnięcia sprzeciwu",
    functions: ["computeDeadlines"],
    issues: ["#10", "#36"],
  },
  {
    sourceKey: "mandatoryPromotion",
    requirement: "Obowiązkowy awans po dwóch ocenach na najwyższych poziomach",
    functions: ["computeDeadlines"],
    issues: ["#10"],
  },
  {
    sourceKey: "termCounting",
    requirement: "Liczenie terminów, dni wolne od pracy",
    functions: ["addDays", "addMonths", "nextWorkingDay", "publicHolidays"],
    issues: ["#10"],
  },
];
