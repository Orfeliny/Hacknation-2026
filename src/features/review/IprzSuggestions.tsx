import { useEffect, useState } from "react";
import type { CriterionId } from "../../../convex/rules/pack2016";
import { RouteLink } from "../../app/index";
import { AiBadge } from "../../components/ui/AiBadge";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { StatusAlert } from "../../components/ui/StatusAlert";
import {
  useDraftsForReview,
  useRankOptions,
  useSuggestForArea,
  type RankResult,
  type Suggestion,
} from "../../lib/backend/iprz";
import type { ReviewView } from "./types";
import { useAiMode } from "./useAiMode";

const RANK_THRESHOLD = 5;

function Option({
  suggestion,
  onAdd,
}: {
  suggestion: Suggestion;
  onAdd: (text: string) => void;
}) {
  const { option, reason } = suggestion;
  return (
    <li className="border-divider space-y-1 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{option.title}</span>
        <Badge>{option.form}</Badge>
        {option.source === "demo" && <Badge>dane demonstracyjne</Badge>}
      </div>
      {option.provider && (
        <p className="text-muted text-sm">{option.provider}</p>
      )}
      <p className="text-sm">{reason}</p>
      <Button
        variant="secondary"
        aria-label={`Dodaj do wniosków: ${option.title}`}
        onClick={() => onAdd(option.title)}
      >
        Dodaj do wniosków
      </Button>
    </li>
  );
}

function AreaSuggestions({
  reviewId,
  areaId,
  areaName,
  onAdd,
}: {
  reviewId: string;
  areaId: CriterionId;
  areaName: string;
  onAdd: (text: string) => void;
}) {
  const criterionIds = [areaId];
  const suggestions = useSuggestForArea({ criterionIds });
  const rankOptions = useRankOptions();
  const mode = useAiMode();
  const [ranked, setRanked] = useState<RankResult | undefined>();
  const list = suggestions.data;
  const needsRanking = list !== undefined && list.length > RANK_THRESHOLD;

  useEffect(() => {
    if (!needsRanking) return;
    let current = true;
    rankOptions({ criterionIds: [areaId] })
      .then((result) => current && setRanked(result))
      .catch(() => current && setRanked(undefined));
    return () => {
      current = false;
    };
  }, [needsRanking, areaId, rankOptions]);

  const shown = needsRanking && ranked ? ranked.suggestions : list;
  const aiRanked = needsRanking && ranked?.ranking === "ai";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h6 className="text-base font-semibold">{areaName}</h6>
        {aiRanked ? <AiBadge mode={mode} /> : <Badge>bez rankingu AI</Badge>}
      </div>
      {!aiRanked && ranked?.note && (
        <p className="text-muted text-sm">{ranked.note}</p>
      )}
      {shown === undefined ? (
        <p>Ładowanie ofert…</p>
      ) : shown.length === 0 ? (
        <p>Brak pasujących ofert w katalogu.</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((s) => (
            <Option key={s.option._id} suggestion={s} onAdd={onAdd} />
          ))}
        </ul>
      )}
      <RouteLink
        to={`/rozwoj?ocena=${encodeURIComponent(reviewId)}&obszar=${encodeURIComponent(areaId)}`}
      >
        {`Szukaj ofert: ${areaName}`}
      </RouteLink>
    </div>
  );
}

export function IprzSuggestions({
  view,
  onAdd,
}: {
  view: ReviewView;
  onAdd: (text: string) => void;
}) {
  const reviewId = view.review._id;
  const listing = useDraftsForReview({ reviewId });
  const names = new Map(view.criteria.map((c) => [c.id, c.name]));
  const areas = new Map<CriterionId, string>();
  for (const d of listing.data?.drafts ?? []) {
    if (d.section !== "development_area" || d.status === "rejected") continue;
    const name = names.get(d.criterionId as CriterionId);
    if (name) areas.set(d.criterionId as CriterionId, name);
  }
  if (areas.size === 0) {
    return (
      <p className="text-muted border-border rounded-md border border-dashed p-3 text-sm">
        Sugerowane działania pojawią się, gdy w podpowiedziach AI wskażesz
        obszar do rozwoju.
      </p>
    );
  }
  return (
    <section
      aria-labelledby="iprz-suggestions-heading"
      className="border-border space-y-3 rounded-md border border-dashed p-4"
    >
      <h5 id="iprz-suggestions-heading" className="text-base font-semibold">
        Sugerowane działania (podpowiedź)
      </h5>
      <StatusAlert tone="info" live={false}>
        Oferty dobiera katalog według kryteriów. Wniosek do programu rozwoju
        piszesz Ty.
      </StatusAlert>
      {[...areas].map(([areaId, areaName]) => (
        <AreaSuggestions
          key={areaId}
          reviewId={reviewId}
          areaId={areaId}
          areaName={areaName}
          onAdd={onAdd}
        />
      ))}
    </section>
  );
}
