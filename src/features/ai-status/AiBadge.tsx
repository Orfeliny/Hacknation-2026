import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";

export type AiStatus = FunctionReturnType<typeof api.aiStatus.queries.status>;

const COPY = {
  mock: {
    label: "Atrapa AI (mock)",
    detail: "Odpowiedzi są przykładowe. Żadne dane nie opuszczają aplikacji.",
    tone: "border-slate-300 bg-slate-50 text-slate-900",
  },
  local: {
    label: "Model lokalny (sieć urzędu)",
    detail:
      "Dane zostają w sieci urzędu. Rozpoznane po adresie hosta, to nie jest gwarancja.",
    tone: "border-emerald-300 bg-emerald-50 text-emerald-900",
  },
  external: {
    label: "Model zewnętrzny",
    detail:
      "Dane są wysyłane poza sieć urzędu, po zastąpieniu imion i nazwisk znacznikami.",
    tone: "border-amber-300 bg-amber-50 text-amber-900",
  },
  invalid: {
    label: "Błędna konfiguracja AI",
    detail: "Funkcje AI nie zadziałają, dopóki administrator jej nie poprawi.",
    tone: "border-red-300 bg-red-50 text-red-900",
  },
} as const;

// Shown on the AI status page and reusable on any page that calls a model.
export function AiBadge({ status }: { status: AiStatus }) {
  const copy = COPY[status.state];
  return (
    <div
      role="status"
      className={`space-y-1 rounded-lg border p-3 text-sm ${copy.tone}`}
    >
      <p className="font-semibold">{copy.label}</p>
      {status.state === "invalid" ? (
        <p>{status.message}</p>
      ) : (
        <p>
          Dostawca: {status.provider}, model: {status.model}
          {"host" in status ? `, host: ${status.host}` : ""}
        </p>
      )}
      <p>{copy.detail}</p>
    </div>
  );
}
