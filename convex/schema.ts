import { defineSchema } from "convex/server";
import { auditTables } from "./audit/tables";
import { competenciesTables } from "./competencies/tables";
import { conversationsTables } from "./conversations/tables";
import { draftingTables } from "./drafting/tables";
import { employeesTables } from "./employees/tables";
import { firstReviewTables } from "./firstReview/tables";
import { growthTables } from "./growth/tables";
import { hrDashboardTables } from "./hrDashboard/tables";
import { hrPartnerTables } from "./hrPartner/tables";
import { knowledgeTables } from "./knowledge/tables";
import { mailTables } from "./mail/tables";
import { meTables } from "./me/tables";
import { notesTables } from "./notes/tables";
import { observationsTables } from "./observations/tables";
import { regulationsWatchTables } from "./regulationsWatch/tables";
import { reviewsTables } from "./reviews/tables";

export default defineSchema({
  ...notesTables,
  ...employeesTables,
  ...reviewsTables,
  ...observationsTables,
  ...meTables,
  ...conversationsTables,
  ...draftingTables,
  ...hrPartnerTables,
  ...hrDashboardTables,
  ...competenciesTables,
  ...knowledgeTables,
  ...firstReviewTables,
  ...auditTables,
  ...mailTables,
  ...regulationsWatchTables,
  ...growthTables,
});
