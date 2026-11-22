import { useState } from "react";
import { Link } from "react-router";
import { Button } from "../../components/ui/Button";
import { ExternalLink } from "../../components/ui/ExternalLink";
import { Icon } from "../../components/ui/Icon";
import { Select } from "../../components/ui/Select";
import { formatDate } from "../../lib/format";
import { daysLabel, type AttentionItem } from "./attention";
import { EmployeeLink } from "./EmployeeLink";
import { LEGAL, STAGE_LABELS } from "./labels";
import { isFeatureRegistered } from "./registered";
import type { BoardRow } from "./types";

const ALL_UNITS = "";

function Deadline({ item }: { item: AttentionItem }) {
  const late = item.kind === "overdue" || item.row.overdue;
  return (
    <>
      <span
        className={`inline-flex items-center gap-1 font-semibold ${late ? "text-danger" : "text-ink"}`}
      >
        {late ? <Icon name="danger" className="size-4" /> : null}
        {late ? "Po terminie" : daysLabel(item.date)}
      </span>
      <div className="text-muted text-sm">
        {item.kind === "overdue"
          ? `Termin minął ${formatDate(item.date)}`
          : formatDate(item.date)}
      </div>
    </>
  );
}

function RemindButton({
  row,
  sent,
  onRemind,
}: {
  row: BoardRow;
  sent: boolean;
  onRemind: (row: BoardRow) => void;
}) {
  return (
    <Button
      variant="secondary"
      className="border-border! text-ink! mt-2"
      disabled={sent}
      onClick={() => onRemind(row)}
    >
      {sent ? "Wysłano przypomnienie" : "Wyślij przypomnienie"}
      <span className="sr-only">{` oceniającemu ${row.evaluator}, ocena: ${row.employee}`}</span>
    </Button>
  );
}

function Basis({ item }: { item: AttentionItem }) {
  const ref = item.kind === "overdue" ? LEGAL.art81ust6 : LEGAL.art83ust3;
  return <ExternalLink href={ref.href}>{ref.text}</ExternalLink>;
}

export function AttentionTable({
  items,
  board,
  sent,
  onRemind,
}: {
  items: readonly AttentionItem[];
  board: readonly BoardRow[];
  sent: ReadonlySet<string>;
  onRemind: (row: BoardRow) => void;
}) {
  const [unit, setUnit] = useState(ALL_UNITS);
  const units = [...new Set(items.map((i) => i.row.unit))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pl"));
  const shown = unit ? items.filter((i) => i.row.unit === unit) : items;
  const employeeOf = (reviewId: string) =>
    board.find((r) => r.reviewId === reviewId)?.employeeId;

  return (
    <section
      aria-labelledby="h-uwaga"
      className="border-border rounded-xl border bg-white"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 px-6 py-5">
        <h2 id="h-uwaga" className="text-xl font-bold">
          Wymaga uwagi kadr
        </h2>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Komórka
          <Select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="min-w-48 text-base font-normal"
          >
            <option value={ALL_UNITS}>Wszystkie</option>
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </label>
      </div>
      {shown.length === 0 ? (
        <p className="px-6 pb-5">Żadna sprawa nie wymaga teraz uwagi kadr.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">
              Sprawy posortowane od najpilniejszej
            </caption>
            <thead>
              <tr className="bg-surface-muted text-sm font-semibold">
                <th scope="col" className="px-6 py-2">
                  Termin
                </th>
                <th scope="col" className="px-3 py-2">
                  Sprawa
                </th>
                <th scope="col" className="px-3 py-2">
                  Osoba i komórka
                </th>
                <th scope="col" className="px-6 py-2">
                  Podstawa
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((item) => (
                <tr
                  key={item.key}
                  className="border-divider border-b align-top last:border-b-0"
                >
                  <td className="px-6 py-3">
                    <Deadline item={item} />
                  </td>
                  <td className="px-3 py-3">
                    {item.kind === "overdue" ? (
                      <>
                        <strong>Ocena niesporządzona w terminie</strong>
                        <div className="text-muted text-sm">
                          Etap: {STAGE_LABELS[item.row.stage]}
                        </div>
                        {item.row.evaluator ? (
                          <RemindButton
                            row={item.row}
                            sent={sent.has(item.row.reviewId)}
                            onRemind={onRemind}
                          />
                        ) : null}
                      </>
                    ) : (
                      <>
                        <strong>Sprzeciw u dyrektora generalnego</strong>
                        <div className="text-muted text-sm">
                          Etap: {STAGE_LABELS.objection}. Dyrektor generalny ma
                          14 dni na rozpatrzenie.
                        </div>
                        {isFeatureRegistered("objections") ? (
                          <div className="mt-1">
                            <Link to="/sprzeciwy">
                              Zobacz sprzeciw
                              <span className="sr-only">
                                {`: ${item.row.employeeName}`}
                              </span>
                            </Link>
                          </div>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {item.kind === "overdue" ? (
                      <>
                        <EmployeeLink
                          employeeId={item.row.employeeId}
                          name={item.row.employee}
                        />
                        <div className="text-muted text-sm">
                          {item.row.unit}
                        </div>
                        <div className="text-muted text-sm">
                          Oceniający: {item.row.evaluator ?? "brak"}
                        </div>
                      </>
                    ) : (
                      <>
                        {employeeOf(item.row.reviewId) ? (
                          <EmployeeLink
                            employeeId={employeeOf(item.row.reviewId)!}
                            name={item.row.employeeName}
                          />
                        ) : (
                          item.row.employeeName
                        )}
                        <div className="text-muted text-sm">
                          {item.row.unit || item.row.position}
                        </div>
                      </>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <Basis item={item} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
