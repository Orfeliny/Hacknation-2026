import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useChallengeProfile } from "../../lib/challengeProfile";
import { useDemoRole, type DemoRole } from "../../lib/demoRole";
import { markOnboardingDone, useOnboardingDone } from "../../lib/onboarding";
import { placeCallout, type Placement, type Side } from "./anchor";
import { stepsFor } from "./steps";

const POINTER_SIZE = 16;

// The pointer is a rotated square on the dialog edge facing the target.
const POINTER_EDGE: Record<Side, string> = {
  bottom: "border-t border-l",
  top: "border-b border-r",
  right: "border-b border-l",
  left: "border-t border-r",
};

function pointerStyle({ side, pointerOffset }: Placement) {
  const edge = -POINTER_SIZE / 2 - 1;
  const along = pointerOffset - POINTER_SIZE / 2;
  if (side === "bottom") return { top: edge, left: along };
  if (side === "top") return { bottom: edge, left: along };
  if (side === "right") return { left: edge, top: along };
  return { right: edge, top: along };
}

function useTargetPlacement(
  open: boolean,
  selector: string | undefined,
  stepKey: number,
) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

  useEffect(() => {
    if (!open || !selector) return;
    const update = () => {
      const target = document.querySelector(selector);
      const dialog = dialogRef.current;
      if (!target || !dialog) return setPlacement(null);
      setPlacement(
        placeCallout(
          target.getBoundingClientRect(),
          { width: dialog.offsetWidth, height: dialog.offsetHeight },
          { width: window.innerWidth, height: window.innerHeight },
        ),
      );
    };
    const frame = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, selector, stepKey]);

  // The element outlined on the page while its step is shown.
  useEffect(() => {
    if (!open || !selector) return;
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) return;
    const { outline, outlineOffset } = target.style;
    target.style.outline = "3px solid var(--color-primary)";
    target.style.outlineOffset = "3px";
    return () => {
      target.style.outline = outline;
      target.style.outlineOffset = outlineOffset;
    };
  }, [open, selector, stepKey]);

  return { dialogRef, placement: open && selector ? placement : null };
}

function Steps({ role, open }: { role: DemoRole; open: boolean }) {
  const profile = useChallengeProfile();
  const steps = stepsFor(role, profile);
  const [index, setIndex] = useState(0);
  const step = steps[Math.min(index, steps.length - 1)];
  const { dialogRef, placement } = useTargetPlacement(
    open,
    step?.target,
    index,
  );
  if (!step) return null;
  const last = index >= steps.length - 1;
  const finish = () => {
    setIndex(0);
    markOnboardingDone(role);
  };

  return (
    <Modal
      open={open}
      title={step.title}
      onClose={finish}
      position={placement}
      dialogRef={dialogRef}
      footer={
        <>
          <Button
            variant="secondary"
            aria-disabled={index === 0}
            className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            onClick={() => index > 0 && setIndex(index - 1)}
          >
            Wstecz
          </Button>
          {last ? (
            <Button onClick={finish}>Zaczynam</Button>
          ) : (
            <Button onClick={() => setIndex(index + 1)}>Dalej</Button>
          )}
          {!last && (
            <Button variant="ghost" onClick={finish}>
              Pomiń
            </Button>
          )}
        </>
      }
    >
      {placement && (
        <span
          aria-hidden="true"
          data-onboarding-pointer={placement.side}
          style={{
            ...pointerStyle(placement),
            width: POINTER_SIZE,
            height: POINTER_SIZE,
          }}
          className={`border-border absolute rotate-45 bg-white ${POINTER_EDGE[placement.side]}`}
        />
      )}
      <p className="text-muted text-sm">
        Krok {index + 1} z {steps.length}
      </p>
      <p>{step.text}</p>
    </Modal>
  );
}

// Opens once for a role that has not seen it; the flag is per role (a demo stand-in until login, #42).
// Stays mounted while closed so the browser returns focus to the element that opened it.
export function OnboardingDialog() {
  const role = useDemoRole();
  const done = useOnboardingDone(role);
  return <Steps key={role} role={role} open={!done} />;
}
