import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import type { CriterionId } from "./rules/pack2016";

const at = <T>(items: readonly T[], i: number): T => {
  const item = items[i % items.length];
  if (item === undefined) throw new Error("seed: empty list");
  return item;
};

/**
 * Demo seeder for the schema supplied in the conversation.
 *
 * Run:
 *   npx convex run seed:seed
 *
 * Safe to run repeatedly: a marker in `notes` prevents duplicate seeding.
 * This does not delete or overwrite existing application data.
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const marker = "__DEMO_SEED_V1__";
    const notes = await ctx.db.query("notes").collect();
    if (notes.some((n) => n.text === marker)) {
      return { seeded: false, message: "Demo data already exists." };
    }

    const now = Date.now();
    const daysAgo = (days: number) => now - days * 24 * 60 * 60 * 1000;

    // -----------------------------------------------------------------------
    // Employees
    // -----------------------------------------------------------------------
    const people = [
      {
        firstName: "Anna",
        lastName: "Kowalska",
        position: "Dyrektor",
        unit: "Kierownictwo",
        role: "director",
        positionKind: "office_head",
      },
      {
        firstName: "Marek",
        lastName: "Wiśniewski",
        position: "Kierownik Wydziału",
        unit: "Wydział Organizacyjny",
        role: "supervisor",
        positionKind: "managerial",
      },
      {
        firstName: "Ewa",
        lastName: "Zielińska",
        position: "Kierownik Wydziału",
        unit: "Wydział Kadr",
        role: "supervisor",
        positionKind: "managerial",
      },
      {
        firstName: "Jan",
        lastName: "Nowak",
        position: "Starszy specjalista",
        unit: "Wydział Organizacyjny",
        role: "employee",
        positionKind: "non_managerial",
      },
      {
        firstName: "Maria",
        lastName: "Wójcik",
        position: "Specjalista",
        unit: "Wydział Organizacyjny",
        role: "employee",
        positionKind: "non_managerial",
      },
      {
        firstName: "Piotr",
        lastName: "Kamiński",
        position: "Inspektor",
        unit: "Wydział Organizacyjny",
        role: "employee",
        positionKind: "non_managerial",
      },
      {
        firstName: "Agnieszka",
        lastName: "Lewandowska",
        position: "Starszy specjalista",
        unit: "Wydział Kadr",
        role: "employee",
        positionKind: "non_managerial",
      },
      {
        firstName: "Tomasz",
        lastName: "Dąbrowski",
        position: "Specjalista",
        unit: "Wydział Kadr",
        role: "employee",
        positionKind: "non_managerial",
      },
      {
        firstName: "Katarzyna",
        lastName: "Szymańska",
        position: "Główny specjalista",
        unit: "Wydział Kadr",
        role: "employee",
        positionKind: "non_managerial",
      },
      {
        firstName: "Paweł",
        lastName: "Woźniak",
        position: "Administrator systemów",
        unit: "Wydział IT",
        role: "admin",
        positionKind: "non_managerial",
      },
    ] as const;

    const employeeIds: Id<"employees">[] = [];
    for (let i = 0; i < people.length; i++) {
      const p = at(people, i);
      const supervisorId =
        i === 3 || i === 4 || i === 5
          ? at(employeeIds, 1)
          : i === 6 || i === 7 || i === 8
            ? at(employeeIds, 2)
            : undefined;

      const id = await ctx.db.insert("employees", {
        firstName: p.firstName,
        lastName: p.lastName,
        position: p.position,
        unit: p.unit,
        positionKind: p.positionKind,
        email: `${p.firstName.toLowerCase()}.${p.lastName.toLowerCase()}@demo.gov.pl`,
        createdAt: daysAgo(180),
        demoPersona: p.role,
        seedKey: `demo-employee-${i + 1}`,
        ...(supervisorId ? { supervisorId } : {}),
        ...(i >= 3 && i <= 8
          ? {
              contractTerm: "indefinite" as const,
              indefiniteEmploymentSince: "2020-03-01",
              isNewToCivilService: false,
              serviceGrade: i % 3 === 0 ? 3 : 2,
              serviceGradeSince: "2023-01-01",
            }
          : {}),
      });
      employeeIds.push(id);
    }

    const supervisorId = at(employeeIds, 1);
    const hrId = at(employeeIds, 2);
    const janId = at(employeeIds, 3);
    const mariaId = at(employeeIds, 4);
    const piotrId = at(employeeIds, 5);
    const agnieszkaId = at(employeeIds, 6);
    const tomaszId = at(employeeIds, 7);

    // -----------------------------------------------------------------------
    // Reviews and first-service reviews
    // -----------------------------------------------------------------------
    const reviewIds: Id<"reviews">[] = [];
    const reviewStages = [
      "observation",
      "evaluation",
      "writing",
      "signing",
      "closed",
    ] as const;
    const reviewEmployees = [janId, mariaId, piotrId, agnieszkaId, tomaszId];

    for (let i = 0; i < reviewEmployees.length; i++) {
      const employeeId = at(reviewEmployees, i);
      const evaluatorId = i < 3 ? supervisorId : hrId;
      const stage = at(reviewStages, i);
      const reviewId = await ctx.db.insert("reviews", {
        employeeId,
        evaluatorId,
        createdAt: daysAgo(150 - i * 8),
        updatedAt: daysAgo(5 + i),
        stage,
        round: 1,
        sheet: i % 2 === 0 ? "A" : "B",
        rulesVersion: "2025.1",
        periodStart: "2025-01-01",
        periodEnd: "2025-12-31",
        dueDate: "2026-02-28",
        openingConversationDate: "2025-01-15",
        evaluationConversationDate: i >= 1 ? "2025-11-20" : undefined,
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
        overallResult: i === 4 ? "positive" : undefined,
        overallJustification:
          "Ocena oparta na udokumentowanych obserwacjach i realizacji uzgodnionych celów.",
        previousReview: {
          date: "2024-12-15",
          levelId: "meets_expectations",
          result: "positive",
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
              kind: "training",
              text: "Udział w szkoleniu z komunikacji interpersonalnej.",
            },
            {
              areaId: "komunikacja",
              kind: "task",
              text: "Poprowadzenie krótkiego spotkania zespołu.",
            },
          ],
        },
        stageHistory: [
          { at: daysAgo(150 - i * 8), stage: "setup" },
          { at: daysAgo(120 - i * 8), stage: "opening" },
          { at: daysAgo(60 - i * 5), stage },
        ],
        ...(i === 4
          ? { closedAt: daysAgo(2), endReason: "completed" as const }
          : {}),
      });
      reviewIds.push(reviewId);
    }

    const firstReviewId = await ctx.db.insert("firstReviews", {
      employeeId: mariaId,
      evaluatorId: supervisorId,
      createdAt: daysAgo(90),
      updatedAt: daysAgo(3),
      startDate: "2025-03-01",
      dueDate: "2026-03-01",
      stage: "assessment",
      rulesVersion: "2025.1",
      result: "positive",
      stageHistory: [
        { at: daysAgo(90), stage: "opening" },
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
      const employeeId = at(reviewEmployees, i);
      const authorId = i % 5 < 3 ? supervisorId : hrId;
      const observationId = await ctx.db.insert("observations", {
        employeeId,
        authorId,
        createdAt: daysAgo(100 - i * 4),
        date: `2025-${String(1 + Math.floor(i / 2)).padStart(2, "0")}-${String(10 + (i % 15)).padStart(2, "0")}`,
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
        assessorId: i % 2 === 0 ? supervisorId : hrId,
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
        ...(i === 0 ? { firstReviewId } : {}),
      });
    }

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
        authorId: i % 2 === 0 ? supervisorId : hrId,
        reviewId: at(reviewIds, i),
        createdAt: daysAgo(40 - i),
        updatedAt: daysAgo(2),
        heldOn: `2025-0${(i % 6) + 1}-15`,
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
        employeeId: at(reviewEmployees, i),
        supervisorId: i < 3 ? supervisorId : hrId,
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
        authorId: at(reviewEmployees, i),
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
        recipientId: i % 2 === 0 ? janId : mariaId,
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

    for (const employeeId of [janId, mariaId, piotrId]) {
      await ctx.db.insert("selfNotes", {
        employeeId,
        reviewId: at(reviewIds, 0),
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
        actorRole: i % 2 === 0 ? "supervisor" : "hr",
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
      text: marker,
    });
    await ctx.db.insert("notes", {
      createdAt: now,
      text: "Środowisko demo zostało zasilone przykładowymi danymi. Dane są fikcyjne.",
    });

    return {
      seeded: true,
      employees: employeeIds.length,
      reviews: reviewIds.length,
      observations: observationIds.length,
      forumThreads: threadIds.length,
      knowledgeDocuments: 1,
      message: "Demo data inserted successfully.",
    };
  },
});
