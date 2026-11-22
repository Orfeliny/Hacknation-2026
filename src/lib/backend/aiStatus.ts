import { api } from "../../../convex/_generated/api";
import type { AIStatus } from "../../../convex/aiStatus/classify";
import { aiStatusStore } from "./demo/aiStatus";
import { online, useDemoQuery, type QueryResult } from "./useDemo";
import { useLiveQuery } from "./useLive";

function useDemoAiStatus(): QueryResult<AIStatus> {
  return useDemoQuery(aiStatusStore, (status) => status, null);
}

const useLiveAiStatus = (): QueryResult<AIStatus> =>
  useLiveQuery(api.aiStatus.queries.status, {});

export const useAiStatus = online ? useLiveAiStatus : useDemoAiStatus;
