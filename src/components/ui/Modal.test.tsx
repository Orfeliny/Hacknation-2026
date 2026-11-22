import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import { Modal } from "./Modal";

function Demo({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Otwórz</Button>
      <Modal
        open={open}
        title="Witaj"
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        footer={<Button onClick={() => setOpen(false)}>Zamknij</Button>}
      >
        <p>Treść okna</p>
      </Modal>
    </>
  );
}

describe("Modal", () => {
  it("is a dialog named by its title, with the content and footer", () => {
    render(<Demo />);
    const dialog = screen.getByRole("dialog", { name: "Witaj" });
    expect(dialog).toHaveTextContent("Treść okna");
    expect(screen.getByRole("button", { name: "Zamknij" })).toBeInTheDocument();
  });

  it("renders no content while closed", () => {
    render(
      <Modal open={false} title="Ukryte" onClose={() => undefined}>
        <p>Treść okna</p>
      </Modal>,
    );
    expect(screen.queryByText("Treść okna")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes through the footer and can be opened again", async () => {
    render(<Demo />);
    await userEvent.click(screen.getByRole("button", { name: "Zamknij" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Otwórz" }));
    expect(screen.getByRole("dialog", { name: "Witaj" })).toBeInTheDocument();
  });

  it("asks the parent to close on Esc instead of closing itself", () => {
    const onClose = vi.fn();
    render(<Demo onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: "Witaj" });
    const cancel = new Event("cancel", { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
