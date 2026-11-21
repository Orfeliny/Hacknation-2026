import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import type { DemoRole } from "../lib/validators";
import type { PositionKind, StaffingSituation } from "../rules/types";

// Fictional office for the demo. Positions follow the filled sheets in
// docs/materialy_md/05-przyklady-wypelnione (A for the head of the office, B for managers, C).
type SeedEmployee = {
  key: string;
  firstName: string;
  lastName: string;
  position: string;
  unit: string;
  positionKind: PositionKind;
  corpsRole: "official" | "employee";
  contractTerm?: "indefinite" | "fixed_term";
  indefiniteEmploymentSince?: string;
  supervisor?: string;
  demoPersona?: DemoRole;
  serviceGrade?: number;
  serviceGradeSince?: string;
  appointmentYear?: number;
  isNewToCivilService?: boolean;
  staffingEvents?: (Omit<StaffingSituation, "previousEvaluatorId"> & {
    previousEvaluator?: string;
  })[];
};

export const DEMO_EMPLOYEES: SeedEmployee[] = [
  {
    key: "glowny-inspektor",
    firstName: "Marek",
    lastName: "Zieliński",
    position: "Główny Inspektor",
    unit: "Kierownictwo urzędu",
    positionKind: "office_head",
    corpsRole: "official",
    indefiniteEmploymentSince: "2019-02-01",
    serviceGrade: 7,
    serviceGradeSince: "2022-05-01",
    appointmentYear: 2012,
  },
  {
    key: "dyrektor-generalny",
    firstName: "Ewa",
    lastName: "Kowalczyk",
    position: "Dyrektor Generalny",
    unit: "Kierownictwo urzędu",
    positionKind: "managerial",
    corpsRole: "official",
    indefiniteEmploymentSince: "2018-09-01",
    supervisor: "glowny-inspektor",
    demoPersona: "director",
    serviceGrade: 6,
    serviceGradeSince: "2023-03-01",
    appointmentYear: 2011,
  },
  {
    key: "dyrektor-departamentu",
    firstName: "Piotr",
    lastName: "Nowicki",
    position: "Dyrektor Departamentu Kontroli",
    unit: "Departament Kontroli",
    positionKind: "managerial",
    corpsRole: "official",
    indefiniteEmploymentSince: "2017-01-02",
    supervisor: "dyrektor-generalny",
    serviceGrade: 5,
    serviceGradeSince: "2021-10-01",
    appointmentYear: 2014,
  },
  {
    key: "naczelnik",
    firstName: "Katarzyna",
    lastName: "Wiśniewska",
    position: "Naczelnik Wydziału Kontroli Planowej",
    unit: "Wydział Kontroli Planowej",
    positionKind: "managerial",
    corpsRole: "official",
    indefiniteEmploymentSince: "2016-04-01",
    supervisor: "dyrektor-departamentu",
    demoPersona: "supervisor",
    serviceGrade: 4,
    serviceGradeSince: "2022-01-01",
    appointmentYear: 2015,
  },
  {
    key: "anna",
    firstName: "Anna",
    lastName: "Przykładowa",
    position: "Główny specjalista",
    unit: "Wydział Kontroli Planowej",
    positionKind: "non_managerial",
    corpsRole: "official",
    indefiniteEmploymentSince: "2020-03-02",
    supervisor: "naczelnik",
    demoPersona: "employee",
    serviceGrade: 3,
    serviceGradeSince: "2023-04-01",
    appointmentYear: 2020,
  },
  {
    key: "radca",
    firstName: "Tomasz",
    lastName: "Lewandowski",
    position: "Radca",
    unit: "Wydział Kontroli Planowej",
    positionKind: "non_managerial",
    corpsRole: "employee",
    contractTerm: "indefinite",
    indefiniteEmploymentSince: "2019-07-01",
    supervisor: "naczelnik",
    // Sick leave and holiday back to back: one absence longer than a month (KPRM note).
    staffingEvents: [
      { kind: "long_absence", from: "2026-10-05", to: "2026-10-16" },
      { kind: "long_absence", from: "2026-10-19", to: "2026-11-06" },
    ],
  },
  {
    key: "analityk",
    firstName: "Joanna",
    lastName: "Mazur",
    position: "Główny analityk",
    unit: "Wydział Kontroli Planowej",
    positionKind: "non_managerial",
    corpsRole: "employee",
    contractTerm: "indefinite",
    indefiniteEmploymentSince: "2021-02-15",
    supervisor: "naczelnik",
    staffingEvents: [
      {
        kind: "duties_change",
        from: "2026-06-01",
        note: "Przejęcie zadań po osobie na urlopie rodzicielskim.",
      },
    ],
  },
  {
    key: "archiwista",
    firstName: "Zofia",
    lastName: "Krawczyk",
    position: "Archiwista",
    unit: "Wydział Kontroli Planowej",
    positionKind: "non_managerial",
    corpsRole: "employee",
    contractTerm: "indefinite",
    indefiniteEmploymentSince: "2015-05-04",
    supervisor: "naczelnik",
    staffingEvents: [
      {
        kind: "evaluator_change",
        from: "2026-03-01",
        previousEvaluator: "dyrektor-departamentu",
        note: "Przeniesienie do Wydziału Kontroli Planowej.",
      },
    ],
  },
  {
    key: "inspektor",
    firstName: "Michał",
    lastName: "Wójcik",
    position: "Inspektor",
    unit: "Wydział Kontroli Planowej",
    positionKind: "non_managerial",
    corpsRole: "employee",
    contractTerm: "indefinite",
    indefiniteEmploymentSince: "2026-09-01",
    supervisor: "naczelnik",
    isNewToCivilService: true,
  },
  {
    key: "specjalista-terminowy",
    firstName: "Agnieszka",
    lastName: "Kaczmarek",
    position: "Specjalista",
    unit: "Wydział Kontroli Planowej",
    positionKind: "non_managerial",
    corpsRole: "employee",
    contractTerm: "fixed_term",
    supervisor: "naczelnik",
  },
  {
    key: "kadry",
    firstName: "Barbara",
    lastName: "Dąbrowska",
    position: "Główny specjalista ds. kadr",
    unit: "Wydział Kadr",
    positionKind: "non_managerial",
    corpsRole: "employee",
    contractTerm: "indefinite",
    indefiniteEmploymentSince: "2018-11-05",
    supervisor: "dyrektor-generalny",
    demoPersona: "hr",
  },
  {
    key: "admin",
    firstName: "Łukasz",
    lastName: "Pawlak",
    position: "Informatyk",
    unit: "Wydział Informatyki",
    positionKind: "non_managerial",
    corpsRole: "employee",
    contractTerm: "indefinite",
    indefiniteEmploymentSince: "2022-01-10",
    supervisor: "dyrektor-generalny",
    demoPersona: "admin",
  },
];

