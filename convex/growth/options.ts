import { v } from "convex/values";
import { query } from "../_generated/server";
import { criterionId } from "../lib/validators";
import {
  developmentCost,
  developmentForm,
  developmentLevel,
} from "./constants";
import { matchesSearch } from "./optionsSearch";

// The interface for the IPRZ and HR partner suggestions (#59): they read the catalog only through
// `listOptions` and `getOption`, never from the table, so the filters stay in one place.
// Open to every role; entries hold no personal data.

// All filters are combined with AND. Only active entries are returned, sorted by title.
export const listOptions = query({
  args: {
    criterionId: v.optional(criterionId),
    form: v.optional(developmentForm),
    level: v.optional(developmentLevel),
    cost: v.optional(developmentCost),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("developmentOptions").collect();
    return rows
      .filter(
        (row) =>
          row.active &&
          (args.criterionId === undefined ||
            row.criterionIds.includes(args.criterionId)) &&
          (args.form === undefined || row.form === args.form) &&
          (args.level === undefined || row.level === args.level) &&
          (args.cost === undefined || row.cost === args.cost) &&
          matchesSearch([row.title, row.description], args.search ?? ""),
      )
      .sort((a, b) => a.title.localeCompare(b.title, "pl"));
  },
});

// One entry, or null when it does not exist or is not active.
export const getOption = query({
  args: { optionId: v.id("developmentOptions") },
  handler: async (ctx, { optionId }) => {
    const row = await ctx.db.get(optionId);
    return row?.active ? row : null;
  },
});
