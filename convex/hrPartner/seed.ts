import { internalMutation } from "../_generated/server";
import { addDays } from "../rules/dates";
import { todayIso } from "./time";

// Recent observations for the demo office from employees/seed:run, dated relative to today so the
// signals are on screen whenever the demo is run: a workload signal for the analyst and a recognition
// moment for Anna. Idempotent: a note that is already stored (same employee and text) is skipped.
const NOTES = [
  {
    key: "analityk",
    daysAgo: 4,
    sentiment: "neutral",
    criterionId: "organizacja_pracy",
    wellbeing: true,
    text: "Kolejny tydzień zostaje po godzinach, żeby domknąć zadania po przejętym zakresie.",
  },
  {
    key: "analityk",
    daysAgo: 15,
    sentiment: "neutral",
    criterionId: "organizacja_pracy",
    wellbeing: true,
    text: "Zgłosiła, że nie nadąża z terminami przy dwóch równoległych zadaniach.",
  },
  {
    key: "analityk",
    daysAgo: 27,
    sentiment: "neutral",
    criterionId: "organizacja_pracy",
    wellbeing: true,
    text: "Pracowała w weekend nad sprawozdaniem i prosiła o odciążenie.",
  },
  {
    key: "anna",
    daysAgo: 6,
    sentiment: "positive",
    criterionId: "komunikacja",
    wellbeing: false,
    text: "Bardzo dobrze poprowadziła spotkanie z kontrolowanym podmiotem, bez dalszych pytań.",
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
    const today = todayIso(Date.now());
    let inserted = 0;
    for (const note of NOTES) {
      const employee = await ctx.db
        .query("employees")
        .withIndex("by_seedKey", (q) => q.eq("seedKey", note.key))
        .unique();
      if (!employee) continue;
      const stored = await ctx.db
        .query("observations")
        .withIndex("by_employee_date", (q) => q.eq("employeeId", employee._id))
        .collect();
      if (stored.some((o) => o.text === note.text)) continue;
      await ctx.db.insert("observations", {
        employeeId: employee._id,
        authorId: boss._id,
        date: addDays(today, -note.daysAgo),
        text: note.text,
        sentiment: note.sentiment,
        criterionId: note.criterionId,
        wellbeing: note.wellbeing || undefined,
        createdAt: Date.now(),
      });
      inserted += 1;
    }
    return { inserted };
  },
});
