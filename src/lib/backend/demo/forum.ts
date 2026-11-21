import type {
  createThreadContract,
  ForumReplyRow,
  ForumThreadDetail,
  reportContract,
  replyContract,
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
  threads: (ForumThreadDetail & { replies: ForumReplyRow[] })[];
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
      replies: [],
    },
  ],
}));

const cut = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

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
        t.threadId === args.threadId ? { ...t, reported: true } : t,
      ),
    },
    result: null,
  };
}
