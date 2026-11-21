export type SourceId =
  | "hr_import"
  | "directory"
  | "evaluator"
  | "employee"
  | "hr"
  | "director"
  | "rules"
  | "ai"
  | "system"
  | "scheduler"
  | "eli";

export const SOURCES: Record<SourceId, { label: string; hint: string }> = {
  hr_import: {
    label: "Kadry: import",
    hint: "Seed na demo; docelowo import z systemu kadrowego (CSV) albo panel kadr.",
  },
  directory: {
    label: "Katalog użytkowników",
    hint: "Demo-rola; docelowo Keycloak połączony z AD urzędu (#42).",
  },
  evaluator: {
    label: "Oceniający",
    hint: "Wpisuje przełożony w kreatorze oceny albo w swoim module.",
  },
  employee: {
    label: "Oceniany",
    hint: "Wpisuje albo potwierdza pracownik w widoku „Moja ocena” (#30).",
  },
  hr: { label: "Kadry", hint: "Wpisuje komórka kadrowa (panel kadr, #17)." },
  director: {
    label: "Dyrektor generalny",
    hint: "Decyzje: sprzeciw (#36), kolejny stopień służbowy.",
  },
  rules: {
    label: "Reguły prawne",
    hint: "Wyliczane z `convex/rules` (#10): arkusz, terminy, średnia, wynik.",
  },
  ai: {
    label: "AI (propozycja)",
    hint: "Propozycja modelu; trafia dalej dopiero po akceptacji człowieka.",
  },
  system: {
    label: "System",
    hint: "Ustawiane automatycznie przy zapisie (czas, historia etapów).",
  },
  scheduler: {
    label: "Harmonogram",
    hint: "Codzienne zadanie Convex (`convex/crons.ts`).",
  },
  eli: { label: "API ELI Sejmu", hint: "Metadane aktów prawnych (#41)." },
};

export type TableMeta = {
  module: string;
  issues: number[];
  purpose: string;
  source: SourceId;
  fields?: Record<string, SourceId>;
};

export const TABLES: Record<string, TableMeta> = {
  notes: {
    module: "notes",
    issues: [],
    purpose: "Przykładowa funkcja startera, do usunięcia z menu.",
    source: "system",
  },
  employees: {
    module: "employees",
    issues: [11],
    purpose:
      "Pracownicy urzędu i podległość służbowa. Źródło danych do części I arkusza.",
    source: "hr_import",
    fields: {
      demoPersona: "directory",
      authSubject: "directory",
      email: "directory",
      createdAt: "system",
      archivedAt: "hr",
    },
  },
  reviews: {
    module: "reviews",
    issues: [12, 36, 38],
    purpose: "Jedna ocena okresowa: arkusz A/B/C od części I do zamknięcia.",
    source: "evaluator",
    fields: {
      stage: "system",
      createdAt: "system",
      updatedAt: "system",
      closedAt: "system",
      stageHistory: "system",
      sheet: "rules",
      rulesVersion: "rules",
      dueDate: "rules",
      averageScore: "rules",
      overallResult: "rules",
      overallLevelId: "rules",
      deadlineChanges: "rules",
      previousReview: "system",
      previousReviewId: "system",
      staffingSituations: "hr",
      signatures: "employee",
      objection: "employee",
      round: "director",
    },
  },
  observations: {
    module: "observations",
    issues: [13],
    purpose: "Prywatny dziennik obserwacji przełożonego z okresu oceny.",
    source: "evaluator",
    fields: { createdAt: "system" },
  },
  selfNotes: {
    module: "me",
    issues: [30],
    purpose:
      "Notatki pracownika o sobie, udostępniane przełożonemu na życzenie.",
    source: "employee",
    fields: { createdAt: "system" },
  },
  conversations: {
    module: "conversations",
    issues: [14, 37],
    purpose:
      "Przygotowanie i przebieg rozmów: rozpoczynającej, oceniającej, feedbacku.",
    source: "evaluator",
    fields: {
      plan: "ai",
      createdAt: "system",
      icsUid: "system",
      icsSequence: "system",
    },
  },
  drafts: {
    module: "drafting",
    issues: [15],
    purpose: "Propozycje AI do treści oceny i IPRZ, każda do akceptacji.",
    source: "ai",
    fields: { status: "evaluator", createdAt: "system" },
  },
  hrSignals: {
    module: "hrPartner",
    issues: [16],
    purpose:
      "Sygnały HR partnera (przeciążenie, brak docenienia) z rekomendacjami.",
    source: "rules",
    fields: { recommendations: "ai", status: "evaluator" },
  },
  reminders: {
    module: "hrDashboard",
    issues: [17],
    purpose: "Przypomnienia o terminach etapów.",
    source: "scheduler",
    fields: { dismissedAt: "evaluator" },
  },
  competencyAssessments: {
    module: "competencies",
    issues: [19],
    purpose: "Kompas: ocena kompetencji przez wskaźniki behawioralne.",
    source: "evaluator",
    fields: { suggestedLevel: "rules", createdAt: "system" },
  },
  knowledgeChunks: {
    module: "knowledge",
    issues: [20],
    purpose: "Fragmenty przepisów i poradników do cytowania przez asystenta.",
    source: "system",
  },
  firstReviews: {
    module: "firstReview",
    issues: [21],
    purpose: "Kompas: pierwsza ocena w służbie cywilnej.",
    source: "evaluator",
    fields: { stage: "system", dueDate: "rules", createdAt: "system" },
  },
  auditLog: {
    module: "audit",
    issues: [39],
    purpose: "Kto oglądał i zmieniał dane (rozliczalność, RODO).",
    source: "system",
  },
  aiInteractions: {
    module: "audit",
    issues: [39],
    purpose: "Rejestr wywołań AI i decyzji człowieka (AI Act).",
    source: "system",
    fields: { decision: "evaluator" },
  },
  mailMessages: {
    module: "mail",
    issues: [37],
    purpose: "Powiadomienia i zaproszenia .ics (skrzynka demo albo SMTP).",
    source: "system",
  },
  regulationWatch: {
    module: "regulationsWatch",
    issues: [41],
    purpose: "Obserwowane akty prawne i wykryte zmiany.",
    source: "eli",
    fields: { acknowledgedAt: "hr" },
  },
};

