import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiBadge, type AiStatus } from "./AiBadge";
import { AiStatusPage } from "./AiStatusPage";

const useQueryMock = vi.hoisted(() => vi.fn());
vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: useQueryMock,
}));

const online = () =>
  vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");

afterEach(() => {
  vi.unstubAllEnvs();
  useQueryMock.mockReset();
});

const MOCK: AiStatus = { state: "mock", provider: "mock", model: "mock" };
const LOCAL: AiStatus = {
  state: "local",
  provider: "openai-compatible",
  model: "bielik-11b",
  host: "llm.urzad.local:8000",
};
const EXTERNAL: AiStatus = {
  state: "external",
  provider: "openai-compatible",
  model: "gpt-x",
  host: "api.example.com",
};

describe("AiBadge", () => {
  it("shows the mock", () => {
    render(<AiBadge status={MOCK} />);
    expect(screen.getByText("AI demonstracyjne (atrapa)")).toBeInTheDocument();
    expect(screen.getByText(/nie opuszczają aplikacji/)).toBeInTheDocument();
  });

  it("shows a local model, its host, and that the label comes from the address", () => {
    render(<AiBadge status={LOCAL} />);
    expect(screen.getByText("Model lokalny (sieć urzędu)")).toBeInTheDocument();
    expect(
      screen.getByText(/host: llm\.urzad\.local:8000/),
    ).toBeInTheDocument();
    expect(screen.getByText(/zostają w sieci urzędu/)).toBeInTheDocument();
    expect(screen.getByText(/nie jest gwarancja/)).toBeInTheDocument();
  });

  it("shows an external model and says data leaves the network", () => {
    render(<AiBadge status={EXTERNAL} />);
    expect(screen.getByText("Model zewnętrzny")).toBeInTheDocument();
    expect(screen.getByText(/poza sieć urzędu/)).toBeInTheDocument();
  });

  it("shows the configuration error instead of a model", () => {
    render(
      <AiBadge
        status={{ state: "invalid", message: "AI_MODEL is required" }}
      />,
    );
    expect(screen.getByText("Błędna konfiguracja AI")).toBeInTheDocument();
    expect(screen.getByText("AI_MODEL is required")).toBeInTheDocument();
    expect(screen.queryByText(/Dostawca:/)).not.toBeInTheDocument();
  });
});

describe("AiStatusPage", () => {
  it("says a backend is needed and does not query offline", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    render(<AiStatusPage />);
    expect(
      screen.getByText(/wymaga połączenia z backendem/),
    ).toBeInTheDocument();
    expect(useQueryMock).not.toHaveBeenCalled();
  });

  it("shows a loading state, then the badge", () => {
    online();
    useQueryMock.mockReturnValue(undefined);
    const { rerender } = render(<AiStatusPage />);
    expect(screen.getByText(/Ładowanie statusu/)).toBeInTheDocument();
    useQueryMock.mockReturnValue(LOCAL);
    rerender(<AiStatusPage />);
    expect(screen.getByText("Model lokalny (sieć urzędu)")).toBeInTheDocument();
  });

  it("has no provider switcher, only the env instructions", () => {
    online();
    useQueryMock.mockReturnValue(MOCK);
    render(<AiStatusPage />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.getByText(/npx convex env set AI_PROVIDER mock/),
    ).toBeInTheDocument();
  });
});
