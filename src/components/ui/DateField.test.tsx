import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DateField } from "./DateField";

describe("DateField", () => {
  it("is a labelled numeric text input with a dd.mm.rrrr placeholder", () => {
    render(<DateField label="Termin" value="" onChange={() => {}} />);
    const input = screen.getByLabelText("Termin");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("placeholder", "dd.mm.rrrr");
  });

  it("shows an ISO value as dd.mm.rrrr", () => {
    render(<DateField label="Termin" value="2026-11-27" onChange={() => {}} />);
    expect(screen.getByLabelText("Termin")).toHaveValue("27.11.2026");
  });

  it("reports ISO for a valid date", async () => {
    const onChange = vi.fn();
    render(<DateField label="Termin" value="" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Termin"), "27.11.2026");
    expect(onChange).toHaveBeenLastCalledWith("2026-11-27");
  });

  it("rejects 31.02 with a field error on blur and reports empty", async () => {
    const onChange = vi.fn();
    render(<DateField label="Termin" value="" onChange={onChange} />);
    const input = screen.getByLabelText("Termin");
    await userEvent.type(input, "31.02.2026");
    await userEvent.tab();
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(screen.getByText(/formacie dd\.mm\.rrrr/)).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});
