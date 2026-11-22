import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "./AuthGate";
import { SignOutButton } from "./SignOutButton";
import { useSession } from "../lib/session";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  convexAuth: vi.fn(),
  me: vi.fn(),
  link: vi.fn(),
  signinRedirect: vi.fn(),
  signoutRedirect: vi.fn(),
}));

vi.mock("react-oidc-context", () => ({
  useAuth: () => mocks.auth() as unknown,
}));
vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useConvexAuth: () => mocks.convexAuth() as unknown,
  useQuery: () => mocks.me() as unknown,
  useMutation: () => mocks.link,
}));

const signedIn = () => ({
  isLoading: false,
  isAuthenticated: true,
  error: undefined,
  signinRedirect: mocks.signinRedirect,
  signoutRedirect: mocks.signoutRedirect,
});

beforeEach(() => {
  mocks.auth.mockReturnValue(signedIn());
  mocks.convexAuth.mockReturnValue({ isLoading: false, isAuthenticated: true });
  mocks.link.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.clearAllMocks();
  mocks.link.mockReset();
});

function Who() {
  const session = useSession();
  return (
    <p>
      {session?.employee.firstName}:{session?.roles.join(",")}
    </p>
  );
}

const renderGate = () =>
  render(
    <AuthGate>
      <Who />
    </AuthGate>,
  );

describe("AuthGate", () => {
  it("shows loading while the login or the server is still deciding", () => {
    mocks.auth.mockReturnValue({ ...signedIn(), isLoading: true });
    renderGate();
    expect(screen.getByRole("heading", { name: "Ładowanie…" })).toBeVisible();
  });

  it("offers a login when nobody is signed in, and sends the user to Keycloak", async () => {
    mocks.auth.mockReturnValue({ ...signedIn(), isAuthenticated: false });
    renderGate();
    expect(screen.queryByText(/:/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Zaloguj się" }));
    expect(mocks.signinRedirect).toHaveBeenCalledOnce();
  });

  it("shows a login error with a way to retry", async () => {
    mocks.auth.mockReturnValue({ ...signedIn(), error: new Error("x") });
    renderGate();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Nie udało się zalogować/,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Spróbuj ponownie" }),
    );
    expect(mocks.signinRedirect).toHaveBeenCalledOnce();
  });

  it("does not show the app while the server's answer is pending", () => {
    mocks.me.mockReturnValue(undefined);
    renderGate();
    expect(screen.getByRole("heading", { name: "Ładowanie…" })).toBeVisible();
  });

  it("refuses to run when the server is not in oidc mode", () => {
    mocks.me.mockReturnValue({ mode: "demo", allowedRoles: [] });
    renderGate();
    expect(screen.getByRole("alert")).toHaveTextContent(/różne ustawienia/);
    expect(screen.queryByText(/:/)).not.toBeInTheDocument();
  });

  it("says so when the server did not accept the token", () => {
    mocks.me.mockReturnValue({ mode: "oidc", authenticated: false });
    renderGate();
    expect(
      screen.getByRole("heading", { name: /nie przyjął logowania/ }),
    ).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /zalogować się ponownie/,
    );
  });

  it("links the account once on the first login and shows the refusal", async () => {
    mocks.me.mockReturnValue({
      mode: "oidc",
      authenticated: true,
      linked: false,
    });
    mocks.link.mockResolvedValue({ ok: false, code: "not_linked" });
    renderGate();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /nie jest powiązane z pracownikiem/,
    );
    expect(mocks.link).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Wyloguj" }));
    expect(mocks.signoutRedirect).toHaveBeenCalledOnce();
  });

  it("shows a failed link call as a configuration problem", async () => {
    mocks.me.mockReturnValue({
      mode: "oidc",
      authenticated: true,
      linked: false,
    });
    mocks.link.mockRejectedValue(new Error("boom"));
    renderGate();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /źle skonfigurowane/,
    );
  });

  it("shows the app with the person's roles once linked", () => {
    mocks.me.mockReturnValue({
      mode: "oidc",
      authenticated: true,
      linked: true,
      allowedRoles: ["employee", "hr"],
      employee: {
        id: "e1",
        firstName: "Barbara",
        lastName: "Dąbrowska",
        position: "p",
      },
    });
    renderGate();
    expect(screen.getByText("Barbara:employee,hr")).toBeInTheDocument();
    expect(mocks.link).not.toHaveBeenCalled();
  });
});

describe("SignOutButton", () => {
  it("ends the session at Keycloak", async () => {
    render(<SignOutButton />);
    await userEvent.click(screen.getByRole("button", { name: "Wyloguj" }));
    expect(mocks.signoutRedirect).toHaveBeenCalledOnce();
  });
});
