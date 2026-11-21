import type {
  decideContract,
  markNoticeSentContract,
  ShiftRequest,
} from "../../../../convex/lib/contracts/deadlineShift";
import {
  createDemoStore,
  daysFromToday,
  demoId,
  msFromToday,
  type ArgsOf,
} from "../useDemo";

const SUPERVISOR = "Katarzyna Wiśniewska";
const HR = "Barbara Dąbrowska";
const BLOCKED_REASON =
  "Termin oceny nie może zostać przesunięty o więcej niż 6 miesięcy od końca okresu oceniania.";

type Row = Omit<ShiftRequest, "reviewId" | "employeeId"> & {
  reviewKey: string;
  employeeKey: string;
};

const toRequest = ({ reviewKey, employeeKey, ...rest }: Row): ShiftRequest => ({
  ...rest,
  reviewId: demoId("reviews", reviewKey),
  employeeId: demoId("employees", employeeKey),
});

export const deadlineShiftStore = createDemoStore<ShiftRequest[]>(() => {
  const rows: Row[] = [
    {
      reviewKey: "mazur",
      employeeKey: "analityk",
      changeIndex: 0,
      createdAt: msFromToday(-3),
      employeeName: "Joanna Mazur",
      employeePosition: "Główny analityk",
      supervisorName: SUPERVISOR,
      currentDueDate: daysFromToday(10),
      reason: "employee_request",
      basis: "optional",
      status: "requested",
      previousDate: daysFromToday(10),
      proposedDate: daysFromToday(30),
      newDate: daysFromToday(30),
      employeeReason:
        "Pracuję nad kontrolą, która kończy się dopiero za trzy tygodnie.",
      shiftAllowed: true,
    },
    {
      reviewKey: "wojcik",
      employeeKey: "inspektor",
      changeIndex: 0,
      createdAt: msFromToday(-2),
      employeeName: "Michał Wójcik",
      employeePosition: "Inspektor",
      supervisorName: SUPERVISOR,
      currentDueDate: daysFromToday(5),
      reason: "employee_request",
      basis: "optional",
      status: "requested",
      previousDate: daysFromToday(5),
      proposedDate: daysFromToday(260),
      newDate: daysFromToday(260),
      employeeReason: "Planowany urlop wychowawczy.",
      shiftAllowed: false,
      shiftBlockedReason: BLOCKED_REASON,
    },
    {
      reviewKey: "lewandowski",
      employeeKey: "radca",
      changeIndex: 0,
      createdAt: msFromToday(-12),
      employeeName: "Tomasz Lewandowski",
      employeePosition: "Radca",
      supervisorName: SUPERVISOR,
      currentDueDate: daysFromToday(8),
      reason: "employee_request",
      basis: "optional",
      status: "approved",
      previousDate: daysFromToday(8),
      proposedDate: daysFromToday(28),
      newDate: daysFromToday(21),
      employeeReason: "Zastępstwo za nieobecnego kolegę.",
      decisionJustification:
        "Termin przesunięty o trzy tygodnie, dłużej nie ma potrzeby.",
      decidedByName: SUPERVISOR,
      decidedAt: msFromToday(-9),
      shiftAllowed: true,
    },
    {
      reviewKey: "krawczyk",
      employeeKey: "archiwista",
      changeIndex: 0,
      createdAt: msFromToday(-14),
      employeeName: "Zofia Krawczyk",
      employeePosition: "Archiwista",
      supervisorName: SUPERVISOR,
      currentDueDate: daysFromToday(14),
      reason: "employee_request",
      basis: "optional",
      status: "rejected",
      previousDate: daysFromToday(14),
      proposedDate: daysFromToday(45),
      newDate: daysFromToday(45),
      employeeReason: "Chcę mieć więcej czasu na samoocenę.",
      decisionJustification:
        "Brak podstaw do przesunięcia, rozmowa jest już umówiona.",
      decidedByName: SUPERVISOR,
      decidedAt: msFromToday(-10),
      shiftAllowed: true,
    },
    {
      reviewKey: "kaczmarek",
      employeeKey: "specjalista-terminowy",
      changeIndex: 0,
      createdAt: msFromToday(-30),
      employeeName: "Agnieszka Kaczmarek",
      employeePosition: "Specjalista",
      supervisorName: SUPERVISOR,
      currentDueDate: daysFromToday(20),
      reason: "employee_request",
      basis: "optional",
      status: "approved",
      previousDate: daysFromToday(2),
      proposedDate: daysFromToday(20),
      newDate: daysFromToday(20),
      employeeReason: "Choroba w okresie oceny.",
      decisionJustification: "Uwzględniam.",
      decidedByName: SUPERVISOR,
      decidedAt: msFromToday(-25),
      noticeSentAt: msFromToday(-20),
      shiftAllowed: true,
    },
    {
      reviewKey: "przykladowa",
      employeeKey: "anna",
      changeIndex: 0,
      createdAt: msFromToday(-6),
      employeeName: "Anna Przykładowa",
      employeePosition: "Główny specjalista",
      supervisorName: SUPERVISOR,
      currentDueDate: daysFromToday(12),
      reason: "evaluator_change",
      basis: "mandatory",
      status: "approved",
      previousDate: daysFromToday(12),
      newDate: daysFromToday(42),
      decidedByName: HR,
      decidedAt: msFromToday(-6),
      shiftAllowed: true,
    },
  ];
  return rows.map(toRequest);
});

type Entry = { reviewId: string; changeIndex: number };

const sameEntry = (row: ShiftRequest, entry: Entry) =>
  row.reviewId === entry.reviewId && row.changeIndex === entry.changeIndex;

export function decide(
  rows: ShiftRequest[],
  args: ArgsOf<typeof decideContract>,
) {
  const row = rows.find((r) => sameEntry(r, args));
  if (!row || row.status !== "requested") {
    throw new Error("Wniosek nie czeka na decyzję.");
  }
  if (args.accepted && !row.shiftAllowed) {
    throw new Error(
      row.shiftBlockedReason ?? "Przesunięcie terminu jest niedozwolone.",
    );
  }
  if (args.accepted && !args.newDate) throw new Error("Podaj nowy termin.");
  const next: ShiftRequest = {
    ...row,
    status: args.accepted ? "approved" : "rejected",
    newDate: args.accepted && args.newDate ? args.newDate : row.newDate,
    decisionJustification: args.justification,
    decidedByName: SUPERVISOR,
    decidedAt: Date.now(),
  };
  return { state: rows.map((r) => (r === row ? next : r)), result: null };
}

export function markNoticeSent(
  rows: ShiftRequest[],
  args: ArgsOf<typeof markNoticeSentContract>,
) {
  const row = rows.find((r) => sameEntry(r, args));
  if (!row || row.status === "requested") {
    throw new Error("Brak decyzji do zakomunikowania.");
  }
  const dueDate = row.status === "approved" ? row.newDate : row.currentDueDate;
  const next: ShiftRequest = {
    ...row,
    noticeSentAt: Date.now(),
    currentDueDate: dueDate,
  };
  return {
    state: rows.map((r) => (r === row ? next : r)),
    result: { dueDate },
  };
}
