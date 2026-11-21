import {
  createMaelstrom,
  HttpConnector,
  vessel,
  type TypedVesselProps,
} from "@maelstrom-co/react";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import {
  DEVELOPMENT_FORMS,
  DEVELOPMENT_FORM_LABELS,
} from "../../../convex/growth/constants";
import { getEnv } from "../../lib/env";
import { chartVessel, examples, scriptVessel, startLayout } from "./vessels";

const FIXTURE: Record<string, number> = {
  szkolenie: 4,
  mentoring: 1,
  zadanie_rozwojowe: 3,
};

// A real Convex hook inside a Vessel, to check that Maelstrom components are ordinary React.
function useCountsByForm(): { counts: Record<string, number>; live: boolean } {
  const online = getEnv().convexUrl !== undefined;
  const options = useQuery(
    api.growth.options.listOptions,
    online ? {} : "skip",
  );
  if (!online || options === undefined) return { counts: FIXTURE, live: false };
  const counts: Record<string, number> = {};
  for (const option of options)
    counts[option.form] = (counts[option.form] ?? 0) + 1;
  return { counts, live: true };
}

function Script({ variantProps }: TypedVesselProps<typeof scriptVessel>) {
  const full = variantProps.variant === "full";
  return (
    <section aria-label="Skrypt rozmowy" className="space-y-2 p-3 text-sm">
      <h2 className="text-lg font-semibold">Skrypt rozmowy</h2>
      <ol className="list-decimal space-y-1 pl-5">
        <li>Jak oceniasz własną pracę w tym okresie?</li>
        <li>Co poszło dobrze, a co chciałbyś zmienić?</li>
        <li>Jakiego wsparcia potrzebujesz w rozwoju?</li>
      </ol>
      {full && (
        <p className="rounded bg-slate-50 p-2">
          Rozmowa oceniająca to dialog, nie monolog. Omów obowiązki, cele i
          kierunki rozwoju.
        </p>
      )}
    </section>
  );
}

function Chart({ variantProps }: TypedVesselProps<typeof chartVessel>) {
  const { counts, live } = useCountsByForm();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...Object.values(counts));
  if (variantProps.variant === "collapsed") {
    return (
      <p className="p-3 text-sm">
        Wykres zwinięty: {total} wpisów ({live ? "Convex" : "dane przykładowe"}
        ).
      </p>
    );
  }
  return (
    <section aria-label="Wykres" className="space-y-2 p-3 text-sm">
      <h2 className="text-lg font-semibold">Wykres obserwacji</h2>
      <p className="text-xs text-slate-600">
        Źródło: {live ? "Convex (listOptions)" : "dane przykładowe"}
      </p>
      <ul className="space-y-1">
        {DEVELOPMENT_FORMS.filter((f) => counts[f]).map((form) => (
          <li key={form} className="flex items-center gap-2">
            <span className="w-40">{DEVELOPMENT_FORM_LABELS[form]}</span>
            <span
              className="h-3 rounded bg-indigo-600"
              style={{ width: `${((counts[form] ?? 0) / max) * 100}%` }}
            />
            <span>{counts[form]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const m = createMaelstrom({
  vessels: [vessel(scriptVessel, Script), vessel(chartVessel, Chart)],
});

const connector = new HttpConnector({
  baseUrl:
    (import.meta.env.VITE_SPIKE_ENGINE_URL as string | undefined) ??
    "http://127.0.0.1:3101/api",
});

function Workspace() {
  const [intent, setIntent] = useState<string>(examples[0].intent);
  const {
    processIntent,
    connectionStatus,
    isProcessing,
    lastError,
    lastResponse,
  } = m.useMaelstrom();
  return (
    <>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void processIntent(intent.trim());
        }}
      >
        <label htmlFor="spike-intent" className="sr-only">
          Polecenie
        </label>
        <input
          id="spike-intent"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          value={intent}
          maxLength={500}
          onChange={(e) => setIntent(e.target.value)}
        />
        <button
          type="submit"
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white"
          disabled={isProcessing || connectionStatus !== "connected"}
        >
          Wyślij
        </button>
      </form>
      <p role="status" className="text-sm">
        {isProcessing
          ? "Układanie…"
          : lastError
            ? "Silnik układu jest niedostępny. Uruchom: node spike/maelstrom/engine-server.mjs"
            : (lastResponse?.userMessage ?? `Połączenie: ${connectionStatus}`)}
      </p>
      <div
        className="h-96 rounded border border-slate-200"
        aria-busy={isProcessing}
      >
        <m.Chart />
      </div>
    </>
  );
}

export default function SpikePage() {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-bold tracking-tight">
        Spike: Maelstrom (adaptacyjny układ)
      </h1>
      <m.Provider
        connector={connector}
        layoutMode="tiling"
        initialLayout={startLayout()}
      >
        <Workspace />
      </m.Provider>
    </section>
  );
}
