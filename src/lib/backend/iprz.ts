import { useAction } from "convex/react";
import { useCallback } from "react";
import { api } from "../../../convex/_generated/api";
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
  type ViewArgs,
} from "./useDemo";
import {
  useActorAction,
  useActorMutation,
  useActorQuery,
  useLiveQuery,
} from "./useLive";

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

const useLiveDraftsForReview = (args: {
  reviewId: Id<"reviews">;
}): QueryResult<DraftListing> =>
  useActorQuery(api.drafting.queries.listForReview, args);

const useLiveSuggestForArea = (args: {
  criterionIds: CriterionIds;
  level?: DevelopmentOption["level"];
}): QueryResult<Suggestion[]> =>
  useLiveQuery(api.growth.suggest.suggestForArea, args);

const useLiveGenerateDraft = (): ((
  args: ViewArgs<GenerateArgs>,
) => Promise<GenerateResult>) => useActorAction(api.drafting.actions.generate);

const useLiveSetDraftStatus = (): ((
  args: ViewArgs<SetStatusArgs>,
) => Promise<null>) => useActorMutation(api.drafting.mutations.setStatus);

const useLiveEditDraft = (): ((args: ViewArgs<EditArgs>) => Promise<null>) =>
  useActorMutation(api.drafting.mutations.edit);

const useLiveRankOptions = (): ((args: {
  criterionIds: CriterionIds;
  level?: DevelopmentOption["level"];
}) => Promise<RankResult>) => useAction(api.growth.rankOptions.rankOptions);

export const useDraftsForReview = online
  ? useLiveDraftsForReview
  : useDemoDraftsForReview;
export const useSuggestForArea = online
  ? useLiveSuggestForArea
  : useDemoSuggestForArea;
export const useGenerateDraft = online
  ? useLiveGenerateDraft
  : useDemoGenerateDraft;
export const useSetDraftStatus = online
  ? useLiveSetDraftStatus
  : useDemoSetDraftStatus;
export const useEditDraft = online ? useLiveEditDraft : useDemoEditDraft;
export const useRankOptions = online ? useLiveRankOptions : useDemoRankOptions;
export const useAddToIprz = online ? useDemoAddToIprz : useDemoAddToIprz;
