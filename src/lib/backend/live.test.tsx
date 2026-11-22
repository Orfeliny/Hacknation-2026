import { renderHook } from "@testing-library/react";
import {
  getFunctionName,
  type FunctionArgs,
  type FunctionReference,
  type FunctionReturnType,
} from "convex/server";
import type { PropertyValidators, Validator } from "convex/values";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { api } from "../../../convex/_generated/api";
import type { AIStatus } from "../../../convex/aiStatus/classify";
import type {
  getAdviceContract,
  listAdviceContract,
} from "../../../convex/lib/contracts/advice";
import type {
  decideContract,
  getContract,
  listAwaitingNoticeContract,
  listForEmployeeContract,
  listForSupervisorContract,
  markNoticeSentContract,
} from "../../../convex/lib/contracts/deadlineShift";
import type {
  createThreadContract,
  getThreadContract,
  listThreadsContract,
  replyContract,
  reportContract,
} from "../../../convex/lib/contracts/forum";
import { setDemoRole } from "../demoRole";
import type { ArgsOf, ReturnsOf } from "./useDemo";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  mutations: new Map<string, ReturnType<typeof vi.fn>>(),
}));

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useQuery: mocks.useQuery,
  useMutation: (fn: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(fn);
    if (!mocks.mutations.has(name)) mocks.mutations.set(name, vi.fn());
    return mocks.mutations.get(name);
  },
}));

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type AnyContract = {
  args: PropertyValidators;
  returns: Validator<unknown, "required", string>;
};
type Matches<
  Ref extends FunctionReference<"query" | "mutation">,
  C extends AnyContract,
> =
  Equal<FunctionArgs<Ref>, ArgsOf<C>> extends true
    ? FunctionReturnType<Ref> extends ReturnsOf<C>
      ? true
      : false
    : false;

// Each line fails `tsc` when the real function and its contract disagree. Args must be equal; the
// return only has to be assignable, because a handler's inferred return writes an optional field as
// `field: T | undefined` (the runtime `returns` validator still checks it).
const assertMatches = <
  Ref extends FunctionReference<"query" | "mutation">,
  C extends AnyContract,
>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- type-level check only
  ..._ok: Matches<Ref, C> extends true ? [] : ["args or returns drifted"]
) => undefined;

type Api = typeof api;
assertMatches<
  Api["growth"]["advice"]["listAdvice"],
  typeof listAdviceContract
>();
assertMatches<Api["growth"]["advice"]["getAdvice"], typeof getAdviceContract>();
assertMatches<
  Api["deadlineShift"]["queries"]["listForSupervisor"],
  typeof listForSupervisorContract
>();
assertMatches<
  Api["deadlineShift"]["queries"]["listAwaitingNotice"],
  typeof listAwaitingNoticeContract
>();
assertMatches<
  Api["deadlineShift"]["queries"]["listForEmployee"],
  typeof listForEmployeeContract
>();
assertMatches<Api["deadlineShift"]["queries"]["get"], typeof getContract>();
assertMatches<
  Api["deadlineShift"]["mutations"]["decide"],
  typeof decideContract
>();
assertMatches<
  Api["deadlineShift"]["mutations"]["markNoticeSent"],
  typeof markNoticeSentContract
>();
assertMatches<
  Api["forum"]["queries"]["listThreads"],
  typeof listThreadsContract
>();
assertMatches<Api["forum"]["queries"]["getThread"], typeof getThreadContract>();
assertMatches<
  Api["forum"]["mutations"]["createThread"],
  typeof createThreadContract
>();
assertMatches<Api["forum"]["mutations"]["reply"], typeof replyContract>();
assertMatches<Api["forum"]["mutations"]["report"], typeof reportContract>();

const aiStatusMatches: Equal<
  FunctionReturnType<Api["aiStatus"]["queries"]["status"]>,
  AIStatus
> = true;

const firstCall = (): [string, unknown] => {
  const [ref, args] = mocks.useQuery.mock.calls[0] as [
    Parameters<typeof getFunctionName>[0],
    unknown,
  ];
  return [getFunctionName(ref), args];
};

const reviewId = "r1" as never;
const employeeId = "e1" as never;
const threadId = "t1" as never;

