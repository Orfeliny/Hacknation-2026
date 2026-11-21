/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_config from "../ai/config.js";
import type * as ai_index from "../ai/index.js";
import type * as ai_mock from "../ai/mock.js";
import type * as ai_openaiCompatible from "../ai/openaiCompatible.js";
import type * as ai_types from "../ai/types.js";
import type * as audit_tables from "../audit/tables.js";
import type * as competencies_tables from "../competencies/tables.js";
import type * as conversations_tables from "../conversations/tables.js";
import type * as crons from "../crons.js";
import type * as drafting_tables from "../drafting/tables.js";
import type * as employees_access from "../employees/access.js";
import type * as employees_mutations from "../employees/mutations.js";
import type * as employees_queries from "../employees/queries.js";
import type * as employees_seed from "../employees/seed.js";
import type * as employees_tables from "../employees/tables.js";
import type * as firstReview_tables from "../firstReview/tables.js";
import type * as hrDashboard_mutations from "../hrDashboard/mutations.js";
import type * as hrDashboard_notifications from "../hrDashboard/notifications.js";
import type * as hrDashboard_planner from "../hrDashboard/planner.js";
import type * as hrDashboard_queries from "../hrDashboard/queries.js";
import type * as hrDashboard_reminders from "../hrDashboard/reminders.js";
import type * as hrDashboard_tables from "../hrDashboard/tables.js";
import type * as hrPartner_tables from "../hrPartner/tables.js";
import type * as knowledge_tables from "../knowledge/tables.js";
import type * as lib_demoRole from "../lib/demoRole.js";
import type * as lib_validators from "../lib/validators.js";
import type * as mail_ics from "../mail/ics.js";
import type * as mail_mutations from "../mail/mutations.js";
import type * as mail_queries from "../mail/queries.js";
import type * as mail_queue from "../mail/queue.js";
import type * as mail_tables from "../mail/tables.js";
import type * as mail_templates from "../mail/templates.js";
import type * as me_tables from "../me/tables.js";
import type * as notes_actions from "../notes/actions.js";
import type * as notes_limits from "../notes/limits.js";
import type * as notes_mutations from "../notes/mutations.js";
import type * as notes_queries from "../notes/queries.js";
import type * as notes_seed from "../notes/seed.js";
import type * as notes_tables from "../notes/tables.js";
import type * as observations_tables from "../observations/tables.js";
import type * as regulationsWatch_tables from "../regulationsWatch/tables.js";
import type * as reviews_access from "../reviews/access.js";
import type * as reviews_context from "../reviews/context.js";
import type * as reviews_mutations from "../reviews/mutations.js";
import type * as reviews_queries from "../reviews/queries.js";
import type * as reviews_stages from "../reviews/stages.js";
import type * as reviews_tables from "../reviews/tables.js";
import type * as rules_assessment from "../rules/assessment.js";
import type * as rules_dates from "../rules/dates.js";
import type * as rules_deadlines from "../rules/deadlines.js";
import type * as rules_pack2016 from "../rules/pack2016.js";
import type * as rules_types from "../rules/types.js";
import type * as rules_validateReview from "../rules/validateReview.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/config": typeof ai_config;
  "ai/index": typeof ai_index;
  "ai/mock": typeof ai_mock;
  "ai/openaiCompatible": typeof ai_openaiCompatible;
  "ai/types": typeof ai_types;
  "audit/tables": typeof audit_tables;
  "competencies/tables": typeof competencies_tables;
  "conversations/tables": typeof conversations_tables;
  crons: typeof crons;
  "drafting/tables": typeof drafting_tables;
  "employees/access": typeof employees_access;
  "employees/mutations": typeof employees_mutations;
  "employees/queries": typeof employees_queries;
  "employees/seed": typeof employees_seed;
  "employees/tables": typeof employees_tables;
  "firstReview/tables": typeof firstReview_tables;
  "hrDashboard/mutations": typeof hrDashboard_mutations;
  "hrDashboard/notifications": typeof hrDashboard_notifications;
  "hrDashboard/planner": typeof hrDashboard_planner;
  "hrDashboard/queries": typeof hrDashboard_queries;
  "hrDashboard/reminders": typeof hrDashboard_reminders;
  "hrDashboard/tables": typeof hrDashboard_tables;
  "hrPartner/tables": typeof hrPartner_tables;
  "knowledge/tables": typeof knowledge_tables;
  "lib/demoRole": typeof lib_demoRole;
  "lib/validators": typeof lib_validators;
  "mail/ics": typeof mail_ics;
  "mail/mutations": typeof mail_mutations;
  "mail/queries": typeof mail_queries;
  "mail/queue": typeof mail_queue;
  "mail/tables": typeof mail_tables;
  "mail/templates": typeof mail_templates;
  "me/tables": typeof me_tables;
  "notes/actions": typeof notes_actions;
  "notes/limits": typeof notes_limits;
  "notes/mutations": typeof notes_mutations;
  "notes/queries": typeof notes_queries;
  "notes/seed": typeof notes_seed;
  "notes/tables": typeof notes_tables;
  "observations/tables": typeof observations_tables;
  "regulationsWatch/tables": typeof regulationsWatch_tables;
  "reviews/access": typeof reviews_access;
  "reviews/context": typeof reviews_context;
  "reviews/mutations": typeof reviews_mutations;
  "reviews/queries": typeof reviews_queries;
  "reviews/stages": typeof reviews_stages;
  "reviews/tables": typeof reviews_tables;
  "rules/assessment": typeof rules_assessment;
  "rules/dates": typeof rules_dates;
  "rules/deadlines": typeof rules_deadlines;
  "rules/pack2016": typeof rules_pack2016;
  "rules/types": typeof rules_types;
  "rules/validateReview": typeof rules_validateReview;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