const email = (e: SeedEmployee) =>
  `${e.firstName}.${e.lastName}@urzad.example`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l");

// Idempotent: rows are matched by seedKey and updated in place, so re-running never duplicates.
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ids = new Map<string, Id<"employees">>();
    let inserted = 0;
    for (const e of DEMO_EMPLOYEES) {
      const existing = await ctx.db
        .query("employees")
        .withIndex("by_seedKey", (q) => q.eq("seedKey", e.key))
        .unique();
      const base = {
        firstName: e.firstName,
        lastName: e.lastName,
        position: e.position,
        unit: e.unit,
        positionKind: e.positionKind,
        corpsRole: e.corpsRole,
        contractTerm: e.contractTerm,
        indefiniteEmploymentSince: e.indefiniteEmploymentSince,
        email: email(e),
        demoPersona: e.demoPersona,
        serviceGrade: e.serviceGrade,
        serviceGradeSince: e.serviceGradeSince,
        appointmentYear: e.appointmentYear,
        isNewToCivilService: e.isNewToCivilService,
        seedKey: e.key,
      };
      if (existing) {
        await ctx.db.patch(existing._id, base);
        ids.set(e.key, existing._id);
      } else {
        ids.set(
          e.key,
          await ctx.db.insert("employees", { ...base, createdAt: Date.now() }),
        );
        inserted++;
      }
    }
    for (const e of DEMO_EMPLOYEES) {
      await ctx.db.patch(ids.get(e.key)!, {
        supervisorId: e.supervisor ? ids.get(e.supervisor) : undefined,
        staffingEvents: e.staffingEvents?.map(
          ({ previousEvaluator, ...event }) => ({
            ...event,
            previousEvaluatorId: previousEvaluator
              ? ids.get(previousEvaluator)
              : undefined,
          }),
        ),
      });
    }
    return { inserted, total: DEMO_EMPLOYEES.length };
  },
});
