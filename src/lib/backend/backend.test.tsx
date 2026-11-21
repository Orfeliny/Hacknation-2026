import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setDemoRole } from "../demoRole";
import { today } from "../format";
import { useAdvice, useAdviceList } from "./advice";
import { useAiStatus } from "./aiStatus";
import {
  useDecideShift,
  useMarkNoticeSent,
  useShift,
  useShiftsAwaitingNotice,
  useShiftsForEmployee,
  useShiftsForSupervisor,
} from "./deadlineShift";
import { adviceStore } from "./demo/advice";
import { aiStatusStore } from "./demo/aiStatus";
import { deadlineShiftStore } from "./demo/deadlineShift";
import { forumStore } from "./demo/forum";
import { iprzStore } from "./demo/iprz";
import { knowledgeStore } from "./demo/knowledgeDocs";
import {
  useCreateThread,
  useForumThread,
  useForumThreads,
  useReplyToThread,
  useReportThread,
} from "./forum";
import {
  useAddToIprz,
  useDraftsForReview,
  useEditDraft,
  useGenerateDraft,
  useRankOptions,
  useSuggestForArea,
} from "./iprz";
import {
  useAskKnowledge,
  useGenerateUploadUrl,
  useKnowledgeDocuments,
  useRegisterDocument,
  useRemoveDocument,
} from "./knowledgeDocs";
import { demoId, type QueryResult } from "./useDemo";

const stores = [
  adviceStore,
  aiStatusStore,
  deadlineShiftStore,
  forumStore,
  iprzStore,
  knowledgeStore,
];

beforeEach(() => {
  window.localStorage.clear();
  stores.forEach((store) => store.reset());
});

afterEach(() => {
  vi.useRealTimers();
});

async function loaded<T>(result: {
  current: { data: T | undefined };
}): Promise<T> {
  await waitFor(() => expect(result.current.data).toBeDefined());
  return result.current.data as T;
}

describe("query hooks", () => {
  const hooks: [string, () => QueryResult<unknown>][] = [
    ["advice list", () => useAdviceList()],
    ["advice", () => useAdvice({ slug: "docenianie-codziennej-pracy" })],
    ["ai status", () => useAiStatus()],
    ["shifts for supervisor", () => useShiftsForSupervisor()],
    ["shifts awaiting notice", () => useShiftsAwaitingNotice()],
    ["knowledge documents", () => useKnowledgeDocuments()],
    ["forum threads", () => useForumThreads()],
    ["drafts", () => useDraftsForReview({ reviewId: demoId("reviews", "x") })],
    ["suggestions", () => useSuggestForArea({ criterionIds: ["komunikacja"] })],
  ];

  it.each(hooks)(
    "%s: data is undefined on the first render, then arrives, flagged as demo and offline",
    async (_name, useHook) => {
      const { result } = renderHook(useHook);
      expect(result.current.data).toBeUndefined();
      await loaded(result);
      expect(result.current).toMatchObject({ isDemo: true, offline: true });
    },
  );
});

describe("advice", () => {
  it("filters by topic and diacritic-insensitive search, and can be empty", async () => {
    const topic = renderHook(() => useAdviceList({ topic: "dobrostan" }));
    expect((await loaded(topic.result)).map((a) => a.slug)).toEqual([
      "obciazenie-i-dobrostan-zespolu",
    ]);
    const search = renderHook(() => useAdviceList({ search: "obciazenie" }));
    expect(await loaded(search.result)).toHaveLength(1);
    const none = renderHook(() => useAdviceList({ search: "zzz-nic" }));
    expect(await loaded(none.result)).toEqual([]);
  });

  it("returns null for an unknown slug", async () => {
    const { result } = renderHook(() => useAdvice({ slug: "nie-ma" }));
    await waitFor(() => expect(result.current.data).toBeNull());
  });
});

