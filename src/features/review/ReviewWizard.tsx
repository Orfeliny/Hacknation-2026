import { useState } from "react";
import { RouteLink } from "../../app/index";
import { Card } from "../../components/ui/Card";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { FormalCheck } from "./FormalCheck";
import { SheetHeader } from "./SheetHeader";
import { StageNav } from "./StageNav";
import {
  ClosingStep,
  EvaluationStep,
  ObservationStep,
  OpeningStep,
  SigningStep,
} from "./steps";
import { errorMessage, type ReviewView, type WizardActions } from "./types";
import { WritingStep } from "./writing";

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
  const props = { view, actions, run, pending };
  const id = encodeURIComponent(review._id);

  return (
    <div className="space-y-6">
      <SheetHeader view={view} />
      <StageNav stage={review.stage} />

      {view.warnings.length > 0 && (
        <StatusAlert tone="warning">
          {view.warnings.map((w) => w.message).join(" ")}
        </StatusAlert>
      )}

      {view.gaps.length > 0 && review.stage !== "closed" && (
        <FormalCheck gaps={view.gaps} />
      )}

      <Card className="space-y-4">
        <h3 className="text-xl font-bold">{view.stageLabel}</h3>
        {review.stage === "opening" && <OpeningStep {...props} />}
        {review.stage === "observation" && <ObservationStep {...props} />}
        {review.stage === "evaluation" && <EvaluationStep {...props} />}
        {review.stage === "writing" && <WritingStep {...props} />}
        {review.stage === "signing" && <SigningStep {...props} />}
        {(review.stage === "objection_window" || review.stage === "closed") && (
          <ClosingStep {...props} />
        )}
        {review.stage === "objection" && (
          <p>
            Oceniany wniósł sprzeciw. Rozpatruje go dyrektor generalny urzędu, a
            po jego decyzji ocena zostaje zamknięta albo wraca do sporządzenia.
          </p>
        )}
        {error && (
          <StatusAlert tone="danger">
            <span className="whitespace-pre-line">{error}</span>
          </StatusAlert>
        )}
      </Card>

      <Card>
        <h3 className="text-lg font-bold">Pomoc i wydruk</h3>
        <ul className="mt-2">
          <li>
            <RouteLink to={`/rozmowy?ocena=${id}`}>
              Przygotowanie do rozmów (asystent AI)
            </RouteLink>
          </li>
          <li>
            <RouteLink to={`/projekt?ocena=${id}`}>
              Projekt treści oceny (asystent AI)
            </RouteLink>
          </li>
          <li>
            <RouteLink to={`/druk?ocena=${id}`}>Wydruk arkusza oceny</RouteLink>
          </li>
          <li>
            <RouteLink to="/przepisy">Zapytaj o przepisy</RouteLink>
          </li>
        </ul>
      </Card>
    </div>
  );
}
