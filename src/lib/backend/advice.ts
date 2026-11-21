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

export const useAdviceList = online ? useDemoAdviceList : useDemoAdviceList;
export const useAdvice = online ? useDemoAdvice : useDemoAdvice;
