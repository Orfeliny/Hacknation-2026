import { describe, expect, it } from "vitest";
import {
  computeAssessment,
  criteriaForSheet,
  pickSheet,
  ratingScale,
  validateAdditionalCriteria,
} from "./assessment";
import {
  addDays,
  addMonths,
  isWorkingDay,
  mergeContinuousAbsences,
  nextWorkingDay,
  publicHolidays,
} from "./dates";
import {
  absenceExtensionDays,
  computeDeadlines,
  isOverdue,
  reevaluationDate,
} from "./deadlines";
import { RULES_2016 } from "./pack2016";
import { validateReview } from "./validateReview";

const codes = (errors: { code: string }[]) => errors.map((e) => e.code);

describe("sheets and criteria (§ 3, § 4, zał. 1)", () => {
  it("picks sheet A only for the head of the office", () => {
    expect(pickSheet("office_head")).toBe("A");
    expect(pickSheet("managerial")).toBe("B");
    expect(pickSheet("non_managerial")).toBe("C");
  });

  it("has 14 catalogue criteria and 6/5/5 mandatory ones", () => {
    expect(RULES_2016.catalog).toHaveLength(14);
    const mandatory = (sheet: "A" | "B" | "C") =>
      criteriaForSheet(sheet)
        .filter((c) => c.kind === "mandatory")
        .map((c) => c.id);
    expect(mandatory("A")).toHaveLength(6);
    expect(mandatory("A")).toContain("zarzadzanie_strategiczne");
    expect(mandatory("B")).not.toContain("zarzadzanie_strategiczne");
    expect(mandatory("C")).toEqual(
      expect.arrayContaining([
        "wykorzystywanie_wiedzy",
        "rzetelnosc",
        "organizacja_pracy",
        "wspolpraca",
        "komunikacja",
      ]),
    );
    for (const c of criteriaForSheet("C")) expect(c.source).toMatch(/§/);
  });

  it("rejects more than 3, duplicated, unknown or mandatory additional criteria (§ 5 ust. 2)", () => {
    expect(
      validateAdditionalCriteria("C", [
        "kreatywnosc",
        "negocjowanie",
        "myslenie_analityczne",
      ]),
    ).toEqual([]);
    expect(
      codes(
        validateAdditionalCriteria("C", [
          "kreatywnosc",
          "negocjowanie",
          "myslenie_analityczne",
          "orientacja_na_klienta",
        ]),
      ),
    ).toContain("too_many_additional");
    expect(
      codes(validateAdditionalCriteria("C", ["kreatywnosc", "kreatywnosc"])),
    ).toContain("duplicate_additional");
    expect(codes(validateAdditionalCriteria("C", ["xyz"]))).toContain(
      "unknown_criterion",
    );
    expect(codes(validateAdditionalCriteria("C", ["rzetelnosc"]))).toContain(
      "mandatory_as_additional",
    );
    expect(codes(validateAdditionalCriteria("B", ["rzetelnosc"]))).toEqual([]);
  });
});

describe("overall result (§ 11)", () => {
  it("exposes the 1/3/5/7/9 scale", () => {
    expect(ratingScale().levels.map((l) => l.value)).toEqual([1, 3, 5, 7, 9]);
  });

  it.each([
    [[1, 3, 1, 3, 1], "znacznie_ponizej_oczekiwan", "negative"],
    [[3, 3, 3, 3, 3], "ponizej_oczekiwan", "negative"],
    [[5, 5, 3, 5, 3], "na_poziomie_oczekiwan", "positive"],
    [[5, 5, 5, 3, 3], "na_poziomie_oczekiwan", "positive"],
    [[7, 7, 5, 5, 5], "na_poziomie_oczekiwan", "positive"],
    [[7, 7, 7, 7, 9], "powyzej_oczekiwan", "positive"],
    [[9, 9, 9, 7, 9], "znacznie_powyzej_oczekiwan", "positive"],
  ])("%j → %s, %s", (points, level, result) => {
    const r = computeAssessment(points);
    expect(r.levelId).toBe(level);
    expect(r.result).toBe(result);
  });

  it("treats an average of exactly 4 as negative (poniżej oczekiwań: powyżej 2 do 4)", () => {
    expect(computeAssessment([3, 5, 3, 5]).result).toBe("negative");
  });

  it("makes any 1-point rating negative, even with a high average", () => {
    const r = computeAssessment([9, 9, 9, 9, 1]);
    expect(r.levelId).toBe("powyzej_oczekiwan");
    expect(r.result).toBe("negative");
    expect(r.justificationRequired).toBe(true);
  });

  it("allows a promotion request only for a positive official (§ 11 ust. 5)", () => {
    expect(
      computeAssessment([7, 7, 7, 7, 7], { isOfficial: true })
        .promotionRequestAllowed,
    ).toBe(true);
    expect(
      computeAssessment([7, 7, 7, 7, 7], { isOfficial: false })
        .promotionRequestAllowed,
    ).toBe(false);
    expect(() => computeAssessment([4])).toThrow();
  });
});

