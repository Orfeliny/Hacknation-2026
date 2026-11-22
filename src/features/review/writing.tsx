import { useState } from "react";
import { Field } from "../../components/ui/Field";
import { RatingScale } from "../../components/ui/RatingScale";
import { Textarea } from "../../components/ui/Textarea";
import { AverageSummary } from "./AverageSummary";
import { StepButtons, type StepProps } from "./steps";
import type { ReviewPatch, ReviewView } from "./types";

export function RatingsSection({
  view,
  levels,
  onChange,
}: {
  view: ReviewView;
  levels: Record<string, string>;
  onChange: (criterionId: string, levelId: string) => void;
}) {
  const options = view.scale.map((l) => ({
    value: l.id,
    label: `${l.value} – ${l.label}`,
  }));
  return (
    <section aria-labelledby="ratings-heading" className="space-y-4">
      <h3 id="ratings-heading" className="text-base font-semibold">
        Oceny cząstkowe
      </h3>
      {view.criteria
        .filter((c) => c.expected)
        .map((c) => (
          <RatingScale
            key={c.id}
            legend={c.name}
            hint={c.description || undefined}
            options={options}
            value={levels[c.id] ?? ""}
            disabled={!view.can.edit}
            onChange={(levelId) => onChange(c.id, levelId)}
          />
        ))}
    </section>
  );
}

export function ConclusionsSection({
  view,
  justification,
  plan,
  promotion,
  promotionText,
  onJustification,
  onPlan,
  onPromotion,
  onPromotionText,
}: {
  view: ReviewView;
  justification: string;
  plan: string;
  promotion: boolean;
  promotionText: string;
  onJustification: (value: string) => void;
  onPlan: (value: string) => void;
  onPromotion: (value: boolean) => void;
  onPromotionText: (value: string) => void;
}) {
  const edit = view.can.edit;
  return (
    <section aria-labelledby="conclusions-heading" className="space-y-4">
      <h3 id="conclusions-heading" className="text-base font-semibold">
        Uzasadnienie i wnioski
      </h3>
      <Field label="Uzasadnienie oceny (wymagane przy ocenie negatywnej)">
        <Textarea
          id="justification"
          rows={3}
          value={justification}
          disabled={!edit}
          onChange={(e) => onJustification(e.target.value)}
        />
      </Field>
      <Field label="Wnioski dotyczące indywidualnego programu rozwoju zawodowego">
        <Textarea
          id="plan"
          rows={3}
          value={plan}
          disabled={!edit}
          onChange={(e) => onPlan(e.target.value)}
        />
      </Field>
      {view.preview?.promotionRequestAllowed && (
        <div className="space-y-2">
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              className="accent-primary size-5"
              checked={promotion}
              disabled={!edit}
              onChange={(e) => onPromotion(e.target.checked)}
            />
            Wniosek o kolejny stopień służbowy
          </label>
          {promotion && (
            <Field label="Umotywowanie wniosku">
              <Textarea
                id="promotion-text"
                rows={2}
                value={promotionText}
                disabled={!edit}
                onChange={(e) => onPromotionText(e.target.value)}
              />
            </Field>
          )}
        </div>
      )}
    </section>
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
  const patch = (): ReviewPatch => ({
    ratings: view.criteria
      .filter((c) => c.expected && levels[c.id])
      .map((c) => ({ criterionId: c.id, levelId: levels[c.id]! })),
    overallJustification: justification,
    developmentPlan: { summary: plan },
    promotionRequest: { requested: promotion, justification: promotionText },
  });
  return (
    <div className="space-y-6">
      <RatingsSection
        view={view}
        levels={levels}
        onChange={(criterionId, levelId) =>
          setLevels({ ...levels, [criterionId]: levelId })
        }
      />
      {view.preview && (
        <AverageSummary
          preview={view.preview}
          ratedCount={view.criteria.filter((c) => c.expected).length}
        />
      )}
      <ConclusionsSection
        view={view}
        justification={justification}
        plan={plan}
        promotion={promotion}
        promotionText={promotionText}
        onJustification={setJustification}
        onPlan={setPlan}
        onPromotion={setPromotion}
        onPromotionText={setPromotionText}
      />
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
