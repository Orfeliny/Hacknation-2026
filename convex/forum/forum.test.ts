import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { FORUM_LIMITS } from "../lib/contracts/forum";
import schema from "../schema";
import { SEED_THREADS } from "./seedData";

const modules = import.meta.glob("/convex/**/*.*s");

type Role = "supervisor" | "employee" | "hr" | "director" | "admin";
const as = (role: Role) => ({ role });
const ROLES: Role[] = ["supervisor", "employee", "hr", "director", "admin"];

const newDb = () => convexTest(schema, modules);
type Db = ReturnType<typeof newDb>;

async function seeded() {
  const t = newDb();
  await t.mutation(internal.employees.seed.run, {});
  await t.mutation(internal.forum.seed.run, {});
  return t;
}

const list = (t: Db, args: object = {}, role: Role = "employee") =>
  t.query(api.forum.queries.listThreads, { actor: as(role), ...args });

const get = (t: Db, threadId: Id<"forumThreads">, role: Role = "employee") =>
  t.query(api.forum.queries.getThread, { actor: as(role), threadId });

const create = (t: Db, args: object = {}, role: Role = "employee") =>
  t.mutation(api.forum.mutations.createThread, {
    actor: as(role),
    kind: "question",
    title: "Tytuł wątku",
    body: "Treść wątku.",
    ...args,
  });

const reply = (
  t: Db,
  threadId: Id<"forumThreads">,
  body = "Odpowiedź.",
  role: Role = "supervisor",
) => t.mutation(api.forum.mutations.reply, { actor: as(role), threadId, body });

const report = (t: Db, threadId: Id<"forumThreads">, role: Role = "hr") =>
  t.mutation(api.forum.mutations.report, { actor: as(role), threadId });

describe("listThreads", () => {
  it("returns every thread newest first, with author name and unit", async () => {
    const t = await seeded();
    const rows = await list(t);
    expect(rows).toHaveLength(SEED_THREADS.length);
    const times = rows.map((r) => r.createdAt);
    expect(times).toEqual([...times].sort((a, b) => b - a));
    const first = rows.find((r) => r.title.startsWith("Spisuj oczekiwania"));
    expect(first).toMatchObject({
      kind: "recommendation",
      authorName: "Katarzyna Wiśniewska",
      authorUnit: "Wydział Kontroli Planowej",
      criterionId: "komunikacja",
      replyCount: 0,
      reported: false,
    });
  });

  it("returns an empty list for an empty forum", async () => {
    const t = newDb();
    await t.mutation(internal.employees.seed.run, {});
    expect(await list(t)).toEqual([]);
  });

  it("filters by kind, by criterion and by both", async () => {
    const t = await seeded();
    const questions = await list(t, { kind: "question" });
    expect(questions.map((r) => r.kind)).toEqual(["question", "question"]);
    const byCriterion = await list(t, { criterionId: "komunikacja" });
    expect(byCriterion).toHaveLength(2);
    for (const row of byCriterion) expect(row.criterionId).toBe("komunikacja");
    const both = await list(t, {
      kind: "recommendation",
      criterionId: "komunikacja",
    });
    expect(both.map((r) => r.title)).toEqual([
      "Spisuj oczekiwania po rozmowie rozpoczynającej",
    ]);
    expect(
      await list(t, { kind: "offer", criterionId: "komunikacja" }),
    ).toEqual([]);
  });

  it("shows a short body as is and cuts a long one to the excerpt limit", async () => {
    const t = await seeded();
    const long = `${"Długie zdanie. ".repeat(40)}\n\nKoniec.`;
    await create(t, { title: "Długi wątek", body: long });
    await create(t, {
      title: "Krótki wątek",
      body: "Krótko.\nW dwóch liniach.",
    });
    const rows = await list(t);
    const cut = rows.find((r) => r.title === "Długi wątek");
    expect(cut?.excerpt.length).toBeLessThanOrEqual(FORUM_LIMITS.excerpt);
    expect(cut?.excerpt.endsWith("…")).toBe(true);
    expect(cut?.excerpt).not.toContain("\n");
    expect(rows.find((r) => r.title === "Krótki wątek")?.excerpt).toBe(
      "Krótko. W dwóch liniach.",
    );
  });

  it("does not leave half of an emoji at the cut of the excerpt", async () => {
    const t = await seeded();
    await create(t, { title: "Emoji", body: `${"a".repeat(198)}😀 reszta` });
    const row = (await list(t)).find((r) => r.title === "Emoji");
    expect(row?.excerpt.endsWith("…")).toBe(true);
    expect(row?.excerpt).not.toMatch(/[�-�]…$/);
    expect(row?.excerpt.length).toBeLessThanOrEqual(FORUM_LIMITS.excerpt);
  });

  it("shows 'Nieznany autor' when the author no longer exists", async () => {
    const t = await seeded();
    const threads = await t.run((ctx) =>
      ctx.db.query("forumThreads").collect(),
    );
    // Mazur's author is not the demo person behind any role, so the actor stays valid.
    const thread = threads.find((x) => x.title.startsWith("Krótki przegląd"))!;
    await t.run((ctx) => ctx.db.delete(thread.authorId));
    const row = (await list(t)).find((r) => r.threadId === thread._id);
    expect(row).toMatchObject({ authorName: "Nieznany autor", authorUnit: "" });
  });
});

