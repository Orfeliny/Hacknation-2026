import { describe, expect, it } from "vitest";
import { GAP, MARGIN, placeCallout } from "./anchor";

const viewport = { width: 1200, height: 800 };
const dialog = { width: 400, height: 240 };

describe("placeCallout", () => {
  it("puts the dialog below the target and centres the pointer on it", () => {
    const target = { top: 100, left: 500, width: 100, height: 44 };
    const placement = placeCallout(target, dialog, viewport);
    expect(placement.side).toBe("bottom");
    expect(placement.top).toBe(100 + 44 + GAP);
    expect(placement.left).toBe(550 - 200);
    expect(placement.pointerOffset).toBe(200);
  });

  it("keeps the dialog inside the viewport and points at the target", () => {
    const target = { top: 20, left: 4, width: 60, height: 44 };
    const placement = placeCallout(target, dialog, viewport);
    expect(placement.left).toBe(MARGIN);
    expect(placement.pointerOffset).toBe(34 - MARGIN > 24 ? 34 - MARGIN : 24);
  });

  it("goes to the right when there is no room below", () => {
    const target = { top: 700, left: 40, width: 200, height: 44 };
    const placement = placeCallout(target, dialog, viewport);
    expect(placement.side).toBe("right");
    expect(placement.left).toBe(40 + 200 + GAP);
  });

  it("goes above when below and right do not fit", () => {
    const target = { top: 700, left: 900, width: 200, height: 44 };
    const placement = placeCallout(target, dialog, viewport);
    expect(placement.side).toBe("top");
    expect(placement.top).toBe(700 - GAP - dialog.height);
  });

  it("falls back to below, clamped, when nothing fits", () => {
    const target = { top: 10, left: 10, width: 1180, height: 780 };
    const placement = placeCallout(target, dialog, viewport);
    expect(placement.side).toBe("bottom");
    expect(placement.left).toBeGreaterThanOrEqual(MARGIN);
  });
});
