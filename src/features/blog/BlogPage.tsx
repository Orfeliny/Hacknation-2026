import { useQuery } from "convex/react";
import { Component, type ReactNode } from "react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import { ADVICE_TOPIC_LABELS } from "../../../convex/growth/constants";
import { RULES_2016 } from "../../../convex/rules/pack2016";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageTitle } from "../../components/ui/PageTitle";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { DevelopmentSuggestions } from "../growth/components/DevelopmentSuggestions";

const NEWEST = 3;
const DEMO_LABEL = "Dane demonstracyjne";
const ASSESSMENT_STAGES = new Set([
  "signing",
  "objection_window",
  "objection",
  "closed",
]);
const CRITERION_IDS = new Set<string>(RULES_2016.catalog.map((c) => c.id));

type CriterionId = (typeof RULES_2016.catalog)[number]["id"];
const isCriterionId = (id: string | undefined): id is CriterionId =>
  id !== undefined && CRITERION_IDS.has(id);

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

function Tile({
  to,
  title,
  text,
  count,
  unit,
}: {
  to: string;
  title: string;
  text: string;
  count: number | undefined;
  unit: string;
}) {
  return (
    <Card className="space-y-1">
      <Link
        to={to}
        className="text-primary font-semibold hover:underline"
        aria-label={`${title}: ${count === undefined ? "ładowanie" : `${count} ${unit}`}`}
      >
        {title}
      </Link>
      <p>{text}</p>
      <p className="text-muted text-sm">
        {count === undefined ? "…" : `${count} ${unit}`}
      </p>
    </Card>
  );
}

function Tiles() {
  const actor = { role: useDemoRole() };
  const options = useQuery(api.growth.options.listOptions, {});
  const advice = useQuery(api.growth.advice.listAdvice, {
    audience: "pracownik",
  });
  const threads = useQuery(api.forum.queries.listThreads, { actor });
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Tile
        to="/rozwoj"
        title="Katalog rozwoju"
        text="Szkolenia, kursy, mentoring i inne formy rozwoju."
        count={options?.length}
        unit="pozycji"
      />
      <Tile
        to="/porady"
        title="Porady"
        text="Krótkie artykuły o ocenie, rozmowie i rozwoju."
        count={advice?.length}
        unit="porad"
      />
      <Tile
        to="/forum"
        title="Forum rozwoju"
        text="Pytania, polecenia kursów, oferty i szukanie mentora."
        count={threads?.length}
        unit="wątków"
      />
    </div>
  );
}

function Newest() {
  const actor = { role: useDemoRole() };
  const advice = useQuery(api.growth.advice.listAdvice, {
    audience: "pracownik",
  });
  const threads = useQuery(api.forum.queries.listThreads, { actor });
  return (
    <section aria-labelledby="newest-heading" className="space-y-3">
      <h2 id="newest-heading" className="text-ink text-[22px] font-bold">
        Najnowsze
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-ink text-lg font-bold">Wątki z forum</h3>
          {threads === undefined ? (
            <p className="text-muted">Ładowanie…</p>
          ) : threads.length === 0 ? (
            <p className="text-muted">Nie ma jeszcze żadnych wątków.</p>
          ) : (
            <ul className="space-y-2">
              {threads.slice(0, NEWEST).map((t) => (
                <li key={t.threadId}>
                  <Link
                    className="text-primary hover:underline"
                    to={`/forum?watek=${t.threadId}`}
                  >
                    {t.title}
                  </Link>
                  <p className="text-muted text-sm">
                    {t.authorName} · odpowiedzi: {t.replyCount}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="text-ink text-lg font-bold">Porady do przeczytania</h3>
          {advice === undefined ? (
            <p className="text-muted">Ładowanie…</p>
          ) : advice.length === 0 ? (
            <p className="text-muted">Nie ma jeszcze żadnych porad.</p>
          ) : (
            <ul className="space-y-2">
              {advice.slice(0, NEWEST).map((a) => (
                <li key={a.slug}>
                  <Link
                    className="text-primary hover:underline"
                    to={`/porady?porada=${encodeURIComponent(a.slug)}`}
                  >
                    {a.title}
                  </Link>
                  <p className="text-muted text-sm">
                    {ADVICE_TOPIC_LABELS[a.topic]}
                    {a.isDemo ? ` · ${DEMO_LABEL}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function NoAreas({ text }: { text: string }) {
  return (
    <div className="space-y-1">
      <p>{text}</p>
      <Link className="text-primary underline" to="/rozwoj">
        Przejdź do pełnego katalogu rozwoju
      </Link>
    </div>
  );
}

function OwnAreas() {
  const actor = { role: useDemoRole() };
  const reviews = useQuery(api.me.queries.list, { actor });
  const latest = reviews?.find((r) => ASSESSMENT_STAGES.has(r.stage));
  const detail = useQuery(
    api.me.queries.get,
    latest ? { actor, reviewId: latest._id } : "skip",
  );
  if (reviews === undefined) return <p className="text-muted">Ładowanie…</p>;
  if (!latest) {
    return (
      <NoAreas text="Nie masz jeszcze oceny z planem rozwoju, więc nie mamy skąd wziąć obszarów rozwoju." />
    );
  }
  if (detail === undefined) return <p className="text-muted">Ładowanie…</p>;
  const criteria = [
    ...new Set(
      (detail.assessment?.developmentPlan?.areas ?? [])
        .map((a) => a.criterionId)
        .filter(isCriterionId),
    ),
  ];
  if (criteria.length === 0) {
    return (
      <NoAreas text="W Twoim planie rozwoju nie wskazano jeszcze obszarów powiązanych z kryteriami." />
    );
  }
  return <DevelopmentSuggestions criterionIds={criteria} />;
}

function AreasSection() {
  const role = useDemoRole();
  return (
    <section aria-labelledby="areas-heading" className="space-y-3">
      <h2 id="areas-heading" className="text-ink text-[22px] font-bold">
        Dla Twoich obszarów rozwoju
      </h2>
      {role !== "employee" ? (
        <NoAreas text="Podpowiedzi pokazujemy zalogowanemu pracownikowi, na podstawie jego własnej oceny." />
      ) : (
        <Boundary
          fallback={
            <NoAreas text="Nie udało się wczytać Twoich obszarów rozwoju." />
          }
        >
          <OwnAreas />
        </Boundary>
      )}
    </section>
  );
}

export function BlogPage() {
  const online = getEnv().convexUrl !== undefined;
  return (
    <section className="space-y-6">
      <PageTitle>Blog rozwoju</PageTitle>
      <PageHeader title="Blog rozwoju" />
      {!online ? (
        <p className="text-muted">
          Tryb offline: blog rozwoju wymaga połączenia z backendem.
        </p>
      ) : (
        <>
          <Boundary
            fallback={
              <StatusAlert tone="warning">
                Nie udało się wczytać blogu rozwoju. Spróbuj odświeżyć stronę.
              </StatusAlert>
            }
          >
            <Tiles />
            <Newest />
          </Boundary>
          <AreasSection />
        </>
      )}
    </section>
  );
}
