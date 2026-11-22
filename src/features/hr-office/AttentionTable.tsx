import { Link } from "react-router";
import { Button } from "../../components/ui/Button";
import { ExternalLink } from "../../components/ui/ExternalLink";
import { Icon } from "../../components/ui/Icon";
import { formatDate, today } from "../../lib/format";
import { EmployeeLink } from "./EmployeeLink";
import { LEGAL } from "./labels";
import { isFeatureRegistered } from "./registered";
import type { AttentionItem } from "./attention";
import type { BoardRow } from "./types";

function daysLabel(iso: string): string {
  const diff = Math.ceil(
    (new Date(iso).getTime() - today().getTime()) / 86_400_000,
  );
  if (diff < 0) return "Po terminie";
  if (diff === 0) return "Dziś";
  return `za ${diff} ${diff === 1 ? "dzień" : "dni"}`;
}

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
        {item.kind === "overdue" ? "Termin oceny: " : "Termin decyzji: "}
        {formatDate(item.date)}
      </div>
    </>
  );
}

export function AttentionTable({
  items,
  sent,
  onRemind,
}: {
  items: readonly AttentionItem[];
  sent: ReadonlySet<string>;
  onRemind: (row: BoardRow) => void;
}) {
  if (items.length === 0) {
    return <p>Żadna sprawa nie wymaga teraz uwagi kadr.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <caption className="sr-only">
          Sprawy posortowane od najpilniejszej
        </caption>
        <thead>
          <tr className="border-divider border-b">
            <th scope="col" className="py-2 pr-4">
              Termin
            </th>
            <th scope="col" className="py-2 pr-4">
              Sprawa
            </th>
            <th scope="col" className="py-2 pr-4">
              Osoba i komórka
            </th>
            <th scope="col" className="py-2">
              Podstawa
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.key} className="border-divider border-b align-top">
              <td className="py-3 pr-4">
                <Deadline item={item} />
              </td>
              <td className="py-3 pr-4">
                {item.kind === "overdue" ? (
                  <>
                    <strong>Ocena niesporządzona w terminie</strong>
                    <div className="text-muted text-sm">
                      Oceniający: {item.row.evaluator ?? "brak"}
                    </div>
                    {item.row.evaluator ? (
                      <Button
                        variant="secondary"
                        className="mt-2"
                        disabled={sent.has(item.row.reviewId)}
                        onClick={() => onRemind(item.row)}
                      >
                        {sent.has(item.row.reviewId)
                          ? `Wysłano przypomnienie: ${item.row.evaluator}, ${item.row.employee}`
                          : `Wyślij przypomnienie oceniającemu ${item.row.evaluator} o ocenie: ${item.row.employee}`}
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <>
                    <strong>Sprzeciw u dyrektora generalnego</strong>
                    <div className="text-muted text-sm">
                      Dyrektor generalny rozpatruje sprzeciw w ciągu 14 dni.
                    </div>
                    {isFeatureRegistered("objections") ? (
                      <div className="mt-1">
                        <Link to="/sprzeciwy">
                          Zobacz sprzeciw: {item.row.employeeName}
                        </Link>
                      </div>
                    ) : null}
                  </>
                )}
              </td>
              <td className="py-3 pr-4">
                {item.kind === "overdue" ? (
                  <>
                    <EmployeeLink
                      employeeId={item.row.employeeId}
                      name={item.row.employee}
                    />
                    <div className="text-muted text-sm">{item.row.unit}</div>
                  </>
                ) : (
                  <>
                    {item.row.employeeName}
                    <div className="text-muted text-sm">
                      {item.row.position}
                    </div>
                  </>
                )}
              </td>
              <td className="py-3">
                {item.kind === "overdue" ? (
                  <ExternalLink href={LEGAL.art81ust6.href}>
                    {LEGAL.art81ust6.text}
                  </ExternalLink>
                ) : (
                  <ExternalLink href={LEGAL.art83ust3.href}>
                    {LEGAL.art83ust3.text}
                  </ExternalLink>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
