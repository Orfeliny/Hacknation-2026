import { RouteLink } from "../../app/index";
import { useDraftsForReview } from "../../lib/backend/iprz";
import type { IprzContext } from "./context";
import { criterionName } from "./labels";

export function IprzContextBar({ context }: { context: IprzContext }) {
  const { data } = useDraftsForReview({ reviewId: context.reviewId });
  return (
    <div className="bg-surface-muted flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg px-4 py-3">
      <p>
        Szukasz ofert dla{" "}
        <strong>{data ? data.review.employeeName : "wybranej osoby"}</strong>.
        Obszar z wniosków IPRZ: {criterionName(context.area)}.
      </p>
      <RouteLink to={`/oceny?ocena=${encodeURIComponent(context.reviewId)}`}>
        Wróć do oceny
      </RouteLink>
    </div>
  );
}
