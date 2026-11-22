import { ConvexError } from "convex/values";
import { z } from "zod";
import { FORUM_LIMITS } from "../lib/contracts/forum";

const text = (label: string, empty: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label}: ${empty}.`)
    .max(max, `${label}: najwyżej ${max} znaków.`);

const threadInput = z.object({
  title: text("Tytuł", "wpisz tytuł", FORUM_LIMITS.title),
  body: text("Treść wątku", "wpisz treść", FORUM_LIMITS.body),
});

const replyInput = z.object({
  body: text("Odpowiedź", "wpisz treść", FORUM_LIMITS.reply),
});

function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ConvexError(
      result.error.issues.map((issue) => issue.message).join(" "),
    );
  }
  return result.data;
}

export const parseThreadInput = (value: { title: string; body: string }) =>
  parse(threadInput, value);

export const parseReplyInput = (value: { body: string }) =>
  parse(replyInput, value);

// Collapsed whitespace, cut to the contract's limit with an ellipsis.
export function excerptOf(body: string): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= FORUM_LIMITS.excerpt) return flat;
  let cut = flat.slice(0, FORUM_LIMITS.excerpt - 1);
  // Do not leave half of a surrogate pair (e.g. an emoji) at the cut.
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}
