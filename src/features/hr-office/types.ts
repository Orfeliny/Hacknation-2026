import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";

export type BoardRow = FunctionReturnType<
  typeof api.hrDashboard.queries.statusBoard
>[number];
export type ObjectionRow = FunctionReturnType<
  typeof api.objections.queries.listForDirector
>[number];
export type Stats = FunctionReturnType<typeof api.hrDashboard.queries.stats>;
export type Reminder = FunctionReturnType<
  typeof api.hrDashboard.queries.myReminders
>[number];
