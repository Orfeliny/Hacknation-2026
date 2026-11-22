import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";

export type AiStatus = FunctionReturnType<typeof api.aiStatus.queries.status>;

const COPY = {
  mock: {
    label: "AI demonstracyjne (atrapa)",
    detail: "Odpowiedzi są przykładowe. Żadne dane nie opuszczają aplikacji.",
    tone: "text-ink",
  },
  local: {
    label: "Model lokalny (sieć urzędu)",
    detail:
      "Dane zostają w sieci urzędu. Rozpoznane po adresie hosta, to nie jest gwarancja.",
    tone: "text-success",
  },
  external: {
    label: "Model zewnętrzny",
    detail:
      "Dane są wysyłane poza sieć urzędu, po zastąpieniu imion i nazwisk znacznikami.",
    tone: "text-warning",
  },
  invalid: {
    label: "Błędna konfiguracja AI",
    detail: "Funkcje AI nie zadziałają, dopóki administrator jej nie poprawi.",
    tone: "text-danger",
  },
} as const;

// Shown on the AI status page and reusable on any page that calls a model.
export function AiBadge({ status }: { status: AiStatus }) {
  const copy = COPY[status.state];
  return (
    <div
      role="status"
      className="border-border text-ink space-y-1 rounded-lg border bg-white p-3"
    >
      <p className={`font-bold ${copy.tone}`}>{copy.label}</p>
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
