import type { Id, TableNames } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { CriterionId } from "./rules/pack2016";

const at = <T>(items: readonly T[], i: number): T => {
  const item = items[i % items.length];
  if (item === undefined) throw new Error("seed: empty list");
  return item;
};

const DAY = 24 * 60 * 60 * 1000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

const MARKER_V1 = "__DEMO_SEED_V1__";
const MARKER_V2 = "__DEMO_SEED_V2__";
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

const PERSONA_KEYS = [
  "naczelnik",
  "kadry",
  "anna",
  "radca",
  "analityk",
  "archiwista",
  "inspektor",
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
    const notes = await ctx.db.query("notes").collect();
    if (notes.some((n) => n.text === MARKER_V2)) {
      return { seeded: false, message: "Demo data already exists." };
    }

    const persona = await personaIds(ctx);
    const replaced = await removeV1(ctx);

    const now = Date.now();
    const daysAgo = (days: number) => now - days * DAY;
    const isoIn = (days: number) => isoDay(now + days * DAY);

    const supervisorId = persona.naczelnik;
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
    type ReviewStage = (typeof STAGE_PATH)[number];

    const reviewBase = (
      employeeId: Id<"employees">,
      stage: ReviewStage,
      i: number,
      period: { start: string; end: string; due: string },
      extra: {
        previousReviewId?: Id<"reviews">;
        closed?: boolean;
      } = {},
    ) => {
      const steps = STAGE_PATH.slice(0, STAGE_PATH.indexOf(stage) + 1);
      const born = 150 - i * 8;
      return {
        employeeId,
        evaluatorId: supervisorId,
        createdAt: daysAgo(born),
        updatedAt: daysAgo(5 + i),
        stage,
        round: 1,
        sheet: "C" as const,
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
        ratings: [
          {
            criterionId: "komunikacja",
            levelId: i % 2 === 0 ? "above_expectations" : "meets_expectations",
            justification: "Komunikacja z zespołem jest rzeczowa i terminowa.",
          },
          {
            criterionId: "organizacja_pracy",
            levelId: "meets_expectations",
            justification:
              "Powierzone zadania są realizowane zgodnie z ustaleniami.",
          },
          {
            criterionId: "wspolpraca",
            levelId: "above_expectations",
            justification: "Pracownik chętnie dzieli się wiedzą.",
          },
        ],
        averageScore: 3.6 + (i % 3) * 0.3,
        overallLevelId:
          i % 2 === 0 ? "above_expectations" : "meets_expectations",
        overallResult: extra.closed ? ("positive" as const) : undefined,
        overallJustification:
          "Ocena oparta na udokumentowanych obserwacjach i realizacji uzgodnionych celów.",
        previousReview: {
          date: "2024-12-15",
          levelId: "meets_expectations",
          result: "positive" as const,
        },
        additionalCriteria: ["terminowosc"],
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
          at: daysAgo(born - n * 12),
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
    const activeReviews = [
      { employeeId: persona.radca, stage: "observation", due: -4 },
      {
        employeeId: persona.analityk,
        stage: "evaluation",
        due: 9,
        previousReviewId: closedReviewId,
      },
      { employeeId: persona.archiwista, stage: "writing", due: 21 },
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
            "previousReviewId" in r
              ? { previousReviewId: r.previousReviewId }
              : {},
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
        sentiment:
          i % 4 === 0 ? "development" : i % 4 === 1 ? "neutral" : "positive",
        text: at(
          [
            "Samodzielnie przygotował zestawienie i przekazał je przed terminem.",
            "Wspierał współpracowników w realizacji pilnego zadania.",
            "Warto doskonalić priorytetyzację przy kilku równoległych zadaniach.",
          ],
          i,
        ),
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
    // Advice articles and development options
    // -----------------------------------------------------------------------
    const articleTopics = [
      "informacja_zwrotna",
      "rozmowa_oceniajaca",
      "dobrostan",
      "docenianie",
      "kryteria_oceny",
    ] as const;
    for (let i = 0; i < 10; i++) {
      await ctx.db.insert("adviceArticles", {
        title: at(
          [
            "Jak udzielać konstruktywnej informacji zwrotnej?",
            "Jak przygotować się do rozmowy oceniającej?",
            "Dobrostan pracownika w miejscu pracy",
            "Docenianie codziennej pracy zespołu",
            "Jak rozumieć kryteria oceny?",
          ],
          i,
        ),
        slug: `demo-poradnik-${i + 1}`,
        summary:
          "Praktyczny materiał wspierający przełożonych i pracowników w procesie oceniania.",
        topic: at(articleTopics, i),
        source: "demo",
        published: true,
        readingMinutes: 4 + (i % 5),
        criterionIds: [at(criteria, i)],
        sections: [
          {
            heading: "Najważniejsze zasady",
            paragraphs: [
              "Rozmowa powinna opierać się na konkretnych przykładach i faktach.",
              "Warto wspólnie ustalić dalsze działania oraz sposób monitorowania postępów.",
            ],
            bullets: [
              "Przygotuj przykłady.",
              "Zadbaj o dialog.",
              "Ustal kolejny krok.",
            ],
          },
          {
            heading: "W praktyce",
            paragraphs: [
              "Regularna informacja zwrotna pomaga rozwijać kompetencje i wzmacnia współpracę.",
            ],
            bullets: ["Stosuj jasny język.", "Unikaj uogólnień."],
          },
        ],
      });
    }

    const forms = [
      "szkolenie",
      "kurs",
      "mentoring",
      "material",
      "zadanie_rozwojowe",
      "wymiana_doswiadczen",
    ] as const;
    for (let i = 0; i < 15; i++) {
      await ctx.db.insert("developmentOptions", {
        title: at(
          [
            "Komunikacja interpersonalna",
            "Zarządzanie czasem i priorytetami",
            "Analityczne rozwiązywanie problemów",
            "Współpraca w zespole",
            "Wystąpienia publiczne",
          ],
          i,
        ),
        description:
          "Proponowana aktywność rozwojowa z praktycznymi ćwiczeniami i możliwością wykorzystania wiedzy w codziennej pracy.",
        form: at(forms, i),
        level:
          i % 3 === 0 ? "podstawowy" : i % 3 === 1 ? "sredni" : "zaawansowany",
        cost:
          i % 3 === 0 ? "bezplatne" : i % 3 === 1 ? "platne" : "brak_danych",
        costNote: i % 3 === 1 ? "Koszt zależny od organizatora." : undefined,
        durationNote: "Od 2 godzin do 2 dni, zależnie od formy.",
        active: true,
        criterionIds: [at(criteria, i)],
        provider: "Centrum Rozwoju Kompetencji",
        source: "demo",
      });
    }

    // -----------------------------------------------------------------------
    // HR signals, forum, reminders, mail and personal notes
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

    const threadIds: Id<"forumThreads">[] = [];
    for (let i = 0; i < 5; i++) {
      const threadId = await ctx.db.insert("forumThreads", {
        authorId: at(team, i),
        createdAt: daysAgo(20 - i),
        title: at(
          [
            "Jak rozwijać kompetencje analityczne?",
            "Sprawdzone sposoby na lepszą organizację pracy",
            "Polecane materiały o komunikacji",
            "Jak przygotować się do rozmowy oceniającej?",
            "Szukam mentora w obszarze zarządzania projektami",
          ],
          i,
        ),
        body: "Zapraszam do wymiany doświadczeń i praktycznych wskazówek. Jakie rozwiązania sprawdzają się w Waszej codziennej pracy?",
        criterionId: at(criteria, i),
        kind:
          i === 4 ? "seeking_mentor" : i === 2 ? "recommendation" : "question",
        replyCount: 1,
      });
      threadIds.push(threadId);
      await ctx.db.insert("forumReplies", {
        threadId,
        authorId: supervisorId,
        createdAt: daysAgo(18 - i),
        body: "Warto zacząć od małego zadania praktycznego i omówić wnioski z zespołem.",
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
    // Knowledge base, regulation watch and generic notes
    // -----------------------------------------------------------------------
    const chunks = [
      "Rozmowa oceniająca powinna opierać się na faktach, przykładach i uzgodnionych kryteriach.",
      "Informacja zwrotna powinna być konkretna, zrozumiała i ukierunkowana na zachowania.",
      "Plan rozwoju powinien wskazywać działanie, termin i oczekiwany rezultat.",
    ];
    for (let i = 0; i < chunks.length; i++) {
      await ctx.db.insert("knowledgeChunks", {
        sourceId: "demo-przewodnik",
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

    await ctx.db.insert("notes", {
      createdAt: now,
      text: MARKER_V2,
    });
    await ctx.db.insert("notes", {
      createdAt: now,
      text: V1_NOTE_TEXT,
    });

    return {
      seeded: true,
      replacedV1: replaced.removed,
      danglingReferences: replaced.dangling,
      reviews: reviewIds.length,
      observations: observationIds.length,
      forumThreads: threadIds.length,
      knowledgeDocuments: 1,
      message: "Demo data inserted successfully.",
    };
  },
});
