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
import type * as drafting_tables from "../drafting/tables.js";
import type * as employees_tables from "../employees/tables.js";
import type * as firstReview_tables from "../firstReview/tables.js";
import type * as hrDashboard_tables from "../hrDashboard/tables.js";
import type * as hrPartner_tables from "../hrPartner/tables.js";
import type * as knowledge_tables from "../knowledge/tables.js";
import type * as lib_demoRole from "../lib/demoRole.js";
import type * as lib_validators from "../lib/validators.js";
import type * as mail_tables from "../mail/tables.js";
import type * as me_tables from "../me/tables.js";
import type * as notes_actions from "../notes/actions.js";
import type * as notes_limits from "../notes/limits.js";
import type * as notes_mutations from "../notes/mutations.js";
import type * as notes_queries from "../notes/queries.js";
import type * as notes_seed from "../notes/seed.js";
import type * as notes_tables from "../notes/tables.js";
import type * as observations_tables from "../observations/tables.js";
import type * as print_queries from "../print/queries.js";
import type * as regulationsWatch_tables from "../regulationsWatch/tables.js";
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
  "drafting/tables": typeof drafting_tables;
  "employees/tables": typeof employees_tables;
  "firstReview/tables": typeof firstReview_tables;
  "hrDashboard/tables": typeof hrDashboard_tables;
  "hrPartner/tables": typeof hrPartner_tables;
  "knowledge/tables": typeof knowledge_tables;
  "lib/demoRole": typeof lib_demoRole;
  "lib/validators": typeof lib_validators;
  "mail/tables": typeof mail_tables;
  "me/tables": typeof me_tables;
  "notes/actions": typeof notes_actions;
  "notes/limits": typeof notes_limits;
  "notes/mutations": typeof notes_mutations;
  "notes/queries": typeof notes_queries;
  "notes/seed": typeof notes_seed;
  "notes/tables": typeof notes_tables;
  "observations/tables": typeof observations_tables;
  "print/queries": typeof print_queries;
  "regulationsWatch/tables": typeof regulationsWatch_tables;
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
