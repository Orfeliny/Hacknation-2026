import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Card } from "../../components/ui/Card";
import { DemoDataNote } from "../../components/ui/DemoDataNote";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { Field } from "../../components/ui/Field";
import { useActorQuery } from "../../lib/backend/useLive";
import { AssessmentEditor } from "./AssessmentEditor";

export function CompetenciesPage() {
  const model = useActorQuery(api.competencies.queries.model, {});
  const team = useActorQuery(api.employees.queries.team, {});
  const [employeeId, setEmployeeId] = useState("");
  const [competencyId, setCompetencyId] = useState("");

  if (model.data === undefined || team.data === undefined) {
    return <p>Ładowanie…</p>;
  }
  const competency = model.data.competencies.find((c) => c.id === competencyId);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Kompas kompetencji"
        description="Wskaż poziom kompetencji na podstawie wskaźników. System proponuje poziom i pokazuje, jak go wyliczył; decyzja należy do oceniającego."
      />
      {model.data.isDemo ? <DemoDataNote /> : null}
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Pracownik">
          <Select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">Wybierz pracownika</option>
            {team.data.map((e) => (
              <option key={e._id} value={e._id}>
                {e.firstName} {e.lastName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Kompetencja">
          <Select
            value={competencyId}
            onChange={(e) => setCompetencyId(e.target.value)}
          >
            <option value="">Wybierz kompetencję</option>
            {model.data.competencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </Card>
      {employeeId && competency ? (
        <AssessmentEditor
          key={`${employeeId}:${competency.id}`}
          employeeId={employeeId as Id<"employees">}
          competency={competency}
          levels={model.data.levels}
        />
      ) : (
        <p className="text-muted">
          Wybierz pracownika i kompetencję, aby zacząć.
        </p>
      )}
    </div>
  );
}
