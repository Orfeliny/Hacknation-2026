import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { MODERATOR_ONLY } from "./moderationAccess";

const modules = import.meta.glob("/convex/**/*.*s");

type Role = "supervisor" | "employee" | "hr" | "director" | "admin";
const as = (role: Role) => ({ role });
const NON_MODERATORS: Role[] = ["supervisor", "employee", "director", "admin"];
const denied = { data: { code: "denied", message: MODERATOR_ONLY } };

const newDb = () => convexTest(schema, modules);
type Db = ReturnType<typeof newDb>;
type ThreadId = Id<"forumThreads">;

async function seeded() {
  const t = newDb();
  await t.mutation(internal.employees.seed.run, {});
  return t;
}

const create = (t: Db, title = "Wątek") =>
  t.mutation(api.forum.mutations.createThread, {
    actor: as("employee"),
    kind: "question",
    title,
    body: "Treść wątku.",
  });

const report = (t: Db, threadId: ThreadId) =>
  t.mutation(api.forum.mutations.report, { actor: as("employee"), threadId });

const list = (t: Db, role: Role = "employee") =>
  t.query(api.forum.queries.listThreads, { actor: as(role) });

const get = (t: Db, threadId: ThreadId, role: Role = "employee") =>
  t.query(api.forum.queries.getThread, { actor: as(role), threadId });

const reported = (t: Db, role: Role = "hr") =>
  t.query(api.forum.moderation.listReportedThreads, { actor: as(role) });

const hide = (t: Db, threadId: ThreadId, role: Role = "hr") =>
  t.mutation(api.forum.moderation.hideThread, { actor: as(role), threadId });

const restore = (t: Db, threadId: ThreadId, role: Role = "hr") =>
  t.mutation(api.forum.moderation.restoreThread, { actor: as(role), threadId });

const dismiss = (t: Db, threadId: ThreadId, role: Role = "hr") =>
  t.mutation(api.forum.moderation.dismissReport, { actor: as(role), threadId });

const stored = (t: Db, threadId: ThreadId) =>
  t.run((ctx) => ctx.db.get(threadId));

const moderationAudit = (t: Db) =>
  t.run(async (ctx) =>
    (await ctx.db.query("auditLog").collect()).filter((e) =>
      e.details?.startsWith("moderation:"),
    ),
  );

describe("access", () => {
  it.each(NON_MODERATORS)(
    "refuses %s in every moderation call",
    async (role) => {
      const t = await seeded();
      const id = await create(t);
      await report(t, id);
      await expect(reported(t, role)).rejects.toMatchObject(denied);
      await expect(hide(t, id, role)).rejects.toMatchObject(denied);
      await expect(restore(t, id, role)).rejects.toMatchObject(denied);
      await expect(dismiss(t, id, role)).rejects.toMatchObject(denied);
      const thread = await stored(t, id);
      expect(thread?.hiddenAt).toBeUndefined();
      expect(thread?.reportedAt).toBeTypeOf("number");
    },
  );

  it("rejects a thread that does not exist", async () => {
    const t = await seeded();
    const id = await create(t);
    await t.run((ctx) => ctx.db.delete(id));
    await expect(hide(t, id)).rejects.toThrow("Nie znaleziono wątku.");
  });
});

describe("listReportedThreads", () => {
  it("lists reported and hidden threads, the oldest report first", async () => {
    const t = await seeded();
    const quiet = await create(t, "Spokojny");
    const late = await create(t, "Zgłoszony później");
    const early = await create(t, "Zgłoszony wcześniej");
    const hiddenOnly = await create(t, "Ukryty bez zgłoszenia");
    await t.run(async (ctx) => {
      await ctx.db.patch(late, { reportedAt: 3_000 });
      await ctx.db.patch(early, { reportedAt: 1_000 });
      await ctx.db.patch(hiddenOnly, { hiddenAt: 2_000 });
    });
    const rows = await reported(t);
    expect(rows.map((r) => r.threadId)).toEqual([early, hiddenOnly, late]);
    expect(rows.map((r) => r.threadId)).not.toContain(quiet);
    expect(rows[0]).toMatchObject({
      title: "Zgłoszony wcześniej",
      authorName: "Anna Przykładowa",
      reportedAt: 1_000,
    });
    expect(rows[0]?.hiddenAt).toBeUndefined();
    expect(rows[1]?.hiddenAt).toBe(2_000);
  });
});

describe("hideThread and restoreThread", () => {
  it("hides a thread from regular roles, keeps it stored and restores it", async () => {
    const t = await seeded();
    const id = await create(t);
    await report(t, id);
    await hide(t, id);

    for (const role of NON_MODERATORS) {
      expect((await list(t, role)).map((r) => r.threadId)).not.toContain(id);
      expect(await get(t, id, role)).toBeNull();
    }
    expect((await list(t, "hr")).map((r) => r.threadId)).not.toContain(id);
    expect(await get(t, id, "hr")).toMatchObject({ thread: { threadId: id } });
    const queue = await reported(t);
    expect(queue.map((r) => r.threadId)).toEqual([id]);
    expect(queue[0]?.hiddenAt).toBeTypeOf("number");

    const hr = await t.run((ctx) =>
      ctx.db
        .query("employees")
        .withIndex("by_demoPersona", (q) => q.eq("demoPersona", "hr"))
        .unique(),
    );
    const hidden = await stored(t, id);
    expect(hidden).toMatchObject({ title: "Wątek", moderatedById: hr?._id });
    expect(hidden?.hiddenAt).toBeTypeOf("number");
    expect(hidden?.moderatedAt).toBe(hidden?.hiddenAt);

    await restore(t, id);
    expect((await list(t)).map((r) => r.threadId)).toContain(id);
    expect(await get(t, id)).toMatchObject({ thread: { threadId: id } });
    expect((await stored(t, id))?.hiddenAt).toBeUndefined();
  });

  it("keeps the first hiding time and logs each change once", async () => {
    const t = await seeded();
    const id = await create(t);
    await hide(t, id);
    const first = (await stored(t, id))?.hiddenAt;
    await hide(t, id);
    expect((await stored(t, id))?.hiddenAt).toBe(first);
    await restore(t, id);
    await restore(t, id);
    expect(
      (await moderationAudit(t)).map((e) => ({
        action: e.action,
        actorRole: e.actorRole,
        entity: e.entity,
        entityId: e.entityId,
        details: e.details,
      })),
    ).toEqual([
      {
        action: "update",
        actorRole: "hr",
        entity: "forumThreads",
        entityId: id,
        details: "moderation:hide",
      },
      {
        action: "update",
        actorRole: "hr",
        entity: "forumThreads",
        entityId: id,
        details: "moderation:restore",
      },
    ]);
  });
});

describe("dismissReport", () => {
  it("clears the reported flag and drops the thread from the queue", async () => {
    const t = await seeded();
    const id = await create(t);
    await report(t, id);
    expect((await list(t)).find((r) => r.threadId === id)?.reported).toBe(true);

    await dismiss(t, id);
    expect((await list(t)).find((r) => r.threadId === id)?.reported).toBe(
      false,
    );
    expect((await get(t, id))?.thread.reported).toBe(false);
    expect(await reported(t)).toEqual([]);
    expect((await moderationAudit(t)).map((e) => e.details)).toEqual([
      "moderation:dismiss_report",
    ]);

    await dismiss(t, id);
    expect(await moderationAudit(t)).toHaveLength(1);
  });
});
