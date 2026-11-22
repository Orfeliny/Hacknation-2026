import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AiBadge } from "./AiBadge";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Card } from "./Card";
import { DemoDataNote } from "./DemoDataNote";
import { ExternalLink } from "./ExternalLink";
import { Field } from "./Field";
import { Input } from "./Input";
import { PageHeader } from "./PageHeader";
import { RatingScale } from "./RatingScale";
import { Select } from "./Select";
import { StatusAlert } from "./StatusAlert";
import { Textarea } from "./Textarea";

describe("Button", () => {
  it("keeps props and defaults to type=button", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Zapisz</Button>);
    const button = screen.getByRole("button", { name: "Zapisz" });
    expect(button).toHaveAttribute("type", "button");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it.each(["primary", "secondary", "ghost"] as const)(
    "is at least 44px high in the %s variant (R2.1)",
    (variant) => {
      render(<Button variant={variant}>Akcja</Button>);
      expect(screen.getByRole("button")).toHaveClass("min-h-11");
    },
  );

  it("can be reached and activated with the keyboard", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Dalej</Button>);
    await userEvent.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("form controls", () => {
  it("Input, Textarea and Select are at least 44px high (R2.1)", () => {
    render(
      <>
        <Input aria-label="a" />
        <Textarea aria-label="b" />
        <Select aria-label="c">
          <option>x</option>
        </Select>
      </>,
    );
    for (const name of ["a", "b", "c"]) {
      expect(screen.getByLabelText(name)).toHaveClass("min-h-11");
    }
  });

  it("Card passes props through", () => {
    render(<Card data-testid="card">treść</Card>);
    expect(screen.getByTestId("card")).toHaveTextContent("treść");
    expect(screen.getByTestId("card")).toHaveClass("rounded-xl", "p-6");
  });
});

describe("Field (R2.3)", () => {
  it("links hint to the control via aria-describedby", () => {
    render(
      <Field label="Imię" hint="Jak w umowie">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Imię");
    expect(input).toHaveAccessibleDescription("Jak w umowie");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("links hint and error and sets aria-invalid on error", () => {
    render(
      <Field label="Imię" hint="Jak w umowie" error="Pole jest wymagane">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Imię");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Jak w umowie Pole jest wymagane",
    );
  });

  it("works with Textarea and Select", () => {
    render(
      <>
        <Field label="Opis" error="Za krótki">
          <Textarea />
        </Field>
        <Field label="Rola">
          <Select>
            <option>a</option>
          </Select>
        </Field>
      </>,
    );
    expect(screen.getByLabelText("Opis")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Rola")).toBeInTheDocument();
  });

  it("keeps the child's own aria-describedby and aria-invalid", () => {
    render(
      <>
        <span id="extra">Dodatkowo</span>
        <Field label="Imię" hint="Podpowiedź">
          <Input aria-describedby="extra" aria-invalid />
        </Field>
      </>,
    );
    const input = screen.getByLabelText("Imię");
    expect(input).toHaveAccessibleDescription("Dodatkowo Podpowiedź");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("respects an explicit control id", () => {
    render(
      <Field label="Imię">
        <Input id="moje-id" />
      </Field>,
    );
    expect(screen.getByLabelText("Imię")).toHaveAttribute("id", "moje-id");
  });
});

describe("StatusAlert (R2.4)", () => {
  it("uses role=alert for danger and role=status otherwise", () => {
    const { rerender } = render(<StatusAlert tone="danger">Błąd</StatusAlert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Błąd");
    for (const tone of ["warning", "info", "success"] as const) {
      rerender(<StatusAlert tone={tone}>Treść</StatusAlert>);
      expect(screen.getByRole("status")).toBeInTheDocument();
    }
  });

  it("colours only the text and the icon, and the icon is hidden from AT", () => {
    render(<StatusAlert tone="warning">Termin zbliża się</StatusAlert>);
    const alert = screen.getByRole("status");
    expect(alert.className).not.toMatch(
      /text-warning|bg-warning|border-warning/,
    );
    expect(alert.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(alert.querySelector("svg")).toHaveClass("text-warning");
    expect(screen.getByText("Termin zbliża się")).toHaveClass("text-warning");
  });

  it("carries the state in text, not colour alone", () => {
    render(<StatusAlert tone="danger">Po terminie</StatusAlert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Po terminie");
  });
});

describe("RatingScale (R2.2)", () => {
  const options = [
    { value: "1", label: "Niski" },
    { value: "2", label: "Średni" },
    { value: "3", label: "Wysoki" },
  ];

  it("renders native radios in a fieldset named by its legend", () => {
    render(<RatingScale legend="Ocena" options={options} />);
    const group = screen.getByRole("group", { name: "Ocena" });
    expect(group.tagName).toBe("FIELDSET");
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    for (const radio of radios) {
      expect(radio.tagName).toBe("INPUT");
      expect(radio).toHaveAttribute("type", "radio");
    }
  });

  it("is controlled and calls onChange", async () => {
    const onChange = vi.fn();
    render(
      <RatingScale
        legend="Ocena"
        options={options}
        value="2"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("radio", { name: "Średni" })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "Wysoki" }));
    expect(onChange).toHaveBeenCalledWith("3");
  });

  it("supports arrow-key navigation within the group", async () => {
    function Harness() {
      const [value, setValue] = useState("1");
      return (
        <RatingScale
          legend="Ocena"
          options={options}
          value={value}
          onChange={setValue}
        />
      );
    }
    render(<Harness />);
    await userEvent.tab();
    expect(screen.getByRole("radio", { name: "Niski" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Średni" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Średni" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "Wysoki" })).toBeChecked();
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Średni" })).toBeChecked();
  });

  it("makes the whole group one tab stop", async () => {
    render(
      <>
        <RatingScale legend="Ocena" options={options} />
        <Button>Dalej</Button>
      </>,
    );
    await userEvent.tab();
    expect(screen.getAllByRole("radio")[0]).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Dalej" })).toHaveFocus();
  });

  it("links hint and error to the fieldset", () => {
    render(
      <RatingScale
        legend="Ocena"
        options={options}
        hint="Wybierz jedną"
        error="Brak oceny"
      />,
    );
    const group = screen.getByRole("group", { name: "Ocena" });
    expect(group).toHaveAccessibleDescription("Wybierz jedną Brak oceny");
    expect(group).toHaveAttribute("aria-invalid", "true");
  });

  it("disables every radio when disabled", () => {
    render(<RatingScale legend="Ocena" options={options} disabled />);
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }
  });
});

describe("small primitives", () => {
  it("Badge renders its text", () => {
    render(<Badge>Nowy</Badge>);
    expect(screen.getByText("Nowy")).toBeInTheDocument();
  });

  it.each([
    ["mock", /^AI demonstracyjne$/],
    ["local", /model lokalny/],
    ["external", /model zewnętrzny/],
    ["invalid", /błędna konfiguracja/],
    ["unknown", /sprawdzanie/],
  ] as const)("AiBadge shows the %s state as text", (mode, text) => {
    render(<AiBadge mode={mode} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("PageHeader renders the h1, description and actions", () => {
    render(
      <PageHeader
        title="Pulpit"
        description="Opis"
        actions={<Button>Akcja</Button>}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Pulpit" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Opis")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass(
      "text-[31px]",
      "leading-[1.2]",
      "font-bold",
      "tracking-[-0.01em]",
    );
    expect(screen.getByRole("button", { name: "Akcja" })).toBeInTheDocument();
  });

  it("ExternalLink opens a new tab and announces it", () => {
    render(<ExternalLink href="https://example.com">art. 83</ExternalLink>);
    const link = screen.getByRole("link", {
      name: "art. 83 (otwiera się w nowej karcie)",
    });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("DemoDataNote is a plain note, not a live region", () => {
    render(<DemoDataNote />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText(/demonstracyjne/i)).toBeInTheDocument();
  });
});
