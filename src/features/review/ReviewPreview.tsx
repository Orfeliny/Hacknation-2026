import { useQuery } from "convex/react";
import { Link, useLocation, useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Card } from "../../components/ui/Card";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useRecordView } from "../audit/useAudit";
import { useDemoRole } from "../../lib/demoRole";
import { FormalCheck } from "./FormalCheck";
import { SheetHeader } from "./SheetHeader";
import { StageNav } from "./StageNav";
import { StageBody } from "./ReviewWizard";
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

export function ReviewPreview({ reviewId }: { reviewId: Id<"reviews"> }) {
  const role = useDemoRole();
  const view = useQuery(api.reviews.queries.get, {
    actor: { role },
    reviewId,
  });
  useRecordView(reviewId);

  if (view === undefined) return <p>Ładowanie oceny…</p>;
  if (view === null) {
    return (
      <StatusAlert tone="danger">
        Nie znaleziono oceny albo nie masz do niej dostępu w tej roli.
      </StatusAlert>
    );
  }
  const readOnly: ReviewView = { ...view, can: READ_ONLY_CAN };
  return (
    <div className="space-y-6">
      <StatusAlert tone="info" live={false}>
        Podgląd tylko do odczytu. Nie możesz tu niczego zmienić ani potwierdzić.
      </StatusAlert>
      <SheetHeader view={readOnly} />
      <StageNav stage={view.review.stage} />
      <FormalCheck gaps={view.gaps} />
      <Card className="space-y-4">
        <h3 className="text-xl font-bold">{view.stageLabel}</h3>
        <StageBody
          view={readOnly}
          actions={NO_ACTIONS}
          run={() => Promise.resolve()}
          pending={false}
        />
      </Card>
    </div>
  );
}
