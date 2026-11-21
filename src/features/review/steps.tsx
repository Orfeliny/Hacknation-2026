import { useState, type ReactNode } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { ReviewPatch, ReviewView, WizardActions } from "./types";

const textareaClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 disabled:bg-slate-100";

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

type StepProps = {
  view: ReviewView;
  actions: WizardActions;
  run: (task: () => Promise<unknown>) => Promise<void>;
  pending: boolean;
};

function StepButtons({
  view,
  pending,
  onSave,
  onNext,
  nextLabel,
}: {
  view: ReviewView;
  pending: boolean;
  onSave: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  if (!view.can.edit) return null;
  return (
    <div className="flex gap-2">
      <Button disabled={pending} onClick={onSave}>
        Zapisz
      </Button>
      <Button disabled={pending} onClick={onNext}>
        {nextLabel}
      </Button>
    </div>
  );
}

function SignBox({
  scope,
  view,
  actions,
  run,
  pending,
}: StepProps & { scope: "part_one" | "assessment" }) {
  const [place, setPlace] = useState("Warszawa");
  const mine =
    scope === "part_one" ? view.can.signPartOne : view.can.signAssessment;
  const signatures = (view.review.signatures ?? []).filter(
    (s) => (s.scope ?? "assessment") === scope,
  );
  const who = (role: string) =>
    role === "evaluator" ? "oceniający" : "oceniany";
  return (
    <div className="space-y-2 rounded-md bg-slate-50 p-3">
      <h3 className="text-sm font-semibold">
        {scope === "part_one"
          ? "Potwierdzenie części I (rozmowa rozpoczynająca)"
          : "Potwierdzenie oceny"}
      </h3>
      <ul className="text-sm">
        {signatures.length === 0 && <li>Nikt jeszcze nie potwierdził.</li>}
        {signatures.map((s) => (
          <li key={`${s.role}-${s.signedAt}`}>
            Potwierdził {who(s.role)}: {s.place},{" "}
            {new Date(s.signedAt).toLocaleDateString("pl-PL")}
          </li>
        ))}
      </ul>
      {mine && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field id={`place-${scope}`} label="Miejscowość">
              <Input
                id={`place-${scope}`}
                value={place}
                onChange={(e) => setPlace(e.target.value)}
              />
            </Field>
          </div>
          <Button
            disabled={pending}
            onClick={() => void run(() => actions.sign(scope, place))}
          >
            Potwierdzam
          </Button>
        </div>
      )}
    </div>
  );
}

export function OpeningStep(props: StepProps) {
  const { view, actions, run, pending } = props;
  const { review } = view;
  const locked =
    !view.can.edit ||
    (review.signatures ?? []).some((s) => s.scope === "part_one");
  const [date, setDate] = useState(review.openingConversationDate ?? "");
  const [extra, setExtra] = useState(review.additionalCriteria ?? []);
  const [expectations, setExpectations] = useState<Record<string, string>>(
    Object.fromEntries(
      (review.expectations ?? []).map((e) => [e.criterionId, e.text]),
    ),
  );
  const patch = (): ReviewPatch => ({
    additionalCriteria: extra,
    ...(date ? { openingConversationDate: date } : {}),
    expectations: view.criteria
      .filter((c) => c.kind === "mandatory" || extra.includes(c.id))
      .map((c) => ({ criterionId: c.id, text: expectations[c.id] ?? "" }))
      .filter((e) => e.text.trim() !== ""),
  });
  // The backend rejects every opening-stage field once part I is signed.
  const save = async () => {
    if (!locked) await actions.save(patch());
  };
  const toggle = (id: string) =>
    setExtra((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length >= view.maxAdditional
          ? cur
          : [...cur, id],
    );
  const chosen = view.criteria.filter(
    (c) => c.kind === "mandatory" || extra.includes(c.id),
  );
  return (
    <div className="space-y-4">
      <Field id="opening-date" label="Data rozmowy rozpoczynającej">
        <Input
          id="opening-date"
          type="date"
          value={date}
          disabled={locked}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>
      <fieldset className="space-y-1" disabled={locked}>
        <legend className="text-sm font-medium">
          Kryteria dodatkowe ({extra.length}/{view.maxAdditional})
        </legend>
        {view.criteria
          .filter((c) => c.kind === "additional")
          .map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={extra.includes(c.id)}
                disabled={
                  !extra.includes(c.id) && extra.length >= view.maxAdditional
                }
                onChange={() => toggle(c.id)}
              />
              {c.name}
            </label>
          ))}
      </fieldset>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Oczekiwania wobec kryteriów</h3>
        {chosen.map((c) => (
          <Field key={c.id} id={`exp-${c.id}`} label={c.name}>
            <textarea
              id={`exp-${c.id}`}
              className={textareaClass}
              rows={2}
              value={expectations[c.id] ?? ""}
              disabled={locked}
              onChange={(e) =>
                setExpectations({ ...expectations, [c.id]: e.target.value })
              }
            />
          </Field>
        ))}
      </div>
      <StepButtons
        view={view}
        pending={pending}
        onSave={() => void run(save)}
        onNext={() =>
          void run(async () => {
            await save();
            await actions.advance();
          })
        }
        nextLabel="Zapisz i przejdź do okresu oceny"
      />
      <SignBox scope="part_one" {...props} />
    </div>
  );
}

