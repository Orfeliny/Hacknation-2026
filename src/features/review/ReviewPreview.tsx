import { Link, useLocation, useNavigate } from "react-router";
import type { Id } from "../../../convex/_generated/dataModel";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageTitle } from "../../components/ui/PageTitle";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useRecordView } from "../audit/useAudit";
import { useDemoRole } from "../../lib/demoRole";
import { Breadcrumb } from "./SheetHeader";
import { SheetFrame, StageBody } from "./ReviewWizard";
import { useReviewView } from "./useReviewView";
import type { ReviewView, WizardActions } from "./types";

const READ_ONLY_CAN: ReviewView["can"] = {
  edit: false,
  advance: false,
  signPartOne: false,
  signAssessment: false,
  close: false,
  asEmployee: false,
};

const refuse = () =>
  Promise.reject(new Error("Podgląd jest tylko do odczytu."));
const NO_ACTIONS: WizardActions = {
  save: refuse,
  advance: refuse,
  sign: refuse,
  close: refuse,
};

export function BackLink({ fallback }: { fallback: string }) {
  const navigate = useNavigate();
  const { key } = useLocation();
  return (
    <Link
      className="text-primary inline-flex min-h-11 items-center font-semibold"
      to={fallback}
      onClick={(event) => {
        if (key === "default") return;
        event.preventDefault();
        void navigate(-1);
      }}
    >
      Wróć do poprzedniej strony
    </Link>
  );
}

export function ReviewPreview({ reviewId }: { reviewId: string }) {
  const role = useDemoRole();
  const view = useReviewView(reviewId);
  useRecordView(view ? (reviewId as Id<"reviews">) : undefined);

  if (view === undefined) return <p>Ładowanie oceny…</p>;
  if (view === null) {
    return (
      <>
        <PageTitle>Ocena okresowa</PageTitle>
        <PageHeader title="Ocena okresowa" />
        <StatusAlert tone="danger">
          Nie znaleziono oceny albo nie masz do niej dostępu w tej roli.
        </StatusAlert>
      </>
    );
  }
  const readOnly: ReviewView = { ...view, can: READ_ONLY_CAN };
  return (
    <SheetFrame
      view={readOnly}
      top={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Breadcrumb view={view} />
          <BackLink fallback={role === "hr" ? "/kadry" : "/pulpit"} />
        </div>
      }
    >
      <StatusAlert tone="info" live={false}>
        Podgląd tylko do odczytu. Nie możesz tu niczego zmienić ani potwierdzić.
      </StatusAlert>
      <Card className="space-y-4">
        <h2 className="text-xl font-bold">{view.stageLabel}</h2>
        <StageBody
          view={readOnly}
          actions={NO_ACTIONS}
          run={() => Promise.resolve()}
          pending={false}
        />
      </Card>
    </SheetFrame>
  );
}
