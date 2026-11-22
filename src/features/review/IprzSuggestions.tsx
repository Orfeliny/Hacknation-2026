import { useEffect, useState } from "react";
import type { CriterionId } from "../../../convex/rules/pack2016";
import { RouteLink } from "../../app/index";
import { AiBadge } from "../../components/ui/AiBadge";
import { Badge } from "../../components/ui/Badge";
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

function Option({ suggestion }: { suggestion: Suggestion }) {
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
    </li>
  );
}

function AreaSuggestions({
  reviewId,
  areaId,
  areaName,
}: {
  reviewId: string;
  areaId: CriterionId;
  areaName: string;
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
        <h4 className="text-base font-semibold">{areaName}</h4>
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
            <Option key={s.option._id} suggestion={s} />
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

export function IprzSuggestions({ view }: { view: ReviewView }) {
  const reviewId = view.review._id;
  const listing = useDraftsForReview({ reviewId });
  const names = new Map(view.criteria.map((c) => [c.id, c.name]));
  const areas = new Map<CriterionId, string>();
  for (const d of listing.data?.drafts ?? []) {
    if (d.section !== "development_area" || d.status === "rejected") continue;
    const name = names.get(d.criterionId as CriterionId);
    if (name) areas.set(d.criterionId as CriterionId, name);
  }
  if (areas.size === 0) return null;
  return (
    <section
      aria-labelledby="iprz-suggestions-heading"
      className="border-divider space-y-3 rounded-md border p-4"
    >
      <h4 id="iprz-suggestions-heading" className="text-base font-semibold">
        Oferty rozwojowe do wniosków IPRZ
      </h4>
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
        />
      ))}
    </section>
  );
}
