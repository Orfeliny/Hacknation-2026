import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { FirstReviewWizard } from "./FirstReviewWizard";
import { errorMessage, type FirstReviewActions } from "./types";

function OpenFirstReview({ id }: { id: Id<"firstReviews"> }) {
  const actor = { role: useDemoRole() };
  const view = useQuery(api.firstReview.queries.get, {
    actor,
    firstReviewId: id,
  });
  const confirmReport = useMutation(api.firstReview.mutations.confirmReport);
  const conclude = useMutation(api.firstReview.mutations.conclude);
  const sign = useMutation(api.firstReview.mutations.sign);
  const actions: FirstReviewActions = {
    confirmReport: () =>
      confirmReport({ actor, firstReviewId: id, reportReceived: true }),
    conclude: (result, unitHeadAgreed) =>
      conclude({ actor, firstReviewId: id, result, unitHeadAgreed }),
    sign: (role, place) => sign({ actor, firstReviewId: id, role, place }),
  };
  if (view === undefined) return <p>Ładowanie pierwszej oceny…</p>;
  if (view === null) {
    return (
      <p role="alert">
        Nie znaleziono pierwszej oceny albo nie masz do niej dostępu w tej roli.
      </p>
    );
  }
  return <FirstReviewWizard view={view} actions={actions} />;
}

function FirstReviewList() {
  const actor = { role: useDemoRole() };
  const rows = useQuery(api.firstReview.queries.list, { actor });
  const candidates = useQuery(api.firstReview.queries.candidates, { actor });
  const start = useMutation(api.firstReview.mutations.start);
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
          <label htmlFor="first-start" className="block text-sm font-medium">
            Rozpocznij pierwszą ocenę dla nowego pracownika
          </label>
          <div className="flex gap-2">
            <select
              id="first-start"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">wybierz…</option>
              {candidates.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}, {c.position}
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
      {rows === undefined ? (
        <p>Ładowanie…</p>
      ) : rows.length === 0 ? (
        <p>Brak pierwszych ocen widocznych dla tej roli.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r._id}>
              <Card>
                <Link
                  className="font-medium text-indigo-700 underline"
                  to={`/pierwsza-ocena?ocena=${r._id}`}
                >
                  {r.employeeName}
                </Link>
                <span className="ml-2 text-sm text-slate-600">
                  {r.stageLabel}
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

export function FirstReviewPage() {
  const online = getEnv().convexUrl !== undefined;
  const [params] = useSearchParams();
  const id = params.get("ocena");
  return (
    <section className="space-y-4">
      <title>Pierwsza ocena w służbie cywilnej</title>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Pierwsza ocena w służbie cywilnej
        </h1>
        {id && (
          <Link
            className="text-sm text-indigo-700 underline"
            to="/pierwsza-ocena"
          >
            Wszystkie pierwsze oceny
          </Link>
        )}
      </div>
      {!online ? (
        <p className="text-sm text-slate-600">
          Tryb offline: pierwsza ocena wymaga połączenia z backendem.
        </p>
      ) : id ? (
        <OpenFirstReview id={id as Id<"firstReviews">} />
      ) : (
        <FirstReviewList />
      )}
    </section>
  );
}