export function ObservationStep(props: StepProps) {
  const { view, actions, run, pending } = props;
  const { review } = view;
  const [from, setFrom] = useState(review.periodStart ?? "");
  const [to, setTo] = useState(review.periodEnd ?? "");
  const [situations, setSituations] = useState(review.staffingSituations ?? []);
  const patch = (): ReviewPatch => ({
    ...(from ? { periodStart: from } : {}),
    ...(to ? { periodEnd: to } : {}),
    staffingSituations: situations,
  });
  const labels = {
    evaluator_change: "Zmiana oceniającego",
    duties_change: "Zmiana zakresu obowiązków",
    long_absence: "Długa nieobecność",
  } as const;
  return (
    <div className="space-y-4">
      <p className="text-sm">
        Termin sporządzenia oceny: <strong>{review.dueDate ?? "brak"}</strong>
        {view.daysLeft !== null &&
          (view.daysLeft >= 0
            ? ` (zostało ${view.daysLeft} dni)`
            : ` (minął ${-view.daysLeft} dni temu)`)}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="period-from" label="Okres oceny: od">
          <Input
            id="period-from"
            type="date"
            value={from}
            disabled={!view.can.edit}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field id="period-to" label="Okres oceny: do">
          <Input
            id="period-to"
            type="date"
            value={to}
            disabled={!view.can.edit}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">
          Sytuacje kadrowe w okresie oceny
        </h3>
        {situations.length === 0 && <p className="text-sm">Brak.</p>}
        {situations.map((s, i) => (
          <div
            key={`${s.kind}-${s.from}-${i}`}
            className="space-y-1 rounded-md bg-slate-50 p-3"
          >
            <p className="text-sm font-medium">
              {labels[s.kind]} od {s.from}
              {s.to ? ` do ${s.to}` : ""}
            </p>
            {s.kind === "evaluator_change" && (
              <Field
                id={`sit-${i}`}
                label="Opinia odchodzącego oceniającego dla następcy"
              >
                <textarea
                  id={`sit-${i}`}
                  className={textareaClass}
                  rows={2}
                  value={s.note ?? ""}
                  disabled={!view.can.edit}
                  onChange={(e) =>
                    setSituations(
                      situations.map((x, j) =>
                        j === i ? { ...x, note: e.target.value } : x,
                      ),
                    )
                  }
                />
              </Field>
            )}
          </div>
        ))}
      </div>
      <StepButtons
        view={view}
        pending={pending}
        onSave={() => void run(() => actions.save(patch()))}
        onNext={() =>
          void run(async () => {
            await actions.save(patch());
            await actions.advance();
          })
        }
        nextLabel="Zapisz i przejdź do rozmowy oceniającej"
      />
    </div>
  );
}

export function EvaluationStep({ view, actions, run, pending }: StepProps) {
  const [date, setDate] = useState(
    view.review.evaluationConversationDate ?? "",
  );
  const patch = (): ReviewPatch =>
    date ? { evaluationConversationDate: date } : {};
  return (
    <div className="space-y-4">
      <Field id="evaluation-date" label="Data rozmowy oceniającej">
        <Input
          id="evaluation-date"
          type="date"
          value={date}
          disabled={!view.can.edit}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>
      <StepButtons
        view={view}
        pending={pending}
        onSave={() => void run(() => actions.save(patch()))}
        onNext={() =>
          void run(async () => {
            await actions.save(patch());
            await actions.advance();
          })
        }
        nextLabel="Zapisz i przejdź do sporządzania oceny"
      />
    </div>
  );
}

