import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import { RouteLink } from "../../app/index";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { DateField } from "../../components/ui/DateField";
import { PageTitle } from "../../components/ui/PageTitle";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { formatDate } from "../../lib/format";
import { plural } from "../../lib/plural";
import { Coverage } from "./Coverage";
import { ObservationForm } from "./ObservationForm";
import { Timeline, type Entry } from "./Timeline";
import { CRITERIA, emptyDraft, type Draft } from "./labels";

const TITLE = "Dziennik obserwacji";

const entryNoun = (n: number) =>
  plural(n, { one: "wpis", few: "wpisy", many: "wpisów" });

function Workspace({ role }: { role: "supervisor" | "hr" }) {
  const actor = { role };
  const canEdit = role === "supervisor";
  const team = useQuery(api.employees.queries.team, { actor });
  const [params, setParams] = useSearchParams();
  const chosen = params.get("pracownik");
  const counts = useQuery(api.observations.queries.entryCounts, { actor });
  const withEntries = new Set(counts?.map((c) => c.employeeId));
  const employee =
    team?.find((e) => e._id === chosen) ??
    team?.find((e) => withEntries.has(e._id)) ??
    team?.[0];
  const employeeId = employee?._id;
  const entries = useQuery(
    api.observations.queries.timeline,
    employeeId ? { actor, employeeId } : "skip",
  );
  const coverage = useQuery(
    api.observations.queries.coverage,
    employeeId ? { actor, employeeId } : "skip",
  );
  const add = useMutation(api.observations.mutations.add);
  const update = useMutation(api.observations.mutations.update);
  const remove = useMutation(api.observations.mutations.remove);
  const [editing, setEditing] = useState<Entry>();
  const [criterion, setCriterion] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  if (team === undefined || counts === undefined)
    return <p>Ładowanie zespołu…</p>;
  if (!employee || !employeeId) {
    return (
      <>
        <PageHeader title={TITLE} />
        <p>Nie ma pracowników, o których można prowadzić dziennik.</p>
      </>
    );
  }

  const name = `${employee.firstName} ${employee.lastName}`;
  const shown = (entries ?? []).filter(
    (e) =>
      (!criterion || e.criterionId === criterion) &&
      (!from || e.date >= from) &&
      (!to || e.date <= to),
  );
  const period =
    coverage?.since && coverage.until
      ? ` · okres oceny ${formatDate(coverage.since)}–${formatDate(coverage.until)}`
      : "";
  const count = entries?.length ?? 0;

  async function submit(draft: Draft) {
    const criterionId = draft.criterionId
      ? { criterionId: draft.criterionId }
      : {};
    if (editing) {
      await update({
        actor,
        observationId: editing._id,
        date: draft.date,
        text: draft.text,
        sentiment: draft.sentiment,
        ...criterionId,
      });
      setEditing(undefined);
    } else {
      await add({
        actor,
        employeeId: employeeId!,
        date: draft.date,
        text: draft.text,
        sentiment: draft.sentiment,
        ...criterionId,
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={TITLE}
        description={`${name}${period} · ${count} ${entryNoun(count)}`}
        actions={
          <Field label="Pracownik">
            <Select
              value={employeeId}
              onChange={(e) => {
                setEditing(undefined);
                setParams({ pracownik: e.target.value });
              }}
            >
              {team.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </Select>
          </Field>
        }
      />
      <div
        role="note"
        className="bg-ink flex flex-col gap-1 rounded-lg p-4 text-white"
      >
        <p>
          <strong>
            {canEdit
              ? `Wpisy widzisz Ty i kadry. ${name} nigdy ich nie zobaczy.`
              : `Wpisy widzą ich autorzy i kadry. ${name} nigdy ich nie zobaczy.`}
          </strong>{" "}
          {canEdit ? (
            <>
              Następca zobaczy je tylko za Twoją zgodą,{" "}
              <RouteLink
                to="/zmiana-oceniajacego"
                className="font-semibold text-white underline"
              >
                przy zmianie oceniającego
              </RouteLink>
              .
            </>
          ) : (
            "Kadry czytają dziennik, ale nie dodają do niego wpisów."
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-8">
        <div className="flex min-w-0 flex-[999_1_38rem] flex-col gap-6">
          {canEdit ? (
            <ObservationForm
              key={editing?._id ?? "new"}
              initial={
                editing
                  ? {
                      date: editing.date,
                      text: editing.text,
                      sentiment: editing.sentiment,
                      criterionId: editing.criterionId,
                    }
                  : emptyDraft()
              }
              editing={editing !== undefined}
              onSubmit={submit}
              onCancel={() => setEditing(undefined)}
            />
          ) : null}
          <section
            aria-labelledby="obs-list-title"
            className="border-border flex flex-col gap-2 rounded-xl border bg-white p-6"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2
                id="obs-list-title"
                className="text-ink text-[22px] font-bold"
              >
                Wpisy
              </h2>
              <div className="flex flex-wrap items-end gap-4">
                <Field label="Kryterium (filtr)">
                  <Select
                    value={criterion}
                    onChange={(e) => setCriterion(e.target.value)}
                  >
                    <option value="">Wszystkie</option>
                    {CRITERIA.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <DateField label="Od" value={from} onChange={setFrom} />
                <DateField label="Do" value={to} onChange={setTo} />
              </div>
            </div>
            {entries === undefined ? (
              <p>Ładowanie wpisów…</p>
            ) : (
              <Timeline
                entries={shown}
                total={entries.length}
                canEdit={canEdit}
                viewer={role}
                onEdit={setEditing}
                onRemove={async (entry) => {
                  await remove({ actor, observationId: entry._id });
                  if (editing?._id === entry._id) setEditing(undefined);
                }}
              />
            )}
          </section>
        </div>
        <aside
          aria-label="Pokrycie kryteriów"
          className="flex min-w-0 flex-[1_1_18rem] flex-col gap-4"
        >
          {coverage === undefined ? (
            <p>Ładowanie pokrycia…</p>
          ) : (
            <Coverage coverage={coverage} viewer={role} />
          )}
        </aside>
      </div>
    </div>
  );
}

function OnlineObservations() {
  const role = useDemoRole();
  if (role !== "supervisor" && role !== "hr") {
    return (
      <>
        <PageHeader title={TITLE} />
        <Card>
          Dziennik obserwacji prowadzi przełożony, a czytają go kadry. Wybierz
          jedną z tych ról w nagłówku.
        </Card>
      </>
    );
  }
  return <Workspace role={role} />;
}

export function ObservationsPage() {
  const online = getEnv().convexUrl !== undefined;
  return (
    <>
      <PageTitle>{TITLE}</PageTitle>
      {online ? (
        <OnlineObservations />
      ) : (
        <>
          <PageHeader title={TITLE} />
          <StatusAlert tone="info">
            Ten widok wymaga połączenia z backendem (tryb offline).
          </StatusAlert>
        </>
      )}
    </>
  );
}
