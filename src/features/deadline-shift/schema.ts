import { z } from "zod";
import { SHIFT_LIMITS } from "../../../convex/lib/contracts/deadlineShift";

export type DecisionErrors = Partial<
  Record<"accepted" | "justification" | "newDate", string>
>;

export type DecisionInput = {
  accepted: "yes" | "no" | "";
  justification: string;
  newDate: string;
};

function decisionSchema(currentDueDate: string) {
  return z
    .object({
      accepted: z.enum(["yes", "no"], { error: "Wybierz rozstrzygnięcie." }),
      justification: z
        .string()
        .trim()
        .min(1, "Wpisz uzasadnienie, trafi do pisma.")
        .max(
          SHIFT_LIMITS.justification,
          `Uzasadnienie może mieć najwyżej ${SHIFT_LIMITS.justification} znaków.`,
        ),
      newDate: z.string(),
    })
    .superRefine((value, ctx) => {
      if (value.accepted !== "yes") return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value.newDate)) {
        ctx.addIssue({
          code: "custom",
          path: ["newDate"],
          message: "Podaj nowy termin.",
        });
      } else if (value.newDate <= currentDueDate) {
        ctx.addIssue({
          code: "custom",
          path: ["newDate"],
          message: "Nowy termin musi być późniejszy niż obecny.",
        });
      }
    });
}

export type DecisionResult =
  | { ok: true; accepted: boolean; justification: string; newDate?: string }
  | { ok: false; errors: DecisionErrors };

export function validateDecision(
  input: DecisionInput,
  currentDueDate: string,
): DecisionResult {
  const parsed = decisionSchema(currentDueDate).safeParse(input);
  if (!parsed.success) {
    const errors: DecisionErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof DecisionErrors;
      errors[key] ??= issue.message;
    }
    return { ok: false, errors };
  }
  const accepted = parsed.data.accepted === "yes";
  return {
    ok: true,
    accepted,
    justification: parsed.data.justification,
    ...(accepted ? { newDate: parsed.data.newDate } : {}),
  };
}
