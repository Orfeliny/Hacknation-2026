import type { Id, TableNames } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { fullName } from "./employees/access";
import { computeAssessment, mandatoryCriteria } from "./rules/assessment";
import type { CriterionId } from "./rules/pack2016";

const at = <T>(items: readonly T[], i: number): T => {
  const item = items[i % items.length];
  if (item === undefined) throw new Error("seed: empty list");
  return item;
};

const DAY = 24 * 60 * 60 * 1000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

const MARKER_V1 = "__DEMO_SEED_V1__";
const MARKER_V2_LEGACY = "__DEMO_SEED_V2__";
// A demo document instead of a note: every role reads `notes` in the UI, so a marker there leaks.
const MARKER_SOURCE_ID = "demo-przewodnik-v2";
const V1_NOTE_TEXT =
  "Środowisko demo zostało zasilone przykładowymi danymi. Dane są fikcyjne.";
const V1_OPTION_DESCRIPTION =
  "Proponowana aktywność rozwojowa z praktycznymi ćwiczeniami i możliwością wykorzystania wiedzy w codziennej pracy.";
const V1_OPTION_TITLES = [
  "Komunikacja interpersonalna",
  "Zarządzanie czasem i priorytetami",
  "Analityczne rozwiązywanie problemów",
  "Współpraca w zespole",
  "Wystąpienia publiczne",
];

const OBSERVATIONS = [
  {
    sentiment: "development",
    text: "Warto doskonalić priorytetyzację przy kilku równoległych zadaniach.",
  },
  {
    sentiment: "neutral",
    text: "Omówił na spotkaniu zespołu stan realizowanych zadań.",
  },
  {
    sentiment: "positive",
    text: "Samodzielnie przygotował zestawienie i przekazał je przed terminem.",
  },
  {
    sentiment: "positive",
    text: "Wspierał współpracowników w realizacji pilnego zadania.",
  },
] as const;

// Sheet C mandatory criteria plus one valid additional criterion; levels are pack2016 partial-scale points.
const ADDITIONAL_CRITERION = "myslenie_analityczne";
const RATED_CRITERIA: {
  id: CriterionId;
  points: (i: number) => 5 | 7;
  justification: string;
}[] = [
  {
    id: "wykorzystywanie_wiedzy",
    points: () => 5,
    justification:
      "Pracownik korzysta z przepisów i orzecznictwa w bieżących sprawach.",
  },
  {
    id: "rzetelnosc",
    points: () => 5,
    justification: "Powierzone zadania są realizowane zgodnie z ustaleniami.",
  },
  {
    id: "organizacja_pracy",
    points: () => 5,
    justification: "Zadania są planowane i kończone w uzgodnionych terminach.",
  },
  {
    id: "wspolpraca",
    points: () => 7,
    justification: "Pracownik chętnie dzieli się wiedzą.",
  },
  {
    id: "komunikacja",
    points: (i) => (i % 2 === 0 ? 7 : 5),
    justification: "Komunikacja z zespołem jest rzeczowa i terminowa.",
  },
  {
    id: ADDITIONAL_CRITERION,
    points: () => 7,
    justification: "Wnioski z analiz są trafne i dobrze uzasadnione.",
  },
];

const PERSONA_KEYS = [
  "naczelnik",
  "kadry",
  "anna",
  "radca",
  "analityk",
  "archiwista",
  "inspektor",
  "admin",
  "glowny-inspektor",
  "dyrektor-generalny",
  "dyrektor-departamentu",
] as const;

