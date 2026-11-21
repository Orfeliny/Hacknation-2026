import { v, type Infer } from "convex/values";
import { adviceSection, adviceTopic } from "../../growth/constants";

// B1 Advice. Backend: convex/growth/advice.ts. No table change: `adviceArticles` already holds
// topic, sections and sourceRef.

export const ADVICE_LIMITS = { search: 100, slug: 100 } as const;

export const adviceListItem = v.object({
  slug: v.string(),
  title: v.string(),
  summary: v.string(),
  topic: adviceTopic,
  readingMinutes: v.optional(v.number()),
  sourceRef: v.optional(v.string()),
  isDemo: v.boolean(),
});

export const adviceDetail = v.object({
  ...adviceListItem.fields,
  sections: v.array(adviceSection),
});

// Access: public, every role and anonymous callers. Only published articles; entries hold no
// personal data. `search` matches title and summary, diacritics-insensitive.
export const listAdviceContract = {
  args: {
    topic: v.optional(adviceTopic),
    search: v.optional(v.string()),
  },
  returns: v.array(adviceListItem),
};

// Access: public. `null` when the slug is unknown or the article is not published.
export const getAdviceContract = {
  args: { slug: v.string() },
  returns: v.union(adviceDetail, v.null()),
};

export type AdviceListItem = Infer<typeof adviceListItem>;
export type AdviceDetail = Infer<typeof adviceDetail>;
