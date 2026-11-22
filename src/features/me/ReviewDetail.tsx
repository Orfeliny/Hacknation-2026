import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ratingScale } from "../../../convex/rules/assessment";
import { RULES_2016 } from "../../../convex/rules/pack2016";
import { Button } from "../../components/ui/Button";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { formatDate, today } from "../../lib/format";
import { RouteLink } from "../../app/index";
import { useRecordView } from "../audit/useAudit";
import { errorMessage } from "../review/types";
import { chosenCriteria } from "./criteria";
import { NextStepHero } from "./NextStepHero";
import { SelfNotes } from "./SelfNotes";
import { CheckMark, StageTimeline } from "./StageTimeline";
import { RESULT_STAGES, type ReviewStageId } from "./stages";

const actor = { role: "employee" as const };
const RESULT_PATH = "/wynik-oceny";
const GROWTH_PATH = "/rozwoj";
const DEFAULT_PLACE = "Warszawa";

const isoToday = () => {
  const now = today();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

function PartOneAction({ reviewId }: { reviewId: Id<"reviews"> }) {
  const full = useQuery(api.reviews.queries.get, { actor, reviewId });
  const sign = useMutation(api.reviews.mutations.sign);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  if (!full?.can.signPartOne) return null;

  async function run() {
    setError(undefined);
    setPending(true);
    try {
      await sign({ actor, reviewId, scope: "part_one", place: DEFAULT_PLACE });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        className="min-h-12 px-6 font-bold"
        disabled={pending}
        onClick={() => void run()}
      >
        Potwierdź zapoznanie <span className="sr-only">z kryteriami</span>
      </Button>
      {error && <StatusAlert tone="danger">{error}</StatusAlert>}
    </div>
  );
}

const STEP_COPY: Record<ReviewStageId, { title: string; text: string }> = {
  setup: {
    title: "Oceniający ustala kryteria",
    text: "Zaproszenie na rozmowę rozpoczynającą dostaniesz od oceniającego.",
  },
  opening: {
    title: "Potwierdź, że znasz kryteria",
    text: "Potwierdzenie oznacza, że wiesz, za co będziesz oceniany. Nie oznacza zgody z kryteriami.",
  },
  observation: {
    title: "Pracuj i zapisuj osiągnięcia",
    text: "Nic nie musisz teraz potwierdzać. Swoje osiągnięcia zapisuj w notatkach obok.",
  },
  evaluation: {
    title: "Przygotuj się do rozmowy oceniającej",
    text: "Oceniający umówi się z Tobą na rozmowę przed sporządzeniem oceny.",
  },
  writing: {
    title: "Oceniający sporządza ocenę",
    text: "Ocenę zobaczysz na etapie zapoznania. Nic nie musisz teraz robić.",
  },
  signing: {
    title: "Ocena jest gotowa do zapoznania",
    text: `Po zapoznaniu się z oceną masz ${RULES_2016.objectionDays} dni na sprzeciw, jeśli chcesz go złożyć.`,
  },
  objection_window: {
    title: "Ocena jest gotowa do zapoznania",
    text: `Po zapoznaniu się z oceną masz ${RULES_2016.objectionDays} dni na sprzeciw, jeśli chcesz go złożyć.`,
  },
  objection: {
    title: "Sprzeciw jest rozpatrywany",
    text: "Dyrektor rozstrzyga sprzeciw. Wynik oceny nadal możesz przejrzeć.",
  },
  closed: {
    title: "Ocena jest zamknięta",
    text: "Nic więcej nie musisz robić. Wynik oceny nadal możesz przejrzeć.",
  },
};

function NextStep({
  reviewId,
  stage,
}: {
  reviewId: Id<"reviews">;
  stage: ReviewStageId;
}) {
  const content = STEP_COPY[stage];
  const showResult = RESULT_STAGES.includes(stage);
  return (
    <NextStepHero
      id="h-krok"
      title={content.title}
      action={
        stage === "opening" ? (
          <PartOneAction reviewId={reviewId} />
        ) : showResult ? (
          <RouteLink
            to={`${RESULT_PATH}?ocena=${reviewId}`}
            className="border-primary text-primary min-h-12 rounded-md border bg-white px-6 font-semibold"
          >
            Zobacz wynik oceny
          </RouteLink>
        ) : undefined
      }
    >
      <p>{content.text}</p>
    </NextStepHero>
  );
}

function OpeningConversation({ heldOn }: { heldOn: string | null }) {
  if (!heldOn) return <>Jeszcze się nie odbyła</>;
  return heldOn <= isoToday() ? (
    <>
      <CheckMark />
      Odbyła się {formatDate(heldOn)}
    </>
  ) : (
    <>Zaplanowana na {formatDate(heldOn)}</>
  );
}

const SECTION = "border-border space-y-4 rounded-xl border bg-white p-6";
const H2 = "text-section font-bold";

function periodLabel(start: string | null, end: string | null) {
  return start && end
    ? `${formatDate(`${start}T12:00:00`)} – ${formatDate(`${end}T12:00:00`)}`
    : "Okres oceny nieustalony";
}

export function ReviewDetail({ reviewId }: { reviewId: Id<"reviews"> }) {
  const review = useQuery(api.me.queries.get, { actor, reviewId });
  useRecordView(reviewId);
  if (review === undefined) return <p>Ładowanie oceny…</p>;

  const stage: ReviewStageId = review.stage;
  const { criteria: chosen, expectations } = chosenCriteria(review);
  const scale = ratingScale(RULES_2016)
    .levels.map((l) => l.id)
    .join(", ");
  const held = review.openingHeldOn !== null;

  return (
    <div className="space-y-6">
      <p className="text-muted">
        Oceniający: {review.evaluatorName ?? "brak danych"}
        {review.sheet ? ` · arkusz ${review.sheet}` : ""} · {review.stageLabel}
      </p>
      <StageTimeline
        stage={stage}
        facts={{
          criteriaCount: chosen.length,
          periodStart: review.periodStart,
          periodEnd: review.periodEnd,
          dueDate: review.dueDate,
        }}
      />
      <NextStep reviewId={reviewId} stage={stage} />
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-8">
        <div className="space-y-6">
          <section aria-labelledby="h-terminy" className={SECTION}>
            <h2 id="h-terminy" className={H2}>
              Terminy
            </h2>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
              <div className="border-border rounded-[10px] border px-4 py-3.5">
                <dt className="text-muted text-sm font-bold">
                  Rozmowa rozpoczynająca
                </dt>
                <dd
                  className={`mt-1 flex items-center gap-1.5 ${held ? "text-success font-bold" : ""}`}
                >
                  <OpeningConversation heldOn={review.openingHeldOn} />
                </dd>
              </div>
              <div className="border-border rounded-[10px] border px-4 py-3.5">
                <dt className="text-muted text-sm font-bold">Okres oceny</dt>
                <dd className="mt-1">
                  {periodLabel(review.periodStart, review.periodEnd)}
                </dd>
              </div>
              <div className="border-border rounded-[10px] border px-4 py-3.5">
                <dt className="text-muted text-sm font-bold">Termin oceny</dt>
                <dd className="mt-1 text-xl font-bold">
                  {review.dueDate
                    ? formatDate(`${review.dueDate}T12:00:00`)
                    : "Nieustalony"}
                </dd>
              </div>
            </dl>
            <StatusAlert tone="info" live={false}>
              <span className="text-ink font-normal">
                Termin może się przesunąć, na przykład gdy nieobecność potrwa
                dłużej niż miesiąc. Dostaniesz wtedy pismo, a tu zobaczysz nową
                datę.
              </span>
            </StatusAlert>
          </section>
          <section aria-labelledby="h-kryt" className={SECTION}>
            <div>
              <h2 id="h-kryt" className={H2}>
                Za co będziesz oceniany
              </h2>
              <p className="text-muted">
                Skala ocen: {scale}. Każde kryterium waży w średniej tyle samo.
              </p>
            </div>
            {chosen.length === 0 ? (
              <p>Kryteria nie zostały jeszcze ustalone.</p>
            ) : (
              <ul className="divide-y divide-[#c0c0c0]">
                {chosen.map((c) => (
                  <li key={c.id} className="space-y-1 py-3 first:pt-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <strong>{c.name}</strong>
                      <span className="text-muted text-sm">
                        {c.kind === "mandatory" ? "obowiązkowe" : "dodatkowe"}
                      </span>
                    </div>
                    {expectations.has(c.id) && (
                      <p>
                        <span className="text-muted">Oczekiwanie:</span>{" "}
                        {expectations.get(c.id)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside className="space-y-6">
          <SelfNotes reviewId={reviewId} />
          <section className="border-border space-y-2 rounded-xl border bg-white px-6 py-5">
            <h2 className={H2}>Rozwój już teraz</h2>
            <p className="text-muted">
              Szkolenia, warsztaty i mentoring w urzędzie, także takie, które
              wzmacniają Twoje mocne strony.
            </p>
            <p>
              <RouteLink to={GROWTH_PATH}>Zobacz Forum rozwoju</RouteLink>
            </p>
          </section>
          <section className="space-y-2 px-1">
            <h3 className="text-[17px] font-bold">Czego tu nie ma</h3>
            <p className="text-muted">
              Nie widzisz obserwacji oceniającego, bo to jego robocze zapiski.
              Zobaczysz gotową ocenę z uzasadnieniem i będziesz mieć{" "}
              {RULES_2016.objectionDays} dni na sprzeciw.
            </p>
            <p>
              <RouteLink to={`${RESULT_PATH}?ocena=${reviewId}`}>
                Jak wygląda koniec oceny
              </RouteLink>
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
