import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { MAX_OBJECTION_LENGTH } from "../../../convex/objections/limits";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { RULES_2016 } from "../../../convex/rules/pack2016";
import { useDemoRole } from "../../lib/demoRole";
import { errorMessage } from "../review/types";
import { DECISION_LABEL } from "./labels";

type Decision = "amend" | "redo" | "rejected";

const DECISIONS: { decision: Decision; label: string; hint: string }[] = [
  {
    decision: "amend",
    label: "Uwzględnij: oceniający zmieni ocenę",
    hint: "Ocena wraca do sporządzenia i jest podpisywana ponownie.",
  },
  {
    decision: "redo",
    label: "Uwzględnij: sporządź ocenę ponownie",
    hint: "Ocena wraca do rozmowy oceniającej jako ocena po raz drugi. Od niej przysługuje kolejny sprzeciw.",
  },
  {
    decision: "rejected",
    label: "Nie uwzględniaj sprzeciwu",
    hint: "Ocena zostaje zamknięta. Oceniany może się odwołać do sądu pracy.",
  },
];

const textareaClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600";

const day = (ms: number) => new Date(ms).toLocaleDateString("pl-PL");

export function DecisionButtons({ reviewId }: { reviewId: Id<"reviews"> }) {
  const actor = { role: useDemoRole() };
  const decide = useMutation(api.objections.mutations.decide);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function run(decision: Decision) {
    setError(undefined);
    setPending(true);
    try {
      await decide({ actor, reviewId, decision });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {DECISIONS.map(({ decision, label, hint }) => (
          <li key={decision} className="space-y-1">
            <Button
              disabled={pending}
              aria-describedby={`hint-${reviewId}-${decision}`}
              className={decision === "rejected" ? "bg-slate-600" : undefined}
              onClick={() => void run(decision)}
            >
              {label}
            </Button>
            <p
              id={`hint-${reviewId}-${decision}`}
              className="text-xs text-slate-600"
            >
              {hint}
            </p>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function FileForm({
  reviewId,
  deadline,
}: {
  reviewId: Id<"reviews">;
  deadline: string | null;
}) {
  const actor = { role: useDemoRole() };
  const file = useMutation(api.objections.mutations.file);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function submit() {
    setError(undefined);
    setPending(true);
    try {
      await file({ actor, reviewId, text });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm">
        Masz {RULES_2016.objectionDays} dni od zapoznania się z oceną na
        sprzeciw do dyrektora generalnego urzędu
        {deadline ? ` (do ${deadline})` : ""}.
      </p>
      <label htmlFor={`objection-${reviewId}`} className="block text-sm">
        Uzasadnienie sprzeciwu
      </label>
      <textarea
        id={`objection-${reviewId}`}
        className={textareaClass}
        rows={4}
        maxLength={MAX_OBJECTION_LENGTH}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button disabled={pending || !text.trim()} onClick={() => void submit()}>
        Wnieś sprzeciw
      </Button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function ObjectionPanel({ reviewId }: { reviewId: Id<"reviews"> }) {
  const actor = { role: useDemoRole() };
  const info = useQuery(api.objections.queries.forReview, { actor, reviewId });
  if (!info) return null;
  const { objection } = info;
  if (!objection && !info.can.file && !info.can.fileBlockedReason) return null;

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold">Sprzeciw od oceny</h2>
      {info.round > 1 && (
        <p className="text-sm">
          To ocena sporządzona po raz drugi (podejście {info.round}).
        </p>
      )}
      {objection && (
        <div className="space-y-1 text-sm">
          <p>
            {info.can.file ? "Poprzedni sprzeciw: wniesiono " : "Wniesiono "}
            {day(objection.filedAt)}
            {objection.addressee ? `, adresat: ${objection.addressee}` : ""}.
          </p>
          <p className="whitespace-pre-line">{objection.text}</p>
          {objection.decision ? (
            <p role="status" className="font-medium">
              Rozstrzygnięcie: {DECISION_LABEL[objection.decision]}
              {objection.decidedAt ? ` (${day(objection.decidedAt)})` : ""}.
            </p>
          ) : (
            <p role="status">
              Sprzeciw czeka na decyzję dyrektora generalnego
              {info.decisionDeadline ? `, termin ${info.decisionDeadline}` : ""}
              .
            </p>
          )}
        </div>
      )}
      {info.courtAppealDays !== null && (
        <p className="rounded-md bg-slate-50 p-3 text-sm">
          Od tego rozstrzygnięcia przysługuje odwołanie do sądu pracy w terminie{" "}
          {info.courtAppealDays} dni.
        </p>
      )}
      {info.can.file && (
        <FileForm reviewId={reviewId} deadline={info.filingDeadline} />
      )}
      {info.can.fileBlockedReason && (
        <p className="text-sm">{info.can.fileBlockedReason}</p>
      )}
      {info.can.decide && <DecisionButtons reviewId={reviewId} />}
    </Card>
  );
}
