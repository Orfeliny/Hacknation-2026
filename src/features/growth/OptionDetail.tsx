import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  DEVELOPMENT_COST_LABELS,
  DEVELOPMENT_FORM_LABELS,
  DEVELOPMENT_LEVEL_LABELS,
} from "../../../convex/growth/constants";
import { Card } from "../../components/ui/Card";
import { ExternalLink } from "../../components/ui/ExternalLink";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { DemoDataNote } from "../../components/ui/DemoDataNote";
import { CostBadge, OfferActions, SourceBadge } from "./Catalog";
import type { IprzContext } from "./context";
import { criterionName } from "./labels";

const safeUrl = (url: string) => /^https?:\/\//i.test(url);

function NotFound() {
  return (
    <StatusAlert tone="danger">
      Nie znaleziono wpisu. Mógł zostać wycofany z katalogu.
    </StatusAlert>
  );
}

function OptionDetail({
  optionId,
  context,
}: {
  optionId: string;
  context: IprzContext | undefined;
}) {
  const options = useQuery(api.growth.options.listOptions, {});
  if (options === undefined) return <p>Ładowanie wpisu…</p>;
  const option = options.find((row) => row._id === optionId);
  if (!option) return <NotFound />;
  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="text-xl font-bold">{option.title}</h2>
      <div className="flex flex-wrap gap-2">
        <SourceBadge source={option.source} />
        <CostBadge cost={option.cost} />
      </div>
      {option.source === "demo" && <DemoDataNote />}
      <p>{option.description}</p>
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[10rem_1fr]">
        <dt className="text-muted">Forma</dt>
        <dd>{DEVELOPMENT_FORM_LABELS[option.form]}</dd>
        <dt className="text-muted">Poziom</dt>
        <dd>{DEVELOPMENT_LEVEL_LABELS[option.level]}</dd>
        {option.cost !== "brak_danych" && (
          <>
            <dt className="text-muted">Koszt</dt>
            <dd>
              {DEVELOPMENT_COST_LABELS[option.cost]}
              {option.costNote ? `, ${option.costNote}` : ""}
            </dd>
          </>
        )}
        {option.durationNote && (
          <>
            <dt className="text-muted">Czas trwania</dt>
            <dd>{option.durationNote}</dd>
          </>
        )}
        <dt className="text-muted">Kryteria oceny</dt>
        <dd>{option.criterionIds.map(criterionName).join(", ")}</dd>
        {option.provider && (
          <>
            <dt className="text-muted">Organizator</dt>
            <dd>{option.provider}</dd>
          </>
        )}
        {option.url && safeUrl(option.url) && (
          <>
            <dt className="text-muted">Strona</dt>
            <dd>
              <ExternalLink className="break-all" href={option.url}>
                {option.url}
              </ExternalLink>
            </dd>
          </>
        )}
        {option.sourceRef && (
          <>
            <dt className="text-muted">Źródło</dt>
            <dd>{option.sourceRef}</dd>
          </>
        )}
      </dl>
      <OfferActions option={option} context={context} />
    </Card>
  );
}

export function OptionDetailView({
  optionId,
  context,
}: {
  optionId: string;
  context: IprzContext | undefined;
}) {
  return <OptionDetail optionId={optionId} context={context} />;
}
