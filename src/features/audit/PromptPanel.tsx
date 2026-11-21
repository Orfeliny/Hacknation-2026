import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useDemoRole } from "../../lib/demoRole";
import { DECISION_LABEL } from "./labels";

// "What was sent to the model": the pseudonymised prompt of one AI call, shown next to its suggestion.
export function PromptPanel({
  interactionId,
}: {
  interactionId: Id<"aiInteractions">;
}) {
  const actor = { role: useDemoRole() };
  const row = useQuery(api.audit.queries.aiInteraction, {
    actor,
    interactionId,
  });
  if (row === undefined) return null;
  return (
    <details className="rounded-md border border-slate-200 p-2 text-sm">
      <summary className="cursor-pointer font-medium">
        Co wysłano do modelu
      </summary>
      <p className="mt-2 text-slate-600">
        Model: {row.provider} / {row.model}. Imiona i nazwiska zastąpiono
        znacznikami. Decyzja: {DECISION_LABEL[row.decision] ?? row.decision}.
      </p>
      <pre className="mt-2 rounded bg-slate-50 p-2 text-xs whitespace-pre-wrap">
        {row.sentPrompt}
      </pre>
    </details>
  );
}
