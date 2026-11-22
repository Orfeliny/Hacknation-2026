import { useAction, useMutation } from "convex/react";
import { useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { useDemoRole } from "../../lib/demoRole";
import { PromptPanel } from "../audit/PromptPanel";
import { errorText } from "./errors";
import { RECOMMENDATION_LABEL, SIGNAL_LABEL, labelOf, plDates } from "./labels";

type Team = FunctionReturnType<typeof api.hrPartner.queries.listForSupervisor>;
export type TeamSignal = Team["team"][number]["signals"][number];

type Recommendations = NonNullable<TeamSignal["recommendations"]>;

export function SignalItem({
  employeeId,
  employeeName,
  signal,
}: {
  employeeId: Id<"employees">;
  employeeName: string;
  signal: TeamSignal;
}) {
  const actor = { role: useDemoRole() };
  const recommend = useAction(api.hrPartner.actions.recommend);
  const setStatus = useMutation(api.hrPartner.mutations.setStatus);
  const [fresh, setFresh] = useState<Recommendations | null>(null);
  const [interactionId, setInteractionId] = useState<
    Id<"aiInteractions"> | undefined
  >();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const recommendations = fresh ?? signal.recommendations;
  const context = ` — ${employeeName}, ${labelOf(SIGNAL_LABEL, signal.kind)}`;

  async function ask() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await recommend({
        actor,
        employeeId,
        kind: signal.kind,
        reason: signal.reason,
      });
      if (result.ok) {
        setFresh(result.recommendations);
        setInteractionId(result.interactionId);
      } else setMessage(result.message);
    } catch (error) {
      setMessage(
        errorText(error, "Nie udało się wykonać operacji. Spróbuj ponownie."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function mark(status: "acted" | "dismissed") {
    setBusy(true);
    setMessage(null);
    try {
      await setStatus({
        actor,
        employeeId,
        kind: signal.kind,
        reason: signal.reason,
        status,
      });
    } catch (error) {
      setMessage(
        errorText(error, "Nie udało się wykonać operacji. Spróbuj ponownie."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border-border space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <Badge>{labelOf(SIGNAL_LABEL, signal.kind)}</Badge>
        <span>{plDates(signal.reason)}</span>
      </div>
      {recommendations && (
        <div className="space-y-1" aria-live="polite">
          <h3 className="text-ink font-bold">Podpowiedziane działania</h3>
          <ul className="list-disc space-y-1 pl-5">
            {recommendations.map((item, index) => (
              <li key={`${index}-${item.text}`}>
                {item.kind && (
                  <span className="mr-1 font-medium">
                    {labelOf(RECOMMENDATION_LABEL, item.kind)}:
                  </span>
                )}
                {item.text}
              </li>
            ))}
          </ul>
          {interactionId && <PromptPanel interactionId={interactionId} />}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {!recommendations && (
          <Button disabled={busy} onClick={() => void ask()}>
            {busy ? "Szukam podpowiedzi…" : "Pokaż rekomendacje"}
            <span className="sr-only">{context}</span>
          </Button>
        )}
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void mark("acted")}
        >
          Oznacz jako zrobione
          <span className="sr-only">{context}</span>
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => void mark("dismissed")}
        >
          Odrzuć sygnał
          <span className="sr-only">{context}</span>
        </Button>
      </div>
      {message && (
        <p role="alert" className="text-danger font-semibold">
          {message}
        </p>
      )}
    </li>
  );
}
