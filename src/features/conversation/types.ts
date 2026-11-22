import type { Doc } from "../../../convex/_generated/dataModel";
import type { DemoRole } from "../../lib/demoRole";

export type Actor = { role: DemoRole };
export type Employee = Doc<"employees">;
export type Conversation = Doc<"conversations">;

export const fullName = (e: Pick<Employee, "firstName" | "lastName">) =>
  `${e.firstName} ${e.lastName}`;
