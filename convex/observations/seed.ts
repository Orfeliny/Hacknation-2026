import { internalMutation } from "../_generated/server";

// Examples close to the ones given in the KPRM interviews (W1 23:14), for employees from
// employees/seed:run. Idempotent: skips a note the supervisor already wrote (same employee, date and text).
const NOTES = [
  {
    key: "anna",
    date: "2025-06-12",
    sentiment: "positive",
    criterionId: "organizacja_pracy",
    text: "Świetny pomysł na harmonogram kontroli: zadanie zrobione w tydzień zamiast dwóch miesięcy.",
  },
  {
    key: "anna",
    date: "2026-02-03",
    sentiment: "positive",
    criterionId: "komunikacja",
    text: "Jasno wyjaśniła kontrolowanemu podmiotowi zalecenia pokontrolne, bez dalszych pytań.",
  },
  {
    key: "anna",
    date: "2026-09-18",
    sentiment: "development",
    criterionId: "wykorzystywanie_wiedzy",
    text: "Nie zna jeszcze nowych przepisów o kontroli; zaproponowałam szkolenie.",
  },
  {
    key: "radca",
    date: "2025-11-04",
    sentiment: "development",
    criterionId: "rzetelnosc",
    text: "Notorycznie się spóźnia z opiniami; trzy terminy przekroczone w miesiącu.",
  },
  {
    key: "radca",
    date: "2026-04-22",
    sentiment: "positive",
    criterionId: "rzetelnosc",
    text: "Po rozmowie wszystkie opinie oddane w terminie.",
  },
  {
    key: "analityk",
    date: "2026-07-01",
    sentiment: "neutral",
    criterionId: "organizacja_pracy",
    text: "Przejęła część zadań nieobecnego współpracownika; obciążenie wyraźnie wzrosło.",
    wellbeing: true,
  },
  {
    key: "archiwista",
    date: "2026-05-15",
    sentiment: "positive",
    criterionId: "wspolpraca",
    text: "Sama zaproponowała, że wdroży nowego pracownika w porządkowanie akt.",
  },
] as const;

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const boss = await ctx.db
      .query("employees")
      .withIndex("by_seedKey", (q) => q.eq("seedKey", "naczelnik"))
      .unique();
    if (!boss) throw new Error("Najpierw uruchom employees/seed:run.");
    const written = await ctx.db
      .query("observations")
      .withIndex("by_author", (q) => q.eq("authorId", boss._id))
      .collect();
    let inserted = 0;
    for (const note of NOTES) {
      const employee = await ctx.db
        .query("employees")
        .withIndex("by_seedKey", (q) => q.eq("seedKey", note.key))
        .unique();
      if (!employee) continue;
      if (
        written.some(
          (o) =>
            o.employeeId === employee._id &&
            o.date === note.date &&
            o.text === note.text,
        )
      )
        continue;
      await ctx.db.insert("observations", {
        employeeId: employee._id,
        authorId: boss._id,
        date: note.date,
        text: note.text,
        sentiment: note.sentiment,
        criterionId: note.criterionId,
        wellbeing: "wellbeing" in note ? note.wellbeing : undefined,
        createdAt: Date.now(),
      });
      inserted++;
    }
    return { inserted };
  },
});
