import { api } from "../../../convex/_generated/api";
import type {
  createThreadContract,
  getThreadContract,
  listThreadsContract,
  reportContract,
  replyContract,
} from "../../../convex/lib/contracts/forum";
import {
  createThread,
  excerptOf,
  forumStore,
  reply,
  report,
  type ForumState,
} from "./demo/forum";
import {
  online,
  useDemoMutation,
  useDemoQuery,
  type ArgsOf,
  type QueryResult,
  type ReturnsOf,
  type ViewArgs,
} from "./useDemo";
import { useActorMutation, useActorQuery } from "./useLive";

function useDemoForumThreads(
  args: ViewArgs<ArgsOf<typeof listThreadsContract>> = {},
): QueryResult<ReturnsOf<typeof listThreadsContract>> {
  return useDemoQuery(
    forumStore,
    ({ threads }) =>
      threads
        .filter((t) => !args.kind || t.kind === args.kind)
        .filter((t) => !args.criterionId || t.criterionId === args.criterionId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(({ body, replies, ...thread }) => ({
          ...thread,
          excerpt: excerptOf(body),
          replyCount: replies.length,
        })),
    args,
  );
}

function useDemoForumThread(
  args: ViewArgs<ArgsOf<typeof getThreadContract>>,
): QueryResult<ReturnsOf<typeof getThreadContract>> {
  return useDemoQuery(
    forumStore,
    ({ threads }) => {
      const found = threads.find((t) => t.threadId === args.threadId);
      if (!found) return null;
      const { replies, ...thread } = found;
      return { thread, replies };
    },
    args,
  );
}

const useDemoCreateThread = () =>
  useDemoMutation<
    ForumState,
    ArgsOf<typeof createThreadContract>,
    ReturnsOf<typeof createThreadContract>
  >(forumStore, createThread);

const useDemoReplyToThread = () =>
  useDemoMutation<
    ForumState,
    ArgsOf<typeof replyContract>,
    ReturnsOf<typeof replyContract>
  >(forumStore, reply);

const useDemoReportThread = () =>
  useDemoMutation<
    ForumState,
    ArgsOf<typeof reportContract>,
    ReturnsOf<typeof reportContract>
  >(forumStore, report);

const q = api.forum.queries;
const m = api.forum.mutations;

const useLiveForumThreads = (
  args: ViewArgs<ArgsOf<typeof listThreadsContract>> = {},
): QueryResult<ReturnsOf<typeof listThreadsContract>> =>
  useActorQuery(q.listThreads, args);

const useLiveForumThread = (
  args: ViewArgs<ArgsOf<typeof getThreadContract>>,
): QueryResult<ReturnsOf<typeof getThreadContract>> =>
  useActorQuery(q.getThread, args);

const useLiveCreateThread = (): ((
  args: ViewArgs<ArgsOf<typeof createThreadContract>>,
) => Promise<ReturnsOf<typeof createThreadContract>>) =>
  useActorMutation(m.createThread);

const useLiveReplyToThread = (): ((
  args: ViewArgs<ArgsOf<typeof replyContract>>,
) => Promise<ReturnsOf<typeof replyContract>>) => useActorMutation(m.reply);

const useLiveReportThread = (): ((
  args: ViewArgs<ArgsOf<typeof reportContract>>,
) => Promise<ReturnsOf<typeof reportContract>>) => useActorMutation(m.report);

export const useForumThreads = online
  ? useLiveForumThreads
  : useDemoForumThreads;
export const useForumThread = online ? useLiveForumThread : useDemoForumThread;
export const useCreateThread = online
  ? useLiveCreateThread
  : useDemoCreateThread;
export const useReplyToThread = online
  ? useLiveReplyToThread
  : useDemoReplyToThread;
export const useReportThread = online
  ? useLiveReportThread
  : useDemoReportThread;
