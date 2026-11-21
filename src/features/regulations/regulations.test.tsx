import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import * as assessment from "../../../convex/rules/assessment";
import * as dates from "../../../convex/rules/dates";
import * as deadlines from "../../../convex/rules/deadlines";
import { RULES_2016, type RulesPack } from "../../../convex/rules/pack2016";
import * as validateReview from "../../../convex/rules/validateReview";
import feature from "./feature";
import { MATRIX } from "./matrix";
import { RegulationsPage } from "./RegulationsPage";
import { coverage, periodRows, sheetRows, sourceOf } from "./rulesView";

const exported = new Set([
  ...Object.keys(assessment),
  ...Object.keys(dates),
  ...Object.keys(deadlines),
  ...Object.keys(validateReview),
]);

describe("compliance matrix", () => {
  it("has a row for every provision of the rules pack", () => {
    expect(coverage(RULES_2016, MATRIX)).toEqual({
      total: Object.keys(RULES_2016.sources).length,
      covered: Object.keys(RULES_2016.sources).length,
      missing: [],
    });
  });

  it("has no row for a provision the pack does not know", () => {
    const keys = new Set(Object.keys(RULES_2016.sources));
    expect(MATRIX.filter((row) => !keys.has(row.sourceKey))).toEqual([]);
  });

  it("names only functions that convex/rules exports", () => {
    const unknown = MATRIX.flatMap((row) => row.functions).filter(
      (name) => !exported.has(name),
    );
    expect(unknown).toEqual([]);
  });

  it("reports a gap when a provision has no row", () => {
    const rest = MATRIX.filter((row) => row.sourceKey !== "objection");
    expect(coverage(RULES_2016, rest).missing).toEqual(["objection"]);
  });
});

describe("rules view", () => {
  it("lists the mandatory criteria of each sheet by name", () => {
    const rows = sheetRows(RULES_2016);
    expect(rows.map((row) => row.sheet)).toEqual(["A", "B", "C"]);
    expect(rows[0]?.criteria).toContain("Zarządzanie strategiczne");
    expect(rows[2]?.criteria).not.toContain("Zarządzanie ludźmi");
  });

  it("takes every deadline from the pack with its source", () => {
    const rows = periodRows(RULES_2016);
    expect(rows).toContainEqual({
      label: "Okres między ocenami",
      value: "24 mies.",
      source: sourceOf(RULES_2016, "reviewPeriod"),
    });
  });
});

describe("RegulationsPage", () => {
  it("shows the version and source of the active pack", () => {
    render(<RegulationsPage />);
    expect(screen.getByText(RULES_2016.version)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Macierz zgodności" }),
    ).toBeInTheDocument();
  });

  it("states how many provisions the matrix covers", () => {
    render(<RegulationsPage />);
    const total = Object.keys(RULES_2016.sources).length;
    expect(screen.getByRole("status")).toHaveTextContent(
      `Macierz obejmuje ${total} z ${total} przepisów pakietu.`,
    );
  });

  it("renders the matrix with the provision text read from the pack", () => {
    render(<RegulationsPage />);
    const table = screen.getByRole("table", {
      name: "Przepis, funkcja w systemie i zgłoszenie",
    });
    const row = within(table)
      .getByRole("rowheader", { name: "Termin na sprzeciw" })
      .closest("tr")!;
    expect(row).toHaveTextContent(sourceOf(RULES_2016, "objection"));
    expect(row).toHaveTextContent("computeDeadlines");
    expect(row).toHaveTextContent("#36");
  });

  it("renders another pack without any change to the components", () => {
    const amended: RulesPack = {
      ...RULES_2016,
      version: "2099-01-01",
      reviewPeriodMonths: 36,
      sources: { ...RULES_2016.sources, reviewPeriod: "nowa ustawa art. 1" },
    };
    render(<RegulationsPage rules={amended} />);
    expect(screen.getByText("2099-01-01")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Terminy i okresy" });
    expect(
      within(table).getByRole("cell", { name: "36 mies." }),
    ).toBeInTheDocument();
    expect(within(table).getAllByText("nowa ustawa art. 1")).not.toHaveLength(
      0,
    );
  });

  it("explains how to implement an amendment", () => {
    render(<RegulationsPage />);
    const section = screen.getByRole("region", {
      name: "Jak wdrożyć nowelizację",
    });
    expect(within(section).getAllByRole("listitem")).toHaveLength(4);
  });
});

describe("feature registration", () => {
  it("registers the /przepisy route", () => {
    expect(feature.path).toBe("/przepisy");
    expect(feature.navLabel).toBe("Przepisy");
    expect(typeof feature.order).toBe("number");
  });
});
