import { useCallback } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  addToIprz,
  demoListing,
  edit,
  generate,
  iprzStore,
  rank,
  setStatus,
  suggest,
  type AddToIprzArgs,
  type CriterionIds,
  type EditArgs,
  type GenerateArgs,
  type SetStatusArgs,
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
  criterionIds: CriterionIds;
  level?: DevelopmentOption["level"];
}): QueryResult<Suggestion[]> {
  return useDemoQuery(
    iprzStore,
    () => suggest(args.criterionIds, args.level),
    args,
  );
}

const useDemoGenerateDraft = () =>
  useDemoMutation<IprzState, GenerateArgs, GenerateResult>(iprzStore, generate);

const useDemoSetDraftStatus = () =>
  useDemoMutation<IprzState, SetStatusArgs, null>(iprzStore, setStatus);

const useDemoEditDraft = () =>
  useDemoMutation<IprzState, EditArgs, null>(iprzStore, edit);

const useDemoRankOptions = () =>
  useCallback(
    (args: {
      criterionIds: CriterionIds;
      level?: DevelopmentOption["level"];
    }): Promise<RankResult> =>
      Promise.resolve(rank(args.criterionIds, args.level)),
    [],
  );

const useDemoAddToIprz = () =>
  useDemoMutation<IprzState, AddToIprzArgs, { areaId: string }>(
    iprzStore,
    addToIprz,
  );

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
