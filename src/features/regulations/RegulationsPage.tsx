import type { ReactNode } from "react";
import { RULES_2016, type RulesPack } from "../../../convex/rules/pack2016";
import { MATRIX } from "./matrix";
import {
  coverage,
  matrixView,
  periodRows,
  sheetRows,
  sourceOf,
} from "./rulesView";

const AMENDMENT_STEPS = [
  "Przygotuj nowy pakiet reguł obok obecnego, z datą wejścia w życie i źródłem każdej reguły.",
  "Wskaż go jako aktywny dla ocen rozpoczętych od tej daty.",
  "Oceny w toku kończą się według pakietu, z którym je rozpoczęto.",
  "Uruchom testy reguł: zmiana jednej stałej nie wymaga zmiany komponentów.",
];

const cell = "border-b border-slate-200 px-3 py-2 text-left align-top text-sm";
const head = `${cell} font-medium text-slate-900`;

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-xl font-bold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Scroll({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function RegulationsPage({ rules = RULES_2016 }: { rules?: RulesPack }) {
  const sheets = sheetRows(rules);
  const periods = periodRows(rules);
  const matrix = matrixView(rules, MATRIX);
  const covered = coverage(rules, MATRIX);
  const lowest = Math.min(...rules.partialScale.map((level) => level.value));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Przepisy</h1>
        <p className="text-sm text-slate-600">
          Aktywny pakiet reguł: wersja <strong>{rules.version}</strong>,{" "}
          {rules.source}. Każda reguła jest danymi z podstawą prawną, więc
          nowelizacja oznacza wymianę jednego pakietu.
        </p>
      </header>

      <Section id="sheets" title="Arkusze i kryteria obowiązkowe">
        <Scroll>
          <table className="w-full border-collapse">
            <caption className="sr-only">Arkusze oceny i ich kryteria</caption>
            <thead>
              <tr>
                <th scope="col" className={head}>
                  Arkusz
                </th>
                <th scope="col" className={head}>
                  Kryteria obowiązkowe
                </th>
                <th scope="col" className={head}>
                  Podstawa prawna
                </th>
              </tr>
            </thead>
            <tbody>
              {sheets.map((row) => (
                <tr key={row.sheet}>
                  <th scope="row" className={head}>
                    {row.sheet}
                    <span className="block font-normal text-slate-600">
                      {row.position}
                    </span>
                  </th>
                  <td className={cell}>{row.criteria.join(", ")}</td>
                  <td className={cell}>{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
        <p className="text-sm text-slate-600">
          Kryteriów dodatkowych można wybrać najwyżej{" "}
          {rules.maxAdditionalCriteria} ({sourceOf(rules, "additionalCriteria")}
          ).
        </p>
      </Section>

      <Section id="scale" title="Skala ocen">
        <Scroll>
          <table className="w-full border-collapse">
            <caption className="sr-only">Skala ocen cząstkowych</caption>
            <thead>
              <tr>
                <th scope="col" className={head}>
                  Ocena cząstkowa
                </th>
                <th scope="col" className={head}>
                  Znaczenie
                </th>
              </tr>
            </thead>
            <tbody>
              {rules.partialScale.map((level) => (
                <tr key={level.id}>
                  <th scope="row" className={head}>
                    {level.value}
                  </th>
                  <td className={cell}>{level.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
        <Scroll>
          <table className="w-full border-collapse">
            <caption className="sr-only">Poziomy oceny ogólnej</caption>
            <thead>
              <tr>
                <th scope="col" className={head}>
                  Średnia
                </th>
                <th scope="col" className={head}>
                  Poziom oceny ogólnej
                </th>
              </tr>
            </thead>
            <tbody>
              {rules.overallLevels.map((level) => (
                <tr key={level.id}>
                  <th scope="row" className={head}>
                    do {level.maxAverage}
                  </th>
                  <td className={cell}>{level.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
        <p className="text-sm text-slate-600">
          Wynik jest pozytywny przy średniej powyżej {rules.positiveAbove} i
          braku oceny {lowest} ({sourceOf(rules, "result")}).
        </p>
      </Section>

      <Section id="deadlines" title="Terminy">
        <Scroll>
          <table className="w-full border-collapse">
            <caption className="sr-only">Terminy i okresy</caption>
            <thead>
              <tr>
                <th scope="col" className={head}>
                  Termin
                </th>
                <th scope="col" className={head}>
                  Wartość
                </th>
                <th scope="col" className={head}>
                  Podstawa prawna
                </th>
              </tr>
            </thead>
            <tbody>
              {periods.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className={head}>
                    {row.label}
                  </th>
                  <td className={cell}>{row.value}</td>
                  <td className={cell}>{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
      </Section>

      <Section id="matrix" title="Macierz zgodności">
        <p role="status" className="text-sm text-slate-600">
          Macierz obejmuje {covered.covered} z {covered.total} przepisów
          pakietu.
          {covered.missing.length > 0 &&
            ` Brakuje: ${covered.missing.join(", ")}.`}
        </p>
        <Scroll>
          <table className="w-full border-collapse">
            <caption className="sr-only">
              Przepis, funkcja w systemie i zgłoszenie
            </caption>
            <thead>
              <tr>
                <th scope="col" className={head}>
                  Wymaganie
                </th>
                <th scope="col" className={head}>
                  Przepis
                </th>
                <th scope="col" className={head}>
                  Funkcje w systemie
                </th>
                <th scope="col" className={head}>
                  Zgłoszenia
                </th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.sourceKey}>
                  <th scope="row" className={head}>
                    {row.requirement}
                  </th>
                  <td className={cell}>{row.source}</td>
                  <td className={cell}>
                    {row.functions.map((name) => (
                      <code key={name} className="mr-2 inline-block text-xs">
                        {name}
                      </code>
                    ))}
                  </td>
                  <td className={cell}>{row.issues.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
      </Section>

      <Section id="amendment" title="Jak wdrożyć nowelizację">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-900">
          {AMENDMENT_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
