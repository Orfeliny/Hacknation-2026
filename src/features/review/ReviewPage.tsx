import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageTitle } from "../../components/ui/PageTitle";
import { Select } from "../../components/ui/Select";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { AccessHistory } from "../audit/AccessHistory";
import { useRecordView } from "../audit/useAudit";
import { getEnv } from "../../lib/env";
import { useDemoRole } from "../../lib/demoRole";
import { formatDate } from "../../lib/format";
import { ObjectionPanel } from "../objections/ObjectionPanel";
import { ReviewPreview } from "./ReviewPreview";
import { ReviewWizard } from "./ReviewWizard";
import { useReviewView } from "./useReviewView";
import { errorMessage, type WizardActions } from "./types";

function OpenReview({ reviewId }: { reviewId: string }) {
  const role = useDemoRole();
  const actor = { role };
  const view = useReviewView(reviewId);
  useRecordView(view ? (reviewId as Id<"reviews">) : undefined);
  const save = useMutation(api.reviews.mutations.save);
  const advance = useMutation(api.reviews.mutations.advance);
  const sign = useMutation(api.reviews.mutations.sign);
  const close = useMutation(api.reviews.mutations.close);
  const id = reviewId as Id<"reviews">;
  const actions: WizardActions = {
    save: (patch) => save({ actor, reviewId: id, patch }),
    advance: () => advance({ actor, reviewId: id }),
    sign: (scope, place) => sign({ actor, reviewId: id, scope, place }),
    close: () => close({ actor, reviewId: id }),
  };
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
  return (
    <div className="space-y-6">
      <ReviewWizard view={view} actions={actions} />
      <ObjectionPanel reviewId={id} />
      <AccessHistory reviewId={id} />
    </div>
  );
}

function ReviewList() {
  const role = useDemoRole();
  const actor = { role };
  const reviews = useQuery(api.reviews.queries.list, { actor });
  const candidates = useQuery(api.reviews.queries.candidates, { actor });
  const start = useMutation(api.reviews.mutations.start);
  const [, setParams] = useSearchParams();
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState<string | undefined>();

  async function begin() {
    setError(undefined);
    try {
      const id = await start({
        actor,
        employeeId: employeeId as Id<"employees">,
      });
      setParams({ ocena: id });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      {candidates && candidates.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Field label="Rozpocznij ocenę dla pracownika" error={error}>
                <Select
                  id="start-employee"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                >
                  <option value="">wybierz…</option>
                  {candidates.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}, {c.position} (arkusz {c.sheet})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button disabled={!employeeId} onClick={() => void begin()}>
              Rozpocznij
            </Button>
          </div>
        </Card>
      )}
      {reviews === undefined ? (
        <p>Ładowanie ocen…</p>
      ) : reviews.length === 0 ? (
        <p>Brak ocen widocznych dla tej roli.</p>
      ) : (
        <ul className="space-y-2">
          {reviews.map((r) => (
            <li key={r._id}>
              <Card className="flex flex-wrap items-center gap-x-3">
                <Link
                  className="text-primary inline-flex min-h-11 items-center font-semibold"
                  to={`/oceny?ocena=${r._id}`}
                >
                  {r.employeeName}
                </Link>
                <span className="text-muted">
                  {r.stageLabel}
                  {r.sheet ? `, arkusz ${r.sheet}` : ""}
                  {r.dueDate ? `, termin ${formatDate(r.dueDate)}` : ""}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ReviewPage() {
  const online = getEnv().convexUrl !== undefined;
  const [params] = useSearchParams();
  const reviewId = params.get("ocena");
  const preview = reviewId !== null && params.get("tryb") === "podglad";
  return (
    <section>
      {reviewId === null || !online ? (
        <>
          <PageTitle>Oceny okresowe</PageTitle>
          <PageHeader title="Oceny okresowe" />
        </>
      ) : null}
      {!online ? (
        <StatusAlert tone="info">
          Tryb offline: kreator oceny wymaga połączenia z backendem.
        </StatusAlert>
      ) : preview ? (
        <ReviewPreview reviewId={reviewId} />
      ) : reviewId ? (
        <OpenReview reviewId={reviewId} />
      ) : (
        <ReviewList />
      )}
    </section>
  );
}
