import { useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import { Card } from "../../components/ui/Card";
import { ExternalLink } from "../../components/ui/ExternalLink";
import { PageHeader } from "../../components/ui/PageHeader";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { AssignForm } from "./AssignForm";
import { useRouteRegistered } from "../../app/index";

const HR_OFFICE_PATH = "/kadry";

const LEGAL_BASIS =
  "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20082271505#art-81-ust-8-pkt-1";

function Workspace() {
  const role = useDemoRole();
  const employees = useQuery(api.employees.queries.team, { actor: { role } });
  if (employees === undefined) return <p>Ładowanie pracowników…</p>;
  return <AssignForm employees={employees} role={role} />;
}

function Content() {
  const role = useDemoRole();
  if (role !== "hr" && role !== "admin") {
    return (
      <Card>
        Ten widok jest dla roli „Kadry”. Wybierz ją w nagłówku, żeby przypisać
        oceniającego.
      </Card>
    );
  }
  return <Workspace />;
}

export function HrAssignPage() {
  const hrOffice = useRouteRegistered(HR_OFFICE_PATH);
  const online = getEnv().convexUrl !== undefined;
  return (
    <section>
      <title>Przypisz nowego oceniającego</title>
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
            Podstawa:{" "}
            <ExternalLink href={LEGAL_BASIS}>
              art. 81 ust. 8 pkt 1 ustawy o służbie cywilnej
            </ExternalLink>
          </>
        }
      />
      {online ? (
        <Content />
      ) : (
        <Card>Widok wymaga połączenia z backendem (tryb offline).</Card>
      )}
    </section>
  );
}