// Order matters: a table is scanned after the tables whose rows it may point at.
const OWNED_BY_V1: { table: TableNames; refs: string[] }[] = [
  { table: "reviews", refs: ["employeeId"] },
  { table: "firstReviews", refs: ["employeeId"] },
  { table: "drafts", refs: ["reviewId"] },
  { table: "forumThreads", refs: ["authorId"] },
  { table: "forumReplies", refs: ["authorId", "threadId"] },
  { table: "observations", refs: ["employeeId", "authorId"] },
  {
    table: "competencyAssessments",
    refs: ["employeeId", "reviewId", "firstReviewId"],
  },
  { table: "conversations", refs: ["employeeId", "authorId", "reviewId"] },
  { table: "hrSignals", refs: ["employeeId"] },
  { table: "reminders", refs: ["recipientId", "reviewId", "firstReviewId"] },
  {
    table: "mailMessages",
    refs: ["recipientId", "reviewId", "conversationId", "reminderId"],
  },
  { table: "selfNotes", refs: ["employeeId", "reviewId"] },
  { table: "aiInteractions", refs: ["employeeId", "reviewId", "draftId"] },
  { table: "auditLog", refs: ["reviewId"] },
];

// Rows kept by the cleanup that may still point at a deleted V1 person.
const KEPT_PERSON_REFS: { table: TableNames; field: string }[] = [
  { table: "employees", field: "supervisorId" },
  { table: "reviews", field: "evaluatorId" },
  { table: "firstReviews", field: "evaluatorId" },
  { table: "hrSignals", field: "supervisorId" },
  { table: "competencyAssessments", field: "assessorId" },
  { table: "auditLog", field: "actorId" },
  { table: "aiInteractions", field: "actorId" },
  { table: "forumThreads", field: "moderatedById" },
  { table: "knowledgeDocuments", field: "uploadedById" },
];

type Fields = Record<string, unknown>;

async function personaIds(ctx: MutationCtx) {
  const ids = {} as Record<(typeof PERSONA_KEYS)[number], Id<"employees">>;
  for (const key of PERSONA_KEYS) {
    const row = await ctx.db
      .query("employees")
      .withIndex("by_seedKey", (q) => q.eq("seedKey", key))
      .unique();
    if (!row) {
      throw new Error(
        `seed: employee "${key}" not found. Run \`npx convex run employees/seed:run\` before \`seed:seed\`.`,
      );
    }
    ids[key] = row._id;
  }
  return ids;
}

// Deletes only what the V1 seed created: its own employees by seedKey and whatever hangs
// off them through an owning reference. Anything else that points at a V1 person
// (supervisor, evaluator, actor) is kept and reported.
async function removeV1(ctx: MutationCtx) {
  const gone = new Set<string>();
  const removed: Record<string, number> = {};
  const drop = async (table: TableNames, id: Id<TableNames>) => {
    gone.add(id);
    removed[table] = (removed[table] ?? 0) + 1;
    await ctx.db.delete(id);
  };

  const employees = await ctx.db.query("employees").collect();
  const v1Employees = employees.filter((e) =>
    e.seedKey?.startsWith("demo-employee-"),
  );
  for (const e of v1Employees) gone.add(e._id);

  for (const { table, refs } of OWNED_BY_V1) {
    for (const row of await ctx.db.query(table).collect()) {
      const fields = row as unknown as Fields;
      if (
        refs.some((f) => typeof fields[f] === "string" && gone.has(fields[f]))
      )
        await drop(table, row._id);
    }
  }
  for (const e of v1Employees) await drop("employees", e._id);

  for (const a of await ctx.db.query("adviceArticles").collect()) {
    if (a.slug.startsWith("demo-poradnik-"))
      await drop("adviceArticles", a._id);
  }
  for (const o of await ctx.db.query("developmentOptions").collect()) {
    if (
      o.description === V1_OPTION_DESCRIPTION &&
      V1_OPTION_TITLES.includes(o.title)
    )
      await drop("developmentOptions", o._id);
  }
  for (const c of await ctx.db.query("knowledgeChunks").collect()) {
    if (c.sourceId === "demo-przewodnik") await drop("knowledgeChunks", c._id);
  }
  for (const r of await ctx.db.query("regulationWatch").collect()) {
    if (r.eliId === "demo-eli-przepis") await drop("regulationWatch", r._id);
  }
  for (const n of await ctx.db.query("notes").collect()) {
    if (n.text === MARKER_V1 || n.text === V1_NOTE_TEXT)
      await drop("notes", n._id);
  }

  const dangling: { table: string; id: string; field: string }[] = [];
  for (const { table, field } of KEPT_PERSON_REFS) {
    for (const row of await ctx.db.query(table).collect()) {
      const ref = (row as unknown as Fields)[field];
      if (typeof ref === "string" && gone.has(ref))
        dangling.push({ table, id: row._id, field });
    }
  }
  return { removed, dangling };
}

