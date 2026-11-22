import type { Id } from "../../../convex/_generated/dataModel";
import { RULES_2016 } from "../../../convex/rules/pack2016";
import type { SheetType } from "../../../convex/rules/types";
import type { PrintableSheet } from "./sheetModel";

// Invented people and data, for tests and the development-only demo review at /druk?ocena=demo.
export const DEMO_REVIEW_ID = "demo";

const POINTS = [7, 5, 7, 5, 7, 5];

export function fixtureSheet(
  sheet: SheetType = "C",
  patch: Partial<PrintableSheet> = {},
): PrintableSheet {
  const mandatory = RULES_2016.sheets[sheet].mandatory;
  const ratings: PrintableSheet["ratings"] = [
    ...mandatory,
    "kreatywnosc" as const,
  ].map((criterionId, index) => ({
    criterionId,
    levelId: String(POINTS[index % POINTS.length]),
    justification:
      criterionId === "kreatywnosc" ? "Proponuje nowe rozwiązania." : null,
  }));
  const average =
    ratings.reduce((sum, rating) => sum + Number(rating.levelId), 0) /
    ratings.length;
  return {
    reviewId: DEMO_REVIEW_ID as Id<"reviews">,
    officeName: "Urząd Analiz Strategicznych",
    rulesVersion: RULES_2016.version,
    sheet,
    stage: "signing",
    stageLabel: "Podpisy",
    round: 1,
    employee: {
      firstName: "Anna",
      lastName: "Rokicińska",
      position: "Inspektor",
      unit: "Biuro Dyrektora Generalnego",
      isOfficial: true,
    },
    evaluator: {
      firstName: "Andrzej",
      lastName: "Jacentowski",
      position: "Naczelnik Wydziału Administracyjnego",
      unit: "Biuro Dyrektora Generalnego",
    },
    dueDate: "2026-12-01",
    openingConversationDate: "2024-12-02",
    evaluationConversationDate: "2026-11-18",
    periodStart: "2024-12-02",
    periodEnd: "2026-11-19",
    additionalCriteria: ["kreatywnosc"],
    ratings,
    averageScore: Math.round(average * 100) / 100,
    overallResult: "positive",
    overallLevelId: "na_poziomie_oczekiwan",
    overallJustification: "Rzetelne i terminowe wykonywanie zadań.",
    previousReview: {
      result: "positive",
      levelId: "powyzej_oczekiwan",
      date: "2024-11-20",
    },
    developmentPlan: {
      summary: "Rozwój umiejętności analitycznych i prezentacji wyników.",
      strengths: ["Dokładność", "Współpraca z zespołem"],
      areas: [{ id: "a1", text: "Wystąpienia publiczne" }],
      actions: [
        { areaId: "a1", kind: "training", text: "Kurs wystąpień publicznych" },
      ],
    },
    promotionRequest: {
      requested: true,
      justification:
        "Stały, wysoki poziom pracy i zaangażowanie w projekty zespołu.",
      appointmentYear: 2019,
      currentGrade: 3,
      currentGradeSince: "2022-03-01",
    },
    signatures: [
      {
        role: "evaluator",
        scope: "part_one",
        place: "Warszawa",
        date: "2024-12-02",
        deemedAcknowledgement: false,
      },
      {
        role: "employee",
        scope: "part_one",
        place: "Warszawa",
        date: "2024-12-03",
        deemedAcknowledgement: false,
      },
      {
        role: "evaluator",
        scope: "assessment",
        place: "Warszawa",
        date: "2026-11-19",
        deemedAcknowledgement: false,
      },
      {
        role: "employee",
        scope: "assessment",
        place: "Warszawa",
        date: "2026-11-20",
        deemedAcknowledgement: false,
      },
    ],
    objectionAddressee: sheet === "A" ? "Prezesa Rady Ministrów" : null,
    ...patch,
  };
}
