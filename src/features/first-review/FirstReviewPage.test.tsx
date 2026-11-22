import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FirstReviewPage } from "./FirstReviewPage";

const calls: { name: string; args: unknown }[] = [];
let data: Record<string, unknown> = {};

vi.mock("convex/react", () => ({
  useQuery: (ref: Parameters<typeof getFunctionName>[0], args: unknown) => {
    const name = getFunctionName(ref);
    calls.push({ name, args });
    return data[name];
  },
  useMutation: () => vi.fn(),
}));
vi.mock("../../lib/env", () => ({
  getEnv: () => ({ convexUrl: "http://x" }),
}));

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <FirstReviewPage />
    </MemoryRouter>,
  );
}

describe("FirstReviewPage", () => {
  beforeEach(() => {
    calls.length = 0;
    data = {
      "firstReview/queries:list": [
        {
          _id: "f1",
          employeeName: "Maria Wójcik",
          stageLabel: "Ocena",
          dueDate: "2026-03-01",
        },
      ],
      "firstReview/queries:candidates": [],
    };
  });

  it("separates the name from the stage and formats the due date", () => {
    renderAt("/pierwsza-ocena");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Pierwsza ocena w służbie cywilnej",
    );
    expect(screen.getByRole("listitem")).toHaveTextContent(
      "Maria Wójcik · Ocena, termin 01.03.2026",
    );
    expect(document.title).toBe("Pierwsza ocena w służbie cywilnej — Azymut");
  });

  it("shows the friendly card for an unknown id without querying it", () => {
    renderAt("/pierwsza-ocena?ocena=abc");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Nie znaleziono pierwszej oceny",
    );
    expect(calls.some((c) => c.name === "firstReview/queries:get")).toBe(false);
  });

  it("queries a known id", () => {
    data["firstReview/queries:get"] = undefined;
    renderAt("/pierwsza-ocena?ocena=f1");
    expect(calls.some((c) => c.name === "firstReview/queries:get")).toBe(true);
  });
});
