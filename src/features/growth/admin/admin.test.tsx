import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConvexError } from "convex/values";
import { getFunctionName } from "convex/server";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GrowthPage } from "../GrowthPage";
import { AdminPanel } from "./AdminPanel";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  saveOption: vi.fn(),
  saveArticle: vi.fn(),
  setActive: vi.fn(),
  setPublished: vi.fn(),
}));

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: mocks.useQuery,
  useMutation: (fn: Parameters<typeof getFunctionName>[0]) =>
    ({
      "growth/admin:saveOption": mocks.saveOption,
      "growth/admin:saveArticle": mocks.saveArticle,
      "growth/admin:setOptionActive": mocks.setActive,
      "growth/admin:setArticlePublished": mocks.setPublished,
    })[getFunctionName(fn)],
}));

const option = {
  _id: "o1",
  _creationTime: 1,
  title: "Szkolenie z negocjacji",
  description: "Ogólne szkolenie.",
  form: "szkolenie",
  criterionIds: ["negocjowanie"],
  level: "podstawowy",
  cost: "bezplatne",
  source: "demo",
  active: true,
};

const draft = {
  _id: "a1",
  _creationTime: 1,
  slug: "robocza",
  title: "Robocza porada",
  summary: "Krótko.",
  topic: "inne",
  sections: [
    { heading: "Zasady", paragraphs: ["Zacznij od celu."], bullets: ["Punkt"] },
  ],
  source: "urzad",
  published: false,
};

function serve(options: unknown[] = [option], articles: unknown[] = [draft]) {
  mocks.useQuery.mockImplementation(
    (fn: Parameters<typeof getFunctionName>[0]) =>
      getFunctionName(fn) === "growth/admin:listOptionsAdmin"
        ? options
        : articles,
  );
}

const asRole = (role: string) => localStorage.setItem("demoRole", role);

