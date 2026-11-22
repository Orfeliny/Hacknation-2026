import type { AIStatus } from "../../../../convex/aiStatus/classify";
import { createDemoStore } from "../useDemo";

export const aiStatusStore = createDemoStore<AIStatus>(() => ({
  state: "mock",
  provider: "mock",
  model: "mock",
}));
