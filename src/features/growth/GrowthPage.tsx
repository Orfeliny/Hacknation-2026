import { useQuery } from "convex/react";
import { Component, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  DEVELOPMENT_COSTS,
  DEVELOPMENT_COST_LABELS,
  DEVELOPMENT_FORMS,
  DEVELOPMENT_FORM_LABELS,
  DEVELOPMENT_LEVELS,
  DEVELOPMENT_LEVEL_LABELS,
  GROWTH_SOURCE_LABELS,
  type DevelopmentCost,
  type DevelopmentForm,
  type DevelopmentLevel,
  type GrowthSource,
} from "../../../convex/growth/constants";
import { RULES_2016 } from "../../../convex/rules/pack2016";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { AdminPanel } from "./admin/AdminPanel";

const selectClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600";

const criterionName = (id: string) =>
  RULES_2016.catalog.find((entry) => entry.id === id)?.name ?? id;

function SourceBadge({ source }: { source: GrowthSource }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${
        source === "demo"
          ? "bg-amber-100 text-amber-900"
          : "bg-slate-100 text-slate-800"
      }`}
    >
      {GROWTH_SOURCE_LABELS[source]}
    </span>
  );
}

function FilterSelect<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: T | "";
  onChange: (value: T | "") => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        className={selectClass}
        value={value}
        onChange={(e) => onChange(e.target.value as T | "")}
      >
        <option value="">wszystkie</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Held by the page, not by the catalog, so the filters survive a visit to an entry and back.
function useCatalogFilters() {
  const [criterion, setCriterion] = useState("");
  const [form, setForm] = useState<DevelopmentForm | "">("");
  const [level, setLevel] = useState<DevelopmentLevel | "">("");
  const [cost, setCost] = useState<DevelopmentCost | "">("");
  const [search, setSearch] = useState("");
  return {
    criterion,
    setCriterion,
    form,
    setForm,
    level,
    setLevel,
    cost,
    setCost,
    search,
    setSearch,
  };
}

function Catalog({
  filters,
}: {
  filters: ReturnType<typeof useCatalogFilters>;
}) {
  const {
    criterion,
    setCriterion,
    form,
    setForm,
    level,
    setLevel,
    cost,
    setCost,
    search,
    setSearch,
  } = filters;

  const args = {
    ...(criterion
      ? {
          criterionId: criterion as (typeof RULES_2016.catalog)[number]["id"],
        }
      : {}),
    ...(form ? { form } : {}),
    ...(level ? { level } : {}),
    ...(cost ? { cost } : {}),
    ...(search.trim() ? { search } : {}),
  };
  const filtered = Object.keys(args).length > 0;
  const options = useQuery(api.growth.options.listOptions, args);

  function clear() {
    setCriterion("");
    setForm("");
    setLevel("");
    setCost("");
    setSearch("");
  }

  return (
    <div className="space-y-4">
      <form
        role="search"
        aria-label="Filtry katalogu"
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => e.preventDefault()}
      >
        <FilterSelect
          id="filter-criterion"
          label="Kryterium oceny"
          value={criterion}
          onChange={setCriterion}
          options={RULES_2016.catalog.map((entry) => ({
            value: entry.id,
            label: entry.name,
          }))}
        />
        <FilterSelect
          id="filter-form"
          label="Forma"
          value={form}
          onChange={setForm}
          options={DEVELOPMENT_FORMS.map((value) => ({
            value,
            label: DEVELOPMENT_FORM_LABELS[value],
          }))}
        />
        <FilterSelect
          id="filter-level"
          label="Poziom"
          value={level}
          onChange={setLevel}
          options={DEVELOPMENT_LEVELS.map((value) => ({
            value,
            label: DEVELOPMENT_LEVEL_LABELS[value],
          }))}
        />
        <FilterSelect
          id="filter-cost"
          label="Koszt"
          value={cost}
          onChange={setCost}
          options={DEVELOPMENT_COSTS.map((value) => ({
            value,
            label: DEVELOPMENT_COST_LABELS[value],
          }))}
        />
        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="filter-search" className="block text-sm font-medium">
            Szukaj w tytule i opisie
          </label>
          <Input
            id="filter-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </form>

      {filtered && (
        <Button type="button" className="bg-slate-600" onClick={clear}>
          Wyczyść filtry
        </Button>
      )}

      {options === undefined ? (
        <p role="status">Ładowanie katalogu…</p>
      ) : options.length === 0 ? (
        <p role="status">
          {filtered
            ? "Brak wpisów dla wybranych filtrów."
            : "Katalog jest pusty. Wpisy dodają kadry."}
        </p>
      ) : (
        <>
          <p role="status" className="text-sm text-slate-600">
            Znaleziono: {options.length}
          </p>
          <ul className="space-y-3">
            {options.map((option) => (
              <li key={option._id}>
                <Card className="space-y-2">
                  <h2 className="text-lg font-semibold">
                    <Link
                      className="text-indigo-700 underline focus-visible:outline-2 focus-visible:outline-indigo-600"
                      to={`/rozwoj?wpis=${encodeURIComponent(option._id)}`}
                    >
                      {option.title}
                    </Link>
                  </h2>
                  <p className="text-sm">{option.description}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-indigo-100 px-2 py-0.5 font-medium text-indigo-900">
                      {DEVELOPMENT_FORM_LABELS[option.form]}
                    </span>
                    <span>
                      Poziom: {DEVELOPMENT_LEVEL_LABELS[option.level]}
                    </span>
                    <span>Koszt: {DEVELOPMENT_COST_LABELS[option.cost]}</span>
                    <SourceBadge source={option.source} />
                  </div>
                  <p className="text-xs text-slate-600">
                    Kryteria:{" "}
                    {option.criterionIds.map(criterionName).join(", ")}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

const safeUrl = (url: string) => /^https?:\/\//i.test(url);

function OptionDetail({ optionId }: { optionId: Id<"developmentOptions"> }) {
  const option = useQuery(api.growth.options.getOption, { optionId });
  if (option === undefined) return <p>Ładowanie wpisu…</p>;
  if (option === null) return <NotFound />;
  return (
    <Card className="space-y-3">
      <h2 className="text-xl font-semibold">{option.title}</h2>
      <SourceBadge source={option.source} />
      <p className="text-sm">{option.description}</p>
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
        <dt className="font-medium">Forma</dt>
        <dd>{DEVELOPMENT_FORM_LABELS[option.form]}</dd>
        <dt className="font-medium">Poziom</dt>
        <dd>{DEVELOPMENT_LEVEL_LABELS[option.level]}</dd>
        <dt className="font-medium">Koszt</dt>
        <dd>
          {DEVELOPMENT_COST_LABELS[option.cost]}
          {option.costNote ? `, ${option.costNote}` : ""}
        </dd>
        {option.durationNote && (
          <>
            <dt className="font-medium">Czas trwania</dt>
            <dd>{option.durationNote}</dd>
          </>
        )}
        <dt className="font-medium">Kryteria oceny</dt>
        <dd>{option.criterionIds.map(criterionName).join(", ")}</dd>
        {option.provider && (
          <>
            <dt className="font-medium">Organizator</dt>
            <dd>{option.provider}</dd>
          </>
        )}
        {option.url && safeUrl(option.url) && (
          <>
            <dt className="font-medium">Strona</dt>
            <dd>
              <a
                className="break-all text-indigo-700 underline"
                href={option.url}
                rel="noreferrer noopener"
              >
                {option.url}
              </a>
            </dd>
          </>
        )}
        {option.sourceRef && (
          <>
            <dt className="font-medium">Źródło</dt>
            <dd>{option.sourceRef}</dd>
          </>
        )}
      </dl>
    </Card>
  );
}

function NotFound() {
  return (
    <p
      role="alert"
      className="rounded border border-amber-300 bg-amber-50 p-3 text-sm"
    >
      Nie znaleziono wpisu. Mógł zostać wycofany z katalogu.
    </p>
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

export function GrowthPage() {
  const filters = useCatalogFilters();
  const online = getEnv().convexUrl !== undefined;
  const [params] = useSearchParams();
  const optionId = params.get("wpis");
  const managing = params.get("zarzadzanie") === "1";
  const isHr = useDemoRole() === "hr";
  return (
    <section className="space-y-4">
      <title>Rozwój</title>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Możliwości rozwoju
        </h1>
        {optionId || managing ? (
          <Link className="text-sm text-indigo-700 underline" to="/rozwoj">
            Cały katalog
          </Link>
        ) : (
          isHr && (
            <Link
              className="text-sm text-indigo-700 underline"
              to="/rozwoj?zarzadzanie=1"
            >
              Zarządzaj treścią
            </Link>
          )
        )}
      </div>
      {!online ? (
        <p className="text-sm text-slate-600">
          Tryb offline: katalog wymaga połączenia z backendem.
        </p>
      ) : managing ? (
        <AdminPanel />
      ) : optionId ? (
        <IdBoundary key={optionId}>
          <OptionDetail optionId={optionId as Id<"developmentOptions">} />
        </IdBoundary>
      ) : (
        <Catalog filters={filters} />
      )}
    </section>
  );
}
