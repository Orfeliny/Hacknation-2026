import { v } from "convex/values";

// Same literals as the drafts table in tables.ts (a shared contract file, so not imported from there).
export const draftSection = v.union(
  v.literal("criterion_justification"),
  v.literal("strength"),
  v.literal("development_area"),
  v.literal("development_action"),
  v.literal("feedback_tip"),
);

export type DraftSection =
  | "criterion_justification"
  | "strength"
  | "development_area"
  | "development_action"
  | "feedback_tip";
