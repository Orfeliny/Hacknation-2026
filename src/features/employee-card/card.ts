import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";

export type CardData = NonNullable<
  FunctionReturnType<typeof api.employees.queries.card>
>;

export const fullName = (e: { firstName: string; lastName: string }) =>
  `${e.firstName} ${e.lastName}`;