export function fieldSource(table: string, field: string): SourceId {
  const meta = TABLES[table];
  return meta?.fields?.[field] ?? meta?.source ?? "system";
}

export type Stage = {
  id: string;
  label: string;
  actor: string;
  basis: string;
  writes: string[];
};

export const STAGES: Stage[] = [
  {
    id: "setup",
    label: "Rozpoczęcie cyklu",
    actor: "Kadry / system",
    basis: "art. 81 ust. 1, § 3",
    writes: ["reviews", "reminders"],
  },
  {
    id: "opening",
    label: "Rozmowa rozpoczynająca, część I",
    actor: "Oceniający, potem oceniany potwierdza",
    basis: "§ 5, § 6, § 7",
    writes: ["conversations", "reviews", "mailMessages"],
  },
  {
    id: "observation",
    label: "Okres oceny (ok. 24 miesiące)",
    actor: "Oceniający",
    basis: "art. 81 ust. 4, 7, 8",
    writes: ["observations", "hrSignals", "reminders", "selfNotes"],
  },
  {
    id: "evaluation",
    label: "Rozmowa oceniająca",
    actor: "Oceniający",
    basis: "§ 10",
    writes: ["conversations", "mailMessages"],
  },
  {
    id: "writing",
    label: "Sporządzenie oceny (część II, III)",
    actor: "Oceniający, AI proponuje",
    basis: "§ 11, art. 89 ust. 1",
    writes: ["reviews", "drafts", "aiInteractions"],
  },
  {
    id: "signing",
    label: "Zapoznanie z oceną",
    actor: "Oceniany (albo fikcja zapoznania)",
    basis: "§ 12",
    writes: ["reviews", "auditLog"],
  },
  {
    id: "objection_window",
    label: "7 dni na sprzeciw",
    actor: "Oceniany",
    basis: "art. 83 ust. 1",
    writes: ["reminders"],
  },
  {
    id: "objection",
    label: "Sprzeciw w rozpatrzeniu (14 dni)",
    actor: "Dyrektor generalny",
    basis: "art. 83 ust. 3-4",
    writes: ["reviews", "mailMessages"],
  },
  {
    id: "closed",
    label: "Zamknięta, do akt",
    actor: "System / kadry",
    basis: "§ 12, art. 89 ust. 2",
    writes: ["reviews", "auditLog"],
  },
];

