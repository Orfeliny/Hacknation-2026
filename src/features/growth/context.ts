import type { Id } from "../../../convex/_generated/dataModel";

export type IprzContext = {
  reviewId: Id<"reviews">;
  area: string;
};

const KEEP = ["ocena", "obszar"] as const;

export function contextFrom(params: URLSearchParams): IprzContext | undefined {
  const reviewId = params.get("ocena");
  const area = params.get("obszar");
  return reviewId && area
    ? { reviewId: reviewId as Id<"reviews">, area }
    : undefined;
}

// Links inside the view keep the `?ocena=&obszar=` context and drop the rest of the address state.
export function rozwojHref(
  params: URLSearchParams,
  extra: Record<string, string> = {},
): string {
  const next = new URLSearchParams();
  for (const key of KEEP) {
    const value = params.get(key);
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(extra)) next.set(key, value);
  const query = next.toString();
  return query ? `/rozwoj?${query}` : "/rozwoj";
}
