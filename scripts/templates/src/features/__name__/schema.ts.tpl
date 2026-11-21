import { z } from "zod";
import {
  MAX_ENTRY_LENGTH,
  MIN_ENTRY_LENGTH,
} from "../../../convex/__name__/limits";

export const entryFormSchema = z.object({
  text: z
    .string()
    .trim()
    .min(MIN_ENTRY_LENGTH, "Wpisz treść wpisu.")
    .max(
      MAX_ENTRY_LENGTH,
      `Wpis może mieć najwyżej ${MAX_ENTRY_LENGTH} znaków.`,
    ),
});

export type EntryForm = z.infer<typeof entryFormSchema>;
