import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
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
import { formatDate, today } from "../../lib/format";
import { useRecordView } from "../audit/useAudit";
import { errorMessage } from "../review/types";
import { AppLink } from "./AppLink";
import { isRouteRegistered } from "./routeRegistered";
import { SelfNotes } from "./SelfNotes";
import { StageTimeline } from "./StageTimeline";
import { RESULT_STAGES, type ReviewStageId } from "./stages";

const actor = { role: "employee" as const };
const RESULT_PATH = "/wynik-oceny";
const GROWTH_PATH = "/rozwoj";

const isoToday = () => {
  const now = today();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

function PartOneSigning({ reviewId }: { reviewId: Id<"reviews"> }) {
  const full = useQuery(api.reviews.queries.get, { actor, reviewId });
  const sign = useMutation(api.reviews.mutations.sign);
  const [place, setPlace] = useState("Warszawa");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  if (!full?.can.signPartOne) return null;

  async function run() {
    setError(undefined);
    setPending(true);
    try {
      await sign({ actor, reviewId, scope: "part_one", place });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Miejscowość">
        <Input value={place} onChange={(e) => setPlace(e.target.value)} />
      </Field>
      <Button disabled={pending} onClick={() => void run()}>
        Potwierdź zapoznanie z kryteriami
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
  const showResult =
    RESULT_STAGES.includes(stage) && isRouteRegistered(RESULT_PATH);

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold">Twój następny krok</h2>
      <p className="font-semibold">{content.title}</p>
      <p className="text-muted">{content.text}</p>
      {stage === "opening" && <PartOneSigning reviewId={reviewId} />}
      {showResult && (
        <p>
          <AppLink to={`${RESULT_PATH}?ocena=${reviewId}`}>
            Zobacz wynik oceny
          </AppLink>
        </p>
      )}
    </Card>
  );
}

function OpeningConversation({ heldOn }: { heldOn: string | null }) {
  if (!heldOn) return <>Jeszcze się nie odbyła</>;
  return heldOn <= isoToday() ? (
    <>Odbyła się {formatDate(heldOn)}</>
  ) : (
    <>Zaplanowana na {formatDate(heldOn)}</>
  );
}

export function ReviewDetail({ reviewId }: { reviewId: Id<"reviews"> }) {
  const review = useQuery(api.me.queries.get, { actor, reviewId });
  useRecordView(reviewId);
  if (review === undefined) return <p>Ładowanie oceny…</p>;

  const stage: ReviewStageId = review.stage;
  const criteria = review.sheet
    ? criteriaForSheet(review.sheet, RULES_2016)
    : [];
  const expectations = new Map(
    review.expectations.map((e) => [e.criterionId, e.text]),
  );
  const chosen = criteria.filter(
    (c) => c.kind === "mandatory" || expectations.has(c.id),
  );
  const scale = ratingScale(RULES_2016)
    .levels.map((l) => l.id)
    .join(", ");

  return (
    <div className="space-y-6">
      <p className="text-muted">
        Oceniający: {review.evaluatorName ?? "brak"}
        {review.sheet ? ` · arkusz ${review.sheet}` : ""} · {review.stageLabel}
      </p>
      <StageTimeline stage={stage} />
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
        <div className="space-y-6">
          <NextStep reviewId={reviewId} stage={stage} />
          <Card className="space-y-3">
            <h2 className="text-lg font-bold">Terminy</h2>
            <dl className="space-y-2">
              <div>
                <dt className="font-semibold">Rozmowa rozpoczynająca</dt>
                <dd>
                  <OpeningConversation heldOn={review.openingHeldOn} />
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Okres oceny</dt>
                <dd>
                  {review.periodStart && review.periodEnd
                    ? `${formatDate(review.periodStart)} – ${formatDate(review.periodEnd)}`
                    : "Okres oceny nieustalony"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Termin oceny</dt>
                <dd>
                  {review.dueDate ? formatDate(review.dueDate) : "Nieustalony"}
                </dd>
              </div>
            </dl>
            <p className="text-muted text-sm">
              Termin może się przesunąć, na przykład gdy nieobecność potrwa
              dłużej niż miesiąc. Dostaniesz wtedy pismo, a tu zobaczysz nową
              datę.
            </p>
          </Card>
          <Card className="space-y-3">
            <h2 className="text-lg font-bold">Za co będziesz oceniany</h2>
            <p className="text-muted">
              Skala ocen: {scale}. Każde kryterium waży w średniej tyle samo.
            </p>
            {chosen.length === 0 ? (
              <p>Kryteria nie zostały jeszcze ustalone.</p>
            ) : (
              <ul className="space-y-3">
                {chosen.map((c) => (
                  <li key={c.id} className="space-y-1">
                    <p className="flex items-center gap-2 font-semibold">
                      {c.name}
                      <Badge>
                        {c.kind === "mandatory" ? "obowiązkowe" : "dodatkowe"}
                      </Badge>
                    </p>
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
          </Card>
        </div>
        <aside className="space-y-6">
          <SelfNotes reviewId={reviewId} />
          <Card className="space-y-2">
            <h2 className="text-lg font-bold">Rozwój już teraz</h2>
            <p className="text-muted">
              Szkolenia, warsztaty i mentoring w urzędzie, także takie, które
              wzmacniają Twoje mocne strony.
            </p>
            <p>
              <AppLink to={GROWTH_PATH}>Zobacz Forum rozwoju</AppLink>
            </p>
          </Card>
          <Card className="space-y-2">
            <h2 className="text-lg font-bold">Czego tu nie ma</h2>
            <p className="text-muted">
              Nie widzisz obserwacji oceniającego, bo to jego robocze zapiski.
              Zobaczysz gotową ocenę z uzasadnieniem i będziesz mieć{" "}
              {RULES_2016.objectionDays} dni na sprzeciw.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
