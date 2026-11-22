import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { MAX_OBJECTION_LENGTH } from "../../../convex/objections/limits";
import {
  criteriaForSheet,
  ratingScale,
} from "../../../convex/rules/assessment";
import { RULES_2016 } from "../../../convex/rules/pack2016";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import { formatDate } from "../../lib/format";
import { DECISION_LABEL } from "../objections/labels";
import { errorMessage } from "../review/types";
import {
  filingDeadlineIfAcknowledgedOn,
  formatIsoDay,
  OBJECTION_DAYS,
  OBJECTION_DECISION_DAYS,
} from "./deadlines";

const actor = { role: "employee" as const };

const TIMELINE = [
  ["setup", "Kryteria"],
  ["opening", "Rozmowa rozpoczynająca"],
  ["observation", "Obserwacja"],
  ["evaluation", "Rozmowa oceniająca"],
  ["writing", "Sporządzenie"],
  ["signing", "Zapoznanie"],
  ["objection_window", "Sprzeciw"],
  ["closed", "Zamknięta"],
] as const;

function Timeline({ stage }: { stage: string }) {
  const current = TIMELINE.findIndex(([key]) =>
    stage === "objection" ? key === "objection_window" : key === stage,
  );
  return (
    <nav
      aria-label="Etapy oceny"
      className="border-border rounded-lg border bg-white p-4"
    >
      <ol className="grid grid-cols-8 gap-2 text-sm">
        {TIMELINE.map(([key, label], index) => (
          <li
            key={key}
            aria-current={index === current ? "step" : undefined}
            className={index === current ? "font-bold" : undefined}
          >
            {label}
            {index < current && <span className="sr-only"> (zakończony)</span>}
            {index === current && <span className="sr-only"> (teraz)</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Acknowledge({ reviewId }: { reviewId: Id<"reviews"> }) {
  const sign = useMutation(api.reviews.mutations.sign);
  const [place, setPlace] = useState("Warszawa");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const deadline = filingDeadlineIfAcknowledgedOn(new Date());

  async function confirm() {
    setError(undefined);
    setPending(true);
    try {
      await sign({ actor, reviewId, scope: "assessment", place });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-xl font-bold">Zapoznaj się z oceną</h2>
      <p>
        <strong>Potwierdzenie nie oznacza zgody z oceną.</strong> Oznacza tylko,
        że ją przeczytałeś. Od dnia potwierdzenia masz {OBJECTION_DAYS} dni na
        sprzeciw. Jeśli potwierdzisz dziś, termin minie{" "}
        <strong>{formatIsoDay(deadline)}</strong>.
      </p>
      <Field label="Miejscowość">
        <Input value={place} onChange={(e) => setPlace(e.target.value)} />
      </Field>
      <Button
        disabled={pending || !place.trim()}
        onClick={() => void confirm()}
      >
        Potwierdź zapoznanie z oceną
      </Button>
      {error && <StatusAlert tone="danger">{error}</StatusAlert>}
    </Card>
  );
}

function FileObjection({
  reviewId,
  deadline,
}: {
  reviewId: Id<"reviews">;
  deadline: string | null;
}) {
  const file = useMutation(api.objections.mutations.file);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

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
        Jeśli się nie zgadzasz, złóż sprzeciw do{" "}
        <strong>dyrektora generalnego urzędu</strong> w ciągu {OBJECTION_DAYS}{" "}
        dni od zapoznania
        {deadline ? (
          <>
            {" "}
            (do <strong>{formatIsoDay(deadline)}</strong>)
          </>
        ) : null}
        . Dyrektor rozpatrzy go w ciągu {OBJECTION_DECISION_DAYS} dni. Może
        zmienić ocenę, uchylić ją i zlecić sporządzenie nowej albo sprzeciwu nie
        uwzględnić. W ostatnim przypadku możesz odwołać się do sądu pracy.
      </p>
      <Field
        label="Uzasadnienie sprzeciwu"
        hint="Sprzeciw zobaczą dyrektor generalny, kadry i oceniający."
        error={error}
      >
        <Textarea
          rows={5}
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

type Info = NonNullable<
  ReturnType<typeof useQuery<typeof api.objections.queries.forReview>>
>;

function ObjectionSection({
  reviewId,
  info,
}: {
  reviewId: Id<"reviews">;
  info: Info;
}) {
  const { objection } = info;
  const status = objection
    ? objection.decision
      ? "Rozstrzygnięty"
      : "Czeka na decyzję"
    : info.can.file
      ? "Po zapoznaniu"
      : null;
  return (
    <Card className="space-y-3" aria-labelledby="h-sprzeciw" role="region">
      <div className="flex items-center justify-between gap-3">
        <h2 id="h-sprzeciw" className="text-xl font-bold">
          Sprzeciw
        </h2>
        {status && <Badge>{status}</Badge>}
      </div>
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
          {objection.decision && objection.justification && (
            <p className="whitespace-pre-line">
              <span className="font-semibold">Uzasadnienie dyrektora: </span>
              {objection.justification}
            </p>
          )}
        </div>
      )}
      {info.courtAppealDays !== null && (
        <p>
          Od tego rozstrzygnięcia przysługuje odwołanie do sądu pracy w terminie{" "}
          {info.courtAppealDays} dni.
        </p>
      )}
      {info.can.file && (
        <FileObjection reviewId={reviewId} deadline={info.filingDeadline} />
      )}
      {info.can.fileBlockedReason && <p>{info.can.fileBlockedReason}</p>}
      {!objection && !info.can.file && !info.can.fileBlockedReason && (
        <p>Sprzeciw będzie można złożyć po potwierdzeniu zapoznania z oceną.</p>
      )}
    </Card>
  );
}

type Review = NonNullable<
  ReturnType<typeof useQuery<typeof api.me.queries.get>>
>;

function ResultSection({ review }: { review: Review }) {
  const { assessment } = review;
  if (!assessment) {
    return (
      <Card>
        <p>Ocena będzie widoczna od etapu podpisów.</p>
      </Card>
    );
  }
  const criteria = new Map(
    (review.sheet ? criteriaForSheet(review.sheet, RULES_2016) : []).map(
      (c) => [c.id, c] as const,
    ),
  );
  const levels = new Map(ratingScale(RULES_2016).levels.map((l) => [l.id, l]));
  const overall = RULES_2016.overallLevels.find(
    (l) => l.id === assessment.overallLevelId,
  );
  return (
    <Card className="space-y-3" aria-labelledby="h-wynik" role="region">
      <h2 id="h-wynik" className="text-xl font-bold">
        Wynik
      </h2>
      <p>
        {assessment.averageScore !== null && (
          <strong className="text-2xl">
            {String(assessment.averageScore).replace(".", ",")}
          </strong>
        )}{" "}
        {assessment.overallResult === "negative"
          ? "Ocena negatywna"
          : "Ocena pozytywna"}
        {overall ? `, ${overall.label}` : ""}.
      </p>
      {assessment.overallJustification && (
        <p>{assessment.overallJustification}</p>
      )}
      <ul className="divide-border divide-y">
        {assessment.ratings.map((r) => {
          const criterion = criteria.get(r.criterionId);
          const level = levels.get(r.levelId);
          return (
            <li key={r.criterionId} className="space-y-1 py-2">
              <div className="flex justify-between gap-3">
                <span>
                  {criterion?.name ?? r.criterionId}
                  {criterion?.kind === "additional" && (
                    <>
                      {" "}
                      <Badge>dodatkowe</Badge>
                    </>
                  )}
                </span>
                <strong>
                  {level ? `${level.value} (${level.label})` : r.levelId}
                </strong>
              </div>
              {r.justification && (
                <p className="text-muted text-sm">
                  <span className="font-semibold">Uzasadnienie:</span>{" "}
                  {r.justification}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Aside({ review, reviewId }: { review: Review; reviewId: string }) {
  const plan = review.assessment?.developmentPlan;
  const actions = plan?.actions ?? [];
  return (
    <aside aria-label="Rozwój i pomoc" className="space-y-4">
      <Card className="space-y-2">
        <h2 className="text-lg font-bold">Wnioski do mojego IPRZ</h2>
        {plan?.summary && <p>{plan.summary}</p>}
        {actions.length > 0 && (
          <ul className="list-disc pl-5">
            {actions.map((a) => (
              <li key={a.text}>{a.text}</li>
            ))}
          </ul>
        )}
        {!plan?.summary && actions.length === 0 && (
          <p>Plan rozwoju nie został jeszcze dodany.</p>
        )}
        <Link to="/rozwoj">Zobacz oferty w Forum rozwoju</Link>
      </Card>
      <Card className="space-y-2">
        <h3 className="font-bold">Arkusz oceny</h3>
        <Link to={`/druk?ocena=${encodeURIComponent(reviewId)}`}>
          Otwórz arkusz do druku
        </Link>
      </Card>
      <Card className="space-y-2">
        <h3 className="font-bold">Pytania</h3>
        <p>Pytania o procedurę kieruj do Biura Kadr.</p>
      </Card>
    </aside>
  );
}

export function ResultView({ reviewId }: { reviewId: Id<"reviews"> }) {
  const review = useQuery(api.me.queries.get, { actor, reviewId });
  const full = useQuery(api.reviews.queries.get, { actor, reviewId });
  const info = useQuery(api.objections.queries.forReview, { actor, reviewId });
  if (review === undefined || full === undefined || info === undefined) {
    return <p>Ładowanie oceny…</p>;
  }
  if (info === null || full === null) return <p>Nie znaleziono oceny.</p>;

  return (
    <div className="space-y-6">
      <p className="text-muted">
        Oceniający: {review.evaluatorName ?? "brak"}
        {review.sheet ? ` · arkusz ${review.sheet}` : ""}
        {review.periodStart && review.periodEnd
          ? ` · okres ${formatIsoDay(review.periodStart)} – ${formatIsoDay(review.periodEnd)}`
          : ""}
      </p>
      <Timeline stage={review.stage} />
      {full.can.signAssessment && <Acknowledge reviewId={reviewId} />}
      {review.stage === "signing" && !full.can.signAssessment && (
        <StatusAlert tone="info">
          Oceniający jeszcze nie podpisał oceny. Potwierdzisz zapoznanie, gdy ją
          podpisze.
        </StatusAlert>
      )}
      {info.acknowledgedAt && (
        <StatusAlert tone="success">
          Zapoznanie z oceną potwierdzone {formatIsoDay(info.acknowledgedAt)}.
        </StatusAlert>
      )}
      <div className="grid grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          <ResultSection review={review} />
          <ObjectionSection reviewId={reviewId} info={info} />
        </div>
        <Aside review={review} reviewId={reviewId} />
      </div>
    </div>
  );
}
