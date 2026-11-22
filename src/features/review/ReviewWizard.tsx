import { useState, type ReactNode } from "react";
import { RouteLink } from "../../app/index";
import { Card } from "../../components/ui/Card";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { FormalCheck } from "./FormalCheck";
import { AverageSummary } from "./AverageSummary";
import { Breadcrumb, SheetHeader } from "./SheetHeader";
import { StageNav } from "./StageNav";
import {
  ClosingStep,
  EvaluationStep,
  ObservationStep,
  OpeningStep,
  SigningStep,
  type StepProps,
} from "./steps";
import { errorMessage, type ReviewView, type WizardActions } from "./types";
import { WritingStep } from "./writing";

export function StageBody(props: StepProps) {
  const { stage } = props.view.review;
  return (
    <>
      {stage === "opening" && <OpeningStep {...props} />}
      {stage === "observation" && <ObservationStep {...props} />}
      {stage === "evaluation" && <EvaluationStep {...props} />}
      {stage === "writing" && <WritingStep {...props} />}
      {stage === "signing" && <SigningStep {...props} />}
      {(stage === "objection_window" || stage === "closed") && (
        <ClosingStep {...props} />
      )}
      {stage === "objection" && (
        <p>
          Oceniany wniósł sprzeciw. Rozpatruje go dyrektor generalny urzędu, a
          po jego decyzji ocena zostaje zamknięta albo wraca do sporządzenia.
        </p>
      )}
    </>
  );
}

export function ReviewAside({ view }: { view: ReviewView }) {
  const id = encodeURIComponent(view.review._id);
  return (
    <aside className="space-y-4">
      <FormalCheck gaps={view.gaps} />
      {view.preview && (
        <AverageSummary
          preview={view.preview}
          ratedCount={view.criteria.filter((c) => c.expected).length}
        />
      )}
      <Card>
        <h2 className="text-lg font-bold">Pomoc i wydruk</h2>
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
    </aside>
  );
}

export function SheetFrame({
  view,
  top,
  children,
}: {
  view: ReviewView;
  top?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      {top ?? <Breadcrumb view={view} />}
      <SheetHeader view={view} />
      <StageNav view={view} />
      <div className="flex flex-wrap items-start gap-6">
        <div className="min-w-0 flex-[999_1_620px] space-y-6">{children}</div>
        <div className="min-w-0 flex-[1_1_300px]">
          <ReviewAside view={view} />
        </div>
      </div>
    </div>
  );
}

export function ReviewWizard({
  view,
  actions,
}: {
  view: ReviewView;
  actions: WizardActions;
}) {
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

  return (
    <SheetFrame view={view}>
      {view.warnings.length > 0 && (
        <StatusAlert tone="warning">
          {view.warnings.map((w) => w.message).join(" ")}
        </StatusAlert>
      )}
      <Card className="space-y-4">
        <h2 className="text-xl font-bold">{view.stageLabel}</h2>
        <StageBody {...props} />
        {error && (
          <StatusAlert tone="danger">
            <span className="whitespace-pre-line">{error}</span>
          </StatusAlert>
        )}
      </Card>
    </SheetFrame>
  );
}
