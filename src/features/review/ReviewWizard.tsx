import { useState } from "react";
import { Link } from "react-router";
import { Card } from "../../components/ui/Card";
import {
  ClosingStep,
  EvaluationStep,
  ObservationStep,
  OpeningStep,
  SigningStep,
  WritingStep,
} from "./steps";
import { errorMessage, type ReviewView, type WizardActions } from "./types";

const STEPS = [
  { stage: "opening", label: "Rozmowa rozpoczynająca" },
  { stage: "observation", label: "Okres oceny" },
  { stage: "evaluation", label: "Rozmowa oceniająca" },
  { stage: "writing", label: "Sporządzenie oceny" },
  { stage: "signing", label: "Podpisy" },
  { stage: "objection_window", label: "Zapoznanie i sprzeciw" },
] as const;

export function ReviewWizard({
  view,
  actions,
}: {
  view: ReviewView;
  actions: WizardActions;
}) {
  const { review } = view;
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const run = async (task: () => Promise<unknown>) => {
    setPending(true);
    setError(undefined);
    try {
      await task();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  };
  // An objection is part of the last step ("Zapoznanie i sprzeciw").
  const stepStage =
    review.stage === "objection" ? "objection_window" : review.stage;
  const current = Math.max(
    STEPS.findIndex((s) => s.stage === stepStage),
    review.stage === "closed" ? STEPS.length - 1 : 0,
  );
  const props = { view, actions, run, pending };
  const id = encodeURIComponent(review._id);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">
          Ocena: {view.employee.firstName} {view.employee.lastName}
        </h2>
        <p className="text-sm text-slate-600">
          {view.employee.position}, arkusz {review.sheet}, oceniający:{" "}
          {view.evaluator.firstName} {view.evaluator.lastName}
        </p>
        {view.can.asEmployee && (
          <p className="text-sm text-indigo-800">
            To Twoja ocena: możesz ją przeglądać i potwierdzać, ale nie
            edytować.
          </p>
        )}
      </header>

      <ol className="flex flex-wrap gap-2" aria-label="Kroki oceny">
        {STEPS.map((s, i) => (
          <li
            key={s.stage}
            aria-current={i === current ? "step" : undefined}
            className={`rounded-full px-3 py-1 text-xs ${
              i === current
                ? "bg-indigo-600 font-bold text-white ring-2 ring-indigo-900 ring-offset-1"
                : i < current
                  ? "bg-indigo-100 text-indigo-900"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {i < current && <span aria-hidden="true">✓ </span>}
            {i + 1}. {s.label}
            {i < current && <span className="sr-only"> (zakończony)</span>}
            {i > current && <span className="sr-only"> (do zrobienia)</span>}
          </li>
        ))}
      </ol>

      {view.warnings.length > 0 && (
        <p
          role="status"
          className="rounded-md bg-amber-50 p-3 text-sm text-amber-900"
        >
          {view.warnings.map((w) => w.message).join(" ")}
        </p>
      )}

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold">{view.stageLabel}</h3>
        {review.stage === "opening" && <OpeningStep {...props} />}
        {review.stage === "observation" && <ObservationStep {...props} />}
        {review.stage === "evaluation" && <EvaluationStep {...props} />}
        {review.stage === "writing" && <WritingStep {...props} />}
        {review.stage === "signing" && <SigningStep {...props} />}
        {(review.stage === "objection_window" || review.stage === "closed") && (
          <ClosingStep {...props} />
        )}
        {review.stage === "objection" && (
          <p className="text-sm">
            Oceniany wniósł sprzeciw. Rozpatruje go dyrektor generalny urzędu, a
            po jego decyzji ocena zostaje zamknięta albo wraca do sporządzenia.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm whitespace-pre-line text-red-700">
            {error}
          </p>
        )}
      </Card>

      {view.gaps.length > 0 && review.stage !== "closed" && (
        <Card>
          <h3 className="text-sm font-semibold">
            Braki formalne przed przejściem dalej
          </h3>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {view.gaps.map((g) => (
              <li key={`${g.code}-${g.message}`}>
                {g.message} <span className="text-slate-500">({g.source})</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h3 className="text-sm font-semibold">Pomoc i wydruk</h3>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <Link
              className="text-indigo-700 underline"
              to={`/rozmowy?ocena=${id}`}
            >
              Przygotowanie do rozmów (asystent AI)
            </Link>
          </li>
          <li>
            <Link
              className="text-indigo-700 underline"
              to={`/projekt?ocena=${id}`}
            >
              Projekt treści oceny (asystent AI)
            </Link>
          </li>
          <li>
            <Link
              className="text-indigo-700 underline"
              to={`/druk?ocena=${id}`}
            >
              Wydruk arkusza oceny
            </Link>
          </li>
        </ul>
      </Card>
    </div>
  );
}
