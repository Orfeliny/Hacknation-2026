import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import {
  criteriaForSheet,
  ratingScale,
} from "../../../convex/rules/assessment";
import { RULES_2016 } from "../../../convex/rules/pack2016";
import { useRecordView } from "../audit/useAudit";
import { ObjectionPanel } from "../objections/ObjectionPanel";
import { errorMessage } from "../review/types";

const actor = { role: "employee" as const };

function Signing({ reviewId }: { reviewId: Id<"reviews"> }) {
  const full = useQuery(api.reviews.queries.get, { actor, reviewId });
  const sign = useMutation(api.reviews.mutations.sign);
  const [place, setPlace] = useState("Warszawa");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  if (!full) return null;

  const scopes = [
    full.can.signPartOne && ("part_one" as const),
    full.can.signAssessment && ("assessment" as const),
  ].filter((scope) => scope !== false);
  if (scopes.length === 0) return null;

  async function run(scope: "part_one" | "assessment") {
    setError(undefined);
    setPending(true);
    try {
      await sign({ actor, reviewId, scope, place });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="space-y-2">
      <label htmlFor="sign-place" className="block text-sm font-medium">
        Miejscowość
      </label>
      <Input
        id="sign-place"
        value={place}
        onChange={(e) => setPlace(e.target.value)}
      />
      {scopes.map((scope) => (
        <Button key={scope} disabled={pending} onClick={() => void run(scope)}>
          {scope === "part_one"
            ? "Potwierdzam część I (rozmowa rozpoczynająca)"
            : "Potwierdzam zapoznanie się z oceną"}
        </Button>
      ))}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </Card>
  );
}

export function ReviewDetail({ reviewId }: { reviewId: Id<"reviews"> }) {
  const review = useQuery(api.me.queries.get, { actor, reviewId });
  useRecordView(reviewId);
  if (review === undefined) return <p>Ładowanie oceny…</p>;

  const names = new Map(
    (review.sheet ? criteriaForSheet(review.sheet, RULES_2016) : []).map(
      (c) => [c.id, c.name],
    ),
  );
  const levels = new Map(
    ratingScale(RULES_2016).levels.map((l) => [l.id, l.label]),
  );
  const assessment = review.assessment;
  const overall = RULES_2016.overallLevels.find(
    (l) => l.id === assessment?.overallLevelId,
  );

  return (
    <div className="space-y-4">
      <Card className="space-y-1">
        <h2 className="text-lg font-semibold">{review.stageLabel}</h2>
        <p className="text-sm text-slate-600">
          Oceniający: {review.evaluatorName ?? "brak"}
          {review.dueDate ? `, termin ${review.dueDate}` : ""}
        </p>
      </Card>

      {review.expectations.length > 0 && (
        <Card className="space-y-2">
          <h2 className="text-lg font-semibold">Oczekiwania</h2>
          <ul className="space-y-1 text-sm">
            {review.expectations.map((e) => (
              <li key={e.criterionId}>
                <strong>{names.get(e.criterionId) ?? e.criterionId}:</strong>{" "}
                {e.text}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {assessment ? (
        <>
          <Card className="space-y-2">
            <h2 className="text-lg font-semibold">Ocena</h2>
            <p className="text-sm">
              Wynik:{" "}
              <strong>
                {assessment.overallResult === "negative"
                  ? "negatywny"
                  : "pozytywny"}
              </strong>
              {overall ? `, ${overall.label}` : ""}
              {assessment.averageScore !== null
                ? `, średnia ${assessment.averageScore}`
                : ""}
            </p>
            {assessment.overallJustification && (
              <p className="text-sm">{assessment.overallJustification}</p>
            )}
            <ul className="space-y-1 text-sm">
              {assessment.ratings.map((r) => (
                <li key={r.criterionId}>
                  {names.get(r.criterionId) ?? r.criterionId}:{" "}
                  <strong>{levels.get(r.levelId) ?? r.levelId}</strong>
                  {r.justification ? ` (${r.justification})` : ""}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="space-y-2">
            <h2 className="text-lg font-semibold">Plan rozwoju</h2>
            {assessment.developmentPlan ? (
              <>
                {assessment.developmentPlan.summary && (
                  <p className="text-sm">
                    {assessment.developmentPlan.summary}
                  </p>
                )}
                <ul className="list-disc pl-5 text-sm">
                  {(assessment.developmentPlan.actions ?? []).map((a) => (
                    <li key={a.text}>{a.text}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm">Plan rozwoju nie został jeszcze dodany.</p>
            )}
          </Card>
        </>
      ) : (
        <p className="text-sm text-slate-600">
          Ocena będzie widoczna od etapu podpisów.
        </p>
      )}

      <Signing reviewId={reviewId} />
      <ObjectionPanel reviewId={reviewId} />
    </div>
  );
}
