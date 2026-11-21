import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { getEnv } from "../../lib/env";
import { useDemoRole } from "../../lib/demoRole";
import { ReviewWizard } from "./ReviewWizard";
import { errorMessage, type WizardActions } from "./types";

function OpenReview({ reviewId }: { reviewId: Id<"reviews"> }) {
  const role = useDemoRole();
  const actor = { role };
  const view = useQuery(api.reviews.queries.get, { actor, reviewId });
  const save = useMutation(api.reviews.mutations.save);
  const advance = useMutation(api.reviews.mutations.advance);
  const sign = useMutation(api.reviews.mutations.sign);
  const close = useMutation(api.reviews.mutations.close);
  const actions: WizardActions = {
    save: (patch) => save({ actor, reviewId, patch }),
    advance: () => advance({ actor, reviewId }),
    sign: (scope, place) => sign({ actor, reviewId, scope, place }),
    close: () => close({ actor, reviewId }),
  };
  if (view === undefined) return <p>Ładowanie oceny…</p>;
  if (view === null) {
    return (
      <p role="alert">
        Nie znaleziono oceny albo nie masz do niej dostępu w tej roli.
      </p>
    );
  }
  return <ReviewWizard view={view} actions={actions} />;
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
    <div className="space-y-4">
      {candidates && candidates.length > 0 && (
        <Card className="space-y-2">
          <label htmlFor="start-employee" className="block text-sm font-medium">
            Rozpocznij ocenę dla pracownika
          </label>
          <div className="flex gap-2">
            <select
              id="start-employee"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">wybierz…</option>
              {candidates.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}, {c.position} (arkusz {c.sheet})
                </option>
              ))}
            </select>
            <Button disabled={!employeeId} onClick={() => void begin()}>
              Rozpocznij
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
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
              <Card>
                <Link
                  className="font-medium text-indigo-700 underline"
                  to={`/oceny?ocena=${r._id}`}
                >
                  {r.employeeName}
                </Link>
                <span className="ml-2 text-sm text-slate-600">
                  {r.stageLabel}
                  {r.sheet ? `, arkusz ${r.sheet}` : ""}
                  {r.dueDate ? `, termin ${r.dueDate}` : ""}
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
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Oceny okresowe</h1>
        {reviewId && (
          <Link className="text-sm text-indigo-700 underline" to="/oceny">
            Wszystkie oceny
          </Link>
        )}
      </div>
      {!online ? (
        <p className="text-sm text-slate-600">
          Tryb offline: kreator oceny wymaga połączenia z backendem.
        </p>
      ) : reviewId ? (
        <OpenReview reviewId={reviewId as Id<"reviews">} />
      ) : (
        <ReviewList />
      )}
    </section>
  );
}
