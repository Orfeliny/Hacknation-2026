import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import type { DemoActor } from "../../../../convex/lib/demoRole";
import { createDemoStore, demoId, msFromToday } from "../useDemo";

// Mirrors open PR #85 (convex/drafting/*) and PR #87 (convex/growth/{suggest,rankOptions}.ts).
// Retype these from `api` once they merge. `addToIprz` is in neither PR; it follows spec §6.5.

export type DraftRow = Doc<"drafts">;
export type DevelopmentOption = Doc<"developmentOptions">;

export type DraftListing = {
  review: {
    id: Id<"reviews">;
    stage: string;
    sheet: string | null;
    employeeName: string;
  };
  ratings: {
    criterionId: string;
    name: string;
    points: number;
    label: string;
  }[];
  inconsistencies: { criterionId: string; message: string }[];
  observations: { used: number; total: number };
  drafts: DraftRow[];
  evidence: {
    id: Id<"observations">;
    date: string;
    sentiment: "positive" | "development" | "neutral";
    criterionId: string | null;
    text: string;
  }[];
};

export type GenerateResult =
  | {
      ok: true;
      inserted: number;
      droppedActions: number;
      provider: string;
      interactionId: Id<"aiInteractions">;
    }
  | { ok: false; code: string; message: string };

export type Suggestion = {
  option: DevelopmentOption;
  matchedCriterionIds: string[];
  reason: string;
  rationale?: string;
};

export type RankResult = {
  ranking: "rules" | "ai";
  suggestions: Suggestion[];
  note?: string;
};

type Actor = { actor: DemoActor };
export type CriterionIds = DevelopmentOption["criterionIds"];
export type GenerateArgs = Actor & { reviewId: Id<"reviews"> };
export type SetStatusArgs = Actor & {
  draftId: Id<"drafts">;
  status: "accepted" | "rejected";
};
export type EditArgs = Actor & { draftId: Id<"drafts">; text: string };
export type AddToIprzArgs = Actor & {
  reviewId: Id<"reviews">;
  areaId?: string;
  optionId?: Id<"developmentOptions">;
  text: string;
};

export const DEMO_REVIEW_ID = demoId("reviews", "przykladowa");
export const NO_AI_NOTE = "Bez rankingu AI: AI jest niedostępne.";

const optionIds = [
  "szkolenie-komunikacja",
  "warsztat-informacja",
  "mentoring",
  "kurs-wystapienia",
  "webinar-asertywnosc",
  "ksiazka-rozmowy",
  "podyplomowe",
];

const option = (
  key: string,
  title: string,
  form: DevelopmentOption["form"],
  criterionIds: DevelopmentOption["criterionIds"],
): DevelopmentOption => ({
  _id: demoId("developmentOptions", key),
  _creationTime: 0,
  title,
  description: "Pozycja demonstracyjna katalogu rozwoju.",
  form,
  criterionIds,
  level: "podstawowy",
  cost: "brak_danych",
  provider: "Dostawca demonstracyjny",
  source: "demo",
  active: true,
});

export const demoOptions: DevelopmentOption[] = [
  option(optionIds[0]!, "Skuteczna komunikacja w urzędzie", "szkolenie", [
    "komunikacja",
  ]),
  option(optionIds[1]!, "Warsztat: informacja zwrotna", "szkolenie", [
    "komunikacja",
    "wspolpraca",
  ]),
  option(optionIds[2]!, "Mentoring wewnętrzny", "mentoring", ["komunikacja"]),
  option(optionIds[3]!, "Kurs wystąpień publicznych", "szkolenie", [
    "wystapienia_publiczne",
    "komunikacja",
  ]),
  option(optionIds[4]!, "Webinar: asertywność", "szkolenie", ["komunikacja"]),
  option(optionIds[5]!, "Książka: trudne rozmowy", "material", ["komunikacja"]),
  option(optionIds[6]!, "Studia podyplomowe z zarządzania", "kurs", [
    "podejmowanie_decyzji",
  ]),
];

const draft = (
  key: string,
  section: DraftRow["section"],
  text: string,
  status: DraftRow["status"],
  extra: Partial<DraftRow> = {},
): DraftRow => ({
  _id: demoId("drafts", key),
  _creationTime: 0,
  reviewId: DEMO_REVIEW_ID,
  section,
  text,
  status,
  createdAt: msFromToday(-1),
  ...extra,
});

const observationA = demoId("observations", "a");