describe("getThread", () => {
  it("returns the thread with its replies oldest first", async () => {
    const t = await seeded();
    const row = (await list(t)).find((r) => r.replyCount === 2)!;
    const found = await get(t, row.threadId);
    expect(found?.thread).toMatchObject({
      threadId: row.threadId,
      title: row.title,
      authorName: "Katarzyna Wiśniewska",
      reported: false,
    });
    expect(found?.thread.body.length).toBeGreaterThan(0);
    expect(found?.replies.map((r) => r.authorName)).toEqual([
      "Piotr Nowicki",
      "Barbara Dąbrowska",
    ]);
    const times = found!.replies.map((r) => r.createdAt);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("returns null for a thread that does not exist", async () => {
    const t = await seeded();
    const [row] = await list(t);
    await t.run((ctx) => ctx.db.delete(row.threadId));
    expect(await get(t, row.threadId)).toBeNull();
  });
});

describe("createThread", () => {
  it("makes the actor the author and puts the thread first", async () => {
    const t = await seeded();
    const id = await create(t, {
      kind: "offer",
      title: "  Oferuję pomoc  ",
      body: "  Mogę pomóc przy sprawozdaniu.  ",
      criterionId: "rzetelnosc",
    });
    const [top] = await list(t);
    expect(top).toMatchObject({
      threadId: id,
      kind: "offer",
      title: "Oferuję pomoc",
      excerpt: "Mogę pomóc przy sprawozdaniu.",
      authorName: "Anna Przykładowa",
      criterionId: "rzetelnosc",
      replyCount: 0,
      reported: false,
    });
  });

  it("rejects an empty or too long title and body with a Polish message", async () => {
    const t = await seeded();
    await expect(create(t, { title: "   " })).rejects.toThrow(/Tytuł: wpisz/);
    await expect(
      create(t, { title: "x".repeat(FORUM_LIMITS.title + 1) }),
    ).rejects.toThrow(/Tytuł: najwyżej 150/);
    await expect(create(t, { body: "" })).rejects.toThrow(/Treść wątku: wpisz/);
    await expect(
      create(t, { body: "x".repeat(FORUM_LIMITS.body + 1) }),
    ).rejects.toThrow(/najwyżej 5000/);
    expect(await list(t)).toHaveLength(SEED_THREADS.length);
  });

  it("rejects a criterion outside the 2016 pack and an unknown kind", async () => {
    const t = await seeded();
    await expect(
      create(t, { criterionId: "nie_ma_takiego" }),
    ).rejects.toThrow();
    await expect(create(t, { kind: "rant" })).rejects.toThrow();
  });
});

describe("reply", () => {
  it("stores the reply under the actor's name and increments the count", async () => {
    const t = await seeded();
    const id = await create(t);
    await reply(t, id, "  Pierwsza odpowiedź.  ", "supervisor");
    await reply(t, id, "Druga odpowiedź.", "hr");
    const found = await get(t, id);
    expect(found?.replies.map((r) => [r.authorName, r.body])).toEqual([
      ["Katarzyna Wiśniewska", "Pierwsza odpowiedź."],
      ["Barbara Dąbrowska", "Druga odpowiedź."],
    ]);
    const row = (await list(t)).find((r) => r.threadId === id);
    expect(row?.replyCount).toBe(2);
  });

  it("rejects an empty or too long reply and a missing thread", async () => {
    const t = await seeded();
    const id = await create(t);
    await expect(reply(t, id, "  ")).rejects.toThrow(/Odpowiedź: wpisz/);
    await expect(
      reply(t, id, "x".repeat(FORUM_LIMITS.reply + 1)),
    ).rejects.toThrow(/najwyżej 3000/);
    expect((await get(t, id))?.replies).toEqual([]);
    await t.run((ctx) => ctx.db.delete(id));
    await expect(reply(t, id)).rejects.toThrow(/Nie znaleziono wątku/);
  });
});

describe("report", () => {
  it("marks the thread as reported and keeps the first time on a second report", async () => {
    const t = await seeded();
    const id = await create(t);
    expect(await report(t, id)).toBeNull();
    const first = await t.run((ctx) => ctx.db.get(id));
    expect(first?.reportedAt).toBeTypeOf("number");
    expect((await get(t, id))?.thread.reported).toBe(true);
    expect((await list(t)).find((r) => r.threadId === id)?.reported).toBe(true);
    expect(await report(t, id, "director")).toBeNull();
    const second = await t.run((ctx) => ctx.db.get(id));
    expect(second?.reportedAt).toBe(first?.reportedAt);
  });

  it("rejects a thread that does not exist", async () => {
    const t = await seeded();
    const id = await create(t);
    await t.run((ctx) => ctx.db.delete(id));
    await expect(report(t, id)).rejects.toThrow(/Nie znaleziono wątku/);
  });
});

describe("access", () => {
  it("is open to every role that has a demo person", async () => {
    const t = await seeded();
    for (const role of ROLES) {
      await expect(list(t, {}, role)).resolves.toHaveLength(
        SEED_THREADS.length,
      );
    }
    for (const role of ROLES) {
      const id = await create(t, { title: `Wątek ${role}` }, role);
      await reply(t, id, "Odpowiedź.", role);
      await report(t, id, role);
    }
    expect(await list(t)).toHaveLength(SEED_THREADS.length + ROLES.length);
  });

  it("refuses a caller whose role has no demo person", async () => {
    const t = newDb();
    await expect(list(t)).rejects.toThrow(/Forum jest dostępne/);
    await expect(create(t)).rejects.toThrow(/Forum jest dostępne/);
  });
});

describe("seed", () => {
  it("is idempotent and keeps the reply counts right", async () => {
    const t = newDb();
    await t.mutation(internal.employees.seed.run, {});
    expect(await t.mutation(internal.forum.seed.run, {})).toEqual({
      inserted: SEED_THREADS.length,
      total: SEED_THREADS.length,
    });
    expect((await t.mutation(internal.forum.seed.run, {})).inserted).toBe(0);
    const rows = await list(t);
    expect(rows).toHaveLength(SEED_THREADS.length);
    for (const seed of SEED_THREADS) {
      expect(rows.find((r) => r.title === seed.title)?.replyCount).toBe(
        seed.replies.length,
      );
    }
  });

  it("covers every kind of thread", () => {
    expect(new Set(SEED_THREADS.map((s) => s.kind))).toEqual(
      new Set(["question", "recommendation", "offer", "seeking_mentor"]),
    );
  });

  it("contains no contact data, link or name of a real person", () => {
    const text = JSON.stringify(SEED_THREADS);
    expect(text).not.toMatch(
      /@|https?:|www\.|\d{3}[ -]?\d{3}[ -]?\d{3}|\b\d{11}\b/i,
    );
  });

  it("leaves out a thread whose author is missing", async () => {
    const t = newDb();
    await t.mutation(internal.employees.seed.run, {});
    await t.run(async (ctx) => {
      const mazur = (await ctx.db.query("employees").collect()).find(
        (e) => e.lastName === "Mazur",
      );
      await ctx.db.delete(mazur!._id);
    });
    const result = await t.mutation(internal.forum.seed.run, {});
    expect(result.inserted).toBe(SEED_THREADS.length - 1);
  });
});
