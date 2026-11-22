import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useChallengeProfile } from "../../lib/challengeProfile";
import { useDemoRole, type DemoRole } from "../../lib/demoRole";
import { markOnboardingDone, useOnboardingDone } from "../../lib/onboarding";
import { stepsFor } from "./steps";

function Steps({ role, open }: { role: DemoRole; open: boolean }) {
  const profile = useChallengeProfile();
  const steps = stepsFor(role, profile);
  const [index, setIndex] = useState(0);
  const step = steps[Math.min(index, steps.length - 1)];
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
