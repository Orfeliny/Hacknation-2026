import { v, type Infer } from "convex/values";
import { developmentForm, developmentLevel } from "../../growth/constants";
import { demoActor } from "../demoRole";
import { criterionId } from "../validators";

// B6 IPRZ and suggestions. Backends: convex/drafting/{actions,mutations}.ts and
// convex/growth/{suggest,rankOptions}.ts. No table change: `drafts` exists and accepted IPRZ
// items go to `reviews.developmentPlan`.
//
// UI rule: the IPRZ list comes from `suggestForArea`. With more than 5 items the view calls
// `rankOptions` and shows that order. "bez rankingu AI" shows when `rankOptions` was not called
// or returned `aiRanked: false`; each item's `isDemo` shows "dane demonstracyjne".

export const IPRZ_LIMITS = {
  text: 2000,
  areaText: 2000,
  maxCandidates: 50,
} as const;

export const draftSection = v.union(
  v.literal("criterion_justification"),
  v.literal("strength"),
  v.literal("development_area"),
  v.literal("development_action"),
  v.literal("feedback_tip"),
);

export const draftStatus = v.union(
  v.literal("proposed"),
  v.literal("accepted"),
  v.literal("edited"),
  v.literal("rejected"),
);

export const draftFragment = v.object({
  draftId: v.id("drafts"),
  section: draftSection,
  text: v.string(),
  status: draftStatus,
  criterionId: v.optional(v.string()),
  observationIds: v.array(v.id("observations")),
  noEvidence: v.boolean(),
  inconsistency: v.optional(v.string()),
});

export const suggestion = v.object({
  optionId: v.id("developmentOptions"),
  title: v.string(),
  provider: v.optional(v.string()),
  form: developmentForm,
  matchReason: v.string(),
  isDemo: v.boolean(),
});

// Access: supervisor who is the evaluator of the review. An action, so it resolves the actor
// through an internal query. Stores the fragments as `drafts` (status `proposed`) and returns them.
export const draftReviewContract = {
  args: { actor: demoActor, reviewId: v.id("reviews") },
  returns: v.array(draftFragment),
};

// Access: supervisor who is the evaluator of the draft's review. `text` replaces the fragment
// text for `edited`.
export const decideFragmentContract = {
  args: {
    actor: demoActor,
    draftId: v.id("drafts"),
    status: v.union(
      v.literal("accepted"),
      v.literal("edited"),
      v.literal("rejected"),
    ),
    text: v.optional(v.string()),
  },
  returns: v.null(),
};

// Access: supervisor who is the evaluator of the review. Appends an item to
// `reviews.developmentPlan.areas`; `areaId` selects an existing area, otherwise a new one is
// created. Returns the area the item landed in.
export const addToIprzContract = {
  args: {
    actor: demoActor,
    reviewId: v.id("reviews"),
    areaId: v.optional(v.string()),
    optionId: v.optional(v.id("developmentOptions")),
    text: v.string(),
  },
  returns: v.object({ areaId: v.string() }),
};

// Access: supervisor, hr. Rule-based, no AI.
export const suggestForAreaContract = {
  args: {
    actor: demoActor,
    criterionIds: v.array(criterionId),
    level: v.optional(developmentLevel),
  },
  returns: v.array(suggestion),
};

// Access: supervisor, hr. An action because it may call the AI provider. `aiRanked: false`
// means the order is the input order, for example on the `mock` provider or after a failure.
export const rankOptionsContract = {
  args: {
    actor: demoActor,
    candidateIds: v.array(v.id("developmentOptions")),
    areaText: v.string(),
  },
  returns: v.object({
    ranked: v.array(
      v.object({
        optionId: v.id("developmentOptions"),
        reason: v.string(),
      }),
    ),
    aiRanked: v.boolean(),
  }),
};

export type DraftFragment = Infer<typeof draftFragment>;
export type Suggestion = Infer<typeof suggestion>;
