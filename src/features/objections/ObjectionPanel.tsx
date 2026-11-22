import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { MAX_OBJECTION_LENGTH } from "../../../convex/objections/limits";
import { RULES_2016 } from "../../../convex/rules/pack2016";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import { useDemoRole } from "../../lib/demoRole";
import { formatDate } from "../../lib/format";
import { formatIsoDay } from "../employee-result/deadlines";
import { errorMessage } from "../review/types";
import { DecisionForm } from "./DecisionForm";
import { DECISION_LABEL } from "./labels";

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
    <div className="space-y-3">
      <p>
        Masz {RULES_2016.objectionDays} dni od zapoznania się z oceną na
        sprzeciw do dyrektora generalnego urzędu
        {deadline ? ` (do ${formatIsoDay(deadline)})` : ""}.
      </p>
      <Field label="Uzasadnienie sprzeciwu" error={error}>
        <Textarea
          rows={4}
          maxLength={MAX_OBJECTION_LENGTH}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
      <Button disabled={pending || !text.trim()} onClick={() => void submit()}>
        Złóż sprzeciw
      </Button>
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
        <p>To ocena sporządzona po raz drugi (podejście {info.round}).</p>
      )}
      {objection && (
        <div className="space-y-1">
          <p>
            {info.can.file ? "Poprzedni sprzeciw: wniesiono " : "Wniesiono "}
            {formatDate(objection.filedAt)}
            {objection.addressee ? `, adresat: ${objection.addressee}` : ""}.
          </p>
          <p className="whitespace-pre-line">{objection.text}</p>
          {objection.decision ? (
            <p role="status" className="font-semibold">
              Rozstrzygnięcie: {DECISION_LABEL[objection.decision]}
              {objection.decidedAt
                ? ` (${formatDate(objection.decidedAt)})`
                : ""}
              .
            </p>
          ) : (
            <p role="status">
              Sprzeciw czeka na decyzję dyrektora generalnego
              {info.decisionDeadline
                ? `, termin ${formatIsoDay(info.decisionDeadline)}`
                : ""}
              .
            </p>
          )}
          {objection.justification && (
            <p className="whitespace-pre-line">
              <span className="font-semibold">Uzasadnienie: </span>
              {objection.justification}
            </p>
          )}
        </div>
      )}
      {info.courtAppealDays !== null && (
        <StatusAlert tone="info" live={false}>
          Od tego rozstrzygnięcia przysługuje odwołanie do sądu pracy w terminie{" "}
          {info.courtAppealDays} dni.
        </StatusAlert>
      )}
      {info.can.file && (
        <FileForm reviewId={reviewId} deadline={info.filingDeadline} />
      )}
      {info.can.fileBlockedReason && <p>{info.can.fileBlockedReason}</p>}
      {info.can.decide && <DecisionForm reviewId={reviewId} />}
    </Card>
  );
}
