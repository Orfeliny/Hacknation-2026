import { z } from "zod";
import { FORUM_LIMITS } from "../../../convex/lib/contracts/forum";
import { THREAD_KINDS } from "./labels";

export const threadFormSchema = z.object({
  kind: z.enum(THREAD_KINDS as [string, ...string[]], {
    error: "Wybierz rodzaj wątku.",
  }),
  title: z
    .string()
    .trim()
    .min(1, "Wpisz tytuł.")
    .max(
      FORUM_LIMITS.title,
      `Tytuł może mieć najwyżej ${FORUM_LIMITS.title} znaków.`,
    ),
  body: z
    .string()
    .trim()
    .min(1, "Wpisz treść wątku.")
    .max(
      FORUM_LIMITS.body,
      `Treść może mieć najwyżej ${FORUM_LIMITS.body} znaków.`,
    ),
  criterionId: z.string().optional(),
});

export const replyFormSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Wpisz treść odpowiedzi.")
    .max(
      FORUM_LIMITS.reply,
      `Odpowiedź może mieć najwyżej ${FORUM_LIMITS.reply} znaków.`,
    ),
});

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Sprawdź formularz.";
}
