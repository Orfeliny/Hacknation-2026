import { ConvexError } from "convex/values";
import type {
  createThreadContract,
  dismissReportContract,
  ForumModerationRow,
  ForumReplyRow,
  ForumThreadDetail,
  hideThreadContract,
  reportContract,
  replyContract,
  restoreThreadContract,
} from "../../../../convex/lib/contracts/forum";
import { FORUM_LIMITS } from "../../../../convex/lib/contracts/forum";
import {
  actorLabel,
  createDemoStore,
  demoId,
  msFromToday,
  type ArgsOf,
} from "../useDemo";

export type ForumState = {
  threads: (ForumThreadDetail & {
    replies: ForumReplyRow[];
    reportedAt?: number;
    hiddenAt?: number;
  })[];
};

const UNIT = "Wydział Kontroli Planowej";

export const forumStore = createDemoStore<ForumState>(() => ({
  threads: [
    {
      threadId: demoId("forumThreads", "komunikacja"),
      kind: "question",
      title: "Jakie szkolenie z wystąpień publicznych polecacie?",
      body: "Szukam kursu na poziomie podstawowym, najlepiej stacjonarnego. Ktoś już był?",
      authorName: "Joanna Mazur",
      authorUnit: UNIT,
      criterionId: "wystapienia_publiczne",
      createdAt: msFromToday(-6),
      reported: false,
      replies: [
        {
          replyId: demoId("forumReplies", "k1"),
          body: "Byłam w zeszłym roku, warto. Dużo ćwiczeń praktycznych.",
          authorName: "Zofia Krawczyk",
          createdAt: msFromToday(-5),
        },
        {
          replyId: demoId("forumReplies", "k2"),
          body: "Dopytaj kadry o dofinansowanie.",
          authorName: "Barbara Dąbrowska",
          createdAt: msFromToday(-4),
        },
      ],
    },
    {
      threadId: demoId("forumThreads", "mentor"),
      kind: "offer",
      title: "Mogę podzielić się doświadczeniem z kontroli planowych",
      body: "Pracuję w kontroli od dziesięciu lat, chętnie poprowadzę krótką sesję dla nowych osób.",
      authorName: "Tomasz Lewandowski",
      authorUnit: UNIT,
      createdAt: msFromToday(-12),
      reported: false,
      replies: [],
    },
    {
      threadId: demoId("forumThreads", "spam"),
      kind: "recommendation",
      title: "Świetna oferta, kliknij tutaj",
      body: "Treść niezwiązana z rozwojem zawodowym.",
      authorName: "Michał Wójcik",
      authorUnit: UNIT,
      createdAt: msFromToday(-2),
      reported: true,
      reportedAt: msFromToday(-1),
      replies: [],
    },
  ],
}));

const cut = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

// The moderation timestamps are not part of the public thread shape.
export function withoutModeration(
  thread: ForumState["threads"][number],
): ForumState["threads"][number] {
  const copy = { ...thread };
  delete copy.reportedAt;
  delete copy.hiddenAt;
  return copy;
}

export const excerptOf = (body: string) => cut(body, FORUM_LIMITS.excerpt);

export function createThread(
  state: ForumState,
  args: ArgsOf<typeof createThreadContract>,
) {
  const threadId = demoId("forumThreads", `new-${state.threads.length + 1}`);
  const thread = {
    threadId,
    kind: args.kind,
    title: args.title,
    body: args.body,
    authorName: actorLabel(args.actor.role),
    authorUnit: UNIT,
    ...(args.criterionId === undefined
      ? {}
      : { criterionId: args.criterionId }),
    createdAt: Date.now(),
    reported: false,
    replies: [],
  };
  return {
    state: { ...state, threads: [thread, ...state.threads] },
    result: threadId,
  };
}

export function reply(state: ForumState, args: ArgsOf<typeof replyContract>) {
  const replyId = demoId(
    "forumReplies",
    `new-${Date.now()}-${args.body.length}`,
  );
  return {
    state: {
      ...state,
      threads: state.threads.map((t) =>
        t.threadId === args.threadId
          ? {
              ...t,
              replies: [
                ...t.replies,
                {
                  replyId,
                  body: args.body,
                  authorName: actorLabel(args.actor.role),
                  createdAt: Date.now(),
                },
              ],
            }
          : t,
      ),
    },
    result: replyId,
  };
}

export function report(state: ForumState, args: ArgsOf<typeof reportContract>) {
  return {
    state: {
      ...state,
      threads: state.threads.map((t) =>
        t.threadId === args.threadId
          ? { ...t, reported: true, reportedAt: t.reportedAt ?? Date.now() }
          : t,
      ),
    },
    result: null,
  };
}

const DENIED = "Tę akcję wykonują tylko kadry.";

function moderate(
  state: ForumState,
  args: { actor: { role: string }; threadId: string },
  change: (
    thread: ForumState["threads"][number],
  ) => ForumState["threads"][number],
) {
  if (args.actor.role !== "hr") {
    throw new ConvexError({ code: "denied", message: DENIED });
  }
  return {
    state: {
      ...state,
      threads: state.threads.map((t) =>
        t.threadId === args.threadId ? change(t) : t,
      ),
    },
    result: null,
  };
}

export function hideThread(
  state: ForumState,
  args: ArgsOf<typeof hideThreadContract>,
) {
  return moderate(state, args, (t) => ({
    ...t,
    hiddenAt: t.hiddenAt ?? Date.now(),
  }));
}

export function restoreThread(
  state: ForumState,
  args: ArgsOf<typeof restoreThreadContract>,
) {
  return moderate(state, args, (t) => {
    const next = { ...t };
    delete next.hiddenAt;
    return next;
  });
}

export function dismissReport(
  state: ForumState,
  args: ArgsOf<typeof dismissReportContract>,
) {
  return moderate(state, args, (t) => {
    const next = { ...t, reported: false };
    delete next.reportedAt;
    return next;
  });
}

// Threads that are reported or hidden, the oldest report (or hiding) first.
export function moderationRows(state: ForumState): ForumModerationRow[] {
  return state.threads
    .filter((t) => t.reported || t.hiddenAt !== undefined)
    .map((t) => ({
      threadId: t.threadId,
      kind: t.kind,
      title: t.title,
      excerpt: excerptOf(t.body),
      authorName: t.authorName,
      authorUnit: t.authorUnit,
      createdAt: t.createdAt,
      replyCount: t.replies.length,
      ...(t.reported ? { reportedAt: t.reportedAt ?? t.createdAt } : {}),
      ...(t.hiddenAt === undefined ? {} : { hiddenAt: t.hiddenAt }),
    }))
    .sort(
      (a, b) =>
        (a.reportedAt ?? a.hiddenAt ?? 0) - (b.reportedAt ?? b.hiddenAt ?? 0),
    );
}
