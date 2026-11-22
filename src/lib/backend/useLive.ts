import { useAction, useMutation, useQuery } from "convex/react";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";
import { useCallback } from "react";
import { useDemoRole } from "../demoRole";
import type { QueryResult, ViewArgs } from "./useDemo";

type Query = FunctionReference<"query">;
type Mutation = FunctionReference<"mutation">;
type Action = FunctionReference<"action">;

// Live counterparts of the demo helpers in useDemo.ts. They live apart because the demo files must
// never call the Convex React hooks (a test enforces it).

export function useLiveQuery<Q extends Query>(
  ref: Q,
  args: FunctionArgs<Q>,
): QueryResult<FunctionReturnType<Q>> {
  return { data: useQuery(ref, args), isDemo: false, offline: false };
}

export function useActorQuery<Q extends Query>(
  ref: Q,
  args: ViewArgs<FunctionArgs<Q>>,
): QueryResult<FunctionReturnType<Q>> {
  const role = useDemoRole();
  return useLiveQuery(ref, { actor: { role }, ...args } as FunctionArgs<Q>);
}

export function useActorMutation<M extends Mutation>(
  ref: M,
): (args: ViewArgs<FunctionArgs<M>>) => Promise<FunctionReturnType<M>> {
  const role = useDemoRole();
  const run = useMutation(ref);
  return useCallback(
    // tsc needs the cast on a generic M; typescript-eslint reads the same line as redundant.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    (args) => run({ actor: { role }, ...args } as FunctionArgs<M>),
    [run, role],
  );
}

export function useActorAction<A extends Action>(
  ref: A,
): (args: ViewArgs<FunctionArgs<A>>) => Promise<FunctionReturnType<A>> {
  const role = useDemoRole();
  const run = useAction(ref);
  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    (args) => run({ actor: { role }, ...args } as FunctionArgs<A>),
    [run, role],
  );
}
