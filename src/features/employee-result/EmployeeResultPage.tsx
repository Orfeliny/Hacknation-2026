import { useQuery } from "convex/react";
import { useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageTitle } from "../../components/ui/PageTitle";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { Crumbs } from "./Crumbs";
import { ResultView } from "./ResultView";

const actor = { role: "employee" as const };

const RESULT_STAGES = new Set([
  "signing",
  "objection_window",
  "objection",
  "closed",
]);

function Empty({ children }: { children: string }) {
  return (
    <div>
      <Crumbs label="Wynik oceny" />
      <PageHeader title="Wynik oceny" />
      <Card>{children}</Card>
    </div>
  );
}

function Resolved() {
  const [params] = useSearchParams();
  const requested = params.get("ocena");
  const list = useQuery(api.me.queries.list, { actor });
  if (list === undefined) return <p>Ładowanie oceny…</p>;
  const review = requested
    ? list.find((r) => r._id === requested)
    : list.find((r) => RESULT_STAGES.has(r.stage));
  if (!review) {
    return (
      <Empty>
        {requested
          ? "Nie znaleziono oceny albo nie masz do niej dostępu."
          : "Nie masz jeszcze oceny do zapoznania się."}
      </Empty>
    );
  }
  return <ResultView reviewId={review._id} />;
}

export function EmployeeResultPage() {
  const role = useDemoRole();
  const online = getEnv().convexUrl !== undefined;
  return (
    <section>
      <PageTitle>Wynik oceny</PageTitle>
      {!online ? (
        <Empty>Tryb offline: ten widok wymaga połączenia z backendem.</Empty>
      ) : role !== "employee" ? (
        <Empty>
          Ten widok jest dla roli „Pracownik”. Wybierz ją w nagłówku, żeby
          zobaczyć swoją ocenę.
        </Empty>
      ) : (
        <Resolved />
      )}
    </section>
  );
}