/**
 * Demo seeder (V2). Run order on a fresh backend:
 *   npx convex run employees/seed:run
 *   npx convex run seed:seed
 *   then the feature seeds
 *
 * V2 hangs the demo data on the personas from employees/seed.ts. When rows from the V1
 * seed exist they are removed first. A marker in `notes` makes a second run a no-op.
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const marked =
      (await ctx.db
        .query("knowledgeChunks")
        .filter((q) => q.eq(q.field("sourceId"), MARKER_SOURCE_ID))
        .first()) ??
      (await ctx.db
        .query("notes")
        .filter((q) => q.eq(q.field("text"), MARKER_V2_LEGACY))
        .first());
    if (marked) {
      return { seeded: false, message: "Demo data already exists." };
    }

    const persona = await personaIds(ctx);
    const replaced = await removeV1(ctx);

    const now = Date.now();
    const daysAgo = (days: number) => now - days * DAY;
    const isoIn = (days: number) => isoDay(now + days * DAY);

    const supervisorId = persona.naczelnik;
    const officeHeadId = persona["glowny-inspektor"];
    const directorDeptId = persona["dyrektor-departamentu"];
    const hrId = persona.kadry;
    const team = [
      persona.radca,
      persona.analityk,
      persona.archiwista,
      persona.inspektor,
      persona.anna,
    ];

    // -----------------------------------------------------------------------
    // Reviews and first-service reviews
    // -----------------------------------------------------------------------
    const STAGE_PATH = [
      "setup",
      "opening",
      "observation",
      "evaluation",
      "writing",
      "signing",
      "closed",
    ] as const;
    const OBJECTION_PATH = [
      "setup",
      "opening",
      "observation",
      "evaluation",
      "writing",
      "signing",
      "objection_window",
      "objection",
    ] as const;
    type ReviewStage = (typeof OBJECTION_PATH)[number] | "closed";
    type Signature = {
      role: "evaluator" | "employee";
      signerId: Id<"employees">;
      signedAt: number;
      scope: "part_one" | "assessment";
      method: "in_app";
      place?: string;
    };
    type ReviewExtra = {
      previousReviewId?: Id<"reviews">;
      closed?: boolean;
      evaluatorId?: Id<"employees">;
      sheet?: "B" | "C";
      signatures?: Signature[];
      objection?: {
        filedAt: number;
        text: string;
        addressee?: string;
      };
      deadlineChanges?: {
        reason: "employee_request";
        status: "requested";
        previousDate: string;
        newDate: string;
        proposedDate: string;
        employeeReason: string;
        createdAt: number;
        requestedById: Id<"employees">;
      }[];
      // Days ago the current stage began; earlier stages are spaced `gap` days apart before it.
      currentSince?: number;
      gap?: number;
    };

    const reviewBase = (
      employeeId: Id<"employees">,
      stage: ReviewStage,
      i: number,
      period: { start: string; end: string; due: string },
      extra: ReviewExtra = {},
    ) => {
      const path: readonly ReviewStage[] =
        stage === "objection" ? OBJECTION_PATH : STAGE_PATH;
      const steps = path.slice(0, path.indexOf(stage) + 1);
      const gap = extra.gap ?? 12;
      const born =
        extra.currentSince === undefined
          ? 150 - i * 8
          : extra.currentSince + (steps.length - 1) * gap;
      const rated = path.indexOf(stage) >= path.indexOf("writing");
      const sheet = extra.sheet ?? "C";
      const criteriaToRate =
        sheet === "B"
          ? mandatoryCriteria("B").map((id, n) => ({
              id,
              points: () => (n % 2 === 0 ? (5 as const) : (7 as const)),
              justification: "Zadania są realizowane rzetelnie i terminowo.",
            }))
          : RATED_CRITERIA;
      const ratings = criteriaToRate.map((c) => ({
        criterionId: c.id,
        levelId: String(c.points(i)),
        justification: c.justification,
      }));
      const assessment = computeAssessment(
        ratings.map((r) => Number(r.levelId)),
      );
      const scored = {
        ratings,
        averageScore: assessment.average,
        overallLevelId: assessment.levelId,
        overallJustification:
          "Ocena oparta na udokumentowanych obserwacjach i realizacji uzgodnionych celów.",
      };
      return {
        employeeId,
        evaluatorId: extra.evaluatorId ?? supervisorId,
        createdAt: daysAgo(born),
        updatedAt: daysAgo(extra.currentSince ?? 5 + i),
        stage,
        round: 1,
        sheet,
        rulesVersion: "2025.1",
        periodStart: period.start,
        periodEnd: period.end,
        dueDate: period.due,
        openingConversationDate: isoDay(daysAgo(born - 10)),
        evaluationConversationDate:
          steps.length > 3 ? isoDay(daysAgo(30 - i)) : undefined,
        previousReviewId: extra.previousReviewId,
        expectations: [
          {
            criterionId: "komunikacja",
            text: "Jasne i terminowe przekazywanie informacji.",
          },
          {
            criterionId: "organizacja_pracy",
            text: "Terminowa realizacja zadań i właściwe ustalanie priorytetów.",
          },
          {
            criterionId: "wspolpraca",
            text: "Współpraca z członkami zespołu.",
          },
        ],
        additionalCriteria: sheet === "C" ? [ADDITIONAL_CRITERION] : [],
        ...(rated ? scored : {}),
        signatures: extra.signatures,
        objection: extra.objection,
        deadlineChanges: extra.deadlineChanges,
        overallResult: extra.closed ? ("positive" as const) : undefined,
        previousReview: {
          date: "2024-12-15",
          levelId: "na_poziomie_oczekiwan",
          result: "positive" as const,
        },
        developmentPlan: {
          summary: "Plan rozwoju na kolejny okres oceny.",
          strengths: ["Współpraca", "Rzetelność"],
          areas: [
            {
              id: "komunikacja",
              criterionId: "komunikacja",
              text: "Doskonalenie komunikacji w sytuacjach trudnych.",
            },
          ],
          actions: [
            {
              areaId: "komunikacja",
              kind: "training" as const,
              text: "Udział w szkoleniu z komunikacji interpersonalnej.",
            },
            {
              areaId: "komunikacja",
              kind: "task" as const,
              text: "Poprowadzenie krótkiego spotkania zespołu.",
            },
          ],
        },
        stageHistory: steps.map((step, n) => ({
          at: daysAgo(born - n * gap),
          stage: step,
        })),
        ...(extra.closed
          ? { closedAt: daysAgo(2), endReason: "completed" as const }
          : {}),
      };
    };

    const current = { start: "2026-01-01", end: "2026-12-31" };
    const closedReviewId = await ctx.db.insert(
      "reviews",
      reviewBase(
        persona.analityk,
        "closed",
        3,
        { start: "2025-01-01", end: "2025-12-31", due: "2026-02-28" },
        { closed: true },
      ),
    );
    const shiftRequest = (
      employeeId: Id<"employees">,
      due: number,
      proposed: number,
      ageDays: number,
      employeeReason: string,
    ) => ({
      reason: "employee_request" as const,
      status: "requested" as const,
      previousDate: isoIn(due),
      newDate: isoIn(proposed),
      proposedDate: isoIn(proposed),
      employeeReason,
      createdAt: daysAgo(ageDays),
      requestedById: employeeId,
    });
    const activeReviews = [
      {
        employeeId: persona.radca,
        stage: "observation",
        due: -4,
        shift: shiftRequest(
          persona.radca,
          -4,
          26,
          1,
          "Przez kilka tygodni byłem nieobecny z powodu choroby i urlopu, więc nie zdążyłem uzupełnić materiałów do oceny. Proszę o przesunięcie terminu.",
        ),
      },
      {
        employeeId: persona.analityk,
        stage: "evaluation",
        due: 9,
        previousReviewId: closedReviewId,
      },
      {
        employeeId: persona.archiwista,
        stage: "writing",
        due: 21,
        shift: shiftRequest(
          persona.archiwista,
          21,
          35,
          3,
          "W najbliższych tygodniach porządkuję przeniesione archiwum i proszę o więcej czasu na rozmowę oceniającą.",
        ),
      },
    ] as const;
    const reviewIds: Id<"reviews">[] = [];
    for (let i = 0; i < activeReviews.length; i++) {
      const r = at(activeReviews, i);
      reviewIds.push(
        await ctx.db.insert(
          "reviews",
          reviewBase(
            r.employeeId,
            r.stage,
            i,
            { ...current, due: isoIn(r.due) },
            {
              ...("previousReviewId" in r
                ? { previousReviewId: r.previousReviewId }
                : {}),
              ...("shift" in r ? { deadlineChanges: [r.shift] } : {}),
            },
          ),
        ),
      );
    }
    reviewIds.push(closedReviewId);
    const reviewEmployees = [
      persona.radca,
      persona.analityk,
      persona.archiwista,
      persona.analityk,
    ];

    // -----------------------------------------------------------------------
    // Flows for the other roles: the employee persona, the director's objections
    // -----------------------------------------------------------------------
    const sign = (
      role: Signature["role"],
      signerId: Id<"employees">,
      scope: Signature["scope"],
      daysBack: number,
    ): Signature => ({
      role,
      signerId,
      scope,
      signedAt: daysAgo(daysBack),
      method: "in_app",
      ...(role === "employee" && scope === "assessment"
        ? { place: "Warszawa" }
        : {}),
    });
    const part = (signerId: Id<"employees">, evaluatorId: Id<"employees">) => [
      sign("evaluator", evaluatorId, "part_one", 60),
      sign("employee", signerId, "part_one", 59),
    ];

    await ctx.db.insert(
      "reviews",
      reviewBase(
        persona.anna,
        "opening",
        14,
        { ...current, due: isoIn(160) },
        { currentSince: 2, gap: 14 },
      ),
    );
    await ctx.db.insert(
      "reviews",
      reviewBase(
        persona.anna,
        "signing",
        4,
        { start: "2025-01-01", end: "2025-12-31", due: isoIn(12) },
        {
          currentSince: 4,
          gap: 10,
          signatures: [
            ...part(persona.anna, supervisorId),
            sign("evaluator", supervisorId, "assessment", 3),
          ],
        },
      ),
    );

    const director = await ctx.db.get(persona["dyrektor-generalny"]);
    const addressee = director ? fullName(director) : undefined;
    const objectionReview = (
      employeeId: Id<"employees">,
      sheet: "B" | "C",
      sinceDays: number,
      text: string,
    ) => {
      const acknowledged = sinceDays + 2;
      return reviewBase(
        employeeId,
        "objection",
        sinceDays,
        { ...current, due: isoIn(30) },
        {
          sheet,
          evaluatorId: officeHeadId,
          currentSince: sinceDays,
          gap: 5,
          signatures: [
            ...part(employeeId, officeHeadId),
            sign("evaluator", officeHeadId, "assessment", acknowledged + 1),
            sign("employee", employeeId, "assessment", acknowledged),
          ],
          objection: { filedAt: daysAgo(sinceDays), text, addressee },
        },
      );
    };
    await ctx.db.insert(
      "reviews",
      objectionReview(
        directorDeptId,
        "B",
        5,
        "Nie zgadzam się z oceną kryterium „Zarządzanie ludźmi”. Oceniający nie uwzględnił reorganizacji departamentu, którą przeprowadziłem w tym okresie, ani opinii moich współpracowników.",
      ),
    );
    await ctx.db.insert(
      "reviews",
      objectionReview(
        persona.admin,
        "C",
        18,
        "Wnoszę sprzeciw od oceny kryterium „Komunikacja”. W okresie oceny nie otrzymałem informacji zwrotnej o zastrzeżeniach, a ocena pomija zadania wykonane przy wdrożeniu systemu.",
      ),
    );

    const firstReviewId = await ctx.db.insert("firstReviews", {
      employeeId: persona.inspektor,
      evaluatorId: supervisorId,
      createdAt: daysAgo(80),
      updatedAt: daysAgo(3),
      startDate: "2026-09-01",
      dueDate: "2027-09-01",
      stage: "assessment",
      rulesVersion: "2025.1",
      result: "positive",
      stageHistory: [
        { at: daysAgo(80), stage: "opening" },
        { at: daysAgo(30), stage: "assessment" },
      ],
    });

    // The radca moves under the department director: the supervisor's observations about
    // him become a handover case, and he is the "Nie" row (under 6 months) in HR's table.
    const radca = await ctx.db.get(persona.radca);
    await ctx.db.patch(persona.radca, {
      supervisorId: directorDeptId,
      staffingEvents: [
        ...(radca?.staffingEvents ?? []),
        {
          kind: "evaluator_change",
          from: isoIn(-14),
          previousEvaluatorId: supervisorId,
          note: "Przeniesienie pod nadzór Dyrektora Departamentu Kontroli.",
        },
      ],
    });

    // -----------------------------------------------------------------------
    // Observations, competency assessments and drafts
    // -----------------------------------------------------------------------
    const criteria: CriterionId[] = [
      "komunikacja",
      "organizacja_pracy",
      "wspolpraca",
      "rzetelnosc",
      "myslenie_analityczne",
    ];
    const observationIds: Id<"observations">[] = [];
    for (let i = 0; i < 15; i++) {
      const observationId = await ctx.db.insert("observations", {
        employeeId: at(team, i),
        authorId: supervisorId,
        createdAt: daysAgo(100 - i * 4),
        date: isoDay(daysAgo(100 - i * 4)),
        criterionId: at(criteria, i),
        sentiment: at(OBSERVATIONS, i).sentiment,
        text: at(OBSERVATIONS, i).text,
        wellbeing: i % 5 !== 0,
      });
      observationIds.push(observationId);
    }

    for (let i = 0; i < 20; i++) {
      await ctx.db.insert("competencyAssessments", {
        employeeId: at(reviewEmployees, i),
        assessorId: supervisorId,
        competencyId: `competency_${(i % 5) + 1}`,
        criterionId: at(criteria, i),
        createdAt: daysAgo(70 - i),
        updatedAt: daysAgo(2),
        modelVersion: "demo-v1",
        suggestedLevel: i % 2 === 0 ? "level_3" : "level_2",
        finalLevel: i % 3 === 0 ? "level_3" : "level_2",
        indicatorChoices: [
          { indicatorId: "indicator_1", levelId: "level_2" },
          { indicatorId: "indicator_2", levelId: "level_3" },
        ],
        reviewId: at(reviewIds, i),
      });
    }
    await ctx.db.insert("competencyAssessments", {
      employeeId: persona.inspektor,
      assessorId: supervisorId,
      competencyId: "competency_1",
      criterionId: "komunikacja",
      createdAt: daysAgo(20),
      updatedAt: daysAgo(2),
      modelVersion: "demo-v1",
      suggestedLevel: "level_2",
      finalLevel: "level_2",
      indicatorChoices: [{ indicatorId: "indicator_1", levelId: "level_2" }],
      firstReviewId,
    });

    const draftSections = [
      "criterion_justification",
      "strength",
      "development_area",
      "development_action",
      "feedback_tip",
    ] as const;
    for (let i = 0; i < 8; i++) {
      await ctx.db.insert("drafts", {
        reviewId: at(reviewIds, i),
        createdAt: daysAgo(10 - i),
        updatedAt: daysAgo(1),
        section: at(draftSections, i),
        status: i % 4 === 0 ? "accepted" : i % 4 === 1 ? "edited" : "proposed",
        criterionId: at(criteria, i),
        text: "Pracownik terminowo realizuje zadania i współpracuje z zespołem. W kolejnym okresie warto rozwijać umiejętność ustalania priorytetów.",
        observationIds: [at(observationIds, i)],
        noEvidence: false,
      });
    }

    // -----------------------------------------------------------------------
    // Conversations
    // -----------------------------------------------------------------------
    for (let i = 0; i < 6; i++) {
      await ctx.db.insert("conversations", {
        employeeId: at(reviewEmployees, i),
        authorId: supervisorId,
        reviewId: at(reviewIds, i),
        createdAt: daysAgo(40 - i),
        updatedAt: daysAgo(2),
        heldOn: isoDay(daysAgo(40 - i)),
        kind: i % 3 === 0 ? "opening" : i % 3 === 1 ? "evaluation" : "feedback",
        durationMinutes: 45,
        location: "Sala konferencyjna 2",
        outcomes: "Uzgodniono priorytety, terminy oraz działania rozwojowe.",
        plan: {
          goal: "Omówienie postępów i uzgodnienie dalszych działań.",
          agenda: ["Podsumowanie zadań", "Informacja zwrotna", "Plan rozwoju"],
          questions: [
            {
              criterionId: "komunikacja",
              text: "Co ułatwia sprawną współpracę w zespole?",
            },
            {
              criterionId: "organizacja_pracy",
              text: "Które zadania wymagały najwięcej zaangażowania?",
            },
          ],
          tips: [
            "Odwołuj się do konkretnych przykładów.",
            "Pozostaw czas na wypowiedź pracownika.",
          ],
          difficultScenario: "Pracownik nie zgadza się z przedstawioną oceną.",
        },
      });
    }

    // -----------------------------------------------------------------------
    // HR signals, reminders, mail and personal notes
    // -----------------------------------------------------------------------
    const signalKinds = [
      "workload",
      "recognition_moment",
      "duties_change",
      "no_recognition",
      "supervisor_change",
    ] as const;
    for (let i = 0; i < 5; i++) {
      await ctx.db.insert("hrSignals", {
        employeeId: at(team, i),
        supervisorId,
        detectedAt: daysAgo(12 - i),
        kind: at(signalKinds, i),
        reason:
          "Sygnał demonstracyjny wymagający weryfikacji w rozmowie z pracownikiem.",
        status: "open",
        recommendations: [
          {
            kind: "conversation",
            text: "Przeprowadź rozmowę i poznaj perspektywę pracownika.",
          },
          {
            kind: "organizational",
            text: "Sprawdź, czy potrzebna jest zmiana organizacji zadań.",
          },
        ],
      });
    }

    for (let i = 0; i < 8; i++) {
      await ctx.db.insert("reminders", {
        recipientId: at(reviewEmployees, i),
        createdAt: daysAgo(5),
        dueDate: "2026-12-15",
        kind:
          i % 3 === 0 ? "upcoming" : i % 3 === 1 ? "feedback_nudge" : "manual",
        message:
          "Przypomnienie demonstracyjne: sprawdź aktualny etap procesu oceny.",
        reviewId: at(reviewIds, i),
        stage: "observation",
      });
    }

    for (let i = 0; i < 6; i++) {
      await ctx.db.insert("mailMessages", {
        recipientId: at(reviewEmployees, i),
        createdAt: daysAgo(4 - i),
        sentAt: daysAgo(4 - i),
        channel: "demo_inbox",
        kind: i % 2 === 0 ? "reminder" : "meeting_invitation",
        status: "sent",
        subject:
          i % 2 === 0
            ? "Przypomnienie o ocenie okresowej"
            : "Zaproszenie na rozmowę",
        body: "To jest przykładowa wiadomość wygenerowana na potrzeby środowiska demonstracyjnego.",
        reviewId: at(reviewIds, i),
      });
    }

    for (let i = 0; i < 3; i++) {
      await ctx.db.insert("selfNotes", {
        employeeId: at(reviewEmployees, i),
        reviewId: at(reviewIds, i),
        createdAt: daysAgo(2),
        text: "Moja notatka: przygotować przykłady zrealizowanych zadań i obszary dalszego rozwoju.",
      });
    }

    // -----------------------------------------------------------------------
    // AI interactions and audit trail
    // -----------------------------------------------------------------------
    for (let i = 0; i < 5; i++) {
      await ctx.db.insert("aiInteractions", {
        employeeId: at(reviewEmployees, i),
        actorId: supervisorId,
        reviewId: at(reviewIds, i),
        createdAt: daysAgo(3 - i),
        model: "demo-model",
        provider: "demo",
        module: "feedback_assistant",
        sentPrompt:
          "Przygotuj propozycję konstruktywnej informacji zwrotnej na podstawie obserwacji.",
        output:
          "Propozycja: podkreśl terminowość realizacji zadań, a następnie wspólnie ustal sposób doskonalenia priorytetyzacji.",
        decision: i % 2 === 0 ? "accepted" : "pending",
        decidedAt: i % 2 === 0 ? daysAgo(2) : undefined,
      });
    }

    const auditActions = [
      "view",
      "create",
      "update",
      "stage_change",
      "sign",
      "export",
      "correction",
    ] as const;
    for (let i = 0; i < 14; i++) {
      await ctx.db.insert("auditLog", {
        actorId: i % 2 === 0 ? supervisorId : hrId,
        actorRole: i % 2 === 0 ? ("supervisor" as const) : ("hr" as const),
        at: daysAgo(14 - i),
        action: at(auditActions, i),
        entity: "reviews",
        entityId: String(at(reviewIds, i)),
        reviewId: at(reviewIds, i),
        details: "Operacja demonstracyjna wykonana w środowisku demo.",
      });
    }

    // -----------------------------------------------------------------------
    // Knowledge base and regulation watch
    // -----------------------------------------------------------------------
    const chunks = [
      "Rozmowa oceniająca powinna opierać się na faktach, przykładach i uzgodnionych kryteriach.",
      "Informacja zwrotna powinna być konkretna, zrozumiała i ukierunkowana na zachowania.",
      "Plan rozwoju powinien wskazywać działanie, termin i oczekiwany rezultat.",
    ];
    for (let i = 0; i < chunks.length; i++) {
      await ctx.db.insert("knowledgeChunks", {
        sourceId: MARKER_SOURCE_ID,
        sourceTitle:
          "Przewodnik po procesie oceniania – materiał demonstracyjny",
        locator: `sekcja-${i + 1}`,
        order: i + 1,
        text: at(chunks, i),
      });
    }

    await ctx.db.insert("regulationWatch", {
      eliId: "demo-eli-przepis",
      title: "Przykładowy akt prawny – monitorowanie demonstracyjne",
      checkedAt: now,
      lastChangeDate: "2025-10-01",
    });

    return {
      seeded: true,
      replacedV1: replaced.removed,
      danglingReferences: replaced.dangling,
      reviews: reviewIds.length,
      observations: observationIds.length,
      knowledgeDocuments: 1,
      message: "Demo data inserted successfully.",
    };
  },
});