export type IprzState = {
  drafts: DraftRow[];
  iprzOptionIds: string[];
};

export const iprzStore = createDemoStore<IprzState>(() => ({
  iprzOptionIds: [],
  drafts: [
    draft(
      "j1",
      "criterion_justification",
      "Komunikacja: osoba mówi jasno na naradach, jedna uwaga o niejasnych wypowiedziach.",
      "proposed",
      {
        criterionId: "komunikacja",
        observationIds: [observationA],
        noEvidence: false,
        inconsistency:
          "Wysoka ocena przy obserwacji rozwojowej z tego samego kryterium.",
      },
    ),
    draft("s1", "strength", "Terminowość w oddawaniu opinii.", "accepted", {
      observationIds: [observationA],
      noEvidence: false,
    }),
    draft(
      "a1",
      "development_area",
      "Jasność wypowiedzi na forum zespołu.",
      "proposed",
      {
        criterionId: "komunikacja",
        noEvidence: true,
      },
    ),
    draft(
      "t1",
      "feedback_tip",
      "Zacznij rozmowę od konkretnego faktu.",
      "rejected",
      {
        noEvidence: true,
      },
    ),
  ],
}));

export const demoListing = (state: IprzState): DraftListing => ({
  review: {
    id: DEMO_REVIEW_ID,
    stage: "writing",
    sheet: "C",
    employeeName: "Anna Przykładowa",
  },
  ratings: [
    {
      criterionId: "komunikacja",
      name: "Komunikacja",
      points: 7,
      label: "Bardzo dobrze",
    },
    {
      criterionId: "rzetelnosc",
      name: "Rzetelność",
      points: 5,
      label: "Dobrze",
    },
  ],
  inconsistencies: [
    {
      criterionId: "komunikacja",
      message:
        "Wysoka ocena przy obserwacji rozwojowej z tego samego kryterium.",
    },
  ],
  observations: { used: 3, total: 3 },
  drafts: state.drafts,
  evidence: [
    {
      id: observationA,
      date: new Date(msFromToday(-20)).toISOString().slice(0, 10),
      sentiment: "development",
      criterionId: "komunikacja",
      text: "Wypowiada się niejasno na naradach.",
    },
  ],
});

export function suggest(
  criterionIds: CriterionIds,
  level?: DevelopmentOption["level"],
): Suggestion[] {
  return demoOptions
    .flatMap((o) => {
      const matched = criterionIds.filter((c) =>
        o.criterionIds.some((oc) => oc === c),
      );
      if (matched.length === 0) return [];
      return [
        {
          option: o,
          matchedCriterionIds: matched,
          reason:
            `Pasuje do kryterium: ${matched.join(", ")}` +
            (level && o.level === level ? `; poziom: ${level}` : ""),
        },
      ];
    })
    .sort(
      (a, b) =>
        b.matchedCriterionIds.length - a.matchedCriterionIds.length ||
        a.option.title.localeCompare(b.option.title, "pl"),
    );
}

export function rank(
  criterionIds: CriterionIds,
  level?: DevelopmentOption["level"],
): RankResult {
  return {
    ranking: "rules",
    suggestions: suggest(criterionIds, level),
    note: NO_AI_NOTE,
  };
}

export function generate(state: IprzState): {
  state: IprzState;
  result: GenerateResult;
} {
  return {
    state,
    result: {
      ok: true,
      inserted: 0,
      droppedActions: 0,
      provider: "mock",
      interactionId: demoId("aiInteractions", "demo"),
    },
  };
}

export function setStatus(state: IprzState, args: SetStatusArgs) {
  return {
    state: {
      ...state,
      drafts: state.drafts.map((d) =>
        d._id === args.draftId
          ? { ...d, status: args.status, updatedAt: Date.now() }
          : d,
      ),
    },
    result: null,
  };
}

export function edit(state: IprzState, args: EditArgs) {
  return {
    state: {
      ...state,
      drafts: state.drafts.map((d) =>
        d._id === args.draftId
          ? {
              ...d,
              text: args.text,
              status: "edited" as const,
              updatedAt: Date.now(),
            }
          : d,
      ),
    },
    result: null,
  };
}

export function addToIprz(state: IprzState, args: AddToIprzArgs) {
  return {
    state: {
      ...state,
      iprzOptionIds: args.optionId
        ? [...state.iprzOptionIds, args.optionId]
        : state.iprzOptionIds,
    },
    result: { areaId: args.areaId ?? "demo-area" },
  };
}
