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
import type * as ai_guardrails from "../ai/guardrails.js";
import type * as ai_index from "../ai/index.js";
import type * as ai_mock from "../ai/mock.js";
import type * as ai_openaiCompatible from "../ai/openaiCompatible.js";
import type * as ai_types from "../ai/types.js";
import type * as aiStatus_classify from "../aiStatus/classify.js";
import type * as aiStatus_queries from "../aiStatus/queries.js";
import type * as audit_access from "../audit/access.js";
import type * as audit_limits from "../audit/limits.js";
import type * as audit_log from "../audit/log.js";
import type * as audit_mutations from "../audit/mutations.js";
import type * as audit_queries from "../audit/queries.js";
import type * as audit_tables from "../audit/tables.js";
import type * as competencies_tables from "../competencies/tables.js";
import type * as conversations_access from "../conversations/access.js";
import type * as conversations_actions from "../conversations/actions.js";
import type * as conversations_mutations from "../conversations/mutations.js";
import type * as conversations_prompt from "../conversations/prompt.js";
import type * as conversations_queries from "../conversations/queries.js";
import type * as conversations_tables from "../conversations/tables.js";
import type * as crons from "../crons.js";
import type * as deadlineShift_mutations from "../deadlineShift/mutations.js";
import type * as deadlineShift_queries from "../deadlineShift/queries.js";
import type * as deadlineShift_shared from "../deadlineShift/shared.js";
import type * as drafting_access from "../drafting/access.js";
import type * as drafting_actions from "../drafting/actions.js";
import type * as drafting_errors from "../drafting/errors.js";
import type * as drafting_fragments from "../drafting/fragments.js";
import type * as drafting_kinds from "../drafting/kinds.js";
import type * as drafting_limits from "../drafting/limits.js";
import type * as drafting_mutations from "../drafting/mutations.js";
import type * as drafting_prompts from "../drafting/prompts.js";
import type * as drafting_queries from "../drafting/queries.js";
import type * as drafting_rules from "../drafting/rules.js";
import type * as drafting_tables from "../drafting/tables.js";
import type * as employees_access from "../employees/access.js";
import type * as employees_mutations from "../employees/mutations.js";
import type * as employees_queries from "../employees/queries.js";
import type * as employees_seed from "../employees/seed.js";
import type * as employees_tables from "../employees/tables.js";
import type * as firstReview_access from "../firstReview/access.js";
import type * as firstReview_flow from "../firstReview/flow.js";
import type * as firstReview_mutations from "../firstReview/mutations.js";
import type * as firstReview_queries from "../firstReview/queries.js";
import type * as firstReview_rules from "../firstReview/rules.js";
import type * as firstReview_tables from "../firstReview/tables.js";
import type * as forum_access from "../forum/access.js";
import type * as forum_moderation from "../forum/moderation.js";
import type * as forum_moderationAccess from "../forum/moderationAccess.js";
import type * as forum_mutations from "../forum/mutations.js";
import type * as forum_queries from "../forum/queries.js";
import type * as forum_seed from "../forum/seed.js";
import type * as forum_seedData from "../forum/seedData.js";
import type * as forum_tables from "../forum/tables.js";
import type * as forum_validation from "../forum/validation.js";
import type * as growth_admin from "../growth/admin.js";
import type * as growth_adminValidation from "../growth/adminValidation.js";
import type * as growth_advice from "../growth/advice.js";
import type * as growth_adviceSeed from "../growth/adviceSeed.js";
import type * as growth_adviceSeedData from "../growth/adviceSeedData.js";
import type * as growth_constants from "../growth/constants.js";
import type * as growth_options from "../growth/options.js";
import type * as growth_optionsSearch from "../growth/optionsSearch.js";
import type * as growth_optionsSeedData from "../growth/optionsSeedData.js";
import type * as growth_rankOptions from "../growth/rankOptions.js";
import type * as growth_seed from "../growth/seed.js";
import type * as growth_suggest from "../growth/suggest.js";
import type * as growth_suggestCore from "../growth/suggestCore.js";
import type * as growth_tables from "../growth/tables.js";
import type * as hrDashboard_mutations from "../hrDashboard/mutations.js";
import type * as hrDashboard_notifications from "../hrDashboard/notifications.js";
import type * as hrDashboard_planner from "../hrDashboard/planner.js";
import type * as hrDashboard_queries from "../hrDashboard/queries.js";
import type * as hrDashboard_reminders from "../hrDashboard/reminders.js";
import type * as hrDashboard_tables from "../hrDashboard/tables.js";
import type * as hrPartner_access from "../hrPartner/access.js";
import type * as hrPartner_actions from "../hrPartner/actions.js";
import type * as hrPartner_errors from "../hrPartner/errors.js";
import type * as hrPartner_kinds from "../hrPartner/kinds.js";
import type * as hrPartner_limits from "../hrPartner/limits.js";
import type * as hrPartner_mutations from "../hrPartner/mutations.js";
import type * as hrPartner_prompts from "../hrPartner/prompts.js";
import type * as hrPartner_queries from "../hrPartner/queries.js";
import type * as hrPartner_rules from "../hrPartner/rules.js";
import type * as hrPartner_seed from "../hrPartner/seed.js";
import type * as hrPartner_signals from "../hrPartner/signals.js";
import type * as hrPartner_tables from "../hrPartner/tables.js";
import type * as hrPartner_time from "../hrPartner/time.js";
import type * as knowledge_assistant from "../knowledge/assistant.js";
import type * as knowledge_chunk from "../knowledge/chunk.js";
import type * as knowledge_convert from "../knowledge/convert.js";
import type * as knowledge_documents from "../knowledge/documents.js";
import type * as knowledge_fetchSource from "../knowledge/fetchSource.js";
import type * as knowledge_hash from "../knowledge/hash.js";
import type * as knowledge_indexing from "../knowledge/indexing.js";
import type * as knowledge_ingest from "../knowledge/ingest.js";
import type * as knowledge_pageContent from "../knowledge/pageContent.js";
import type * as knowledge_parse from "../knowledge/parse.js";
import type * as knowledge_seed from "../knowledge/seed.js";
import type * as knowledge_sources from "../knowledge/sources.js";
import type * as knowledge_tables from "../knowledge/tables.js";
import type * as knowledge_urlSafety from "../knowledge/urlSafety.js";
import type * as knowledge_validation from "../knowledge/validation.js";
import type * as lib_contracts_advice from "../lib/contracts/advice.js";
import type * as lib_contracts_deadlineShift from "../lib/contracts/deadlineShift.js";
import type * as lib_contracts_forum from "../lib/contracts/forum.js";
import type * as lib_contracts_knowledgeDocs from "../lib/contracts/knowledgeDocs.js";
import type * as lib_demoRole from "../lib/demoRole.js";
import type * as lib_validators from "../lib/validators.js";
import type * as mail_ics from "../mail/ics.js";
import type * as mail_mutations from "../mail/mutations.js";
import type * as mail_queries from "../mail/queries.js";
import type * as mail_queue from "../mail/queue.js";
import type * as mail_tables from "../mail/tables.js";
import type * as mail_templates from "../mail/templates.js";
import type * as me_access from "../me/access.js";
import type * as me_limits from "../me/limits.js";
import type * as me_mutations from "../me/mutations.js";
import type * as me_queries from "../me/queries.js";
import type * as me_tables from "../me/tables.js";
import type * as notes_actions from "../notes/actions.js";
import type * as notes_limits from "../notes/limits.js";
import type * as notes_mutations from "../notes/mutations.js";
import type * as notes_queries from "../notes/queries.js";
import type * as notes_seed from "../notes/seed.js";
import type * as notes_tables from "../notes/tables.js";
import type * as objections_limits from "../objections/limits.js";
import type * as objections_mutations from "../objections/mutations.js";
import type * as objections_queries from "../objections/queries.js";
import type * as objections_rules from "../objections/rules.js";
import type * as observations_access from "../observations/access.js";
import type * as observations_limits from "../observations/limits.js";
import type * as observations_mutations from "../observations/mutations.js";
import type * as observations_queries from "../observations/queries.js";
import type * as observations_seed from "../observations/seed.js";
import type * as observations_tables from "../observations/tables.js";
import type * as print_queries from "../print/queries.js";
import type * as regulationsWatch_tables from "../regulationsWatch/tables.js";
import type * as reviews_access from "../reviews/access.js";
import type * as reviews_context from "../reviews/context.js";
import type * as reviews_mutations from "../reviews/mutations.js";
import type * as reviews_queries from "../reviews/queries.js";
import type * as reviews_signing from "../reviews/signing.js";
import type * as reviews_stages from "../reviews/stages.js";
import type * as reviews_tables from "../reviews/tables.js";
import type * as rules_assessment from "../rules/assessment.js";
import type * as rules_dates from "../rules/dates.js";
import type * as rules_deadlines from "../rules/deadlines.js";
import type * as rules_pack2016 from "../rules/pack2016.js";
import type * as rules_types from "../rules/types.js";
import type * as rules_validateReview from "../rules/validateReview.js";
import type * as signatures_access from "../signatures/access.js";
import type * as signatures_actions from "../signatures/actions.js";
import type * as signatures_mutations from "../signatures/mutations.js";
import type * as signatures_pades from "../signatures/pades.js";
import type * as signatures_queries from "../signatures/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/config": typeof ai_config;
  "ai/guardrails": typeof ai_guardrails;
  "ai/index": typeof ai_index;
  "ai/mock": typeof ai_mock;
  "ai/openaiCompatible": typeof ai_openaiCompatible;
  "ai/types": typeof ai_types;
  "aiStatus/classify": typeof aiStatus_classify;
  "aiStatus/queries": typeof aiStatus_queries;
  "audit/access": typeof audit_access;
  "audit/limits": typeof audit_limits;
  "audit/log": typeof audit_log;
  "audit/mutations": typeof audit_mutations;
  "audit/queries": typeof audit_queries;
  "audit/tables": typeof audit_tables;
  "competencies/tables": typeof competencies_tables;
  "conversations/access": typeof conversations_access;
  "conversations/actions": typeof conversations_actions;
  "conversations/mutations": typeof conversations_mutations;
  "conversations/prompt": typeof conversations_prompt;
  "conversations/queries": typeof conversations_queries;
  "conversations/tables": typeof conversations_tables;
  crons: typeof crons;
  "deadlineShift/mutations": typeof deadlineShift_mutations;
  "deadlineShift/queries": typeof deadlineShift_queries;
  "deadlineShift/shared": typeof deadlineShift_shared;
  "drafting/access": typeof drafting_access;
  "drafting/actions": typeof drafting_actions;
  "drafting/errors": typeof drafting_errors;
  "drafting/fragments": typeof drafting_fragments;
  "drafting/kinds": typeof drafting_kinds;
  "drafting/limits": typeof drafting_limits;
  "drafting/mutations": typeof drafting_mutations;
  "drafting/prompts": typeof drafting_prompts;
  "drafting/queries": typeof drafting_queries;
  "drafting/rules": typeof drafting_rules;
  "drafting/tables": typeof drafting_tables;
  "employees/access": typeof employees_access;
  "employees/mutations": typeof employees_mutations;
  "employees/queries": typeof employees_queries;
  "employees/seed": typeof employees_seed;
  "employees/tables": typeof employees_tables;
  "firstReview/access": typeof firstReview_access;
  "firstReview/flow": typeof firstReview_flow;
  "firstReview/mutations": typeof firstReview_mutations;
  "firstReview/queries": typeof firstReview_queries;
  "firstReview/rules": typeof firstReview_rules;
  "firstReview/tables": typeof firstReview_tables;
  "forum/access": typeof forum_access;
  "forum/moderation": typeof forum_moderation;
  "forum/moderationAccess": typeof forum_moderationAccess;
  "forum/mutations": typeof forum_mutations;
  "forum/queries": typeof forum_queries;
  "forum/seed": typeof forum_seed;
  "forum/seedData": typeof forum_seedData;
  "forum/tables": typeof forum_tables;
  "forum/validation": typeof forum_validation;
  "growth/admin": typeof growth_admin;
  "growth/adminValidation": typeof growth_adminValidation;
  "growth/advice": typeof growth_advice;
  "growth/adviceSeed": typeof growth_adviceSeed;
  "growth/adviceSeedData": typeof growth_adviceSeedData;
  "growth/constants": typeof growth_constants;
  "growth/options": typeof growth_options;
  "growth/optionsSearch": typeof growth_optionsSearch;
  "growth/optionsSeedData": typeof growth_optionsSeedData;
  "growth/rankOptions": typeof growth_rankOptions;
  "growth/seed": typeof growth_seed;
  "growth/suggest": typeof growth_suggest;
  "growth/suggestCore": typeof growth_suggestCore;
  "growth/tables": typeof growth_tables;
  "hrDashboard/mutations": typeof hrDashboard_mutations;
  "hrDashboard/notifications": typeof hrDashboard_notifications;
  "hrDashboard/planner": typeof hrDashboard_planner;
  "hrDashboard/queries": typeof hrDashboard_queries;
  "hrDashboard/reminders": typeof hrDashboard_reminders;
  "hrDashboard/tables": typeof hrDashboard_tables;
  "hrPartner/access": typeof hrPartner_access;
  "hrPartner/actions": typeof hrPartner_actions;
  "hrPartner/errors": typeof hrPartner_errors;
  "hrPartner/kinds": typeof hrPartner_kinds;
  "hrPartner/limits": typeof hrPartner_limits;
  "hrPartner/mutations": typeof hrPartner_mutations;
  "hrPartner/prompts": typeof hrPartner_prompts;
  "hrPartner/queries": typeof hrPartner_queries;
  "hrPartner/rules": typeof hrPartner_rules;
  "hrPartner/seed": typeof hrPartner_seed;
  "hrPartner/signals": typeof hrPartner_signals;
  "hrPartner/tables": typeof hrPartner_tables;
  "hrPartner/time": typeof hrPartner_time;
  "knowledge/assistant": typeof knowledge_assistant;
  "knowledge/chunk": typeof knowledge_chunk;
  "knowledge/convert": typeof knowledge_convert;
  "knowledge/documents": typeof knowledge_documents;
  "knowledge/fetchSource": typeof knowledge_fetchSource;
  "knowledge/hash": typeof knowledge_hash;
  "knowledge/indexing": typeof knowledge_indexing;
  "knowledge/ingest": typeof knowledge_ingest;
  "knowledge/pageContent": typeof knowledge_pageContent;
  "knowledge/parse": typeof knowledge_parse;
  "knowledge/seed": typeof knowledge_seed;
  "knowledge/sources": typeof knowledge_sources;
  "knowledge/tables": typeof knowledge_tables;
  "knowledge/urlSafety": typeof knowledge_urlSafety;
  "knowledge/validation": typeof knowledge_validation;
  "lib/contracts/advice": typeof lib_contracts_advice;
  "lib/contracts/deadlineShift": typeof lib_contracts_deadlineShift;
  "lib/contracts/forum": typeof lib_contracts_forum;
  "lib/contracts/knowledgeDocs": typeof lib_contracts_knowledgeDocs;
  "lib/demoRole": typeof lib_demoRole;
  "lib/validators": typeof lib_validators;
  "mail/ics": typeof mail_ics;
  "mail/mutations": typeof mail_mutations;
  "mail/queries": typeof mail_queries;
  "mail/queue": typeof mail_queue;
  "mail/tables": typeof mail_tables;
  "mail/templates": typeof mail_templates;
  "me/access": typeof me_access;
  "me/limits": typeof me_limits;
  "me/mutations": typeof me_mutations;
  "me/queries": typeof me_queries;
  "me/tables": typeof me_tables;
  "notes/actions": typeof notes_actions;
  "notes/limits": typeof notes_limits;
  "notes/mutations": typeof notes_mutations;
  "notes/queries": typeof notes_queries;
  "notes/seed": typeof notes_seed;
  "notes/tables": typeof notes_tables;
  "objections/limits": typeof objections_limits;
  "objections/mutations": typeof objections_mutations;
  "objections/queries": typeof objections_queries;
  "objections/rules": typeof objections_rules;
  "observations/access": typeof observations_access;
  "observations/limits": typeof observations_limits;
  "observations/mutations": typeof observations_mutations;
  "observations/queries": typeof observations_queries;
  "observations/seed": typeof observations_seed;
  "observations/tables": typeof observations_tables;
  "print/queries": typeof print_queries;
  "regulationsWatch/tables": typeof regulationsWatch_tables;
  "reviews/access": typeof reviews_access;
  "reviews/context": typeof reviews_context;
  "reviews/mutations": typeof reviews_mutations;
  "reviews/queries": typeof reviews_queries;
  "reviews/signing": typeof reviews_signing;
  "reviews/stages": typeof reviews_stages;
  "reviews/tables": typeof reviews_tables;
  "rules/assessment": typeof rules_assessment;
  "rules/dates": typeof rules_dates;
  "rules/deadlines": typeof rules_deadlines;
  "rules/pack2016": typeof rules_pack2016;
  "rules/types": typeof rules_types;
  "rules/validateReview": typeof rules_validateReview;
  "signatures/access": typeof signatures_access;
  "signatures/actions": typeof signatures_actions;
  "signatures/mutations": typeof signatures_mutations;
  "signatures/pades": typeof signatures_pades;
  "signatures/queries": typeof signatures_queries;
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
