import { useAction, useMutation } from "convex/react";
import { useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { useDemoRole } from "../../lib/demoRole";
import { PromptPanel } from "../audit/PromptPanel";
import { errorText } from "./errors";
import { RECOMMENDATION_LABEL, SIGNAL_LABEL, labelOf } from "./labels";

type Team = FunctionReturnType<typeof api.hrPartner.queries.listForSupervisor>;
export type TeamSignal = Team["team"][number]["signals"][number];

type Recommendations = NonNullable<TeamSignal["recommendations"]>;

export function SignalItem({
  employeeId,
  signal,
}: {
  employeeId: Id<"employees">;
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
    <li className="space-y-2 rounded-md border border-slate-200 p-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-900">
          {labelOf(SIGNAL_LABEL, signal.kind)}
        </span>
        <span className="text-sm">{signal.reason}</span>
      </div>
      {recommendations && (
        <div className="space-y-1" aria-live="polite">
          <h4 className="text-sm font-semibold">Podpowiedziane działania</h4>
          <ul className="list-disc space-y-1 pl-5 text-sm">
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
          </Button>
        )}
        <Button
          className="bg-emerald-700 hover:bg-emerald-800"
          disabled={busy}
          onClick={() => void mark("acted")}
        >
          Oznacz jako zrobione
        </Button>
        <Button
          className="bg-slate-600 hover:bg-slate-700"
          disabled={busy}
          onClick={() => void mark("dismissed")}
        >
          Odrzuć sygnał
        </Button>
      </div>
      {message && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
    </li>
  );
}
