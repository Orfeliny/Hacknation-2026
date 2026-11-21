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

export const useForumThreads = online
  ? useDemoForumThreads
  : useDemoForumThreads;
export const useForumThread = online ? useDemoForumThread : useDemoForumThread;
export const useCreateThread = online
  ? useDemoCreateThread
  : useDemoCreateThread;
export const useReplyToThread = online
  ? useDemoReplyToThread
  : useDemoReplyToThread;
export const useReportThread = online
  ? useDemoReportThread
  : useDemoReportThread;
