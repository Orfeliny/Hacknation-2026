import { useState } from "react";
import { RouteLink } from "../../app/index";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { formatDate } from "../../lib/format";
import { plural } from "../../lib/plural";
import type { ReviewPatch, ReviewView, WizardActions } from "./types";

const DAYS = { one: "dzień", few: "dni", many: "dni" };

export type StepProps = {
  view: ReviewView;
  actions: WizardActions;
  run: (task: () => Promise<unknown>) => Promise<void>;
  pending: boolean;
};

export function StepButtons({
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
  const hintId = "step-next-hint";
  const blocked = view.gaps.length;
  return (
    <div className="border-border flex flex-wrap items-center gap-3 border-t pt-4">
      <p id={hintId} className="text-muted flex-1 basis-60 text-sm">
        {blocked > 0
          ? `Ocenę przekażesz dalej, gdy usuniesz ${blocked} ${plural(blocked, { one: "brak formalny", few: "braki formalne", many: "braków formalnych" })}. Zapisz, aby odświeżyć kontrolę.`
          : "Zapisz zmiany albo przejdź do następnego etapu."}
      </p>
      <Button variant="secondary" disabled={pending} onClick={onSave}>
        Zapisz
      </Button>
      <RouteLink
        to={`/druk?ocena=${encodeURIComponent(view.review._id)}`}
        className="text-primary inline-flex min-h-11 items-center font-semibold"
      >
        Wydruk arkusza
      </RouteLink>
      <Button aria-describedby={hintId} disabled={pending} onClick={onNext}>
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
    <div className="border-divider space-y-2 rounded-md border p-3">
      <h3 className="text-base font-semibold">
        {scope === "part_one"
          ? "Potwierdzenie części I (rozmowa rozpoczynająca)"
          : "Potwierdzenie oceny"}
      </h3>
      <ul className="text-sm">
        {signatures.length === 0 && <li>Nikt jeszcze nie potwierdził.</li>}
        {signatures.map((s) => (
          <li key={`${s.role}-${s.signedAt}`}>
            Potwierdził {who(s.role)}: {s.place}, {formatDate(s.signedAt)}
          </li>
        ))}
      </ul>
      {mine && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Miejscowość">
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
      <Field label="Data rozmowy rozpoczynającej">
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
        <h3 className="text-base font-semibold">Oczekiwania wobec kryteriów</h3>
        {chosen.map((c) => (
          <Field key={c.id} label={c.name}>
            <Textarea
              id={`exp-${c.id}`}
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
        Termin sporządzenia oceny:{" "}
        <strong>{review.dueDate ? formatDate(review.dueDate) : "brak"}</strong>
        {view.daysLeft !== null &&
          (view.daysLeft >= 0
            ? ` (zostało ${view.daysLeft} ${plural(view.daysLeft, DAYS)})`
            : ` (${-view.daysLeft} ${plural(-view.daysLeft, DAYS)} po terminie)`)}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Okres oceny: od">
          <Input
            id="period-from"
            type="date"
            value={from}
            disabled={!view.can.edit}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="Okres oceny: do">
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
        <h3 className="text-base font-semibold">
          Sytuacje kadrowe w okresie oceny
        </h3>
        {situations.length === 0 && <p className="text-sm">Brak.</p>}
        {situations.map((s, i) => (
          <div
            key={`${s.kind}-${s.from}-${i}`}
            className="border-divider space-y-1 rounded-md border p-3"
          >
            <p className="text-sm font-medium">
              {labels[s.kind]} od {formatDate(s.from)}
              {s.to ? ` do ${formatDate(s.to)}` : ""}
            </p>
            {s.kind === "evaluator_change" && (
              <Field label="Opinia odchodzącego oceniającego dla następcy">
                <Textarea
                  id={`sit-${i}`}
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
      <Field label="Data rozmowy oceniającej">
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
