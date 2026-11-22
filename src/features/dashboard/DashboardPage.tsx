import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DemoDataNote } from "../../components/ui/DemoDataNote";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useShiftsForSupervisor } from "../../lib/backend/deadlineShift";
import { DEMO_PERSONAS, useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { formatDate, today } from "../../lib/format";
import {
  actionFor,
  buildTodo,
  byDeadline,
  conversationPath,
  formalGaps,
  type NoticeEntry,
  dayCount,
  previewPath,
  procedureStats,
  shiftPath,
  SOON_DAYS,
  splitRows,
  type DashboardRow,
  type ShiftEntry,
  type TodoItem,
} from "./model";
import { RouteLink } from "../../app/index";

function DeadlineStatus({ row }: { row: DashboardRow }) {
  if (row.daysLeft === null || row.dueDate === null) return null;
  const text = `${formatDate(row.dueDate)} · ${dayCount(row.daysLeft)}`;
  if (row.daysLeft < 0)
    return (
      <StatusAlert tone="danger" live={false}>
        {text}
      </StatusAlert>
    );
  if (row.daysLeft <= SOON_DAYS) {
    return (
      <StatusAlert tone="warning" live={false}>
        {text}
      </StatusAlert>
    );
  }
  return <p className="text-muted font-semibold">{text}</p>;
}

function ReviewTodo({ row }: { row: DashboardRow }) {
  const action = actionFor(row);
  return (
    <li className="border-divider space-y-2 border-b py-3 last:border-b-0">
      <DeadlineStatus row={row} />
      {row.shiftedFrom && (
        <StatusAlert tone="info" live={false}>
          Termin przesunięty z {formatDate(row.shiftedFrom)}
        </StatusAlert>
      )}
      <p className="text-lg font-bold">{row.stageLabel}</p>
      <p>{row.employeeName}</p>
      {row.gapCount > 0 && (
        <StatusAlert tone="danger" live={false}>
          {formalGaps(row.gapCount)}
        </StatusAlert>
      )}
      <div>
        <RouteLink to={action.to}>
          {action.label}
          <span className="sr-only">{action.srSuffix}</span>
        </RouteLink>
      </div>
    </li>
  );
}

function ShiftTodo({ shift }: { shift: ShiftEntry }) {
  return (
    <li className="border-divider space-y-2 border-b py-3 last:border-b-0">
      <p className="text-muted font-semibold">
        Wniosek z {formatDate(shift.createdAt)}
      </p>
      <p className="text-lg font-bold">
        Wniosek o przesunięcie terminu · {shift.employeeName} · Decyzja należy
        do Ciebie
      </p>
      <p>Nie musisz uwzględnić wniosku.</p>
      <div>
        <RouteLink to={shiftPath(shift.reviewId, shift.changeIndex)}>
          Rozstrzygnij wniosek
          <span className="sr-only">: {shift.employeeName}</span>
        </RouteLink>
      </div>
    </li>
  );
}

function TodoSection({ items }: { items: TodoItem[] }) {
  const stats = procedureStats(
    items.flatMap((i) => (i.kind === "review" ? [i.row] : [])),
  );
  return (
    <section aria-labelledby="h-dzialania" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="h-dzialania" className="text-xl font-bold">
            Do zrobienia
          </h2>
          <p className="text-muted">
            Sprawy, które czekają na Ciebie, od najbliższego terminu.
          </p>
        </div>
        <ul aria-label="Stan procedury" className="flex flex-wrap gap-2">
          <li>
            <Badge>
              <strong>{stats.overdue}</strong> po terminie
            </Badge>
          </li>
          <li>
            <Badge>
              <strong>{stats.soon}</strong> w ciągu {SOON_DAYS} dni
            </Badge>
          </li>
          <li>
            <Badge>
              <strong>{stats.gaps}</strong> braki formalne
            </Badge>
          </li>
        </ul>
      </div>
      {items.length === 0 ? (
        <p>Nic nie czeka na Twoją decyzję.</p>
      ) : (
        <Card>
          <ol>
            {items.map((item) =>
              item.kind === "review" ? (
                <ReviewTodo key={`r-${item.row.reviewId}`} row={item.row} />
              ) : (
                <ShiftTodo
                  key={`s-${item.shift.reviewId}-${item.shift.changeIndex}`}
                  shift={item.shift}
                />
              ),
            )}
          </ol>
        </Card>
      )}
    </section>
  );
}

function WaitingText({ row }: { row: DashboardRow }) {
  if (row.stage === "objection") {
    return (
      <>
        <strong>{row.employeeName}</strong> złożył(a) sprzeciw. Rozpatrzy go
        dyrektor generalny.
      </>
    );
  }
  if (row.stage === "signing" || row.objectionDeadline === null) {
    return (
      <>
        <strong>{row.employeeName}</strong> ma się zapoznać z oceną. Czeka na
        jej podpis.
      </>
    );
  }
  return (
    <>
      <strong>{row.employeeName}</strong> może do{" "}
      {formatDate(row.objectionDeadline)} złożyć sprzeciw. Jeśli to zrobi,
      rozpatrzy go dyrektor generalny.
    </>
  );
}

function WaitingSection({
  rows,
  notices,
}: {
  rows: DashboardRow[];
  notices: NoticeEntry[];
}) {
  return (
    <section aria-labelledby="h-czekasz" className="space-y-3">
      <div>
        <h2 id="h-czekasz" className="text-xl font-bold">
          Czekasz na innych
        </h2>
        <p className="text-muted">
          Tu nic nie musisz robić. Sprawy prowadzą inne osoby.
        </p>
      </div>
      {rows.length === 0 && notices.length === 0 ? (
        <p>Na nikogo nie czekasz.</p>
      ) : (
        <Card>
          <ul>
            {notices.map((n) => (
              <li
                key={`n-${n.reviewId}-${n.changeIndex}`}
                className="border-divider border-b py-3 last:border-b-0"
              >
                <p>
                  <strong>W toku.</strong> Kadry wysyłają{" "}
                  <strong>{n.employeeName}</strong> pismo o{" "}
                  {n.rejected
                    ? "nieuwzględnieniu wniosku o przesunięcie terminu"
                    : `przesunięciu terminu oceny z ${formatDate(n.previousDate)} na ${formatDate(n.newDate)}`}
                  .
                </p>
              </li>
            ))}
            {rows.map((row) => (
              <li
                key={row.reviewId}
                className="border-divider flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-b-0"
              >
                <p>
                  <WaitingText row={row} />
                </p>
                <RouteLink to={previewPath(row)}>
                  Podgląd oceny
                  <span className="sr-only">: {row.employeeName}</span>
                </RouteLink>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

function TeamTable({
  rows,
  todoIds,
}: {
  rows: DashboardRow[];
  todoIds: Set<string>;
}) {
  const [onlyTodo, setOnlyTodo] = useState(false);
  const shown = onlyTodo ? rows.filter((r) => todoIds.has(r.reviewId)) : rows;
  const sorted = [...shown].sort((a, b) => byDeadline(a.dueDate, b.dueDate));
  return (
    <section aria-labelledby="h-zespol" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="h-zespol" className="text-xl font-bold">
          Oceny mojego zespołu
        </h2>
        <div role="group" aria-label="Filtr" className="flex gap-2">
          <Button
            variant={onlyTodo ? "secondary" : "primary"}
            aria-pressed={!onlyTodo}
            onClick={() => setOnlyTodo(false)}
          >
            Wszystkie ({rows.length})
          </Button>
          <Button
            variant={onlyTodo ? "primary" : "secondary"}
            aria-pressed={onlyTodo}
            onClick={() => setOnlyTodo(true)}
          >
            Twoje działania ({todoIds.size})
          </Button>
        </div>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">
            Oceny zespołu, posortowane według najbliższego terminu
          </caption>
          <thead>
            <tr className="border-divider border-b">
              <th scope="col" className="py-2 pr-4">
                Termin
              </th>
              <th scope="col" className="py-2 pr-4">
                Pracownik
              </th>
              <th scope="col" className="py-2 pr-4">
                Etap
              </th>
              <th scope="col" className="py-2">
                <span className="sr-only">Akcja</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.reviewId} className="border-divider border-b">
                <td className="py-2 pr-4">
                  {row.dueDate ? formatDate(row.dueDate) : "brak terminu"}
                  {row.shiftedFrom && (
                    <div className="text-muted text-sm">
                      Przesunięty z {formatDate(row.shiftedFrom)}
                    </div>
                  )}
                </td>
                <td className="py-2 pr-4">
                  <div className="font-semibold">{row.employeeName}</div>
                  <div className="text-muted text-sm">
                    {row.position}
                    {row.sheet ? ` · arkusz ${row.sheet}` : ""}
                  </div>
                </td>
                <td className="py-2 pr-4">{row.stageLabel}</td>
                <td className="py-2">
                  <RouteLink to={previewPath(row)}>
                    Zobacz ocenę
                    <span className="sr-only">: {row.employeeName}</span>
                  </RouteLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

type Reminder = FunctionReturnType<
  typeof api.hrDashboard.queries.myReminders
>[number];

function NudgeSection({
  reminders,
  rows,
}: {
  reminders: Reminder[] | undefined;
  rows: DashboardRow[];
}) {
  if (reminders === undefined) return null;
  const nudges = reminders.flatMap((r) => {
    const row = rows.find((x) => x.reviewId === r.reviewId);
    return r.kind === "feedback_nudge" && row ? [{ r, row }] : [];
  });
  return (
    <section aria-labelledby="h-feedback" className="space-y-3">
      <div>
        <h2 id="h-feedback" className="text-xl font-bold">
          Bieżąca informacja zwrotna
        </h2>
        <p className="text-muted">
          To tylko zalecenia. Nikt nie sprawdza, czy z nich korzystasz.
        </p>
      </div>
      {nudges.length === 0 ? (
        <p>Na razie nic nie warto przypominać.</p>
      ) : (
        <Card>
          <ul>
            {nudges.map(({ r, row }) => (
              <li
                key={r._id}
                className="border-divider space-y-1 border-b py-3 last:border-b-0"
              >
                <p className="font-bold">Może warto porozmawiać</p>
                <p>{r.message}</p>
                <RouteLink to={conversationPath(row, "biezaca")}>
                  Przygotuj rozmowę bieżącą
                  <span className="sr-only">: {row.employeeName}</span>
                </RouteLink>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

function Board({
  rows,
  reminders,
  offline,
}: {
  rows: DashboardRow[] | undefined;
  reminders: Reminder[] | undefined;
  offline: boolean;
}) {
  const shifts = useShiftsForSupervisor();
  if (rows === undefined || shifts.data === undefined) {
    return <p role="status">Ładowanie pulpitu…</p>;
  }
  const requested = shifts.data
    .filter((s) => s.status === "requested")
    .map((s): ShiftEntry => ({
      reviewId: s.reviewId,
      changeIndex: s.changeIndex,
      employeeName: s.employeeName,
      currentDueDate: s.currentDueDate,
      createdAt: s.createdAt,
    }));
  const notices = shifts.data
    .filter((s) => s.status !== "requested" && s.noticeSentAt === undefined)
    .map((s): NoticeEntry => ({
      reviewId: s.reviewId,
      changeIndex: s.changeIndex,
      employeeName: s.employeeName,
      previousDate: s.previousDate,
      newDate: s.newDate,
      rejected: s.status === "rejected",
    }));
  const { todo, waiting } = splitRows(rows);
  const items = buildTodo(todo, requested);
  return (
    <div className="space-y-8">
      {offline && (
        <StatusAlert tone="info">
          Oceny wymagają połączenia z backendem (tryb offline). Poniżej tylko
          wnioski o przesunięcie terminu.
        </StatusAlert>
      )}
      {shifts.isDemo && <DemoDataNote />}
      <TodoSection items={items} />
      {!offline && <WaitingSection rows={waiting} notices={notices} />}
      {!offline && <NudgeSection reminders={reminders} rows={rows} />}
      {!offline && (
        <TeamTable rows={rows} todoIds={new Set(todo.map((r) => r.reviewId))} />
      )}
    </div>
  );
}

function OnlineBoard() {
  const rows = useQuery(api.reviews.queries.dashboard, {
    actor: { role: "supervisor" },
  });
  const reminders = useQuery(api.hrDashboard.queries.myReminders, {
    actor: { role: "supervisor" },
  });
  return <Board rows={rows} reminders={reminders} offline={false} />;
}

export function DashboardPage() {
  const role = useDemoRole();
  const online = getEnv().convexUrl !== undefined;
  return (
    <section className="space-y-6">
      <title>Pulpit przełożonego</title>
      <PageHeader
        title={`Dzień dobry, ${DEMO_PERSONAS.supervisor.name}`}
        description={`Dzisiaj jest ${formatDate(today())}.`}
        actions={<RouteLink to="/obserwacje">Dodaj obserwację</RouteLink>}
      />
      {role !== "supervisor" ? (
        <Card>
          Pulpit jest dla roli „przełożony”. Wybierz ją w nagłówku, żeby
          zobaczyć swoje sprawy.
        </Card>
      ) : online ? (
        <OnlineBoard />
      ) : (
        <Board rows={[]} reminders={[]} offline />
      )}
    </section>
  );
}
