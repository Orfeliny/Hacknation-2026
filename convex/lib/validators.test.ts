import type { Infer } from "convex/values";
import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  DeadlineChange,
  PositionKind,
  ReviewStage,
  SheetType,
  StaffingSituation,
} from "../rules/types";
import {
  deadlineChange,
  positionKind,
  reviewStage,
  sheetType,
  staffingSituation,
} from "./validators";

describe("rule types match their validators", () => {
  it("keeps the plain rule types equal to Infer<> of the validators", () => {
    expectTypeOf<SheetType>().toEqualTypeOf<Infer<typeof sheetType>>();
    expectTypeOf<PositionKind>().toEqualTypeOf<Infer<typeof positionKind>>();
    expectTypeOf<ReviewStage>().toEqualTypeOf<Infer<typeof reviewStage>>();
    expectTypeOf<StaffingSituation>().toEqualTypeOf<
      Infer<typeof staffingSituation>
    >();
    expectTypeOf<DeadlineChange>().toEqualTypeOf<
      Infer<typeof deadlineChange>
    >();
  });

  it("maps sheet A only to the head of the office (§ 3 ust. 2)", () => {
    const literals = positionKind.members.map((member) => member.value);
    expect(literals).toEqual(["office_head", "managerial", "non_managerial"]);
  });
});
