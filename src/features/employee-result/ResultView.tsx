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
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import { formatDate } from "../../lib/format";
import { plural } from "../../lib/plural";
import { chosenCriteria } from "../me/criteria";
import { NextStepHero } from "../me/NextStepHero";
import { StageTimeline } from "../me/StageTimeline";
import { Crumbs } from "./Crumbs";
import { DECISION_LABEL } from "../objections/labels";
import { errorMessage } from "../review/types";
import {
  filingDeadlineIfAcknowledgedOn,
  formatIsoDay,
  OBJECTION_DAYS,
  OBJECTION_DECISION_DAYS,
} from "./deadlines";

const actor = { role: "employee" as const };

const H2 = "text-section font-bold";
const SECTION = "border-border space-y-4 rounded-xl border bg-white p-6";
const DEFAULT_PLACE = "Warszawa";

function Acknowledge({ reviewId }: { reviewId: Id<"reviews"> }) {
  const sign = useMutation(api.reviews.mutations.sign);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function confirm() {
    setError(undefined);
    setPending(true);
    try {
      await sign({
        actor,
        reviewId,
        scope: "assessment",
        place: DEFAULT_PLACE,
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <NextStepHero
      id="h-krok"
      title="Zapoznaj się z oceną"
      action={
        <div className="space-y-2">
          <Button
            className="min-h-12 px-6 font-bold"
            disabled={pending}
            onClick={() => void confirm()}
          >
            Potwierdź zapoznanie
            <span className="sr-only"> z oceną</span>
          </Button>
          {error && <StatusAlert tone="danger">{error}</StatusAlert>}
        </div>
      }
    >
      <p>
        <strong>Potwierdzenie nie oznacza zgody z oceną.</strong> Oznacza tylko,
        że ją przeczytałeś. Od dnia potwierdzenia masz {OBJECTION_DAYS} dni na
        sprzeciw.
      </p>
    </NextStepHero>
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
        hint={
          <>
            Sprzeciw zobaczą dyrektor generalny, kadry i oceniający. Możesz
            oprzeć się na{" "}
            <Link to="/moja-ocena" className="text-primary underline">
              swoich notatkach
            </Link>
            .
          </>
        }
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
    <section aria-labelledby="h-sprzeciw" className={SECTION}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="h-sprzeciw" className={H2}>
          Sprzeciw
        </h2>
        {status && (
          <span className="bg-surface-muted text-muted rounded-full px-3 py-1 text-sm font-bold whitespace-nowrap">
            {status}
          </span>
        )}
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
        <p>
          Sprzeciw będzie można złożyć po potwierdzeniu zapoznania z oceną.
          Jeśli potwierdzisz dziś, termin minie{" "}
          <strong>
            {formatIsoDay(filingDeadlineIfAcknowledgedOn(new Date()))}
          </strong>
          .
        </p>
      )}
    </section>
  );
}

type Review = NonNullable<
  ReturnType<typeof useQuery<typeof api.me.queries.get>>
>;

function ResultSection({
  review,
  reviewId,
}: {
  review: Review;
  reviewId: string;
}) {
  const { assessment } = review;
  if (!assessment) {
    return (
      <section className={SECTION}>
        <p>Ocena będzie widoczna od etapu podpisów.</p>
      </section>
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
    <section aria-labelledby="h-wynik" className={SECTION}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="h-wynik" className={H2}>
          Wynik
        </h2>
        <span>
          {assessment.averageScore !== null && (
            <>
              <strong className="text-[25px]">
                {String(assessment.averageScore).replace(".", ",")}
              </strong>{" "}
              <span className="text-muted">średnia. </span>
            </>
          )}
          <span className="text-muted">
            {assessment.overallResult === "negative"
              ? "Ocena negatywna"
              : "Ocena pozytywna"}
            {overall ? `, ${overall.label}` : ""}.
          </span>
        </span>
      </div>
      {assessment.overallJustification && (
        <p>{assessment.overallJustification}</p>
      )}
      <ul>
        {assessment.ratings.map((r) => {
          const criterion = criteria.get(r.criterionId);
          const level = levels.get(r.levelId);
          return (
            <li
              key={r.criterionId}
              className="space-y-1 border-t border-[#c0c0c0] py-3"
            >
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <span>
                  {criterion?.name ?? r.criterionId}
                  {criterion?.kind === "additional" && (
                    <span className="text-muted text-sm"> dodatkowe</span>
                  )}
                </span>
                <strong>{level ? level.value : r.levelId}</strong>
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
      <Link
        to={`/druk?ocena=${encodeURIComponent(reviewId)}`}
        className="border-primary text-primary inline-flex min-h-11 items-center self-start rounded-md border bg-white px-4 font-semibold"
      >
        Otwórz arkusz do druku
        <span className="sr-only"> z arkuszem oceny</span>
      </Link>
    </section>
  );
}

function Aside({ review }: { review: Review }) {
  const notes = useQuery(api.me.queries.selfNotes, { actor });
  const plan = review.assessment?.developmentPlan;
  const actions = plan?.actions ?? [];
  const noteCount = notes?.length;
  return (
    <aside aria-label="Rozwój i pomoc" className="space-y-6">
      <section className="border-border space-y-2 rounded-xl border bg-white px-6 py-5">
        <h2 className={H2}>Wnioski do mojego IPRZ</h2>
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
        <Link to="/rozwoj" className="text-primary font-semibold">
          Zobacz oferty w Forum rozwoju
        </Link>
      </section>
      {noteCount !== undefined && (
        <section className="space-y-2 px-1">
          <h3 className="text-[17px] font-bold">Twoje notatki</h3>
          <p className="text-muted">
            {noteCount === 0
              ? "Nie masz jeszcze notatek."
              : `Masz ${noteCount} ${plural(noteCount, { one: "notatkę", few: "notatki", many: "notatek" })}.`}{" "}
            Widzisz je Ty i kadry. Oceniający ich nie widzi.
          </p>
        </section>
      )}
      <section className="space-y-2 px-1">
        <h3 className="text-[17px] font-bold">Pytania</h3>
        <p className="text-muted">Pytania o procedurę kieruj do Biura Kadr.</p>
      </section>
    </aside>
  );
}

function periodYears(start: string | null, end: string | null) {
  return start && end ? ` ${start.slice(0, 4)}–${end.slice(0, 4)}` : "";
}

export function ResultView({ reviewId }: { reviewId: Id<"reviews"> }) {
  const review = useQuery(api.me.queries.get, { actor, reviewId });
  const full = useQuery(api.reviews.queries.get, { actor, reviewId });
  const info = useQuery(api.objections.queries.forReview, { actor, reviewId });
  if (review === undefined || full === undefined || info === undefined) {
    return <p>Ładowanie oceny…</p>;
  }
  if (info === null || full === null) return <p>Nie znaleziono oceny.</p>;

  const { criteria } = chosenCriteria(review);
  return (
    <div className="space-y-6">
      <div>
        <Crumbs
          label={`Wynik oceny${periodYears(review.periodStart, review.periodEnd)}`}
        />
        <PageHeader
          title={
            review.stage === "signing"
              ? "Twoja ocena jest gotowa"
              : "Wynik oceny"
          }
          description={`Oceniający: ${review.evaluatorName ?? "brak danych"}${review.sheet ? ` · arkusz ${review.sheet}` : ""}`}
        />
      </div>
      <StageTimeline
        stage={review.stage}
        facts={{
          criteriaCount: criteria.length,
          periodStart: review.periodStart,
          periodEnd: review.periodEnd,
          dueDate: review.dueDate,
        }}
      />
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
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-8">
        <div className="space-y-6">
          <ResultSection review={review} reviewId={reviewId} />
          <ObjectionSection reviewId={reviewId} info={info} />
        </div>
        <Aside review={review} />
      </div>
    </div>
  );
}
