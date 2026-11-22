import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { formatDate } from "../../lib/format";
import {
  errorMessage,
  type FirstReviewActions,
  type FirstReviewView,
} from "./types";

const STEPS = [
  ["report", "Sprawozdanie"],
  ["assessment", "Ocena"],
  ["signing", "Podpisy"],
  ["closed", "Zamknięta"],
] as const;

type Props = { view: FirstReviewView; actions: FirstReviewActions };

export function FirstReviewWizard({ view, actions }: Props) {
  const [error, setError] = useState<string | undefined>();
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState<"positive" | "negative" | "">("");
  const [place, setPlace] = useState("");
  const current = STEPS.findIndex(([id]) => id === view.stage);
  const report = view.elements.find((e) => e.id === "report");
  const unitHead = view.elements.find((e) => e.id === "unit_head");

  async function run(action: () => Promise<unknown>) {
    setError(undefined);
    try {
      await action();
      setChecked(false);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-ink text-xl font-bold">{view.employeeName}</h2>
        <p className="text-muted">{view.position}</p>
      </div>
      <nav
        aria-label="Etapy pierwszej oceny"
        className="border-border rounded-lg border bg-white px-5 py-4"
      >
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEPS.map(([id, label], i) => (
            <li
              key={id}
              aria-current={i === current ? "step" : undefined}
              className={`flex items-center gap-1.5 ${
                i === current ? "text-primary font-bold" : "text-ink"
              }`}
            >
              {i < current ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4 shrink-0"
                >
                  <path d="M5 12l5 5 9-10" />
                </svg>
              ) : null}
              <span>
                {i + 1}. {label}
              </span>
              {i < current ? (
                <span className="sr-only">(zakończony)</span>
              ) : null}
            </li>
          ))}
        </ol>
      </nav>

      {view.window && (
        <Card className="space-y-3">
          <p>
            Najwcześniej: <strong>{formatDate(view.window.earliest)}</strong>
            {view.window.latest && (
              <>
                {" "}
                · najpóźniej: <strong>{formatDate(view.window.latest)}</strong>
              </>
            )}
          </p>
          <p className="text-muted text-sm">Podstawa: {view.window.source}</p>
          {view.warning && (
            <StatusAlert tone="warning">{view.warning}</StatusAlert>
          )}
        </Card>
      )}

      {view.stage === "report" && (
        <Card className="space-y-3">
          <h3 className="font-bold">
            {report ? `Wymagane: ${report.label}` : "Sprawozdanie pracownika"}
          </h3>
          <p className="text-muted text-sm">Podstawa: {report?.source}</p>
          {view.you.isEvaluator ? (
            <>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />
                Otrzymałem sprawozdanie pracownika
              </label>
              <Button
                disabled={!checked}
                onClick={() => void run(actions.confirmReport)}
              >
                Przejdź do oceny
              </Button>
            </>
          ) : (
            <p>Czeka na oceniającego.</p>
          )}
        </Card>
      )}

      {view.stage === "assessment" && (
        <Card className="space-y-3">
          <h3 className="font-bold">Wynik pierwszej oceny</h3>
          {view.you.isEvaluator ? (
            <>
              <fieldset className="space-y-1">
                <legend className="sr-only">Wynik</legend>
                {(
                  [
                    ["positive", "Ocena pozytywna"],
                    ["negative", "Ocena negatywna"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex min-h-11 items-center gap-2"
                  >
                    <input
                      type="radio"
                      name="first-review-result"
                      checked={result === value}
                      onChange={() => setResult(value)}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />
                {unitHead?.label}
              </label>
              <p className="text-muted text-sm">Podstawa: {unitHead?.source}</p>
              <Button
                disabled={!result || !checked}
                onClick={() =>
                  result && void run(() => actions.conclude(result, checked))
                }
              >
                Zapisz wynik i przejdź do podpisów
              </Button>
            </>
          ) : (
            <p>Czeka na oceniającego.</p>
          )}
        </Card>
      )}

      {view.stage === "signing" && (
        <Card className="space-y-3">
          <h3 className="font-bold">Podpisy</h3>
          <label className="block font-semibold">
            Miejscowość
            <input
              className="border-border mt-1 block min-h-11 w-full rounded-md border bg-white px-3 py-2 text-base"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
          </label>
          {view.you.isEvaluator && !view.you.evaluatorSigned && (
            <Button
              disabled={!place.trim()}
              onClick={() => void run(() => actions.sign("evaluator", place))}
            >
              Podpisz jako oceniający
            </Button>
          )}
          {view.you.evaluatorSigned &&
            !view.you.employeeSigned &&
            (view.you.isReviewed || view.you.canRecordForEmployee) && (
              <Button
                disabled={!place.trim()}
                onClick={() => void run(() => actions.sign("employee", place))}
              >
                {view.you.isReviewed
                  ? "Podpisz jako oceniany"
                  : "Zapisz podpis ocenianego w jego imieniu"}
              </Button>
            )}
        </Card>
      )}

      {view.result && view.effect && (
        <Card className="space-y-1">
          <p>
            Wynik:{" "}
            <strong>
              {view.result === "positive" ? "pozytywny" : "negatywny"}
            </strong>
          </p>
          <p>{view.effect.label}</p>
          <p className="text-muted text-sm">Podstawa: {view.effect.source}</p>
        </Card>
      )}

      {view.signatures.length > 0 && (
        <ul>
          {view.signatures.map((s) => (
            <li key={s.role}>
              {s.role === "evaluator" ? "Oceniający" : "Oceniany"}
              {s.onBehalf ? " (podpis w imieniu, kadry)" : ""}
              {s.place ? `, ${s.place}` : ""}, {formatDate(s.signedAt)}
            </li>
          ))}
        </ul>
      )}

      {error && <StatusAlert tone="danger">{error}</StatusAlert>}
    </div>
  );
}
