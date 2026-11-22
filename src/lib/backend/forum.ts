import { api } from "../../../convex/_generated/api";
import type {
  createThreadContract,
  dismissReportContract,
  getThreadContract,
  hideThreadContract,
  listReportedThreadsContract,
  listThreadsContract,
  reportContract,
  replyContract,
  restoreThreadContract,
} from "../../../convex/lib/contracts/forum";
import {
  createThread,
  dismissReport,
  excerptOf,
  forumStore,
  hideThread,
  moderationRows,
  reply,
  report,
  restoreThread,
  withoutModeration,
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
import { useDemoRole } from "../demoRole";

function useDemoForumThreads(
  args: ViewArgs<ArgsOf<typeof listThreadsContract>> = {},
): QueryResult<ReturnsOf<typeof listThreadsContract>> {
  return useDemoQuery(
    forumStore,
    ({ threads }) =>
      threads
        .filter((t) => t.hiddenAt === undefined)
        .filter((t) => !args.kind || t.kind === args.kind)
        .filter((t) => !args.criterionId || t.criterionId === args.criterionId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((row) => withoutModeration(row))
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
  const role = useDemoRole();
  return useDemoQuery(
    forumStore,
    ({ threads }) => {
      const found = threads.find((t) => t.threadId === args.threadId);
      if (!found) return null;
      const hidden = found.hiddenAt !== undefined;
      if (hidden && role !== "hr") return null;
      const { replies, ...thread } = withoutModeration(found);
      return { thread: hidden ? { ...thread, hidden } : thread, replies };
    },
    { ...args, role },
  );
}

function useDemoReportedThreads(): QueryResult<
  ReturnsOf<typeof listReportedThreadsContract>
> {
  const role = useDemoRole();
  return useDemoQuery(
    forumStore,
    (state) => (role === "hr" ? moderationRows(state) : []),
    { role },
  );
}

const useDemoHideThread = () =>
  useDemoMutation<
    ForumState,
    ArgsOf<typeof hideThreadContract>,
    ReturnsOf<typeof hideThreadContract>
  >(forumStore, hideThread);

const useDemoRestoreThread = () =>
  useDemoMutation<
    ForumState,
    ArgsOf<typeof restoreThreadContract>,
    ReturnsOf<typeof restoreThreadContract>
  >(forumStore, restoreThread);

const useDemoDismissReport = () =>
  useDemoMutation<
    ForumState,
    ArgsOf<typeof dismissReportContract>,
    ReturnsOf<typeof dismissReportContract>
  >(forumStore, dismissReport);

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

const mod = api.forum.moderation;

const useLiveReportedThreads = (): QueryResult<
  ReturnsOf<typeof listReportedThreadsContract>
> => useActorQuery(mod.listReportedThreads, {});

const useLiveHideThread = (): ((
  args: ViewArgs<ArgsOf<typeof hideThreadContract>>,
) => Promise<ReturnsOf<typeof hideThreadContract>>) =>
  useActorMutation(mod.hideThread);

const useLiveRestoreThread = (): ((
  args: ViewArgs<ArgsOf<typeof restoreThreadContract>>,
) => Promise<ReturnsOf<typeof restoreThreadContract>>) =>
  useActorMutation(mod.restoreThread);

const useLiveDismissReport = (): ((
  args: ViewArgs<ArgsOf<typeof dismissReportContract>>,
) => Promise<ReturnsOf<typeof dismissReportContract>>) =>
  useActorMutation(mod.dismissReport);

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
export const useReportedThreads = online
  ? useLiveReportedThreads
  : useDemoReportedThreads;
export const useHideThread = online ? useLiveHideThread : useDemoHideThread;
export const useRestoreThread = online
  ? useLiveRestoreThread
  : useDemoRestoreThread;
export const useDismissReport = online
  ? useLiveDismissReport
  : useDemoDismissReport;
