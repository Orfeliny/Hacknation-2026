import { useQuery } from "convex/react";
import { useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageTitle } from "../../components/ui/PageTitle";
import { Select } from "../../components/ui/Select";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import {
  KIND_LABELS,
  KIND_SHORT_HINTS,
  KINDS,
  KIND_QUERY_NAMES,
  KIND_QUERY_VALUES,
  type ConversationKind,
} from "./kinds";
import { Workspace } from "./Workspace";

function OnlineConversations() {
  const actor = { role: useDemoRole() };
  const [params, setParams] = useSearchParams();
  const team = useQuery(api.employees.queries.team, { actor });
  const employeeId = params.get("pracownik") ?? "";
  const kind: ConversationKind =
    KIND_QUERY_VALUES[params.get("rodzaj") ?? ""] ?? "evaluation";
  const employee = team?.find((e) => e._id === employeeId);

  function update(key: "pracownik" | "rodzaj", value: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }

  if (team === undefined) return <p>Ładowanie zespołu…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div className="w-full max-w-sm">
          <Field label="Pracownik">
            <Select
              value={employee?._id ?? ""}
              onChange={(event) => update("pracownik", event.target.value)}
            >
              <option value="">Wybierz pracownika</option>
              {team.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.firstName} {member.lastName}, {member.position}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <legend className="text-ink mb-2 font-bold">Rodzaj rozmowy</legend>
          <div className="bg-surface-muted flex flex-wrap gap-0.5 rounded-[10px] p-[3px]">
            {KINDS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={option === kind}
                onClick={() => update("rodzaj", KIND_QUERY_NAMES[option])}
                className={`text-ink min-h-11 rounded-lg px-[18px] ${
                  option === kind
                    ? "bg-white font-bold shadow-sm"
                    : "bg-transparent"
                }`}
              >
                {KIND_LABELS[option]}
              </button>
            ))}
          </div>
          <span className="text-muted text-[15px]">
            {KIND_SHORT_HINTS[kind]}
          </span>
        </fieldset>
      </div>
      {team.length === 0 ? (
        <p>Nie masz przypisanych pracowników.</p>
      ) : employee ? (
        <Workspace
          key={`${employee._id}:${kind}`}
          employee={employee}
          kind={kind}
          actor={actor}
        />
      ) : (
        <p className="text-muted">
          Wybierz pracownika, aby przygotować rozmowę.
        </p>
      )}
    </div>
  );
}

export function ConversationPage() {
  const online = getEnv().convexUrl !== undefined;
  const role = useDemoRole();
  return (
    <section>
      <PageTitle>Rozmowy</PageTitle>
      <PageHeader
        title="Rozmowy z pracownikiem"
        description="Przygotuj rozmowę rozpoczynającą, oceniającą albo bieżącą, wyślij zaproszenie i zapisz ustalenia."
      />
      {role !== "supervisor" ? (
        <Card>
          Rozmowy przygotowuje przełożony. Wybierz rolę „Przełożony” w nagłówku.
        </Card>
      ) : online ? (
        <OnlineConversations />
      ) : (
        <StatusAlert tone="warning">
          Tryb offline: przygotowanie rozmów wymaga połączenia z backendem
          Convex.
        </StatusAlert>
      )}
    </section>
  );
}
