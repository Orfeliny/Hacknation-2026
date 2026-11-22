import { v, type Infer } from "convex/values";
import {
  adviceAudience,
  adviceSection,
  adviceTopic,
} from "../../growth/constants";

// B1 Advice. Backend: convex/growth/advice.ts. `adviceArticles` holds topic, sections, sourceRef and
// the optional audience.

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
// personal data. `search` matches title and summary, diacritics-insensitive. `audience` returns the
// articles written for that audience plus those for "wszyscy"; an article stored without an audience
// counts as "przelozony". Without `audience` every article is returned.
export const listAdviceContract = {
  args: {
    topic: v.optional(adviceTopic),
    audience: v.optional(adviceAudience),
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
