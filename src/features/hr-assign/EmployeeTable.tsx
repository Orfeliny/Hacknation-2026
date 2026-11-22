import { Link } from "react-router";
import { Icon } from "../../components/ui/Icon";
import { formatDate } from "../../lib/format";
import { useRouteRegistered } from "../../app/index";
import {
  checkSupervision,
  fullName,
  monthsBetween,
  type Employee,
} from "./assign";

const EMPLOYEE_CARD_PATH = "/kadry/pracownik";

function SupervisionCell({ employee, on }: { employee: Employee; on: string }) {
  const { status } = checkSupervision(employee, on);
  if (status === "unknown")
    return (
      <>
        <span className="block font-semibold">Brak danych</span>
        <span className="text-muted block text-sm">Sprawdź ręcznie</span>
      </>
    );
  const enough = status === "enough";
  return (
    <>
      <span
        className={`flex items-center gap-1.5 font-bold ${enough ? "text-success" : ""}`}
      >
        {enough ? <Icon name="success" className="size-4" /> : null}
        {enough ? "Tak" : "Nie"}
      </span>
      <span className="text-muted block text-sm">
        {enough ? "Można ocenić wcześniej" : "Oceni następca"}
      </span>
    </>
  );
}

export function EmployeeTable({
  rows,
  skipped,
  on,
  dueDates,
  onToggle,
  describedBy,
}: {
  rows: Employee[];
  skipped: ReadonlySet<string>;
  on: string;
  dueDates: ReadonlyMap<string, string>;
  onToggle: (id: string) => void;
  describedBy: string;
}) {
  const cardLinks = useRouteRegistered(EMPLOYEE_CARD_PATH);
  return (
    <div
      role="region"
      aria-label="Tabela pracowników"
      tabIndex={0}
      className="overflow-x-auto"
    >
      <table
        aria-describedby={describedBy}
        className="w-full min-w-[700px] border-collapse text-left"
      >
        <caption className="sr-only">
          Pracownicy i wynik sprawdzenia nadzoru
        </caption>
        <thead>
          <tr className="bg-surface-muted text-muted text-sm">
            <th scope="col" className="px-6 py-2.5 font-semibold">
              <span className="sr-only">Zaznacz</span>
            </th>
            <th scope="col" className="px-3 py-2.5 font-semibold">
              Pracownik
            </th>
            <th scope="col" className="px-3 py-2.5 font-semibold">
              Nadzór odchodzącego
            </th>
            <th scope="col" className="px-3 py-2.5 font-semibold">
              Termin oceny
            </th>
            <th scope="col" className="px-6 py-2.5 font-semibold">
              Nadzór co najmniej 6 mies.
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((employee) => {
            const { since } = checkSupervision(employee, on);
            const name = fullName(employee);
            const due = dueDates.get(employee._id);
            return (
              <tr key={employee._id} className="border-divider border-t">
                <td className="px-6 py-3">
                  <input
                    type="checkbox"
                    className="accent-primary size-[22px]"
                    aria-label={`Objęty zmianą: ${name}`}
                    checked={!skipped.has(employee._id)}
                    onChange={() => onToggle(employee._id)}
                  />
                </td>
                <td className="px-3 py-3">
                  {cardLinks ? (
                    <Link
                      to={`${EMPLOYEE_CARD_PATH}?pracownik=${employee._id}`}
                      className="font-bold"
                    >
                      {name}
                    </Link>
                  ) : (
                    <span className="font-bold">{name}</span>
                  )}
                  <span className="text-muted block text-sm">
                    {employee.position}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {since ? `${monthsBetween(since, on)} mies.` : "—"}
                </td>
                <td className="px-3 py-3">{due ? formatDate(due) : "—"}</td>
                <td className="px-6 py-3">
                  <SupervisionCell employee={employee} on={on} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
