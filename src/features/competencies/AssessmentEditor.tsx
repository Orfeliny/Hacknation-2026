import { useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Select } from "../../components/ui/Select";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import { useActorMutation, useActorQuery } from "../../lib/backend/useLive";

type Level = { id: string; label: string };
type Competency = {
  id: string;
  name: string;
  indicators: {
    id: string;
    text: string;
    levels: Record<string, string>;
  }[];
};

const messageOf = (e: unknown) => {
  const data = (e as { data?: unknown }).data;
  if (typeof data === "string") return data;
  return e instanceof Error ? e.message : "Nie udało się zapisać.";
};

export function AssessmentEditor({
  employeeId,
  competency,
  levels,
}: {
  employeeId: Id<"employees">;
  competency: Competency;
  levels: Level[];
}) {
  const open = useActorMutation(api.competencies.mutations.open);
  const list = useActorQuery(api.competencies.queries.listForEmployee, {
    employeeId,
  });
  const [error, setError] = useState<string>();

  if (list.data === undefined) return <p>Ładowanie…</p>;
  const existing = list.data.assessments.find(
    (a) => a.competencyId === competency.id,
  );

  if (!existing) {
    return (
      <Card className="flex flex-col gap-3">
        <p>Ta kompetencja nie ma jeszcze oceny dla wybranej osoby.</p>
        {list.data.can.edit ? (
          <div>
            <Button
              onClick={() => {
                setError(undefined);
                open({ employeeId, competencyId: competency.id }).catch((e) =>
                  setError(messageOf(e)),
                );
              }}
            >
              Rozpocznij ocenę kompetencji
            </Button>
          </div>
        ) : (
          <StatusAlert tone="info" live={false}>
            Rozpocząć ocenę może tylko oceniający.
          </StatusAlert>
        )}
        {error ? <StatusAlert tone="danger">{error}</StatusAlert> : null}
      </Card>
    );
  }
  return (
    <Chosen
      key={existing._id}
      assessmentId={existing._id}
      competency={competency}
      levels={levels}
    />
  );
}

function Chosen({
  assessmentId,
  competency,
  levels,
}: {
  assessmentId: Id<"competencyAssessments">;
  competency: Competency;
  levels: Level[];
}) {
  const detail = useActorQuery(api.competencies.queries.get, { assessmentId });
  if (detail.data === undefined) return <p>Ładowanie…</p>;
  if (detail.data === null) {
    return <StatusAlert tone="danger">Nie znaleziono oceny.</StatusAlert>;
  }
  return (
    <ChosenForm
      assessmentId={assessmentId}
      competency={competency}
      levels={levels}
      detail={detail.data}
    />
  );
}

function ChosenForm({
  assessmentId,
  competency,
  levels,
  detail,
}: {
  assessmentId: Id<"competencyAssessments">;
  competency: Competency;
  levels: Level[];
  detail: NonNullable<FunctionReturnType<typeof api.competencies.queries.get>>;
}) {
  const save = useActorMutation(api.competencies.mutations.saveChoices);
  const setFinal = useActorMutation(api.competencies.mutations.setFinal);
  const [finalLevel, setFinalLevel] = useState(
    detail.assessment.finalLevel ?? "",
  );
  const [justification, setJustification] = useState(
    detail.assessment.deviationJustification ?? "",
  );
  const [outcome, setOutcome] = useState<{
    tone: "success" | "danger";
    text: string;
  }>();

  const { assessment, can } = detail;
  const chosen = new Map(
    assessment.indicatorChoices.map((c) => [c.indicatorId, c.levelId]),
  );
  const suggestion = assessment.suggestion;
  const label = (id: string | null | undefined) =>
    levels.find((l) => l.id === id)?.label ?? id ?? "brak";

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      setOutcome({ tone: "success", text: success });
    } catch (e) {
      setOutcome({ tone: "danger", text: messageOf(e) });
    }
  }

  function choose(indicatorId: string, levelId: string) {
    const next = competency.indicators.map((i) => ({
      indicatorId: i.id,
      levelId: i.id === indicatorId ? levelId || undefined : chosen.get(i.id),
    }));
    void run(
      () => save({ assessmentId, choices: next }),
      "Zapisano wybór wskaźnika.",
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {assessment.modelOutdated ? (
        <StatusAlert tone="warning" live={false}>
          Ta ocena powstała według starszej wersji modelu kompetencji.
        </StatusAlert>
      ) : null}
      <Card className="flex flex-col gap-4">
        <h2 className="text-ink text-lg font-bold">{competency.name}</h2>
        {competency.indicators.map((indicator) => {
          const current = chosen.get(indicator.id) ?? "";
          return (
            <Field key={indicator.id} label={indicator.text}>
              <Select
                value={current}
                disabled={!can.edit}
                onChange={(e) => choose(indicator.id, e.target.value)}
              >
                <option value="">Nie oceniono</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}: {indicator.levels[l.id]}
                  </option>
                ))}
              </Select>
            </Field>
          );
        })}
      </Card>

      <Card className="flex flex-col gap-2" aria-live="polite">
        <h2 className="text-ink text-lg font-bold">Proponowany poziom</h2>
        {suggestion ? (
          <>
            <p>
              {suggestion.levelId
                ? `Sugestia: ${label(suggestion.levelId)}.`
                : "Za mało ocenionych wskaźników, aby zaproponować poziom."}{" "}
              Ocenione wskaźniki: {suggestion.observed} z {suggestion.total}
              (wymagane {suggestion.required}).
            </p>
            <ol className="list-decimal pl-5">
              {suggestion.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            {suggestion.notes.map((n) => (
              <StatusAlert key={n} tone="warning" live={false}>
                {n}
              </StatusAlert>
            ))}
          </>
        ) : (
          <p className="text-muted">Wybierz poziomy wskaźników.</p>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-ink text-lg font-bold">Decyzja oceniającego</h2>
        {assessment.status === "final" ? (
          <p>Poziom końcowy: {label(assessment.finalLevel)}.</p>
        ) : (
          <p className="text-muted">
            Poziom końcowy nie został jeszcze wybrany.
          </p>
        )}
        {can.edit ? (
          <>
            <Field label="Poziom końcowy">
              <Select
                value={finalLevel}
                onChange={(e) => setFinalLevel(e.target.value)}
              >
                <option value="">Wybierz poziom</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Uzasadnienie odstępstwa od sugestii"
              hint="Wymagane, gdy poziom końcowy różni się od proponowanego."
            >
              <Textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
              />
            </Field>
            <div>
              <Button
                disabled={!finalLevel}
                onClick={() =>
                  void run(
                    () =>
                      setFinal({
                        assessmentId,
                        finalLevel,
                        deviationJustification:
                          justification.trim() || undefined,
                      }),
                    "Zapisano poziom końcowy.",
                  )
                }
              >
                Zapisz poziom końcowy
              </Button>
            </div>
          </>
        ) : null}
        {outcome ? (
          <StatusAlert tone={outcome.tone}>{outcome.text}</StatusAlert>
        ) : null}
      </Card>
    </div>
  );
}
