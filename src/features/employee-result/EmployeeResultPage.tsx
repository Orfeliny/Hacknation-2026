import { useQuery } from "convex/react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { ResultView } from "./ResultView";

const actor = { role: "employee" as const };

const RESULT_STAGES = new Set([
  "signing",
  "objection_window",
  "objection",
  "closed",
]);

function BackLink() {
  return (
    <Link className="inline-flex min-h-11 items-center" to="/moja-ocena">
      Wróć do mojej oceny
    </Link>
  );
}

function Resolved() {
  const [params] = useSearchParams();
  const requested = params.get("ocena");
  const list = useQuery(api.me.queries.list, requested ? "skip" : { actor });
  if (!requested && list === undefined) return <p>Ładowanie oceny…</p>;
  const reviewId =
    requested ?? list?.find((r) => RESULT_STAGES.has(r.stage))?._id;
  if (!reviewId) {
    return (
      <Card className="space-y-2">
        <p>Nie masz jeszcze oceny do zapoznania się.</p>
        <BackLink />
      </Card>
    );
  }
  return (
    <>
      <ResultView reviewId={reviewId as Id<"reviews">} />
      <BackLink />
    </>
  );
}

export function EmployeeResultPage() {
  const role = useDemoRole();
  const online = getEnv().convexUrl !== undefined;
  return (
    <section className="space-y-6">
      <title>Zapoznanie z oceną i sprzeciw</title>
      <PageHeader
        title="Zapoznanie z oceną i sprzeciw"
        description="Potwierdź zapoznanie z oceną i, jeśli się nie zgadzasz, złóż sprzeciw."
      />
      {!online ? (
        <StatusAlert tone="info">
          Tryb offline: ten widok wymaga połączenia z backendem.
        </StatusAlert>
      ) : role !== "employee" ? (
        <Card>
          Ten widok jest dla roli „Pracownik”. Wybierz ją w nagłówku, żeby
          zobaczyć swoją ocenę.
        </Card>
      ) : (
        <Resolved />
      )}
    </section>
  );
}
