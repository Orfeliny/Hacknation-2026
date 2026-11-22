import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setDemoRole } from "../../lib/demoRole";
import { HrAssignPage } from "./HrAssignPage";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  changeSupervisor: vi.fn(),
}));

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: mocks.useQuery,
  useMutation: () => mocks.changeSupervisor,
}));

const person = (id: string, first: string, supervisorId?: string) => ({
  _id: id,
  firstName: first,
  lastName: "Test",
  position: "Specjalista",
  unit: "Wydział",
  supervisorId,
  staffingEvents: [],
});

const EMPLOYEES = [
  person("boss", "Marta"),
  person("e1", "Piotr", "boss"),
  person("succ", "Robert"),
];

beforeEach(() => {
  vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
  setDemoRole("hr");
  mocks.useQuery.mockReturnValue(EMPLOYEES);
  mocks.changeSupervisor.mockResolvedValue(null);
});
afterEach(() => {
  vi.unstubAllEnvs();
  mocks.useQuery.mockReset();
  mocks.changeSupervisor.mockReset();
});

describe("HrAssignPage", () => {
  it("shows an offline notice without a backend", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    render(
      <MemoryRouter>
        <HrAssignPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/wymaga połączenia z backendem/),
    ).toBeInTheDocument();
  });

  it("validates, then reassigns the selected reports to the successor", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <HrAssignPage />
      </MemoryRouter>,
    );
    await user.click(
      screen.getByRole("button", { name: "Przypisz oceniającego" }),
    );
    expect(
      screen.getByText("Wybierz odchodzącego oceniającego."),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("Odchodzący oceniający"),
      "boss",
    );
    await user.selectOptions(screen.getByLabelText("Następca"), "succ");
    await user.type(screen.getByLabelText("Ocenia od"), "2027-01-01");
    await user.click(
      screen.getByRole("button", { name: "Przypisz oceniającego" }),
    );

    expect(mocks.changeSupervisor).toHaveBeenCalledWith({
      actor: { role: "hr" },
      employeeId: "e1",
      supervisorId: "succ",
      from: "2027-01-01",
    });
    expect(await screen.findByText(/Przypisano nowego/)).toBeInTheDocument();
  });
});
