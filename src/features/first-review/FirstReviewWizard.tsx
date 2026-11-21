import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
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
        <h2 className="text-xl font-semibold">{view.employeeName}</h2>
        <p className="text-sm text-slate-600">{view.position}</p>
      </div>
      <ol className="flex flex-wrap gap-2" aria-label="Etapy pierwszej oceny">
        {STEPS.map(([id, label], i) => (
          <li
            key={id}
            aria-current={i === current ? "step" : undefined}
            className={`rounded-full px-3 py-1 text-sm ${
              i === current
                ? "bg-indigo-600 text-white"
                : i < current
                  ? "bg-indigo-100 text-indigo-900"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {view.window && (
        <Card className="space-y-1 text-sm">
          <p>
            Najwcześniej: <strong>{view.window.earliest}</strong>
            {view.window.latest && (
              <>
                , najpóźniej: <strong>{view.window.latest}</strong>
              </>
            )}
          </p>
          <p className="text-slate-600">Podstawa: {view.window.source}</p>
          {view.warning && (
            <p role="status" className="text-amber-800">
              {view.warning}
            </p>
          )}
        </Card>
      )}

      {view.stage === "report" && (
        <Card className="space-y-2">
          <h3 className="font-semibold">Wymagane: {report?.label}</h3>
          <p className="text-sm text-slate-600">Podstawa: {report?.source}</p>
          {view.you.isEvaluator ? (
            <>
              <label className="flex items-center gap-2 text-sm">
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
            <p className="text-sm">Czeka na oceniającego.</p>
          )}
        </Card>
      )}

      {view.stage === "assessment" && (
        <Card className="space-y-2">
          <h3 className="font-semibold">Wynik pierwszej oceny</h3>
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
                    className="flex items-center gap-2 text-sm"
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
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />
                {unitHead?.label}
              </label>
              <p className="text-sm text-slate-600">
                Podstawa: {unitHead?.source}
              </p>
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
            <p className="text-sm">Czeka na oceniającego.</p>
          )}
        </Card>
      )}

      {view.stage === "signing" && (
        <Card className="space-y-2">
          <h3 className="font-semibold">Podpisy</h3>
          <label className="block text-sm">
            Miejscowość
            <input
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
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
        <Card className="space-y-1 text-sm">
          <p>
            Wynik:{" "}
            <strong>
              {view.result === "positive" ? "pozytywny" : "negatywny"}
            </strong>
          </p>
          <p>{view.effect.label}</p>
          <p className="text-slate-600">Podstawa: {view.effect.source}</p>
        </Card>
      )}

      {view.signatures.length > 0 && (
        <ul className="text-sm">
          {view.signatures.map((s) => (
            <li key={s.role}>
              {s.role === "evaluator" ? "Oceniający" : "Oceniany"}
              {s.onBehalf ? " (podpis w imieniu, kadry)" : ""}
              {s.place ? `, ${s.place}` : ""},{" "}
              {new Date(s.signedAt).toLocaleDateString("pl-PL")}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
