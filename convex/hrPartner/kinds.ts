import { v } from "convex/values";

// Same literals as the hrSignals table in tables.ts (a shared contract file, so not imported from there).
export const signalKind = v.union(
  v.literal("duties_change"),
  v.literal("workload"),
  v.literal("no_recognition"),
  v.literal("long_absence"),
  v.literal("supervisor_change"),
  v.literal("recognition_moment"),
);

export const recommendationKind = v.union(
  v.literal("wellbeing"),
  v.literal("organizational"),
  v.literal("preventive"),
  v.literal("conversation"),
  v.literal("recognition"),
);

export const recommendation = v.object({
  text: v.string(),
  kind: v.optional(recommendationKind),
});
