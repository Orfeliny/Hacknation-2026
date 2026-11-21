import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { __Name__Page } from "./__Name__Page";
import { entryFormSchema } from "./schema";

const useQueryMock = vi.hoisted(() => vi.fn());
const addMock = vi.hoisted(() => vi.fn());
vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: useQueryMock,
  useMutation: () => addMock,
}));

describe("__name__ schema", () => {
  it("trims and enforces 1-500 characters", () => {
    expect(entryFormSchema.safeParse({ text: "   " }).success).toBe(false);
    expect(entryFormSchema.safeParse({ text: "a".repeat(501) }).success).toBe(
      false,
    );
    expect(entryFormSchema.parse({ text: " ok " })).toEqual({ text: "ok" });
  });
});

describe("__Name__Page", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    useQueryMock.mockReset();
    addMock.mockReset();
  });

  it("renders the list from the query", () => {
    vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
    useQueryMock.mockReturnValue([
      { _id: "1", text: "Pierwszy" },
      { _id: "2", text: "Drugi" },
    ]);
    render(<__Name__Page />);
    expect(screen.getByText("Pierwszy")).toBeInTheDocument();
    expect(screen.getByText("Drugi")).toBeInTheDocument();
  });

  it("submits a valid entry and clears the field", async () => {
    vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
    useQueryMock.mockReturnValue([]);
    addMock.mockResolvedValue("id");
    render(<__Name__Page />);
    const input = screen.getByLabelText("Nowy wpis");
    await userEvent.type(input, "  Zadzwonić  ");
    await userEvent.click(screen.getByRole("button", { name: "Dodaj wpis" }));
    expect(addMock).toHaveBeenCalledWith({ text: "Zadzwonić" });
    expect(input).toHaveValue("");
  });

  it("shows a Polish validation error on empty submit", async () => {
    vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
    useQueryMock.mockReturnValue([]);
    render(<__Name__Page />);
    await userEvent.click(screen.getByRole("button", { name: "Dodaj wpis" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Wpisz treść wpisu.",
    );
    expect(addMock).not.toHaveBeenCalled();
  });

  it("disables submit offline without calling the backend", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    render(<__Name__Page />);
    expect(useQueryMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Dodaj wpis" })).toBeDisabled();
  });
});
