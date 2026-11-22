import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  type ReactNode,
  type Ref,
} from "react";

export type ModalPosition = { top: number; left: number };

// A native <dialog>: showModal() gives the focus trap, Esc and the inert background.
// The parent owns `open`; Esc and the close button both end in `onClose`.
// `position` (viewport px) places the dialog at a point instead of the centre; `dialogRef`
// lets the parent measure the open dialog to compute that point.
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  position,
  dialogRef,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  position?: ModalPosition | null;
  dialogRef?: Ref<HTMLDialogElement>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useImperativeHandle(dialogRef, () => ref.current as HTMLDialogElement);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      style={
        position
          ? {
              position: "fixed",
              inset: "auto",
              margin: 0,
              top: position.top,
              left: position.left,
            }
          : undefined
      }
      className="border-border text-ink m-auto w-full max-w-lg rounded-lg border bg-white p-0 shadow-lg backdrop:bg-black/40"
    >
      {open && (
        <div className="space-y-4 p-6">
          <h2 id={titleId} className="text-xl font-bold">
            {title}
          </h2>
          <div className="space-y-2">{children}</div>
          {footer && <div className="flex flex-wrap gap-2">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
