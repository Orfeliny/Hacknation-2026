import { useState, type ComponentProps } from "react";
import { Field } from "../../components/ui/Field";
import { RouteLink } from "../../app/index";
import { Textarea } from "../../components/ui/Textarea";
import { CompactRating } from "./CompactRating";
import { AiHintsPanel } from "./AiHints";
import { IprzSuggestions } from "./IprzSuggestions";
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
    short: String(l.value),
    label: `${l.value} – ${l.label}`,
  }));
  const rated = view.criteria.filter((c) => c.expected);
  const groups = [
    {
      title: `Obowiązkowe (${rated.filter((c) => c.kind === "mandatory").length})`,
      items: rated.filter((c) => c.kind === "mandatory"),
    },
    {
      title: `Dodatkowe (${rated.filter((c) => c.kind === "additional").length} z ${view.maxAdditional} możliwych)`,
      items: rated.filter((c) => c.kind === "additional"),
    },
  ].filter((g) => g.items.length > 0);
  return (
    <section aria-labelledby="ratings-heading" className="space-y-4">
      <div>
        <h3 id="ratings-heading" className="text-[22px] font-bold">
          Oceny cząstkowe
        </h3>
        <p className="text-muted text-sm">
          {view.scale.map((l) => `${l.value} ${l.label}`).join(" · ")}
        </p>
      </div>
      {groups.map((g) => (
        <div key={g.title} className="space-y-2">
          <h4 className="bg-surface-muted rounded-md px-3 py-1.5 font-semibold">
            {g.title}
          </h4>
          {g.items.map((c) => (
            <CompactRating
              key={c.id}
              legend={c.name}
              description={c.description || undefined}
              options={options}
              value={levels[c.id] ?? ""}
              disabled={!view.can.edit}
              onChange={(levelId) => onChange(c.id, levelId)}
            />
          ))}
        </div>
      ))}
      {view.can.edit && Object.values(levels).some(Boolean) && (
        <AiHintsPanel view={view} />
      )}
    </section>
  );
}

function TextValue({
  edit,
  value,
  label,
  children,
}: {
  edit: boolean;
  value: string;
  label: string;
  children: ComponentProps<typeof Field>["children"];
}) {
  if (edit) return <Field label={label}>{children}</Field>;
  return (
    <div>
      <p className="font-semibold">{label}</p>
      <p className="whitespace-pre-line">{value || "Brak wpisu."}</p>
    </div>
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
  const id = encodeURIComponent(view.review._id);
  return (
    <section aria-labelledby="conclusions-heading" className="space-y-4">
      <h3 id="conclusions-heading" className="text-[22px] font-bold">
        Uzasadnienie i wnioski
      </h3>
      <TextValue
        edit={edit}
        value={justification}
        label="Uzasadnienie oceny (wymagane przy ocenie negatywnej)"
      >
        <Textarea
          id="justification"
          rows={3}
          value={justification}
          onChange={(e) => onJustification(e.target.value)}
        />
      </TextValue>
      <div className="space-y-3">
        <h4 className="text-lg font-bold">
          Wnioski do indywidualnego programu rozwoju zawodowego
        </h4>
        <p className="text-sm">
          <span className="text-danger font-semibold">Wymagane</span>
          <span className="text-muted"> · Podstawa: § 11 ust. 1 pkt 5</span>
        </p>
        <TextValue edit={edit} value={plan} label="Wnioski">
          <Textarea
            id="plan"
            rows={3}
            value={plan}
            onChange={(e) => onPlan(e.target.value)}
          />
        </TextValue>
        {edit && (
          <IprzSuggestions
            view={view}
            onAdd={(text) =>
              onPlan(
                plan.trim()
                  ? `${plan.trim()}
${text}`
                  : text,
              )
            }
          />
        )}
        <p className="bg-surface-muted rounded-md px-3 py-2 text-sm">
          Wnioski mogą wzmacniać mocne strony albo rozwijać obszary do poprawy.{" "}
          <RouteLink to={`/rozwoj?ocena=${id}`}>Zobacz oferty</RouteLink>
        </p>
      </div>
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
            <TextValue
              edit={edit}
              value={promotionText}
              label="Umotywowanie wniosku"
            >
              <Textarea
                id="promotion-text"
                rows={2}
                value={promotionText}
                onChange={(e) => onPromotionText(e.target.value)}
              />
            </TextValue>
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
