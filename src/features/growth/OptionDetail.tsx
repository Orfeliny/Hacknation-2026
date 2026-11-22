import { useQuery } from "convex/react";
import { Component, type ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  DEVELOPMENT_COST_LABELS,
  DEVELOPMENT_FORM_LABELS,
  DEVELOPMENT_LEVEL_LABELS,
} from "../../../convex/growth/constants";
import { Card } from "../../components/ui/Card";
import { ExternalLink } from "../../components/ui/ExternalLink";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { SourceBadge } from "./Catalog";
import { criterionName } from "./labels";

const safeUrl = (url: string) => /^https?:\/\//i.test(url);

function NotFound() {
  return (
    <StatusAlert tone="danger">
      Nie znaleziono wpisu. Mógł zostać wycofany z katalogu.
    </StatusAlert>
  );
}

function OptionDetail({ optionId }: { optionId: Id<"developmentOptions"> }) {
  const option = useQuery(api.growth.options.getOption, { optionId });
  if (option === undefined) return <p>Ładowanie wpisu…</p>;
  if (option === null) return <NotFound />;
  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="text-xl font-bold">{option.title}</h2>
      <div>
        <SourceBadge source={option.source} />
      </div>
      <p>{option.description}</p>
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[10rem_1fr]">
        <dt className="text-muted">Forma</dt>
        <dd>{DEVELOPMENT_FORM_LABELS[option.form]}</dd>
        <dt className="text-muted">Poziom</dt>
        <dd>{DEVELOPMENT_LEVEL_LABELS[option.level]}</dd>
        <dt className="text-muted">Koszt</dt>
        <dd>
          {DEVELOPMENT_COST_LABELS[option.cost]}
          {option.costNote ? `, ${option.costNote}` : ""}
        </dd>
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
    </Card>
  );
}

// A malformed id in the address makes the query throw; show "not found" instead of a crash.
class IdBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <NotFound /> : this.props.children;
  }
}

export function OptionDetailView({ optionId }: { optionId: string }) {
  return (
    <IdBoundary key={optionId}>
      <OptionDetail optionId={optionId as Id<"developmentOptions">} />
    </IdBoundary>
  );
}