describe("ai status", () => {
  it("shows the mock provider", async () => {
    const { result } = renderHook(() => useAiStatus());
    expect(await loaded(result)).toMatchObject({ state: "mock" });
  });
});

describe("deadline shift", () => {
  it("covers requested, blocked, approved waiting, rejected and notice sent", async () => {
    const { result } = renderHook(() => useShiftsForSupervisor());
    const rows = await loaded(result);
    const states = rows.map((r) => [r.status, r.noticeSentAt !== undefined]);
    expect(states).toContainEqual(["requested", false]);
    expect(states).toContainEqual(["approved", false]);
    expect(states).toContainEqual(["rejected", false]);
    expect(states).toContainEqual(["approved", true]);
    expect(rows.some((r) => !r.shiftAllowed && r.shiftBlockedReason)).toBe(
      true,
    );
    expect(rows.every((r) => r.reason === "employee_request")).toBe(true);
  });

  it("lists mandatory entries waiting for notice for HR, not decided-and-sent ones", async () => {
    const { result } = renderHook(() => useShiftsAwaitingNotice());
    const rows = await loaded(result);
    expect(rows.some((r) => r.basis === "mandatory")).toBe(true);
    expect(rows.every((r) => r.noticeSentAt === undefined)).toBe(true);
    expect(rows.every((r) => r.status !== "requested")).toBe(true);
  });

  it("lists an employee's entries newest first, and nothing for a stranger", async () => {
    const mine = renderHook(() =>
      useShiftsForEmployee({ employeeId: demoId("employees", "anna") }),
    );
    expect((await loaded(mine.result)).length).toBeGreaterThan(0);
    const none = renderHook(() =>
      useShiftsForEmployee({ employeeId: demoId("employees", "nikt") }),
    );
    expect(await loaded(none.result)).toEqual([]);
  });

  it("dates follow today()", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2030, 0, 15, 12));
    deadlineShiftStore.reset();
    const { result } = renderHook(() => useShiftsForSupervisor());
    const rows = await loaded(result);
    const first = rows[0]!;
    expect(first.currentDueDate.startsWith("2030-01")).toBe(true);
    expect(first.createdAt).toBeLessThan(today().getTime());
  });

  it("decide changes what the query hooks see, fills the actor, and respects the block", async () => {
    const { result } = renderHook(() => ({
      list: useShiftsForSupervisor(),
      decide: useDecideShift(),
    }));
    const rows = await loaded({
      get current() {
        return result.current.list;
      },
    });
    const open = rows.find((r) => r.status === "requested" && r.shiftAllowed)!;
    await act(async () => {
      await result.current.decide({
        reviewId: open.reviewId,
        changeIndex: open.changeIndex,
        accepted: true,
        justification: "Uwzględniam.",
        newDate: "2031-01-01",
      });
    });
    const after = result.current.list.data!.find(
      (r) => r.reviewId === open.reviewId,
    )!;
    expect(after).toMatchObject({ status: "approved", newDate: "2031-01-01" });

    const blocked = rows.find((r) => !r.shiftAllowed)!;
    await expect(
      result.current.decide({
        reviewId: blocked.reviewId,
        changeIndex: blocked.changeIndex,
        accepted: true,
        justification: "x",
        newDate: "2031-01-01",
      }),
    ).rejects.toThrow(blocked.shiftBlockedReason!);
  });

  it("markNoticeSent moves the due date only for an approved entry", async () => {
    const { result } = renderHook(() => ({
      waiting: useShiftsAwaitingNotice(),
      send: useMarkNoticeSent(),
      one: useShift({
        reviewId: demoId("reviews", "lewandowski"),
        changeIndex: 0,
      }),
    }));
    await waitFor(() => expect(result.current.waiting.data).toBeDefined());
    const before = result.current.one.data!;
    expect(before.currentDueDate).not.toBe(before.newDate);
    let out: { dueDate: string } | undefined;
    await act(async () => {
      out = await result.current.send({
        reviewId: before.reviewId,
        changeIndex: before.changeIndex,
      });
    });
    expect(out?.dueDate).toBe(before.newDate);
    expect(result.current.one.data?.noticeSentAt).toBeDefined();
    expect(
      result.current.waiting.data!.some((r) => r.reviewId === before.reviewId),
    ).toBe(false);

    const rejected = deadlineShiftStore
      .get()
      .find((r) => r.status === "rejected")!;
    let kept: { dueDate: string } | undefined;
    await act(async () => {
      kept = await result.current.send({
        reviewId: rejected.reviewId,
        changeIndex: rejected.changeIndex,
      });
    });
    expect(kept?.dueDate).toBe(rejected.currentDueDate);
  });
});

