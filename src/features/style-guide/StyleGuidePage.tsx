import type { ReactNode } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { colorTokens, contrastRatio, type ColorToken } from "../../lib/tokens";
import {
  formatRatio,
  GLOSSARY,
  PALETTE,
  PRINCIPLES,
  STAGES,
  STATES,
  type PaletteEntry,
} from "./content";

const WHITE = "#ffffff";

function ratioOn(token: ColorToken, background: string): string {
  return formatRatio(contrastRatio(colorTokens[token], background));
}

function Panel({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="border-border rounded-lg border bg-white p-6"
    >
      <h2 id={id} className="text-ink mb-3 text-xl font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PaletteRow({ entry }: { entry: PaletteEntry }) {
  return (
    <li className="border-divider flex items-center gap-3.5 border-t py-2.5">
      <span
        aria-hidden="true"
        className="border-border block h-9 w-12 flex-none rounded-lg border"
        style={{ backgroundColor: colorTokens[entry.token] }}
      />
      <span className="flex-1">
        <span className="block font-bold">
          {entry.name} · {colorTokens[entry.token].toUpperCase()}
        </span>
        <span className="text-muted block text-sm">{entry.usage}</span>
      </span>
      <span className="text-right font-bold whitespace-nowrap">
        <span className="block">na białym {ratioOn(entry.token, WHITE)}</span>
        {entry.onMuted ? (
          <span className="block">
            na Platinum {ratioOn(entry.token, colorTokens["surface-muted"])}
          </span>
        ) : null}
      </span>
    </li>
  );
}

export function StyleGuidePage() {
  return (
    <>
      <title>Zasady i paleta</title>
      <PageHeader
        title="Zasady i paleta"
        description="Spokojny, urzędowy interfejs. Termin widać od razu, a przy każdym wpisie jest napisane, kto go widzi."
      />
      <div className="grid grid-cols-2 items-start gap-10">
        <section aria-labelledby="zasady">
          <h2 id="zasady" className="text-ink mb-3 text-2xl font-bold">
            Zasady
          </h2>
          <ol className="flex list-decimal flex-col gap-3 pl-6">
            {PRINCIPLES.map((p) => (
              <li key={p.lead}>
                <strong>{p.lead}</strong> {p.text}
              </li>
            ))}
          </ol>
        </section>
        <div className="flex flex-col gap-6">
          <Panel id="etapy" title="Etapy oceny, zawsze w tej kolejności">
            <ol className="grid list-decimal grid-cols-2 gap-x-6 gap-y-1.5 pl-6">
              {STAGES.map((stage) => (
                <li key={stage}>{stage}</li>
              ))}
            </ol>
          </Panel>
          <Panel id="slownik" title="Słownik">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              {GLOSSARY.map((g) => (
                <div key={g.term} className="contents">
                  <dt className="font-bold">{g.term}</dt>
                  <dd>{g.definition}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
      <div className="mt-10 grid grid-cols-2 items-start gap-10">
        <Panel id="paleta" title="Paleta">
          <p className="text-muted mb-1">
            Kontrast według WCAG, obliczony z tokenów aplikacji.
          </p>
          <ul>
            {PALETTE.map((entry) => (
              <PaletteRow key={entry.token} entry={entry} />
            ))}
          </ul>
        </Panel>
        <Panel id="stany" title="Kolory stanu">
          <p className="text-muted mb-1">
            Kolor ma tylko tekst i ikona. Stan zawsze podaje też słowo.
          </p>
          <ul>
            {STATES.map((state) => (
              <li
                key={state.token}
                className="border-divider flex items-center gap-3.5 border-t py-2.5"
              >
                <StatusAlert
                  tone={state.token}
                  live={false}
                  className="w-44 flex-none"
                >
                  {state.name}
                </StatusAlert>
                <span className="text-muted flex-1 text-sm">
                  {state.usage} · {colorTokens[state.token].toUpperCase()}
                </span>
                <span className="font-bold whitespace-nowrap">
                  na białym {ratioOn(state.token, WHITE)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
