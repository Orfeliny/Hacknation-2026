import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatusAlert } from "../../components/ui/StatusAlert";
import {
  formatDate,
  formatDateTime,
  formatShortWithWeekday,
  today,
} from "../../lib/format";
import { plural } from "../../lib/plural";
import { Checklist } from "./Checklist";
import { InvitationSection } from "./InvitationSection";
import { KIND_HINTS, KIND_LABELS, KINDS, type ConversationKind } from "./kinds";
import { OutcomesSection } from "./OutcomesSection";
import { PlanSection } from "./PlanSection";
import { StageStrip } from "./StageStrip";
import { fullName, type Actor, type Employee } from "./types";

export function Workspace({
  employee,
  kind,
  actor,
}: {
  employee: Employee;
  kind: ConversationKind;
  actor: Actor;
}) {
  const conversations = useQuery(api.conversations.queries.listForEmployee, {
    actor,
    employeeId: employee._id,
  });
  const review = useQuery(api.conversations.queries.openReview, {
    actor,
    employeeId: employee._id,
  });
  const timeline = useQuery(api.observations.queries.timeline, {
    actor,
    employeeId: employee._id,
  });
  const coverage = useQuery(api.observations.queries.coverage, {
    actor,
    employeeId: employee._id,
  });
  const handover = useQuery(api.observations.queries.handoverPlan, { actor });
  const create = useMutation(api.conversations.mutations.create);
  const [error, setError] = useState<string | undefined>();

  if (conversations === undefined || review === undefined) {
    return <p>Ładowanie rozmowy…</p>;
  }
  const conversation = conversations.find((c) => c.kind === kind);
  const openReview = review?.review ?? null;

  if (!conversation) {
    async function begin() {
      setError(undefined);
      try {
        await create({
          actor,
          employeeId: employee._id,
          kind,
          ...(openReview ? { reviewId: openReview.reviewId } : {}),
        });
      } catch {
        setError("Nie udało się rozpocząć przygotowania. Spróbuj ponownie.");
      }
    }
    return (
      <Card className="space-y-3">
        <h2 className="text-section font-bold">
          Rozmowa: {fullName(employee)}, {KIND_LABELS[kind].toLowerCase()}
        </h2>
        <p className="text-muted">
          Nie ma jeszcze przygotowania tej rozmowy. Plan, zaproszenie i
          ustalenia zapiszemy razem w jednym miejscu.
        </p>
        {error ? <StatusAlert tone="danger">{error}</StatusAlert> : null}
        <div>
          <Button onClick={() => void begin()}>Rozpocznij przygotowanie</Button>
        </div>
      </Card>
    );
  }

  const observationCount = timeline?.length;
  const handoverCount = handover?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="space-y-1">
          <h2 className="text-section font-bold">
            Rozmowa: {fullName(employee)}
          </h2>
          <p className="text-muted">
            {employee.position}
            {openReview?.sheet ? ` · arkusz ${openReview.sheet}` : ""}
          </p>
        </div>
        <PlannedTile
          heldOn={conversation.heldOn}
          scheduledAt={conversation.scheduledAt}
        />
      </div>
      {openReview ? (
        <StageStrip
          stage={openReview.stage}
          observationCount={observationCount}
        />
      ) : null}
      <div className="flex flex-wrap items-start gap-8">
        <div className="min-w-0 flex-[999_1_30rem] space-y-6">
          <Checklist
            kind={kind}
            employeeId={employee._id}
            scheduledAt={conversation.scheduledAt}
            observationCount={observationCount}
            uncoveredCriteria={coverage?.missing}
          />
          <PlanSection conversation={conversation} actor={actor} kind={kind} />
          <InvitationSection
            employee={employee}
            conversation={conversation}
            evaluator={review?.evaluator}
            actor={actor}
          />
          <OutcomesSection
            conversation={conversation}
            actor={actor}
            kind={kind}
            reviewId={openReview?.reviewId}
          />
        </div>
        <aside aria-labelledby="h-rodzaje" className="min-w-0 flex-[1_1_20rem]">
          <Card className="space-y-4">
            <h2 id="h-rodzaje" className="text-section font-bold">
              Co zmienia przełącznik
            </h2>
            {KINDS.map((option) => (
              <div
                key={option}
                className="border-divider space-y-1 border-t pt-4 first-of-type:border-t-0 first-of-type:pt-0"
              >
                <h3 className="text-lg font-bold">
                  {KIND_LABELS[option]}
                  {option === kind ? " (ten widok)" : ""}
                </h3>
                <p className="text-muted">{KIND_HINTS[option]}</p>
              </div>
            ))}
            {handoverCount > 0 ? (
              <div className="border-divider space-y-1 border-t pt-4">
                <h3 className="text-lg font-bold">Zmiana oceniającego</h3>
                <p className="text-muted">
                  Zmiana oceniającego dotyczy {handoverCount}{" "}
                  {plural(handoverCount, {
                    one: "osoby",
                    few: "osób",
                    many: "osób",
                  })}
                  .{" "}
                  <Link to="/zmiana-oceniajacego">
                    Zobacz decyzje dla tych osób
                  </Link>
                </p>
              </div>
            ) : null}
            {openReview ? (
              <p>
                <Link to={`/oceny?ocena=${openReview.reviewId}`}>
                  Przejdź do arkusza oceny
                </Link>
              </p>
            ) : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}

const DAYS = { one: "dzień", few: "dni", many: "dni" };

function daysFromToday(timestamp: number): number {
  const start = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((start(new Date(timestamp)) - start(today())) / 86_400_000);
}

export function PlannedTile({
  heldOn,
  scheduledAt,
}: {
  heldOn: string | undefined;
  scheduledAt: number | undefined;
}) {
  let label = "Planowana rozmowa";
  let value = "bez terminu";
  if (heldOn) {
    label = "Rozmowa odbyła się";
    value = formatDate(heldOn);
  } else if (scheduledAt !== undefined) {
    const days = daysFromToday(scheduledAt);
    const when = `${formatShortWithWeekday(scheduledAt)}, ${formatDateTime(scheduledAt).slice(-5)}`;
    const relative =
      days > 0
        ? `za ${days} ${plural(days, DAYS)}`
        : days === 0
          ? "dziś"
          : "termin minął";
    value = `${when} · ${relative}`;
  }
  return (
    <div className="border-border flex items-center gap-3 rounded-[10px] border bg-white px-4 py-3">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-ink size-[22px] shrink-0"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
      <div>
        <div className="text-muted text-sm">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}