async function loadHooks() {
  vi.resetModules();
  vi.stubEnv("VITE_CONVEX_URL", "https://example.convex.cloud");
  const [advice, aiStatus, shifts, forum] = await Promise.all([
    import("./advice"),
    import("./aiStatus"),
    import("./deadlineShift"),
    import("./forum"),
  ]);
  return { advice, aiStatus, shifts, forum };
}

beforeEach(() => {
  window.localStorage.clear();
  mocks.useQuery.mockReset();
  mocks.mutations.clear();
  setDemoRole("hr");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("online branch of the swapped hooks", () => {
  it("keeps the AI status type in step with the real query", () => {
    expect(aiStatusMatches).toBe(true);
  });

  it("calls the real query with the actor filled for actor-scoped queries", async () => {
    const { shifts, forum } = await loadHooks();
    mocks.useQuery.mockReturnValue([]);
    const actor = { role: "hr" };
    const cases: [string, () => unknown, object][] = [
      [
        "deadlineShift/queries:listForSupervisor",
        () => shifts.useShiftsForSupervisor(),
        { actor },
      ],
      [
        "deadlineShift/queries:listAwaitingNotice",
        () => shifts.useShiftsAwaitingNotice(),
        { actor },
      ],
      [
        "deadlineShift/queries:listForEmployee",
        () => shifts.useShiftsForEmployee({ employeeId }),
        { actor, employeeId },
      ],
      [
        "deadlineShift/queries:get",
        () => shifts.useShift({ reviewId, changeIndex: 2 }),
        { actor, reviewId, changeIndex: 2 },
      ],
      [
        "forum/queries:listThreads",
        () => forum.useForumThreads({ kind: "offer" }),
        { actor, kind: "offer" },
      ],
      [
        "forum/queries:getThread",
        () => forum.useForumThread({ threadId }),
        { actor, threadId },
      ],
    ];
    for (const [name, hook, args] of cases) {
      mocks.useQuery.mockClear();
      const { result } = renderHook(hook as () => { data: unknown });
      const [called, passed] = firstCall();
      expect(called, name).toBe(name);
      expect(passed, name).toEqual(args);
      expect(result.current, name).toMatchObject({
        data: [],
        isDemo: false,
        offline: false,
      });
    }
  });

  it("calls the public queries without an actor", async () => {
    const { advice, aiStatus } = await loadHooks();
    mocks.useQuery.mockReturnValue(undefined);
    const list = renderHook(() => advice.useAdviceList({ topic: "dobrostan" }));
    expect(firstCall()).toEqual([
      "growth/advice:listAdvice",
      { topic: "dobrostan" },
    ]);
    expect(list.result.current.data).toBeUndefined();

    mocks.useQuery.mockClear();
    renderHook(() => advice.useAdvice({ slug: "a" }));
    expect(firstCall()).toEqual(["growth/advice:getAdvice", { slug: "a" }]);

    mocks.useQuery.mockClear();
    renderHook(() => aiStatus.useAiStatus());
    expect(firstCall()).toEqual(["aiStatus/queries:status", {}]);
  });

  it("calls the real mutations with the current role as actor", async () => {
    const { shifts, forum } = await loadHooks();
    const cases: [string, () => (args: never) => Promise<unknown>, object][] = [
      [
        "deadlineShift/mutations:decide",
        shifts.useDecideShift,
        { reviewId, changeIndex: 0, accepted: true, justification: "ok" },
      ],
      [
        "deadlineShift/mutations:markNoticeSent",
        shifts.useMarkNoticeSent,
        { reviewId, changeIndex: 0 },
      ],
      [
        "forum/mutations:createThread",
        forum.useCreateThread,
        { kind: "question", title: "t", body: "b" },
      ],
      [
        "forum/mutations:reply",
        forum.useReplyToThread,
        { threadId, body: "b" },
      ],
      ["forum/mutations:report", forum.useReportThread, { threadId }],
    ];
    for (const [name, hook, args] of cases) {
      const { result } = renderHook(() => hook());
      const run = mocks.mutations.get(name);
      run?.mockResolvedValue("done");
      await expect(result.current(args as never)).resolves.toBe("done");
      expect(run, name).toHaveBeenCalledWith({
        actor: { role: "hr" },
        ...args,
      });
    }
  });
});