export const EXAMPLES: Record<string, Record<string, unknown>> = {
  employees: {
    firstName: "Anna",
    lastName: "Przykładowa",
    position: "Główny specjalista",
    unit: "Wydział Kontroli",
    positionKind: "non_managerial",
    corpsRole: "official",
    supervisorId: "<employees: naczelnik>",
    serviceGrade: 3,
    serviceGradeSince: "2023-04-01",
    email: "anna.przykladowa@urzad.example",
    demoPersona: "employee",
    createdAt: 1763700000000,
  },
  reviews: {
    employeeId: "<employees: Anna>",
    evaluatorId: "<employees: naczelnik>",
    stage: "writing",
    sheet: "C",
    rulesVersion: "2016-04-23",
    dueDate: "2027-03-16",
    periodStart: "2025-03-20",
    periodEnd: "2027-03-10",
    additionalCriteria: ["myslenie_analityczne"],
    ratings: [
      { criterionId: "rzetelnosc", levelId: "7" },
      { criterionId: "wspolpraca", levelId: "5" },
    ],
    averageScore: 6.2,
    overallResult: "positive",
    overallLevelId: "powyzej_oczekiwan",
    developmentPlan: {
      summary: "Szkolenie z analizy danych; mentoring nowego pracownika.",
    },
    signatures: [
      {
        role: "employee",
        signerId: "<employees: Anna>",
        signedAt: 1742500000000,
        scope: "part_one",
        place: "Warszawa",
      },
    ],
    createdAt: 1742400000000,
  },
  observations: {
    employeeId: "<employees: Anna>",
    authorId: "<employees: naczelnik>",
    date: "2026-05-12",
    text: "Samodzielnie przygotowała analizę skarg przed terminem.",
    sentiment: "positive",
    criterionId: "rzetelnosc",
    createdAt: 1778600000000,
  },
  mailMessages: {
    recipientId: "<employees: Anna>",
    kind: "meeting_invitation",
    subject: "Rozmowa oceniająca 10.03.2027, 10:00",
    body: "Zaproszenie na rozmowę oceniającą. Szczegóły w aplikacji.",
    channel: "demo_inbox",
    status: "sent",
    reviewId: "<reviews>",
    conversationId: "<conversations>",
    ics: "BEGIN:VCALENDAR…",
    createdAt: 1804600000000,
  },
};

export type AreaId = "review" | "ai" | "hr" | "kompas" | "audit" | "starter";

export const AREAS: Record<
  AreaId,
  { label: string; fill: string; stroke: string; tables: string[] }
> = {
  review: {
    label: "Ocena okresowa",
    fill: "#eef2ff",
    stroke: "#4f46e5",
    tables: [
      "employees",
      "reviews",
      "observations",
      "conversations",
      "selfNotes",
    ],
  },
  ai: {
    label: "AI i HR partner",
    fill: "#ecfdf5",
    stroke: "#047857",
    tables: ["drafts", "hrSignals", "knowledgeChunks"],
  },
  hr: {
    label: "Kadry, terminy, powiadomienia",
    fill: "#fffbeb",
    stroke: "#b45309",
    tables: ["reminders", "mailMessages", "regulationWatch"],
  },
  kompas: {
    label: "Kompas (MC)",
    fill: "#f0f9ff",
    stroke: "#0369a1",
    tables: ["competencyAssessments", "firstReviews"],
  },
  audit: {
    label: "Rozliczalność",
    fill: "#fff1f2",
    stroke: "#be123c",
    tables: ["auditLog", "aiInteractions"],
  },
  starter: {
    label: "Starter",
    fill: "#f8fafc",
    stroke: "#475569",
    tables: ["notes"],
  },
};

export function areaOf(table: string): AreaId {
  const entry = (
    Object.entries(AREAS) as [AreaId, (typeof AREAS)[AreaId]][]
  ).find(([, area]) => area.tables.includes(table));
  return entry?.[0] ?? "starter";
}
