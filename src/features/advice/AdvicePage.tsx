import { useDeferredValue, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ADVICE_TOPICS,
  ADVICE_TOPIC_LABELS,
  type AdviceAudience,
  type AdviceTopic,
} from "../../../convex/growth/constants";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageTitle } from "../../components/ui/PageTitle";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useAdviceList } from "../../lib/backend/advice";
import { useDemoRole, type DemoRole } from "../../lib/demoRole";
import { plural } from "../../lib/plural";
import { ArticleCard } from "./ArticleCard";
import { FailureBoundary } from "./FailureBoundary";

const AUDIENCE_BY_ROLE: Partial<Record<DemoRole, AdviceAudience>> = {
  supervisor: "przelozony",
  employee: "pracownik",
};

export function AdvicePage() {
  const role = useDemoRole();
  const [search, setSearch] = useState("");
  const title = role === "supervisor" ? "Porady dla przełożonych" : "Porady";

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>{title}</PageTitle>
      <nav aria-label="Ścieżka nawigacji" className="text-muted">
        <Link to="/pulpit" className="text-primary underline">
          Pulpit
        </Link>{" "}
        <span aria-hidden="true">/</span>{" "}
        <span aria-current="page">Porady</span>
      </nav>
      <PageHeader
        title={title}
        description="Krótkie teksty do przeczytania w 3–5 minut. Powstały na podstawie poradnika DSC i standardów zarządzania zasobami ludzkimi."
        actions={
          <div className="w-70">
            <Field label="Szukaj w poradach">
              <Input
                type="search"
                placeholder="np. trudna rozmowa"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Field>
          </div>
        }
      />
      <FailureBoundary
        fallback={
          <StatusAlert tone="danger">
            Nie udało się wczytać porad. Spróbuj odświeżyć stronę.
          </StatusAlert>
        }
      >
        <AdviceList search={search} />
      </FailureBoundary>
      <section
        aria-labelledby="porady-zrodla"
        className="bg-surface-muted rounded-xl px-5 py-4"
      >
        <h2 id="porady-zrodla" className="mb-1 text-[17px] font-bold">
          Skąd te teksty
        </h2>
        <p>
          Teksty redaguje Biuro Kadr albo DSC. Przy każdym podajemy datę i
          źródło. Pytania o przepisy zadasz w{" "}
          <Link to="/oceny" className="text-primary underline">
            arkuszu oceny
          </Link>
          , w polu „Zapytaj o przepisy”.
        </p>
      </section>
    </div>
  );
}

function AdviceList({ search }: { search: string }) {
  const role = useDemoRole();
  const [topic, setTopic] = useState<AdviceTopic | null>(null);
  const deferredSearch = useDeferredValue(search.trim());
  const audience = AUDIENCE_BY_ROLE[role];

  const [params] = useSearchParams();
  const wanted = params.get("porada");

  const { data } = useAdviceList({
    ...(topic ? { topic } : {}),
    ...(audience ? { audience } : {}),
    ...(deferredSearch ? { search: deferredSearch } : {}),
  });

  const filtered = topic !== null || deferredSearch !== "";

  return (
    <>
      <div
        role="group"
        aria-label="Etap oceny"
        className="flex flex-wrap gap-2"
      >
        <TopicButton active={topic === null} onClick={() => setTopic(null)}>
          Wszystkie
        </TopicButton>
        {ADVICE_TOPICS.map((value) => (
          <TopicButton
            key={value}
            active={topic === value}
            onClick={() => setTopic(value)}
          >
            {ADVICE_TOPIC_LABELS[value]}
          </TopicButton>
        ))}
      </div>
      {wanted && data && !filtered && !data.some((a) => a.slug === wanted) ? (
        <StatusAlert tone="info">
          Nie znaleziono porady z tego linku. Poniżej jest pełna lista.
        </StatusAlert>
      ) : null}
      {data && data.length > 0 ? (
        <p role="status" className="sr-only">
          Znaleziono {data.length}{" "}
          {plural(data.length, {
            one: "poradę",
            few: "porady",
            many: "porad",
          })}
        </p>
      ) : null}
      {data === undefined ? (
        <p role="status" className="text-muted">
          Wczytuję porady…
        </p>
      ) : data.length === 0 ? (
        <p role="status" className="text-muted">
          {filtered
            ? "Brak porad dla wybranego tematu i frazy."
            : "Nie ma jeszcze żadnych porad."}
        </p>
      ) : (
        <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4 p-0">
          {data.map((article) => (
            <ArticleCard
              key={article.slug}
              article={article}
              initiallyOpen={article.slug === wanted}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function TopicButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 rounded-lg border px-4 text-[15px] whitespace-nowrap ${
        active
          ? "border-ink bg-ink font-semibold text-white"
          : "border-border text-ink bg-white"
      }`}
    >
      {children}
    </button>
  );
}
