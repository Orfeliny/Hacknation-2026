import { useCallback } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  demoListing,
  generate,
  iprzStore,
  rank,
  suggest,
  type DevelopmentOption,
  type DraftListing,
  type GenerateResult,
  type IprzState,
  type RankResult,
  type Suggestion,
} from "./demo/iprz";
import {
  online,
  useDemoMutation,
  useDemoQuery,
  type QueryResult,
} from "./useDemo";

export type {
  DevelopmentOption,
  DraftListing,
  GenerateResult,
  RankResult,
  Suggestion,
} from "./demo/iprz";

function useDemoDraftsForReview(args: {
  reviewId: Id<"reviews">;
}): QueryResult<DraftListing> {
  return useDemoQuery(iprzStore, demoListing, args);
}

function useDemoSuggestForArea(args: {
  criterionIds: string[];
  level?: DevelopmentOption["level"];
}): QueryResult<Suggestion[]> {
  return useDemoQuery(
    iprzStore,
    () => suggest(args.criterionIds, args.level),
    args,
  );
}

type Actor = { actor: { role: import("../demoRole").DemoRole } };

const useDemoGenerateDraft = () =>
  useDemoMutation<
    IprzState,
    Actor & { reviewId: Id<"reviews"> },
    GenerateResult
  >(iprzStore, (state) => generate(state));

const useDemoSetDraftStatus = () =>
  useDemoMutation<
    IprzState,
    Actor & { draftId: Id<"drafts">; status: "accepted" | "rejected" },
    null
  >(iprzStore, (state, { draftId, status }) => ({
    state: {
      ...state,
      drafts: state.drafts.map((d) =>
        d._id === draftId ? { ...d, status, updatedAt: Date.now() } : d,
      ),
    },
    result: null,
  }));

const useDemoEditDraft = () =>
  useDemoMutation<
    IprzState,
    Actor & { draftId: Id<"drafts">; text: string },
    null
  >(iprzStore, (state, { draftId, text }) => ({
    state: {
      ...state,
      drafts: state.drafts.map((d) =>
        d._id === draftId
          ? { ...d, text, status: "edited", updatedAt: Date.now() }
          : d,
      ),
    },
    result: null,
  }));

const useDemoRankOptions = () =>
  useCallback(
    (args: { criterionIds: string[] }): Promise<RankResult> =>
      Promise.resolve(rank(args.criterionIds)),
    [],
  );

const useDemoAddToIprz = () =>
  useDemoMutation<
    IprzState,
    Actor & {
      reviewId: Id<"reviews">;
      areaId?: string;
      optionId?: Id<"developmentOptions">;
      text: string;
    },
    { areaId: string }
  >(iprzStore, (state, args) => ({
    state: {
      ...state,
      iprzOptionIds: args.optionId
        ? [...state.iprzOptionIds, args.optionId]
        : state.iprzOptionIds,
    },
    result: { areaId: args.areaId ?? "demo-area" },
  }));

export const useDraftsForReview = online
  ? useDemoDraftsForReview
  : useDemoDraftsForReview;
export const useSuggestForArea = online
  ? useDemoSuggestForArea
  : useDemoSuggestForArea;
export const useGenerateDraft = online
  ? useDemoGenerateDraft
  : useDemoGenerateDraft;
export const useSetDraftStatus = online
  ? useDemoSetDraftStatus
  : useDemoSetDraftStatus;
export const useEditDraft = online ? useDemoEditDraft : useDemoEditDraft;
export const useRankOptions = online ? useDemoRankOptions : useDemoRankOptions;
export const useAddToIprz = online ? useDemoAddToIprz : useDemoAddToIprz;
