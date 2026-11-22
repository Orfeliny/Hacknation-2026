import { useQuery } from "convex/react";
import { Component, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import {
  ADVICE_TOPICS,
  ADVICE_TOPIC_LABELS,
  type AdviceTopic,
} from "../../../convex/growth/constants";
import { ADVICE_LIMITS } from "../../../convex/lib/contracts/advice";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { getEnv } from "../../lib/env";

const selectClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600";

const DEMO_LABEL = "Dane demonstracyjne";

function SourceLine({
  sourceRef,
  isDemo,
}: {
  sourceRef?: string | undefined;
  isDemo: boolean;
}) {
  return (
    <p className="text-xs text-slate-600">
      Źródło: {sourceRef ?? (isDemo ? DEMO_LABEL : "brak danych")}
      {isDemo && sourceRef ? ` (${DEMO_LABEL.toLowerCase()})` : ""}
    </p>
  );
}

function NotFound() {
  return (
    <div
      role="alert"
      className="space-y-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm"
    >
      <p>Nie znaleziono porady. Mogła zostać wycofana.</p>
      <Link className="text-indigo-700 underline" to="/porady">
        Wróć do listy porad
      </Link>
    </div>
  );
}

// A failed query (a broken slug, a dropped connection) throws while rendering; keep the page alive.
class Boundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function AdviceList() {
  const [topic, setTopic] = useState<AdviceTopic | "">("");
  const [search, setSearch] = useState("");
  const query = search.trim();
  const articles = useQuery(api.growth.advice.listAdvice, {
    audience: "przelozony",
    ...(topic ? { topic } : {}),
    ...(query ? { search: query } : {}),
  });
  const filtered = topic !== "" || query !== "";

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 sm:grid-cols-2">
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
            {ADVICE_TOPICS.map((t) => (
              <option key={t} value={t}>
                {ADVICE_TOPIC_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="advice-search" className="block text-sm font-medium">
            Szukaj w tytułach i opisach
          </label>
          <Input
            id="advice-search"
            type="search"
            maxLength={ADVICE_LIMITS.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>
      {articles === undefined ? (
        <p>Ładowanie porad…</p>
      ) : articles.length === 0 ? (
        <p>
          {filtered
            ? "Brak porad dla wybranych filtrów."
            : "Nie ma jeszcze żadnych porad."}
        </p>
      ) : (
        <ul className="space-y-2">
          {articles.map((a) => (
            <li key={a.slug}>
              <Card className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    className="font-medium text-indigo-700 underline"
                    to={`/porady?porada=${encodeURIComponent(a.slug)}`}
                  >
                    {a.title}
                  </Link>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                    {ADVICE_TOPIC_LABELS[a.topic]}
                  </span>
                  {a.readingMinutes !== undefined && (
                    <span className="text-xs text-slate-600">
                      {a.readingMinutes} min czytania
                    </span>
                  )}
                </div>
                <p className="text-sm">{a.summary}</p>
                <SourceLine sourceRef={a.sourceRef} isDemo={a.isDemo} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdviceArticle({ slug }: { slug: string }) {
  const article = useQuery(api.growth.advice.getAdvice, { slug });
  if (article === undefined) return <p>Ładowanie porady…</p>;
  if (article === null) return <NotFound />;
  return (
    <article className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">{article.title}</h2>
        <p className="text-sm text-slate-600">
          {ADVICE_TOPIC_LABELS[article.topic]}
          {article.readingMinutes !== undefined
            ? ` · ${article.readingMinutes} min czytania`
            : ""}
        </p>
        <SourceLine sourceRef={article.sourceRef} isDemo={article.isDemo} />
      </header>
      <p className="text-sm">{article.summary}</p>
      {article.sections.map((section, i) => (
        <section key={i} className="space-y-2">
          <h3 className="font-semibold">{section.heading}</h3>
          {section.paragraphs.map((p, j) => (
            <p key={j} className="text-sm">
              {p}
            </p>
          ))}
          {section.bullets.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {section.bullets.map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}

export function AdvicePage() {
  const online = getEnv().convexUrl !== undefined;
  const [params] = useSearchParams();
  const slug = params.get("porada");
  return (
    <section className="space-y-4">
      <title>Porady dla przełożonych</title>
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
        <Boundary key={slug} fallback={<NotFound />}>
          <AdviceArticle slug={slug} />
        </Boundary>
      ) : (
        <Boundary
          fallback={
            <p role="alert" className="text-sm">
              Nie udało się wczytać porad. Spróbuj odświeżyć stronę.
            </p>
          }
        >
          <AdviceList />
        </Boundary>
      )}
    </section>
  );
}
