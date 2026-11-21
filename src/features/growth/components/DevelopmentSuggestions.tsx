import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import {
  DEVELOPMENT_COST_LABELS,
  DEVELOPMENT_FORM_LABELS,
  DEVELOPMENT_LEVEL_LABELS,
  GROWTH_SOURCE_LABELS,
  type DevelopmentLevel,
} from "../../../../convex/growth/constants";
import type { RankResult } from "../../../../convex/growth/rankOptions";
import { RANK_THRESHOLD } from "../../../../convex/growth/suggestCore";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";

type Props = {
  criterionIds: Doc<"developmentOptions">["criterionIds"];
  level?: DevelopmentLevel;
};

// For the IPRZ (#15) and HR partner (#16) modules: forms of development from the catalog for a development
// area. The rule result shows at once; the AI only reorders it, on a click, and only from the same list.
export function DevelopmentSuggestions({ criterionIds, level }: Props) {
  const args = { criterionIds, ...(level ? { level } : {}) };
  const rules = useQuery(api.growth.suggest.suggestForArea, args);
  const rank = useAction(api.growth.rankOptions.rankOptions);
  const [ranked, setRanked] = useState<RankResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (rules === undefined) return <p>Ładowanie podpowiedzi…</p>;
  if (rules.length === 0) {
    return (
      <Card className="space-y-1">
        <h3 className="font-semibold">Podpowiedzi z katalogu rozwoju</h3>
        <p className="text-sm">Brak wpisów w katalogu dla tego obszaru.</p>
        <p className="text-sm text-slate-600">
          Wskazówka ogólna: omów z pracownikiem, jaka forma rozwoju mu
          odpowiada, np. mentoring, zadanie rozwojowe albo wymiana doświadczeń.
        </p>
      </Card>
    );
  }

  const aiRanked = ranked?.ranking === "ai";
  const shown = ranked?.suggestions ?? rules;

  async function orderWithAi() {
    setBusy(true);
    setMessage(null);
    try {
      setRanked(await rank(args));
    } catch {
      setMessage(
        "Nie udało się uporządkować z AI. Pokazuję wynik dopasowania według reguł.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <h3 className="font-semibold">Podpowiedzi z katalogu rozwoju</h3>
      {rules.length > RANK_THRESHOLD && !aiRanked && (
        <Button disabled={busy} onClick={() => void orderWithAi()}>
          {busy ? "Porządkuję…" : "Uporządkuj z AI"}
        </Button>
      )}
      {message && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
      {ranked?.note && <p className="text-sm text-amber-800">{ranked.note}</p>}
      {aiRanked && (
        <p className="text-sm text-slate-600">
          Uporządkowane przez AI, wyłącznie z pozycji katalogu.
        </p>
      )}
      <ul className="space-y-2" aria-live="polite">
        {shown.map(({ option, reason, rationale }) => (
          <li
            key={option._id}
            className="rounded-md border border-slate-200 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{option.title}</span>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  option.source === "demo"
                    ? "bg-amber-100 text-amber-900"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {GROWTH_SOURCE_LABELS[option.source]}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              {DEVELOPMENT_FORM_LABELS[option.form]},{" "}
              {DEVELOPMENT_LEVEL_LABELS[option.level].toLowerCase()},{" "}
              {DEVELOPMENT_COST_LABELS[option.cost].toLowerCase()}
            </p>
            <p className="text-sm">{option.description}</p>
            <p className="text-sm text-slate-600">{reason}</p>
            {rationale && <p className="text-sm">AI: {rationale}</p>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
