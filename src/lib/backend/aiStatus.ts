import type { AIStatus } from "../../../convex/aiStatus/classify";
import { aiStatusStore } from "./demo/aiStatus";
import { online, useDemoQuery, type QueryResult } from "./useDemo";

function useDemoAiStatus(): QueryResult<AIStatus> {
  return useDemoQuery(aiStatusStore, (status) => status, null);
}

export const useAiStatus = online ? useDemoAiStatus : useDemoAiStatus;
