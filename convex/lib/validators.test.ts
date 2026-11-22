import type { Infer } from "convex/values";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { CriterionId } from "../rules/pack2016";
import type {
  DeadlineChange,
  PositionKind,
  ReviewStage,
  SheetType,
  StaffingSituation,
} from "../rules/types";
import {
  assertIsoDate,
  criterionId,
  deadlineChange,
  positionKind,
  reviewStage,
  sheetType,
  staffingSituation,
} from "./validators";

describe("rule types match their validators", () => {
  it("keeps the plain rule types equal to Infer<> of the validators", () => {
    expectTypeOf<SheetType>().toEqualTypeOf<Infer<typeof sheetType>>();
    expectTypeOf<CriterionId>().toEqualTypeOf<Infer<typeof criterionId>>();
    expectTypeOf<PositionKind>().toEqualTypeOf<Infer<typeof positionKind>>();
    expectTypeOf<ReviewStage>().toEqualTypeOf<Infer<typeof reviewStage>>();
    expectTypeOf<StaffingSituation>().toEqualTypeOf<
      Infer<typeof staffingSituation>
    >();
    expectTypeOf<DeadlineChange>().toEqualTypeOf<
      Infer<typeof deadlineChange>
    >();
  });

  it("keeps the deadline shift fields optional, so older entries stay valid", () => {
    const oldEntry: DeadlineChange = {
      reason: "absence_extension",
      status: "approved",
      previousDate: "2027-03-16",
      newDate: "2027-05-02",
      createdAt: 0,
    };
    expectTypeOf(oldEntry).toMatchTypeOf<Infer<typeof deadlineChange>>();
    expectTypeOf<DeadlineChange["proposedDate"]>().toEqualTypeOf<
      string | undefined
    >();
  });

  it("maps sheet A only to the head of the office (§ 3 ust. 2)", () => {
    const literals = positionKind.members.map((member) => member.value);
    expect(literals).toEqual(["office_head", "managerial", "non_managerial"]);
  });
});

describe("assertIsoDate", () => {
  it("accepts real calendar dates", () => {
    expect(assertIsoDate("2026-11-21", "date")).toBe("2026-11-21");
    expect(assertIsoDate("2028-02-29", "date")).toBe("2028-02-29");
  });

  it.each(["2026-99-99", "2026-02-30", "tomorrow", "21.11.2026", ""])(
    "rejects %j",
    (value) => {
      expect(() => assertIsoDate(value, "dueDate")).toThrow(
        /dueDate must be a calendar date/,
      );
    },
  );
});
