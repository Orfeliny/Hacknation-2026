import { api } from "../../../convex/_generated/api";
import type {
  getAdviceContract,
  listAdviceContract,
} from "../../../convex/lib/contracts/advice";
import { adviceStore, listAdvice } from "./demo/advice";
import {
  online,
  useDemoQuery,
  type ArgsOf,
  type QueryResult,
  type ReturnsOf,
} from "./useDemo";
import { useLiveQuery } from "./useLive";

type ListArgs = ArgsOf<typeof listAdviceContract>;
type GetArgs = ArgsOf<typeof getAdviceContract>;

function useDemoAdviceList(
  args: ListArgs = {},
): QueryResult<ReturnsOf<typeof listAdviceContract>> {
  return useDemoQuery(
    adviceStore,
    (articles) => listAdvice(articles, args),
    args,
  );
}

function useDemoAdvice(
  args: GetArgs,
): QueryResult<ReturnsOf<typeof getAdviceContract>> {
  return useDemoQuery(
    adviceStore,
    (articles) => articles.find((a) => a.slug === args.slug) ?? null,
    args,
  );
}

const useLiveAdviceList = (
  args: ListArgs = {},
): QueryResult<ReturnsOf<typeof listAdviceContract>> =>
  useLiveQuery(api.growth.advice.listAdvice, args);

const useLiveAdvice = (
  args: GetArgs,
): QueryResult<ReturnsOf<typeof getAdviceContract>> =>
  useLiveQuery(api.growth.advice.getAdvice, args);

export const useAdviceList = online ? useLiveAdviceList : useDemoAdviceList;
export const useAdvice = online ? useLiveAdvice : useDemoAdvice;
