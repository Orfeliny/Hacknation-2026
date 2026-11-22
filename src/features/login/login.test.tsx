import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, expect, it } from "vitest";
import { getDemoRole } from "../../lib/demoRole";
import { DEMO_CODE } from "./fixtures";
import { LoginPage } from "./LoginPage";

beforeEach(() => window.localStorage.clear());

it("logs in as the fixture persona and navigates to /", async () => {
  const router = createMemoryRouter(
    [
      { path: "/logowanie", element: <LoginPage /> },
      { path: "/", element: <p>start</p> },
    ],
    { initialEntries: ["/logowanie"] },
  );
  render(<RouterProvider router={router} />);
  expect(screen.getByText(/Logowanie demonstracyjne/)).toBeInTheDocument();
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText("Służbowy e-mail"),
    "ewa.kowalczyk@urzad.example",
  );
  await user.click(screen.getByRole("button", { name: "Wyślij link" }));
  await user.type(screen.getByLabelText("Kod z e-maila"), DEMO_CODE);
  await user.click(screen.getByRole("button", { name: "Zaloguj" }));
  expect(getDemoRole()).toBe("director");
  expect(router.state.location.pathname).toBe("/");
});
