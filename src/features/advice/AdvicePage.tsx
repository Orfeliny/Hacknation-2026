import { useQuery } from "convex/react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import {
  ADVICE_TOPICS,
  ADVICE_TOPIC_LABELS,
  GROWTH_SOURCE_LABELS,
  type AdviceTopic,
  type GrowthSource,
} from "../../../convex/growth/constants";
import { RULES_2016 } from "../../../convex/rules/pack2016";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { getEnv } from "../../lib/env";

const selectClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600";

const criterionName = (id: string) =>
  RULES_2016.catalog.find((entry) => entry.id === id)?.name ?? id;

function SourceNote({
  source,
  sourceRef,
}: {
  source: GrowthSource;
  sourceRef?: string;
}) {
  if (source === "demo") {
    return (
      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
        {GROWTH_SOURCE_LABELS.demo}
      </span>
    );
  }
  return (
    <span className="text-xs text-slate-600">
      Źródło: {sourceRef ?? GROWTH_SOURCE_LABELS[source]}
    </span>
  );
}

// Held by the page, not by the list, so the filters survive opening an article and coming back.
function useAdviceFilters() {
  const [topic, setTopic] = useState<AdviceTopic | "">("");
  const [criterion, setCriterion] = useState("");
  const [search, setSearch] = useState("");
  return { topic, setTopic, criterion, setCriterion, search, setSearch };
}

function Filters({
  filters,
}: {
  filters: ReturnType<typeof useAdviceFilters>;
}) {
  const { topic, setTopic, criterion, setCriterion, search, setSearch } =
    filters;
  return (
    <form
      role="search"
      aria-label="Filtry porad"
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="space-y-1">
        <label htmlFor="advice-topic" className="block text-sm font-medium">
          Temat
        </label>
        <select
          id="advice-topic"
          className={selectClass}
          value={topic}
          onChange={(e) => setTopic(e.target.value as AdviceTopic | "")}
        >
          <option value="">wszystkie</option>
          {ADVICE_TOPICS.map((value) => (
            <option key={value} value={value}>
              {ADVICE_TOPIC_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="advice-criterion" className="block text-sm font-medium">
          Kryterium oceny
        </label>
        <select
          id="advice-criterion"
          className={selectClass}
          value={criterion}
          onChange={(e) => setCriterion(e.target.value)}
        >
          <option value="">wszystkie</option>
          {RULES_2016.catalog.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1 sm:col-span-2">
        <label htmlFor="advice-search" className="block text-sm font-medium">
          Szukaj w tytule i streszczeniu
        </label>
        <Input
          id="advice-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </form>
  );
}

function List({ filters }: { filters: ReturnType<typeof useAdviceFilters> }) {
  const { topic, setTopic, criterion, setCriterion, search, setSearch } =
    filters;
  const args = {
    ...(topic ? { topic } : {}),
    ...(criterion
      ? {
          criterionId: criterion as (typeof RULES_2016.catalog)[number]["id"],
        }
      : {}),
    ...(search.trim() ? { search } : {}),
  };
  const filtered = Object.keys(args).length > 0;
  const articles = useQuery(api.growth.advice.listAdvice, args);

  function clear() {
    setTopic("");
    setCriterion("");
    setSearch("");
    document.getElementById("advice-topic")?.focus();
  }

  return (
    <div className="space-y-4">
      <Filters filters={filters} />
      {filtered && (
        <Button type="button" className="bg-slate-600" onClick={clear}>
          Wyczyść filtry
        </Button>
      )}
      {articles === undefined ? (
        <p role="status">Ładowanie porad…</p>
      ) : articles.length === 0 ? (
        <p role="status">
          {filtered
            ? "Brak porad dla wybranych filtrów."
            : "Nie ma jeszcze żadnych porad."}
        </p>
      ) : (
        <>
          <p role="status" className="text-sm text-slate-600">
            Znaleziono: {articles.length}
          </p>
          <ul className="space-y-3">
            {articles.map((article) => (
              <li key={article._id}>
                <Card className="space-y-2">
                  <h2 className="text-lg font-semibold">
                    <Link
                      className="text-indigo-700 underline focus-visible:outline-2 focus-visible:outline-indigo-600"
                      to={`/porady?porada=${encodeURIComponent(article.slug)}`}
                    >
                      {article.title}
                    </Link>
                  </h2>
                  <p className="text-sm">{article.summary}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-indigo-100 px-2 py-0.5 font-medium text-indigo-900">
                      {ADVICE_TOPIC_LABELS[article.topic]}
                    </span>
                    {article.readingMinutes !== undefined && (
                      <span>Czas czytania: {article.readingMinutes} min</span>
                    )}
                    <SourceNote
                      source={article.source}
                      sourceRef={article.sourceRef}
                    />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function NotFound() {
  return (
    <p
      role="alert"
      className="rounded border border-amber-300 bg-amber-50 p-3 text-sm"
    >
      Nie znaleziono porady. Mogła zostać wycofana.
    </p>
  );
}

function Article({ slug }: { slug: string }) {
  const article = useQuery(api.growth.advice.getAdvice, { slug });
  if (article === undefined) return <p role="status">Ładowanie porady…</p>;
  if (article === null) return <NotFound />;
  return (
    <article className="space-y-4">
      <Card className="space-y-2">
        <h2 className="text-xl font-semibold">{article.title}</h2>
        <p className="text-sm">{article.summary}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded bg-indigo-100 px-2 py-0.5 font-medium text-indigo-900">
            {ADVICE_TOPIC_LABELS[article.topic]}
          </span>
          {article.readingMinutes !== undefined && (
            <span>Czas czytania: {article.readingMinutes} min</span>
          )}
          <SourceNote source={article.source} sourceRef={article.sourceRef} />
        </div>
        {article.criterionIds && article.criterionIds.length > 0 && (
          <p className="text-xs text-slate-600">
            Kryteria: {article.criterionIds.map(criterionName).join(", ")}
          </p>
        )}
      </Card>
      {article.sections.map((section, index) => (
        <section key={index} className="space-y-2">
          <h3 className="text-lg font-semibold">{section.heading}</h3>
          {section.paragraphs.map((paragraph, index) => (
            <p key={index} className="text-sm">
              {paragraph}
            </p>
          ))}
          {section.bullets.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {section.bullets.map((bullet, index) => (
                <li key={index}>{bullet}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}

export function AdvicePage() {
  const filters = useAdviceFilters();
  const online = getEnv().convexUrl !== undefined;
  const [params] = useSearchParams();
  const slug = params.get("porada");
  return (
    <section className="space-y-4">
      <title>Porady</title>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Porady dla przełożonych
        </h1>
        {slug && (
          <Link className="text-sm text-indigo-700 underline" to="/porady">
            Wszystkie porady
          </Link>
        )}
      </div>
      {!online ? (
        <p className="text-sm text-slate-600">
          Tryb offline: porady wymagają połączenia z backendem.
        </p>
      ) : slug ? (
        <Article key={slug} slug={slug} />
      ) : (
        <List filters={filters} />
      )}
    </section>
  );
}
