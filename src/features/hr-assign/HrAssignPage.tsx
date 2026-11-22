import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import { Card } from "../../components/ui/Card";
import { ExternalLink } from "../../components/ui/ExternalLink";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageTitle } from "../../components/ui/PageTitle";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { AssignForm } from "./AssignForm";
import { useRouteRegistered } from "../../app/index";

const HR_OFFICE_PATH = "/kadry";

const LEGAL_BASIS =
  "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20082271505#art-81-ust-8-pkt-1";

function Workspace({ onSubtitle }: { onSubtitle: (text: string) => void }) {
  const role = useDemoRole();
  const actor = { role };
  const employees = useQuery(api.employees.queries.team, { actor });
  const board = useQuery(api.hrDashboard.queries.statusBoard, { actor });
  const dueDates = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of board ?? []) {
      if (row.stage !== "closed" && row.dueDate)
        map.set(row.employeeId, row.dueDate);
    }
    return map;
  }, [board]);
  if (employees === undefined) return <p>Ładowanie pracowników…</p>;
  return (
    <AssignForm
      employees={employees}
      role={role}
      dueDates={dueDates}
      onSubtitle={onSubtitle}
    />
  );
}

function Content({ onSubtitle }: { onSubtitle: (text: string) => void }) {
  const role = useDemoRole();
  if (role !== "hr" && role !== "admin") {
    return (
      <Card>
        Ten widok jest dla roli „Kadry”. Wybierz ją w nagłówku, żeby przypisać
        oceniającego.
      </Card>
    );
  }
  return <Workspace onSubtitle={onSubtitle} />;
}

export function HrAssignPage() {
  const hrOffice = useRouteRegistered(HR_OFFICE_PATH);
  const [subtitle, setSubtitle] = useState("");
  const online = getEnv().convexUrl !== undefined;
  return (
    <section>
      <PageTitle>Przypisz nowego oceniającego</PageTitle>
      {hrOffice ? (
        <nav aria-label="Ścieżka nawigacji" className="text-muted mb-4 text-sm">
          <Link to={HR_OFFICE_PATH}>Pulpit</Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">Przypisanie nowego oceniającego</span>
        </nav>
      ) : null}
      <PageHeader
        title="Przypisz nowego oceniającego"
        description={
          <>
            {subtitle ? (
              <>
                {subtitle}
                <br />
              </>
            ) : null}
            Podstawa:{" "}
            <ExternalLink href={LEGAL_BASIS}>
              art. 81 ust. 8 pkt 1 ustawy o służbie cywilnej
            </ExternalLink>
          </>
        }
      />
      {online ? (
        <Content onSubtitle={setSubtitle} />
      ) : (
        <Card>Widok wymaga połączenia z backendem (tryb offline).</Card>
      )}
    </section>
  );
}
