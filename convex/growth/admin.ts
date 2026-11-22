import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import { logAudit } from "../audit/log";
import { demoActor, resolveActor, type DemoActor } from "../lib/demoRole";
import { criterionId } from "../lib/validators";
import {
  adviceAudience,
  adviceSection,
  adviceTopic,
  developmentCost,
  developmentForm,
  developmentLevel,
} from "./constants";
import { parseArticleInput, parseOptionInput, slugOf } from "./adminValidation";

// Content management for HR (#60). The demo role is a stand-in for login (#42), not real security.
// Nothing is deleted: entries are switched off and articles unpublished. Writes go to the audit log
// with ids only.

async function requireHr(ctx: Pick<QueryCtx, "db">, actor: DemoActor) {
  const resolved = await resolveActor(ctx, actor);
  if (resolved.role !== "hr") {
    throw new ConvexError("Treścią katalogu i porad zarządzają tylko kadry.");
  }
  return resolved;
}

const optionFields = {
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
};

// Every entry, switched off ones included, sorted by title.
export const listOptionsAdmin = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    await requireHr(ctx, actor);
    const rows = await ctx.db.query("developmentOptions").collect();
    return rows.sort((a, b) => a.title.localeCompare(b.title, "pl"));
  },
});

// Creates an entry (source "urzad", active) or, with `optionId`, updates one and keeps its source.
export const saveOption = mutation({
  args: {
    actor: demoActor,
    optionId: v.optional(v.id("developmentOptions")),
    ...optionFields,
  },
  handler: async (ctx, { actor, optionId, ...fields }) => {
    const hr = await requireHr(ctx, actor);
    const input = parseOptionInput(fields);
    const values = {
      title: input.title,
      description: input.description,
      form: fields.form,
      criterionIds: [...new Set(fields.criterionIds)],
      level: fields.level,
      cost: fields.cost,
      costNote: input.costNote,
      provider: input.provider,
      url: input.url,
      durationNote: input.durationNote,
    };
    if (optionId === undefined) {
      const id = await ctx.db.insert("developmentOptions", {
        ...values,
        source: "urzad",
        active: true,
      });
      await logAudit(ctx, {
        actor: hr,
        action: "create",
        entity: "developmentOption",
        entityId: id,
      });
      return id;
    }
    const stored = await ctx.db.get(optionId);
    if (!stored) throw new ConvexError("Nie znaleziono wpisu katalogu.");
    await ctx.db.replace(optionId, {
      ...values,
      source: stored.source,
      sourceRef: stored.sourceRef,
      active: stored.active,
    });
    await logAudit(ctx, {
      actor: hr,
      action: "update",
      entity: "developmentOption",
      entityId: optionId,
    });
    return optionId;
  },
});

// Switching off keeps the entry in the database; `listOptions` and `suggestForArea` skip it.
export const setOptionActive = mutation({
  args: {
    actor: demoActor,
    optionId: v.id("developmentOptions"),
    active: v.boolean(),
  },
  handler: async (ctx, { actor, optionId, active }) => {
    const hr = await requireHr(ctx, actor);
    const stored = await ctx.db.get(optionId);
    if (!stored) throw new ConvexError("Nie znaleziono wpisu katalogu.");
    if (stored.active === active) return;
    await ctx.db.patch(optionId, { active });
    await logAudit(ctx, {
      actor: hr,
      action: "update",
      entity: "developmentOption",
      entityId: optionId,
      details: active ? "active" : "inactive",
    });
  },
});

// Every article with its sections, unpublished ones included, so HR can preview before publishing.
export const listArticlesAdmin = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    await requireHr(ctx, actor);
    const rows = await ctx.db.query("adviceArticles").collect();
    return rows.sort((a, b) => a.title.localeCompare(b.title, "pl"));
  },
});

async function freeSlug(ctx: Pick<MutationCtx, "db">, title: string) {
  const base = slugOf(title);
  for (let n = 1; ; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const taken = await ctx.db
      .query("adviceArticles")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!taken) return slug;
  }
}

// Creates an unpublished article (source "urzad") or, with `articleId`, updates one. The slug is made
// from the title once and never changes, so links to the article keep working.
export const saveArticle = mutation({
  args: {
    actor: demoActor,
    articleId: v.optional(v.id("adviceArticles")),
    title: v.string(),
    summary: v.string(),
    topic: adviceTopic,
    audience: v.optional(adviceAudience),
    sections: v.array(adviceSection),
    readingMinutes: v.optional(v.number()),
    sourceRef: v.optional(v.string()),
  },
  handler: async (ctx, { actor, articleId, topic, audience, ...fields }) => {
    const hr = await requireHr(ctx, actor);
    const input = parseArticleInput(fields);
    const values = {
      title: input.title,
      summary: input.summary,
      topic,
      sections: input.sections,
      readingMinutes: input.readingMinutes,
      sourceRef: input.sourceRef,
    };
    if (articleId === undefined) {
      const id = await ctx.db.insert("adviceArticles", {
        ...values,
        audience,
        slug: await freeSlug(ctx, input.title),
        source: "urzad",
        published: false,
      });
      await logAudit(ctx, {
        actor: hr,
        action: "create",
        entity: "adviceArticle",
        entityId: id,
      });
      return id;
    }
    const stored: Doc<"adviceArticles"> | null = await ctx.db.get(articleId);
    if (!stored) throw new ConvexError("Nie znaleziono porady.");
    await ctx.db.replace(articleId, {
      ...values,
      audience: audience ?? stored.audience,
      slug: stored.slug,
      criterionIds: stored.criterionIds,
      source: stored.source,
      published: stored.published,
    });
    await logAudit(ctx, {
      actor: hr,
      action: "update",
      entity: "adviceArticle",
      entityId: articleId,
    });
    return articleId;
  },
});

export const setArticlePublished = mutation({
  args: {
    actor: demoActor,
    articleId: v.id("adviceArticles"),
    published: v.boolean(),
  },
  handler: async (ctx, { actor, articleId, published }) => {
    const hr = await requireHr(ctx, actor);
    const stored = await ctx.db.get(articleId);
    if (!stored) throw new ConvexError("Nie znaleziono porady.");
    if (stored.published === published) return;
    await ctx.db.patch(articleId, { published });
    await logAudit(ctx, {
      actor: hr,
      action: "update",
      entity: "adviceArticle",
      entityId: articleId,
      details: published ? "published" : "unpublished",
    });
  },
});