describe("knowledge documents", () => {
  it("covers queued, indexing, indexed and failed", async () => {
    const { result } = renderHook(() => useKnowledgeDocuments());
    const statuses = (await loaded(result)).map((d) => d.status);
    expect(statuses).toEqual(
      expect.arrayContaining(["queued", "indexing", "indexed", "failed"]),
    );
    expect(
      (await loaded(result)).find((d) => d.status === "failed")?.error,
    ).toBeTruthy();
  });

  it("register adds a queued row by the current role, remove drops it", async () => {
    setDemoRole("hr");
    const { result } = renderHook(() => ({
      list: useKnowledgeDocuments(),
      url: useGenerateUploadUrl(),
      register: useRegisterDocument(),
      remove: useRemoveDocument(),
    }));
    await waitFor(() => expect(result.current.list.data).toBeDefined());
    const url = await result.current.url({});
    expect(url).toMatch(/^demo:\/\/upload\//);
    let id: ReturnType<typeof demoId<"knowledgeDocuments">> | undefined;
    await act(async () => {
      id = await result.current.register({
        storageId: demoId("_storage", "1"),
        title: "Nowy dokument",
        fileName: "nowy.pdf",
        scope: "office",
      });
    });
    const added = result.current.list.data!.find((d) => d.documentId === id)!;
    expect(added).toMatchObject({
      status: "queued",
      uploadedByName: "Barbara Dąbrowska",
    });
    await act(async () => {
      await result.current.remove({ documentId: id! });
    });
    expect(result.current.list.data!.some((d) => d.documentId === id)).toBe(
      false,
    );
  });

  it("ask separates office and law citations, and answers null without a basis", async () => {
    const { result } = renderHook(() => useAskKnowledge());
    const found = await result.current({
      question: "Jak złożyć wniosek o urlop?",
    });
    expect(found.citations.map((c) => c.kind)).toEqual(["office", "law"]);
    expect(await result.current({ question: "Pogoda jutro" })).toEqual({
      answer: null,
      citations: [],
    });
  });
});

describe("forum", () => {
  it("has a thread with replies, a reported one, and an empty filter", async () => {
    const all = renderHook(() => useForumThreads());
    const rows = await loaded(all.result);
    expect(rows.some((t) => t.replyCount > 0)).toBe(true);
    expect(rows.some((t) => t.reported)).toBe(true);
    const none = renderHook(() => useForumThreads({ kind: "seeking_mentor" }));
    expect(await loaded(none.result)).toEqual([]);
  });

  it("opens a thread with its replies, oldest first", async () => {
    const list = renderHook(() => useForumThreads());
    const withReplies = (await loaded(list.result)).find(
      (t) => t.replyCount > 1,
    )!;
    const { result } = renderHook(() =>
      useForumThread({ threadId: withReplies.threadId }),
    );
    const detail = (await loaded(result))!;
    expect(detail.replies).toHaveLength(withReplies.replyCount);
    expect(detail.replies[0]!.createdAt).toBeLessThan(
      detail.replies[1]!.createdAt,
    );
  });

  it("create, reply and report show up in the queries, authored by the current role", async () => {
    setDemoRole("employee");
    const { result } = renderHook(() => ({
      list: useForumThreads(),
      create: useCreateThread(),
      reply: useReplyToThread(),
      report: useReportThread(),
    }));
    await waitFor(() => expect(result.current.list.data).toBeDefined());
    let threadId: ReturnType<typeof demoId<"forumThreads">> | undefined;
    await act(async () => {
      threadId = await result.current.create({
        kind: "question",
        title: "Nowy wątek",
        body: "Treść",
      });
    });
    const created = result.current.list.data!.find(
      (t) => t.threadId === threadId,
    )!;
    expect(created).toMatchObject({
      authorName: "Anna Przykładowa",
      replyCount: 0,
      reported: false,
    });
    await act(async () => {
      await result.current.reply({ threadId: threadId!, body: "Odpowiedź" });
      await result.current.report({ threadId: threadId! });
    });
    const after = result.current.list.data!.find(
      (t) => t.threadId === threadId,
    )!;
    expect(after).toMatchObject({ replyCount: 1, reported: true });
  });
});

describe("IPRZ (B6, demo only)", () => {
  it("suggests options with a reason, and rank reports no AI ranking", async () => {
    const { result } = renderHook(() => ({
      suggestions: useSuggestForArea({ criterionIds: ["komunikacja"] }),
      rank: useRankOptions(),
    }));
    const suggestions = await loaded({
      get current() {
        return result.current.suggestions;
      },
    });
    expect(suggestions.length).toBeGreaterThan(5);
    expect(
      suggestions.every((s) => s.reason && s.option.source === "demo"),
    ).toBe(true);
    const ranked = await result.current.rank({ criterionIds: ["komunikacja"] });
    expect(ranked).toMatchObject({ ranking: "rules" });
    expect(ranked.note).toMatch(/^Bez rankingu AI/);
  });

  it("drafts carry evidence or no-basis, and edits are visible to the query", async () => {
    const { result } = renderHook(() => ({
      listing: useDraftsForReview({
        reviewId: demoId("reviews", "przykladowa"),
      }),
      edit: useEditDraft(),
      generate: useGenerateDraft(),
      add: useAddToIprz(),
    }));
    await waitFor(() => expect(result.current.listing.data).toBeDefined());
    const drafts = result.current.listing.data!.drafts;
    expect(
      drafts.every((d) => (d.observationIds?.length ?? 0) > 0 || d.noEvidence),
    ).toBe(true);
    await act(async () => {
      await result.current.edit({
        draftId: drafts[0]!._id,
        text: "Nowy tekst",
      });
    });
    expect(result.current.listing.data!.drafts[0]).toMatchObject({
      text: "Nowy tekst",
      status: "edited",
    });
    expect(
      await result.current.generate({
        reviewId: demoId("reviews", "przykladowa"),
      }),
    ).toMatchObject({ ok: true });
    expect(
      await result.current.add({
        reviewId: demoId("reviews", "przykladowa"),
        text: "Cel",
      }),
    ).toHaveProperty("areaId");
  });
});

describe("demo code", () => {
  const sources = import.meta.glob<string>("./**/*.ts", {
    query: "?raw",
    import: "default",
    eager: true,
  });

  it("never calls the Convex React hooks", () => {
    const offenders = Object.entries(sources)
      .filter(([, text]) => /\buse(Query|Mutation|Action)\s*\(/.test(text))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });

  it("picks the implementation once at module load, one line per hook", () => {
    const hookFiles = Object.entries(sources).filter(
      ([file]) => !file.includes("/demo/") && !file.endsWith("useDemo.ts"),
    );
    expect(hookFiles.length).toBeGreaterThan(0);
    for (const [file, text] of hookFiles) {
      const exported = text.match(/export const use\w+ =/g) ?? [];
      const swappable =
        text.match(/online\s*\?\s*(useDemo\w+)\s*:\s*\1;/g) ?? [];
      expect(swappable.length, file).toBe(exported.length);
    }
  });
});
