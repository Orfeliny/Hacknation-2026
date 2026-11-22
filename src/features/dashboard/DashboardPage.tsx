import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { RouteLink } from "../../app/index";
import { Card } from "../../components/ui/Card";
import { DemoDataNote } from "../../components/ui/DemoDataNote";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageTitle } from "../../components/ui/PageTitle";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useShiftsForSupervisor } from "../../lib/backend/deadlineShift";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { formatLongDate, today } from "../../lib/format";
import { Aside, type GrowthOption, type Reminder } from "./Aside";
import {
  buildTodo,
  handoverSummary,
  splitRows,
  type DashboardRow,
  type NoticeEntry,
  type ShiftEntry,
} from "./model";
import { TeamTable } from "./TeamTable";
import { TodoSection } from "./TodoSection";
import { WaitingSection } from "./WaitingSection";

const supervisor = { actor: { role: "supervisor" } } as const;

const capitalize = (text: string) =>
  text.charAt(0).toLocaleUpperCase("pl-PL") + text.slice(1);

function Board({
  rows,
  reminders,
  options,
  handover,
  offline,
}: {
  rows: DashboardRow[] | undefined;
  reminders: Reminder[] | undefined;
  options: GrowthOption[] | undefined;
  handover: ReturnType<typeof handoverSummary>;
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
    <>
      {offline && (
        <StatusAlert tone="info">
          Oceny wymagają połączenia z backendem (tryb offline). Poniżej tylko
          wnioski o przesunięcie terminu.
        </StatusAlert>
      )}
      {shifts.isDemo && <DemoDataNote />}
      <TodoSection items={items} handover={handover} />
      {!offline && <WaitingSection rows={waiting} notices={notices} />}
      {!offline && (
        <div className="flex flex-wrap items-start gap-8">
          <TeamTable
            rows={rows}
            todoIds={new Set(todo.map((r) => r.reviewId))}
          />
          <Aside reminders={reminders} rows={rows} options={options} />
        </div>
      )}
    </>
  );
}

function OnlineBoard() {
  const rows = useQuery(api.reviews.queries.dashboard, supervisor);
  const reminders = useQuery(api.hrDashboard.queries.myReminders, supervisor);
  const plan = useQuery(api.observations.queries.handoverPlan, supervisor);
  const options = useQuery(api.growth.options.listOptions, {});
  return (
    <Board
      rows={rows}
      reminders={reminders}
      options={options}
      handover={plan ? handoverSummary(plan) : null}
      offline={false}
    />
  );
}

function OtherRole() {
  return (
    <>
      <PageTitle>Pulpit</PageTitle>
      <PageHeader title="Pulpit" />
      <Card className="space-y-2">
        <p>
          Pulpit jest dla roli „przełożony”. Wybierz ją w nagłówku, żeby
          zobaczyć swoje sprawy.
        </p>
        <RouteLink to="/">Przejdź do swojej strony startowej</RouteLink>
      </Card>
    </>
  );
}

export function DashboardPage() {
  const role = useDemoRole();
  if (role !== "supervisor") return <OtherRole />;
  const online = getEnv().convexUrl !== undefined;
  return (
    <section className="flex flex-col gap-8">
      <PageTitle>Pulpit</PageTitle>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted text-[15px]">
            {capitalize(formatLongDate(today()))}
          </p>
          <h1 className="text-ink mt-1 text-[31px] leading-[1.2] font-bold tracking-[-0.01em]">
            Dzień dobry
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <RouteLink
            to="/obserwacje"
            className="border-border text-ink min-h-11 rounded-lg border bg-white px-[18px] font-semibold"
          >
            Dodaj obserwację
          </RouteLink>
          <RouteLink
            to="/rozmowy"
            className="bg-primary hover:bg-primary-hover min-h-11 rounded-lg px-[18px] font-bold text-white"
          >
            Przygotuj rozmowę
          </RouteLink>
        </div>
      </div>
      {online ? (
        <OnlineBoard />
      ) : (
        <Board
          rows={[]}
          reminders={[]}
          options={undefined}
          handover={null}
          offline
        />
      )}
    </section>
  );
}