beforeEach(() => {
  asRole("hr");
  serve();
  mocks.saveOption.mockResolvedValue("o2");
  mocks.saveArticle.mockResolvedValue("a2");
  mocks.setActive.mockResolvedValue(undefined);
  mocks.setPublished.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe("AdminPanel access", () => {
  it.each(["supervisor", "employee", "director", "admin"])(
    "tells the %s role the panel is for HR and shows no form",
    (role) => {
      asRole(role);
      render(<AdminPanel />);
      expect(screen.getByRole("alert")).toHaveTextContent(/tylko kadry/);
      expect(screen.queryByText("Dodaj wpis")).not.toBeInTheDocument();
    },
  );
});

describe("catalog tab", () => {
  it("lists entries, marking a switched-off one", () => {
    serve([option, { ...option, _id: "o3", title: "Stare", active: false }]);
    render(<AdminPanel />);
    expect(screen.getByText("Szkolenie z negocjacji")).toBeInTheDocument();
    expect(screen.getByText("Wyłączony")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Włącz wpis Stare" }),
    ).toBeInTheDocument();
  });

  it("switches an entry off", async () => {
    render(<AdminPanel />);
    await userEvent.click(
      screen.getByRole("button", {
        name: "Wyłącz wpis Szkolenie z negocjacji",
      }),
    );
    expect(mocks.setActive).toHaveBeenCalledWith({
      actor: { role: "hr" },
      optionId: "o1",
      active: false,
    });
  });

  it("rejects an empty title, no criterion and an http address without calling the backend", async () => {
    render(<AdminPanel />);
    await userEvent.click(screen.getByRole("button", { name: "Dodaj wpis" }));
    await userEvent.click(screen.getByRole("button", { name: "Zapisz wpis" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Tytuł: wpisz treść/);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /co najmniej jedno kryterium/,
    );

    await userEvent.type(screen.getByLabelText("Tytuł"), "Warsztat");
    await userEvent.type(screen.getByLabelText("Opis"), "Opis warsztatu.");
    await userEvent.click(screen.getByLabelText("Negocjowanie"));
    await userEvent.type(
      screen.getByLabelText(/Adres strony/),
      "http://example.org",
    );
    await userEvent.click(screen.getByRole("button", { name: "Zapisz wpis" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/https:\/\//);
    expect(mocks.saveOption).not.toHaveBeenCalled();
  });

  it("saves a valid entry and returns to the list", async () => {
    render(<AdminPanel />);
    await userEvent.click(screen.getByRole("button", { name: "Dodaj wpis" }));
    await userEvent.type(screen.getByLabelText("Tytuł"), "  Warsztat  ");
    await userEvent.type(screen.getByLabelText("Opis"), "Opis warsztatu.");
    await userEvent.click(screen.getByLabelText("Negocjowanie"));
    await userEvent.type(
      screen.getByLabelText(/Adres strony/),
      "https://example.org/x",
    );
    await userEvent.click(screen.getByRole("button", { name: "Zapisz wpis" }));
    expect(mocks.saveOption).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { role: "hr" },
        title: "  Warsztat  ",
        criterionIds: ["negocjowanie"],
        url: "https://example.org/x",
        form: "szkolenie",
      }),
    );
    expect(
      await screen.findByRole("button", { name: "Dodaj wpis" }),
    ).toBeInTheDocument();
  });

  it("shows the backend's message when saving fails", async () => {
    mocks.saveOption.mockRejectedValue(new ConvexError("Brak uprawnień."));
    render(<AdminPanel />);
    await userEvent.click(
      screen.getByRole("button", {
        name: "Edytuj wpis Szkolenie z negocjacji",
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Zapisz wpis" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Brak uprawnień.",
    );
  });
});

describe("advice tab", () => {
  async function openAdvice() {
    render(<AdminPanel />);
    await userEvent.click(screen.getByRole("button", { name: "Porady" }));
  }

  it("marks a draft, previews it and publishes it", async () => {
    await openAdvice();
    expect(screen.getByText("Szkic")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Podgląd porady Robocza porada" }),
    );
    expect(screen.getByLabelText("Podgląd porady")).toHaveTextContent(
      "Zacznij od celu.",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Opublikuj poradę Robocza porada" }),
    );
    expect(mocks.setPublished).toHaveBeenCalledWith({
      actor: { role: "hr" },
      articleId: "a1",
      published: true,
    });
  });

  it("rejects an article without a title or content and says why", async () => {
    await openAdvice();
    await userEvent.click(screen.getByRole("button", { name: "Dodaj poradę" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Zapisz poradę" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/Tytuł: wpisz treść/);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Każda sekcja potrzebuje akapitu lub punktu|Nagłówek sekcji/,
    );
    expect(mocks.saveArticle).not.toHaveBeenCalled();
  });

  it("saves an article built from section fields", async () => {
    await openAdvice();
    await userEvent.click(screen.getByRole("button", { name: "Dodaj poradę" }));
    await userEvent.type(screen.getByLabelText("Tytuł"), "Nowa porada");
    await userEvent.type(screen.getByLabelText("Streszczenie"), "Krótko.");
    await userEvent.type(
      screen.getByLabelText("Nagłówek sekcji 1"),
      "Pierwsza sekcja",
    );
    await userEvent.type(
      screen.getByLabelText("Akapity sekcji 1"),
      "Pierwszy akapit.{Enter}{Enter}Drugi akapit.",
    );
    await userEvent.type(
      screen.getByLabelText("Punkty sekcji 1"),
      "Punkt A{Enter}Punkt B",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Zapisz poradę" }),
    );
    expect(mocks.saveArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Nowa porada",
        topic: "inne",
        audience: "przelozony",
        sections: [
          {
            heading: "Pierwsza sekcja",
            paragraphs: ["Pierwszy akapit.", "Drugi akapit."],
            bullets: ["Punkt A", "Punkt B"],
          },
        ],
      }),
    );
  });
});

describe("advice audience", () => {
  async function openForm(name: string | null) {
    render(<AdminPanel />);
    await userEvent.click(screen.getByRole("button", { name: "Porady" }));
    await userEvent.click(
      screen.getByRole("button", {
        name: name ?? "Dodaj poradę",
      }),
    );
  }

  it("defaults a new article to supervisors and offers all three audiences", async () => {
    await openForm(null);
    const select = screen.getByLabelText("Dla kogo");
    expect(select).toHaveValue("przelozony");
    expect(
      Array.from(select.querySelectorAll("option")).map((o) => o.textContent),
    ).toEqual(["Dla przełożonego", "Dla pracownika", "Dla wszystkich"]);
  });

  it("sends the chosen audience", async () => {
    await openForm(null);
    await userEvent.type(screen.getByLabelText("Tytuł"), "Dla pracownika");
    await userEvent.type(screen.getByLabelText("Streszczenie"), "Krótko.");
    await userEvent.selectOptions(
      screen.getByLabelText("Dla kogo"),
      "pracownik",
    );
    await userEvent.type(screen.getByLabelText("Nagłówek sekcji 1"), "Sekcja");
    await userEvent.type(screen.getByLabelText("Akapity sekcji 1"), "Treść.");
    await userEvent.click(
      screen.getByRole("button", { name: "Zapisz poradę" }),
    );
    expect(mocks.saveArticle).toHaveBeenCalledWith(
      expect.objectContaining({ audience: "pracownik" }),
    );
  });

  it("shows the stored audience when editing", async () => {
    serve([option], [{ ...draft, audience: "wszyscy" }]);
    await openForm("Edytuj poradę Robocza porada");
    expect(screen.getByLabelText("Dla kogo")).toHaveValue("wszyscy");
  });
});

describe("GrowthPage entry point", () => {
  const renderPage = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <GrowthPage />
      </MemoryRouter>,
    );

  it("offers the management link to HR only", () => {
    vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
    mocks.useQuery.mockReturnValue([]);
    renderPage("/rozwoj");
    expect(
      screen.getByRole("link", { name: "Zarządzaj treścią" }),
    ).toBeInTheDocument();
  });

  it("hides the link from other roles", () => {
    asRole("supervisor");
    vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
    mocks.useQuery.mockReturnValue([]);
    renderPage("/rozwoj");
    expect(
      screen.queryByRole("link", { name: "Zarządzaj treścią" }),
    ).not.toBeInTheDocument();
  });

  it("opens the panel with ?zarzadzanie=1", () => {
    vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
    renderPage("/rozwoj?zarzadzanie=1");
    expect(
      screen.getByRole("button", { name: "Dodaj wpis" }),
    ).toBeInTheDocument();
  });
});
