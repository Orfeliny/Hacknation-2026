import type {
  Infer,
  ObjectType,
  PropertyValidators,
  Validator,
} from "convex/values";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { Id, TableNames } from "../../../convex/_generated/dataModel";
import { getEnv } from "../env";
import { useDemoRole, type DemoRole } from "../demoRole";
import { today } from "../format";

export type QueryResult<T> = {
  data: T | undefined;
  isDemo: boolean;
  offline: boolean;
};

export type ArgsOf<C extends { args: PropertyValidators }> = ObjectType<
  C["args"]
>;
export type ReturnsOf<
  C extends { returns: Validator<unknown, "required", string> },
> = Infer<C["returns"]>;
export type ViewArgs<A> = Omit<A, "actor">;

export const online = Boolean(getEnv().convexUrl);

export const demoId = <T extends TableNames | "_storage">(
  table: T,
  key: string,
) => `demo:${table}:${key}` as Id<T>;

const DAY_MS = 86_400_000;

export const daysFromToday = (days: number): string =>
  new Date(today().getTime() + days * DAY_MS).toISOString().slice(0, 10);

export const msFromToday = (days: number): number =>
  today().getTime() + days * DAY_MS;

export type DemoStore<S> = {
  get: () => S;
  set: (next: S) => void;
  reset: () => void;
  subscribe: (listener: () => void) => () => void;
  getVersion: () => number;
};

// Initial state is built on first read so dates follow `today()` at that moment, not at import.
export function createDemoStore<S>(init: () => S): DemoStore<S> {
  let state: S | undefined;
  let version = 0;
  const listeners = new Set<() => void>();
  const get = () => (state ??= init());
  return {
    get,
    set(next) {
      state = next;
      version += 1;
      listeners.forEach((listener) => listener());
    },
    reset() {
      state = undefined;
      version += 1;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getVersion: () => version,
  };
}

export function useDemoQuery<S, T>(
  store: DemoStore<S>,
  select: (state: S) => T,
  args: unknown,
): QueryResult<T> {
  const version = useSyncExternalStore(store.subscribe, store.getVersion);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(id);
  }, []);
  const key = JSON.stringify(args ?? null);
  const data = useMemo(
    () => (ready ? select(store.get()) : undefined),
    // `select` is a fresh closure every render; `key` stands for its arguments.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, version, key, store],
  );
  return { data, isDemo: true, offline: !online };
}

export function useDemoMutation<S, A extends { actor: { role: DemoRole } }, R>(
  store: DemoStore<S>,
  run: (state: S, args: A) => { state: S; result: R },
): (args: ViewArgs<A>) => Promise<R> {
  const role = useDemoRole();
  return useCallback(
    (args) =>
      new Promise<R>((resolve) => {
        const out = run(store.get(), { actor: { role }, ...args } as A);
        store.set(out.state);
        resolve(out.result);
      }),
    // `run` is a module-level function in every caller (a test keeps it so).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [role, store],
  );
}

export function actorLabel(role: DemoRole): string {
  const labels: Record<DemoRole, string> = {
    supervisor: "Katarzyna Wiśniewska",
    employee: "Anna Przykładowa",
    hr: "Barbara Dąbrowska",
    director: "Ewa Kowalczyk",
    admin: "Łukasz Pawlak",
  };
  return labels[role];
}
