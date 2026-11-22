import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { formatDate, formatDateTime } from "../../lib/format";
import { Checklist } from "./Checklist";
import { InvitationSection } from "./InvitationSection";
import { KIND_HINTS, KIND_LABELS, KINDS, type ConversationKind } from "./kinds";
import { OutcomesSection } from "./OutcomesSection";
import { PlanSection } from "./PlanSection";
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
        <h2 className="text-xl font-bold">
          Rozmowa z {fullName(employee)}: {KIND_LABELS[kind].toLowerCase()}
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

  const when = conversation.heldOn
    ? ` · odbyła się ${formatDate(conversation.heldOn)}`
    : conversation.scheduledAt !== undefined
      ? ` · planowana ${formatDateTime(conversation.scheduledAt)}`
      : " · bez terminu";

  return (
    <div className="flex flex-wrap items-start gap-8">
      <div className="min-w-0 flex-[999_1_620px] space-y-6">
        <div>
          <h2 className="text-xl font-bold">Rozmowa z {fullName(employee)}</h2>
          <p className="text-muted">
            {employee.position}
            {when}
          </p>
        </div>
        <Checklist kind={kind} />
        <PlanSection conversation={conversation} actor={actor} kind={kind} />
        <InvitationSection
          employee={employee}
          conversation={conversation}
          evaluator={review?.evaluator}
          actor={actor}
        />
        <OutcomesSection conversation={conversation} actor={actor} />
      </div>
      <aside
        aria-labelledby="h-rodzaje"
        className="flex min-w-0 flex-[1_1_320px] flex-col gap-4"
      >
        <h2 id="h-rodzaje" className="text-xl font-bold">
          Co zmienia przełącznik
        </h2>
        {KINDS.map((option) => (
          <Card key={option}>
            <h3 className="font-bold">
              {KIND_LABELS[option]}
              {option === kind ? " (ten widok)" : ""}
            </h3>
            <p className="text-muted">{KIND_HINTS[option]}</p>
          </Card>
        ))}
        {openReview ? (
          <Link
            className="text-primary underline"
            to={`/oceny?ocena=${openReview.reviewId}`}
          >
            Przejdź do arkusza oceny
          </Link>
        ) : null}
      </aside>
    </div>
  );
}
