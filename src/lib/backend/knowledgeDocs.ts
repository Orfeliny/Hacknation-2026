import { useCallback } from "react";
import { api } from "../../../convex/_generated/api";
import type {
  askContract,
  generateUploadUrlContract,
  KnowledgeDocumentRow,
  listDocumentsContract,
  registerDocumentContract,
  removeDocumentContract,
} from "../../../convex/lib/contracts/knowledgeDocs";
import { useDemoRole } from "../demoRole";
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
import { useActorAction, useActorMutation, useActorQuery } from "./useLive";

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

const useDemoAskKnowledge = () => {
  const role = useDemoRole();
  return useCallback(
    (
      args: ViewArgs<ArgsOf<typeof askContract>>,
    ): Promise<ReturnsOf<typeof askContract>> =>
      Promise.resolve(ask(knowledgeStore.get(), { actor: { role }, ...args })),
    [role],
  );
};

const d = api.knowledge.documents;

const useLiveKnowledgeDocuments = (): QueryResult<
  ReturnsOf<typeof listDocumentsContract>
> => useActorQuery(d.list, {});

const useLiveGenerateUploadUrl = (): ((
  args: ViewArgs<ArgsOf<typeof generateUploadUrlContract>>,
) => Promise<ReturnsOf<typeof generateUploadUrlContract>>) =>
  useActorMutation(d.generateUploadUrl);

const useLiveRegisterDocument = (): ((
  args: ViewArgs<ArgsOf<typeof registerDocumentContract>>,
) => Promise<ReturnsOf<typeof registerDocumentContract>>) =>
  useActorMutation(d.register);

const useLiveRemoveDocument = (): ((
  args: ViewArgs<ArgsOf<typeof removeDocumentContract>>,
) => Promise<ReturnsOf<typeof removeDocumentContract>>) =>
  useActorMutation(d.remove);

const useLiveAskKnowledge = (): ((
  args: ViewArgs<ArgsOf<typeof askContract>>,
) => Promise<ReturnsOf<typeof askContract>>) =>
  useActorAction(api.knowledge.assistant.ask);

export const useKnowledgeDocuments = online
  ? useLiveKnowledgeDocuments
  : useDemoKnowledgeDocuments;
export const useGenerateUploadUrl = online
  ? useLiveGenerateUploadUrl
  : useDemoGenerateUploadUrl;
export const useRegisterDocument = online
  ? useLiveRegisterDocument
  : useDemoRegisterDocument;
export const useRemoveDocument = online
  ? useLiveRemoveDocument
  : useDemoRemoveDocument;
export const useAskKnowledge = online
  ? useLiveAskKnowledge
  : useDemoAskKnowledge;
