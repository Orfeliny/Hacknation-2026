import { useCallback } from "react";
import type {
  askContract,
  generateUploadUrlContract,
  KnowledgeDocumentRow,
  listDocumentsContract,
  registerDocumentContract,
  removeDocumentContract,
} from "../../../convex/lib/contracts/knowledgeDocs";
import {
  ask,
  knowledgeStore,
  nextUploadUrl,
  registerDocument,
  removeDocument,
} from "./demo/knowledgeDocs";
import {
  online,
  useDemoMutation,
  useDemoQuery,
  type ArgsOf,
  type QueryResult,
  type ReturnsOf,
  type ViewArgs,
} from "./useDemo";

function useDemoKnowledgeDocuments(): QueryResult<
  ReturnsOf<typeof listDocumentsContract>
> {
  return useDemoQuery(knowledgeStore, (rows) => rows, null);
}

const useDemoGenerateUploadUrl = () =>
  useCallback<
    (
      args: ViewArgs<ArgsOf<typeof generateUploadUrlContract>>,
    ) => Promise<ReturnsOf<typeof generateUploadUrlContract>>
  >(() => Promise.resolve(nextUploadUrl()), []);

const useDemoRegisterDocument = () =>
  useDemoMutation<
    KnowledgeDocumentRow[],
    ArgsOf<typeof registerDocumentContract>,
    ReturnsOf<typeof registerDocumentContract>
  >(knowledgeStore, registerDocument);

const useDemoRemoveDocument = () =>
  useDemoMutation<
    KnowledgeDocumentRow[],
    ArgsOf<typeof removeDocumentContract>,
    ReturnsOf<typeof removeDocumentContract>
  >(knowledgeStore, removeDocument);

const useDemoAskKnowledge = () =>
  useCallback(
    (
      args: ViewArgs<ArgsOf<typeof askContract>>,
    ): Promise<ReturnsOf<typeof askContract>> =>
      Promise.resolve(
        ask(knowledgeStore.get(), { actor: { role: "supervisor" }, ...args }),
      ),
    [],
  );

export const useKnowledgeDocuments = online
  ? useDemoKnowledgeDocuments
  : useDemoKnowledgeDocuments;
export const useGenerateUploadUrl = online
  ? useDemoGenerateUploadUrl
  : useDemoGenerateUploadUrl;
export const useRegisterDocument = online
  ? useDemoRegisterDocument
  : useDemoRegisterDocument;
export const useRemoveDocument = online
  ? useDemoRemoveDocument
  : useDemoRemoveDocument;
export const useAskKnowledge = online
  ? useDemoAskKnowledge
  : useDemoAskKnowledge;