describe("term counting (KPRM note, Kodeks cywilny art. 111-115)", () => {
  it("ends month terms on the matching day or the last day of a shorter month", () => {
    expect(addMonths("2024-03-16", 24)).toBe("2026-03-16");
    expect(addMonths("2024-01-31", 13)).toBe("2025-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
  });

  it("does not count the day of the event in day terms", () => {
    expect(addDays("2026-11-21", 7)).toBe("2026-11-28");
  });

  it("knows Polish public holidays, including Easter-based ones and 24 December from 2025", () => {
    const h2026 = publicHolidays(2026);
    expect(h2026).toContain("2026-04-05");
    expect(h2026).toContain("2026-04-06");
    expect(h2026).toContain("2026-06-04");
    expect(h2026).toContain("2026-12-24");
    expect(publicHolidays(2024)).not.toContain("2024-12-24");
    expect(isWorkingDay("2026-11-11")).toBe(false);
  });

  it("moves a term ending on a weekend or holiday to the next working day", () => {
    expect(nextWorkingDay("2026-11-21")).toBe("2026-11-23");
    expect(nextWorkingDay("2026-12-24")).toBe("2026-12-28");
    expect(nextWorkingDay("2026-11-23")).toBe("2026-11-23");
  });

  it("joins absences separated only by days off (example from the KPRM note)", () => {
    const merged = mergeContinuousAbsences([
      { from: "2026-10-05", to: "2026-10-16" },
      { from: "2026-10-19", to: "2026-11-06" },
    ]);
    expect(merged).toEqual([{ from: "2026-10-05", to: "2026-11-06" }]);
    expect(absenceExtensionDays(merged)).toBe(33);
  });

  it("does not join absences separated by a working day and ignores short ones", () => {
    const parts = [
      { from: "2026-10-05", to: "2026-10-15" },
      { from: "2026-10-19", to: "2026-11-06" },
    ];
    expect(mergeContinuousAbsences(parts)).toHaveLength(2);
    expect(absenceExtensionDays(parts)).toBe(0);
  });
});

describe("deadlines (§ 7, art. 81, 83, 89)", () => {
  const byKind = (
    input: Parameters<typeof computeDeadlines>[0],
    rules = RULES_2016,
  ) =>
    Object.fromEntries(computeDeadlines(input, rules).map((d) => [d.kind, d]));

  it("sets the opening 30 days and the review 24 months after the cycle start", () => {
    const d = byKind({ cycleStart: "2024-03-15" });
    expect(d.opening?.date).toBe("2024-04-15");
    expect(d.review?.date).toBe("2026-03-16");
    expect(d.review?.source).toMatch(/art\. 81 ust\. 4/);
  });

  it("gives 7 days for the opening after a negative review", () => {
    expect(
      byKind({ cycleStart: "2026-11-02", previousResult: "negative" }).opening
        ?.date,
    ).toBe("2026-11-09");
  });

  it("extends the review by a continuous absence longer than a month (art. 81 ust. 7)", () => {
    const d = byKind({
      cycleStart: "2025-01-15",
      absences: [
        { from: "2026-10-05", to: "2026-10-16" },
        { from: "2026-10-19", to: "2026-11-06" },
      ],
    });
    expect(d.review?.date).toBe(nextWorkingDay(addDays("2027-01-15", 33)));
    expect(d.review?.note).toContain("33 dni");
  });

  it("uses an approved deadline change instead of the computed date (art. 81 ust. 8)", () => {
    expect(
      byKind({ cycleStart: "2025-01-15", overrideReviewDate: "2027-03-01" })
        .review?.date,
    ).toBe("2027-03-01");
  });

  it("adds objection, decision and mandatory promotion terms", () => {
    const d = byKind({
      cycleStart: "2025-01-15",
      acknowledgedAt: "2027-01-20",
      objectionFiledAt: "2027-01-22",
      mandatoryPromotionEarned: true,
    });
    expect(d.objection?.date).toBe("2027-01-27");
    expect(d.objection_decision?.date).toBe("2027-02-05");
    expect(d.mandatory_promotion?.date).toBe("2027-02-19");
    expect(isOverdue(d.objection, "2027-01-28")).toBe(true);
    expect(reevaluationDate("2027-01-20").date).toBe("2027-07-20");
  });

  it("sets the next review 6 months after acknowledging a negative one (art. 81 ust. 9)", () => {
    const d = byKind({
      cycleStart: "2026-11-02",
      previousResult: "negative",
      previousAcknowledgedAt: "2026-11-05",
    });
    expect(d.review?.date).toBe("2027-05-05");
    expect(d.review?.source).toMatch(/art\. 81 ust\. 9/);
  });

  it("ignores absences outside the review period", () => {
    const d = byKind({
      cycleStart: "2025-01-15",
      absences: [{ from: "2024-06-01", to: "2024-09-30" }],
    });
    expect(d.review?.date).toBe("2027-01-15");
  });

  it("is not overdue on the due date itself", () => {
    const d = byKind({ cycleStart: "2025-01-15" });
    expect(isOverdue(d.review, "2027-01-15")).toBe(false);
    expect(isOverdue(d.review, "2027-01-16")).toBe(true);
  });

  it("changes the review period by editing one constant", () => {
    const d = byKind(
      { cycleStart: "2024-03-15" },
      { ...RULES_2016, reviewPeriodMonths: 12 },
    );
    expect(d.review?.date).toBe("2025-03-17");
  });
});

describe("validateReview", () => {
  const official = { corpsRole: "official" as const };
  const full = {
    stage: "objection_window" as const,
    createdAt: 0,
    sheet: "C" as const,
    dueDate: "2027-03-16",
    additionalCriteria: ["kreatywnosc"],
    ratings: [
      "wykorzystywanie_wiedzy",
      "rzetelnosc",
      "organizacja_pracy",
      "wspolpraca",
      "komunikacja",
      "kreatywnosc",
    ].map((criterionId) => ({ criterionId, levelId: "7" })),
    developmentPlan: { summary: "Szkolenie z analizy danych." },
    signatures: [
      {
        role: "evaluator" as const,
        signerId: "e" as never,
        signedAt: 0,
        scope: "part_one" as const,
      },
      {
        role: "employee" as const,
        signerId: "e" as never,
        signedAt: 0,
        scope: "part_one" as const,
      },
      {
        role: "evaluator" as const,
        signerId: "e" as never,
        signedAt: 0,
        scope: "assessment" as const,
      },
      {
        role: "employee" as const,
        signerId: "e" as never,
        signedAt: 0,
        scope: "assessment" as const,
      },
    ],
  };

  it("accepts a complete review", () => {
    expect(
      validateReview(full, { employee: official, today: "2027-03-01" }),
    ).toEqual([]);
  });

  it("reports a missing sheet", () => {
    expect(
      codes(
        validateReview(
          { stage: "setup", createdAt: 0 },
          { employee: official, today: "2026-01-01" },
        ),
      ),
    ).toEqual(["missing_sheet"]);
  });

  it("reports missing ratings, justification, IPRZ conclusions and signatures", () => {
    const negative = {
      ...full,
      ratings: full.ratings.map((r, i) =>
        i === 0 ? { ...r, levelId: "1" } : r,
      ),
      developmentPlan: undefined,
      signatures: [],
    };
    expect(
      codes(
        validateReview(negative, { employee: official, today: "2027-03-01" }),
      ),
    ).toEqual(
      expect.arrayContaining([
        "missing_part_one_evaluator",
        "missing_part_one_employee",
        "missing_justification",
        "missing_development_conclusions",
        "missing_assessment_evaluator",
        "missing_acknowledgement",
      ]),
    );
    const unrated = { ...full, ratings: full.ratings.slice(1) };
    expect(
      validateReview(unrated, { employee: official, today: "2027-03-01" })[0]
        ?.message,
    ).toContain("Wykorzystywanie wiedzy");
  });

  it("reports an overdue review and a fixed-term employee", () => {
    const open = { ...full, stage: "observation" as const };
    const errors = codes(
      validateReview(open, {
        employee: { corpsRole: "employee", contractTerm: "fixed_term" },
        today: "2027-04-01",
      }),
    );
    expect(errors).toEqual(expect.arrayContaining(["overdue", "not_subject"]));
  });

  it("rejects a promotion request for a non-official", () => {
    const withRequest = {
      ...full,
      promotionRequest: { requested: true, justification: "x" },
    };
    expect(
      codes(
        validateReview(withRequest, {
          employee: { corpsRole: "employee", contractTerm: "indefinite" },
          today: "2027-03-01",
        }),
      ),
    ).toContain("promotion_not_allowed");
  });

  it("reports an invalid rating instead of throwing and ignores stray or duplicate ones", () => {
    const invalid = {
      ...full,
      ratings: [
        ...full.ratings.slice(1),
        { criterionId: "wykorzystywanie_wiedzy", levelId: "4" },
      ],
    };
    expect(
      codes(
        validateReview(invalid, { employee: official, today: "2027-03-01" }),
      ),
    ).toContain("invalid_rating");
    const noisy = {
      ...full,
      ratings: [
        ...full.ratings,
        { criterionId: "negocjowanie", levelId: "1" },
        { criterionId: "rzetelnosc", levelId: "7" },
      ],
    };
    expect(
      validateReview(noisy, { employee: official, today: "2027-03-01" }),
    ).toEqual([]);
  });

  it("still reports an overdue term when the sheet is missing, and not on the due date", () => {
    const noSheet = {
      stage: "observation" as const,
      createdAt: 0,
      dueDate: "2027-03-16",
    };
    expect(
      codes(
        validateReview(noSheet, { employee: official, today: "2027-03-17" }),
      ),
    ).toEqual(expect.arrayContaining(["overdue", "missing_sheet"]));
    expect(
      codes(
        validateReview(noSheet, { employee: official, today: "2027-03-16" }),
      ),
    ).not.toContain("overdue");
  });

  it("gives every error a legal source", () => {
    for (const e of validateReview(
      { ...full, signatures: [] },
      { employee: official, today: "2028-01-01" },
    )) {
      expect(e.source.length).toBeGreaterThan(0);
    }
  });
});
