import { defineTable } from "convex/server";
import { v } from "convex/values";
import { criterionId } from "../lib/validators";
import {
  adviceSection,
  adviceTopic,
  developmentCost,
  developmentForm,
  developmentLevel,
  growthSource,
} from "./constants";

// provider and url stay empty until a real source names them: never invent them.
export const growthTables = {
  developmentOptions: defineTable({
    title: v.string(),
    description: v.string(),
    form: developmentForm,
    criterionIds: v.array(criterionId),
    level: developmentLevel,
    cost: developmentCost,
    costNote: v.optional(v.string()),
    provider: v.optional(v.string()),
    url: v.optional(v.string()),
    durationNote: v.optional(v.string()),
    source: growthSource,
    sourceRef: v.optional(v.string()),
    active: v.boolean(),
  }),
  adviceArticles: defineTable({
    slug: v.string(),
    title: v.string(),
    summary: v.string(),
    topic: adviceTopic,
    criterionIds: v.optional(v.array(criterionId)),
    sections: v.array(adviceSection),
    readingMinutes: v.optional(v.number()),
    source: growthSource,
    sourceRef: v.optional(v.string()),
    published: v.boolean(),
  }).index("by_slug", ["slug"]),
};
