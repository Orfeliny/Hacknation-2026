import { useDeferredValue, useState } from "react";
import {
  ADVICE_TOPICS,
  ADVICE_TOPIC_LABELS,
  type AdviceAudience,
  type AdviceTopic,
} from "../../../convex/growth/constants";
import { DemoDataNote } from "../../components/ui/DemoDataNote";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useAdviceList } from "../../lib/backend/advice";
import { useDemoRole, type DemoRole } from "../../lib/demoRole";
import { ArticleCard } from "./ArticleCard";
import { FailureBoundary } from "./FailureBoundary";

const AUDIENCE_BY_ROLE: Partial<Record<DemoRole, AdviceAudience>> = {
  supervisor: "przelozony",
  employee: "pracownik",
};

export function AdvicePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Porady"
        description="Krótkie teksty do przeczytania w 3–5 minut. Powstały na podstawie poradnika DSC i standardów zarządzania zasobami ludzkimi."
      />
      <FailureBoundary
        fallback={
          <StatusAlert tone="danger">
            Nie udało się wczytać porad. Spróbuj odświeżyć stronę.
          </StatusAlert>
        }
      >
        <AdviceList />
      </FailureBoundary>
    </div>
  );
}

function AdviceList() {
  const role = useDemoRole();
  const [topic, setTopic] = useState<AdviceTopic | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const audience = AUDIENCE_BY_ROLE[role];

  const { data, isDemo } = useAdviceList({
    ...(topic ? { topic } : {}),
    ...(audience ? { audience } : {}),
    ...(deferredSearch ? { search: deferredSearch } : {}),
  });

  const showDemoNote = isDemo || (data?.some((a) => a.isDemo) ?? false);

  const filtered = topic !== null || deferredSearch !== "";

  return (
    <>
      {showDemoNote ? <DemoDataNote /> : null}
      <div className="max-w-sm">
        <Field label="Szukaj w poradach">
          <Input
            type="search"
            placeholder="np. trudna rozmowa"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
      </div>
      <div role="group" aria-label="Temat" className="flex flex-wrap gap-2">
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
        <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(340px,1fr))] items-start gap-4 p-0">
          {data.map((article) => (
            <ArticleCard key={article.slug} article={article} />
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
      className={`min-h-11 rounded-md border px-4 text-sm font-semibold whitespace-nowrap ${
        active
          ? "border-ink bg-ink text-white"
          : "border-border text-ink bg-white"
      }`}
    >
      {children}
    </button>
  );
}
