import { useQuery } from "convex/react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import {
  DEVELOPMENT_COSTS,
  DEVELOPMENT_COST_LABELS,
  DEVELOPMENT_FORMS,
  DEVELOPMENT_FORM_LABELS,
  DEVELOPMENT_LEVELS,
  DEVELOPMENT_LEVEL_LABELS,
  GROWTH_SOURCE_LABELS,
  type DevelopmentForm,
  type GrowthSource,
} from "../../../convex/growth/constants";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useAddToIprz } from "../../lib/backend/iprz";
import { rozwojHref, type IprzContext } from "./context";
import type { CatalogFilters } from "./useCatalogFilters";
import { CRITERIA, criterionName } from "./labels";

export function SourceBadge({ source }: { source: GrowthSource }) {
  return <Badge>{GROWTH_SOURCE_LABELS[source]}</Badge>;
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T | "";
  onChange: (value: T | "") => void;
  options: { value: T; label: string }[];
}) {
  return (
    <Field label={label}>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as T | "")}
        className="min-w-44"
      >
        <option value="">wszystkie</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

const INTEREST_FORMS: readonly DevelopmentForm[] = [
  "mentoring",
  "wymiana_doswiadczen",
  "zadanie_rozwojowe",
];

function SignUpButton({ option }: { option: Doc<"developmentOptions"> }) {
  const [done, setDone] = useState(false);
  const label = INTEREST_FORMS.includes(option.form)
    ? "Zgłoś zainteresowanie"
    : "Zapisz się";
  return (
    <>
      <Button disabled={done} onClick={() => setDone(true)}>
        {label}
        <span className="sr-only">: {option.title}</span>
      </Button>
      {done && (
        <p role="status" className="text-success w-full text-sm font-semibold">
          Zgłoszenie odnotowane w widoku demonstracyjnym. Nic nie zostało
          wysłane.
        </p>
      )}
    </>
  );
}

function AddToIprzButton({
  option,
  context,
}: {
  option: Doc<"developmentOptions">;
  context: IprzContext;
}) {
  const addToIprz = useAddToIprz();
  const [state, setState] = useState<"idle" | "busy" | "done" | "failed">(
    "idle",
  );

  async function add() {
    setState("busy");
    try {
      await addToIprz({
        reviewId: context.reviewId,
        areaId: context.area,
        optionId: option._id,
        text: option.title,
      });
      setState("done");
    } catch {
      setState("failed");
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        disabled={state === "busy" || state === "done"}
        onClick={() => void add()}
      >
        Dodaj do IPRZ
        <span className="sr-only">: {option.title}</span>
      </Button>
      {state === "done" && (
        <p role="status" className="text-success w-full text-sm font-semibold">
          Dodano do wniosków IPRZ: {option.title}.
        </p>
      )}
      {state === "failed" && (
        <p role="alert" className="text-danger w-full text-sm font-semibold">
          Nie udało się dodać oferty do IPRZ. Spróbuj ponownie.
        </p>
      )}
    </>
  );
}

function OfferCard({
  option,
  context,
  params,
}: {
  option: Doc<"developmentOptions">;
  context: IprzContext | undefined;
  params: URLSearchParams;
}) {
  return (
    <Card className="flex h-full flex-col gap-3 p-5">
      <div className="flex flex-wrap gap-2">
        <Badge>{DEVELOPMENT_FORM_LABELS[option.form]}</Badge>
        <Badge>{DEVELOPMENT_COST_LABELS[option.cost]}</Badge>
        <SourceBadge source={option.source} />
      </div>
      <h3 className="text-lg font-bold">
        <Link to={rozwojHref(params, { wpis: option._id })}>
          {option.title}
        </Link>
      </h3>
      <p>{option.description}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        {option.provider && (
          <>
            <dt className="text-muted">Organizator</dt>
            <dd>{option.provider}</dd>
          </>
        )}
        <dt className="text-muted">Rozwija</dt>
        <dd>{option.criterionIds.map(criterionName).join(", ")}</dd>
        <dt className="text-muted">Poziom</dt>
        <dd>{DEVELOPMENT_LEVEL_LABELS[option.level]}</dd>
        {option.durationNote && (
          <>
            <dt className="text-muted">Termin</dt>
            <dd>{option.durationNote}</dd>
          </>
        )}
        {option.costNote && (
          <>
            <dt className="text-muted">Koszt</dt>
            <dd>{option.costNote}</dd>
          </>
        )}
      </dl>
      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        <SignUpButton option={option} />
        {context && <AddToIprzButton option={option} context={context} />}
      </div>
    </Card>
  );
}

export function Catalog({
  filters,
  context,
}: {
  filters: CatalogFilters;
  context: IprzContext | undefined;
}) {
  const [params] = useSearchParams();
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
    ...(criterion ? { criterionId: criterion } : {}),
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
    <div className="flex flex-col gap-4">
      <form
        role="search"
        aria-label="Filtry ofert"
        className="border-border flex flex-wrap items-end gap-x-4 gap-y-3 rounded-xl border bg-white px-5 py-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <FilterSelect
          label="Typ"
          value={form}
          onChange={setForm}
          options={DEVELOPMENT_FORMS.map((value) => ({
            value,
            label: DEVELOPMENT_FORM_LABELS[value],
          }))}
        />
        <FilterSelect
          label="Kryterium"
          value={criterion}
          onChange={setCriterion}
          options={CRITERIA}
        />
        <FilterSelect
          label="Poziom"
          value={level}
          onChange={setLevel}
          options={DEVELOPMENT_LEVELS.map((value) => ({
            value,
            label: DEVELOPMENT_LEVEL_LABELS[value],
          }))}
        />
        <FilterSelect
          label="Koszt"
          value={cost}
          onChange={setCost}
          options={DEVELOPMENT_COSTS.map((value) => ({
            value,
            label: DEVELOPMENT_COST_LABELS[value],
          }))}
        />
        <div className="min-w-56 flex-1">
          <Field label="Szukaj w tytule i opisie">
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
        </div>
        {filtered && (
          <Button variant="ghost" onClick={clear}>
            Wyczyść filtry
          </Button>
        )}
      </form>

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
          <p role="status" className="text-muted">
            Znaleziono: {options.length}
          </p>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(380px,100%),1fr))] gap-4">
            {options.map((option) => (
              <li key={option._id}>
                <OfferCard option={option} context={context} params={params} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
