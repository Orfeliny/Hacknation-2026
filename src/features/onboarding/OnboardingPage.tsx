import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { useChallengeProfile } from "../../lib/challengeProfile";
import { DEMO_ROLES, useDemoRole } from "../../lib/demoRole";
import { resetOnboarding } from "../../lib/onboarding";
import { stepsFor } from "./steps";

// The same steps as the dialog, as a page: a way back to them that needs no modal.
export function OnboardingPage() {
  const role = useDemoRole();
  const profile = useChallengeProfile();
  const steps = stepsFor(role, profile);
  const roleLabel = DEMO_ROLES.find((r) => r.value === role)?.label ?? role;
  return (
    <section className="space-y-4">
      <title>Przewodnik</title>
      <PageHeader title="Przewodnik po aplikacji" />
      <p>Krótki przewodnik dla roli: {roleLabel}.</p>
      <ol className="list-decimal space-y-3 pl-6">
        {steps.map((step) => (
          <li key={step.title}>
            <h2 className="font-semibold">{step.title}</h2>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
      <Button variant="secondary" onClick={() => resetOnboarding(role)}>
        Pokaż jako okno
      </Button>
    </section>
  );
}
