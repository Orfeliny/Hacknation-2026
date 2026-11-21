import { ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";
import {
  generateUploadUrlContract,
  listDocumentsContract,
  registerDocumentContract,
  removeDocumentContract,
} from "../lib/contracts/knowledgeDocs";

// Stubs: the team's B4 replaces the handlers. Signatures come from the contract.
export const list = query({
  ...listDocumentsContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const generateUploadUrl = mutation({
  ...generateUploadUrlContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const register = mutation({
  ...registerDocumentContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const remove = mutation({
  ...removeDocumentContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});
