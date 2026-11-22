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
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { formatDate } from "../../lib/format";
import { FirstReviewWizard } from "./FirstReviewWizard";
import { errorMessage, type FirstReviewActions } from "./types";

function NotFound() {
  return (
    <StatusAlert tone="warning">
      Nie znaleziono pierwszej oceny albo nie masz do niej dostępu w tej roli.
    </StatusAlert>
  );
}

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
  if (view === null) return <NotFound />;
  return <FirstReviewWizard view={view} actions={actions} />;
}

function KnownFirstReview({ id }: { id: string }) {
  const actor = { role: useDemoRole() };
  const rows = useQuery(api.firstReview.queries.list, { actor });
  if (rows === undefined) return <p>Ładowanie pierwszej oceny…</p>;
  if (!rows.some((r) => r._id === id)) return <NotFound />;
  return <OpenFirstReview id={id as Id<"firstReviews">} />;
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
        <Card className="space-y-3">
          <Field label="Rozpocznij pierwszą ocenę dla nowego pracownika">
            <Select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">wybierz…</option>
              {candidates.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}, {c.position}
                </option>
              ))}
            </Select>
          </Field>
          <Button disabled={!employeeId} onClick={() => void begin()}>
            Rozpocznij
          </Button>
          {error && <StatusAlert tone="danger">{error}</StatusAlert>}
        </Card>
      )}
      {rows === undefined ? (
        <p>Ładowanie…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted">
          Brak pierwszych ocen widocznych dla tej roli.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r._id}>
              <Card>
                <Link
                  className="text-primary inline-flex min-h-11 items-center font-semibold"
                  to={`/pierwsza-ocena?ocena=${r._id}`}
                >
                  {r.employeeName}
                </Link>
                <span className="text-muted">
                  {" · "}
                  {r.stageLabel}
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

export function FirstReviewPage() {
  const online = getEnv().convexUrl !== undefined;
  const [params] = useSearchParams();
  const id = params.get("ocena");
  return (
    <section>
      <PageTitle>Pierwsza ocena w służbie cywilnej</PageTitle>
      <PageHeader
        title="Pierwsza ocena w służbie cywilnej"
        actions={
          id ? (
            <Link
              className="text-primary inline-flex min-h-11 items-center font-semibold"
              to="/pierwsza-ocena"
            >
              Wszystkie pierwsze oceny
            </Link>
          ) : undefined
        }
      />
      {!online ? (
        <p className="text-muted">
          Tryb offline: pierwsza ocena wymaga połączenia z backendem.
        </p>
      ) : id ? (
        <KnownFirstReview id={id} />
      ) : (
        <FirstReviewList />
      )}
    </section>
  );
}
