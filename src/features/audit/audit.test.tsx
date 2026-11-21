import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_ROLE_STORAGE_KEY } from "../../lib/demoRole";
import { AccessHistory } from "./AccessHistory";
import { PromptPanel } from "./PromptPanel";
import { useRecordExport, useRecordView } from "./useAudit";

const mocks = vi.hoisted(() => ({
  data: new Map<string, unknown>(),
  skipped: [] as string[],
  recorded: new Map<string, ReturnType<typeof vi.fn>>(),
}));

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: (fn: Parameters<typeof getFunctionName>[0], args: unknown) => {
    const name = getFunctionName(fn);
    if (args === "skip") {
      mocks.skipped.push(name);
      return undefined;
    }
    return mocks.data.get(name);
  },
  useMutation: (fn: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(fn);
    if (!mocks.recorded.has(name)) {
      mocks.recorded.set(name, vi.fn().mockResolvedValue(undefined));
    }
    return mocks.recorded.get(name);
  },
}));

const asRole = (role: string) =>
  window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, role);

afterEach(() => {
  window.localStorage.clear();
  mocks.data.clear();
  mocks.skipped = [];
  mocks.recorded.clear();
});

const reviewId = "r1" as never;

describe("AccessHistory", () => {
  it("lists who did what for HR", () => {
    asRole("hr");
    mocks.data.set("audit/queries:accessHistory", [
      {
        _id: "a1",
        at: Date.UTC(2026, 10, 21, 12),
        action: "view",
        entity: "review",
        actorRole: "supervisor",
        actorName: "Katarzyna Szef",
        details: null,
      },
    ]);
    render(<AccessHistory reviewId={reviewId} />);
    expect(screen.getByText(/Katarzyna Szef \(przełożony\)/)).toHaveTextContent(
      /otworzył\(a\) ocenę/,
    );
  });

  it("renders nothing and does not query for other roles", () => {
    asRole("supervisor");
    const { container } = render(<AccessHistory reviewId={reviewId} />);
    expect(container).toBeEmptyDOMElement();
    expect(mocks.skipped).toContain("audit/queries:accessHistory");
  });
});

describe("PromptPanel", () => {
  it("shows what was sent to the model", () => {
    asRole("supervisor");
    mocks.data.set("audit/queries:aiInteraction", {
      provider: "mock",
      model: "mock-1",
      decision: "pending",
      sentPrompt: "Pracownik [PRACOWNIK] ma sygnał obciążenia.",
    });
    render(<PromptPanel interactionId={"i1" as never} />);
    expect(screen.getByText("Co wysłano do modelu")).toBeInTheDocument();
    expect(screen.getByText(/Pracownik \[PRACOWNIK\]/)).toBeInTheDocument();
    expect(screen.getByText(/mock \/ mock-1/)).toBeInTheDocument();
  });
});

function Probe({ kind }: { kind: "view" | "export" }) {
  const view = useRecordView(kind === "view" ? reviewId : undefined);
  const exp = useRecordExport(kind === "export" ? reviewId : undefined);
  return <>{String(view ?? exp ?? "")}</>;
}

describe("recording hooks", () => {
  it("records a view once with the current role", () => {
    asRole("employee");
    const { rerender } = render(<Probe kind="view" />);
    rerender(<Probe kind="view" />);
    expect(
      mocks.recorded.get("audit/mutations:recordView"),
    ).toHaveBeenCalledTimes(1);
    expect(
      mocks.recorded.get("audit/mutations:recordView"),
    ).toHaveBeenCalledWith({
      actor: { role: "employee" },
      reviewId: "r1",
    });
  });

  it("records an export, and nothing without a review", () => {
    asRole("hr");
    render(<Probe kind="export" />);
    expect(
      mocks.recorded.get("audit/mutations:recordExport"),
    ).toHaveBeenCalledTimes(1);
    expect(
      mocks.recorded.get("audit/mutations:recordView"),
    ).not.toHaveBeenCalled();
  });
});