export function WritingStep({ view, actions, run, pending }: StepProps) {
  const { review } = view;
  const [levels, setLevels] = useState<Record<string, string>>(
    Object.fromEntries(
      (review.ratings ?? []).map((r) => [r.criterionId, r.levelId]),
    ),
  );
  const [justification, setJustification] = useState(
    review.overallJustification ?? "",
  );
  const [plan, setPlan] = useState(review.developmentPlan?.summary ?? "");
  const [promotion, setPromotion] = useState(
    review.promotionRequest?.requested ?? false,
  );
  const [promotionText, setPromotionText] = useState(
    review.promotionRequest?.justification ?? "",
  );
  const edit = view.can.edit;
  const patch = (): ReviewPatch => ({
    ratings: view.criteria
      .filter((c) => c.expected && levels[c.id])
      .map((c) => ({ criterionId: c.id, levelId: levels[c.id]! })),
    overallJustification: justification,
    developmentPlan: { summary: plan },
    promotionRequest: { requested: promotion, justification: promotionText },
  });
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Oceny cząstkowe</h3>
        {view.criteria
          .filter((c) => c.expected)
          .map((c) => (
            <Field key={c.id} id={`rate-${c.id}`} label={c.name}>
              <select
                id={`rate-${c.id}`}
                className={textareaClass}
                value={levels[c.id] ?? ""}
                disabled={!edit}
                onChange={(e) =>
                  setLevels({ ...levels, [c.id]: e.target.value })
                }
              >
                <option value="">wybierz…</option>
                {view.scale.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.value} – {l.label}
                  </option>
                ))}
              </select>
            </Field>
          ))}
      </div>
      {view.preview && (
        <p className="rounded-md bg-slate-50 p-3 text-sm" aria-live="polite">
          Średnia {view.preview.average.toFixed(2)}, poziom ogólny:{" "}
          <strong>{view.preview.levelLabel}</strong>, ocena{" "}
          <strong>
            {view.preview.result === "positive" ? "pozytywna" : "negatywna"}
          </strong>
          .{view.preview.average >= 9 && " Wyższego poziomu nie ma."}
        </p>
      )}
      <Field
        id="justification"
        label="Uzasadnienie oceny (wymagane przy ocenie negatywnej)"
      >
        <textarea
          id="justification"
          className={textareaClass}
          rows={3}
          value={justification}
          disabled={!edit}
          onChange={(e) => setJustification(e.target.value)}
        />
      </Field>
      <Field
        id="plan"
        label="Wnioski dotyczące indywidualnego programu rozwoju zawodowego"
      >
        <textarea
          id="plan"
          className={textareaClass}
          rows={3}
          value={plan}
          disabled={!edit}
          onChange={(e) => setPlan(e.target.value)}
        />
      </Field>
      {view.preview?.promotionRequestAllowed && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={promotion}
              disabled={!edit}
              onChange={(e) => setPromotion(e.target.checked)}
            />
            Wniosek o kolejny stopień służbowy
          </label>
          {promotion && (
            <Field id="promotion-text" label="Umotywowanie wniosku">
              <textarea
                id="promotion-text"
                className={textareaClass}
                rows={2}
                value={promotionText}
                disabled={!edit}
                onChange={(e) => setPromotionText(e.target.value)}
              />
            </Field>
          )}
        </div>
      )}
      <StepButtons
        view={view}
        pending={pending}
        onSave={() => void run(() => actions.save(patch()))}
        onNext={() =>
          void run(async () => {
            await actions.save(patch());
            await actions.advance();
          })
        }
        nextLabel="Zapisz i przejdź do podpisów"
      />
    </div>
  );
}

export function SigningStep(props: StepProps) {
  const { review } = props.view;
  return (
    <div className="space-y-4">
      {review.overallResult && (
        <p className="text-sm">
          Ocena{" "}
          {review.overallResult === "positive" ? "pozytywna" : "negatywna"},
          średnia {review.averageScore?.toFixed(2)}.
        </p>
      )}
      <SignBox scope="assessment" {...props} />
    </div>
  );
}

export function ClosingStep({ view, actions, run, pending }: StepProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm">
        {view.review.stage === "closed"
          ? "Ocena jest zamknięta."
          : "Obie strony potwierdziły ocenę. Biegnie termin 7 dni na sprzeciw (art. 83)."}
      </p>
      {view.can.close && (
        <Button
          disabled={pending}
          onClick={() => void run(() => actions.close())}
        >
          Zamknij ocenę
        </Button>
      )}
    </div>
  );
}
