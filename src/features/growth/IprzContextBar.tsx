import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import { RouteLink } from "../../app/index";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useDemoRole } from "../../lib/demoRole";
import type { IprzContext } from "./context";
import { criterionName } from "./labels";

function ContextBar({ context, name }: { context: IprzContext; name: string }) {
  return (
    <div className="bg-surface-muted flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg px-4 py-3">
      <p>
        Szukasz ofert dla <strong>{name}</strong>. Obszar z wniosków IPRZ:{" "}
        {criterionName(context.area)}.
      </p>
      <RouteLink to={`/oceny?ocena=${encodeURIComponent(context.reviewId)}`}>
        Wróć do oceny
      </RouteLink>
    </div>
  );
}

// The context is trusted only once the review appears in the viewer's own list: a bad or foreign id never reaches
// a query that would throw.
export function IprzGate({
  context,
  children,
}: {
  context: IprzContext | undefined;
  children: (context: IprzContext | undefined) => ReactNode;
}) {
  const role = useDemoRole();
  const reviews = useQuery(
    api.reviews.queries.list,
    context ? { actor: { role } } : "skip",
  );
  if (!context) return children(undefined);
  if (reviews === undefined) return <>{children(undefined)}</>;
  const review =
    role === "supervisor"
      ? reviews.find((row) => row._id === context.reviewId)
      : undefined;
  if (!review) {
    return (
      <>
        <StatusAlert tone="warning">
          Ta ocena nie jest dostępna dla Twojej roli albo nie istnieje. Pokazuję
          cały katalog bez dodawania do IPRZ.
        </StatusAlert>
        {children(undefined)}
      </>
    );
  }
  return (
    <>
      <ContextBar context={context} name={review.employeeName} />
      {children(context)}
    </>
  );
}
