import { ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";
import {
  generateUploadUrlContract,
  getPreviewContract,
  listDocumentsContract,
  publishDocumentContract,
  registerDocumentContract,
  registerUrlContract,
  removeDocumentContract,
  withdrawDocumentContract,
} from "../lib/contracts/knowledgeDocs";

// Stubs: the team's B4 replaces the handlers. Signatures come from the contract.
export const list = query({
  ...listDocumentsContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const getPreview = query({
  ...getPreviewContract,
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

export const registerUrl = mutation({
  ...registerUrlContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const publish = mutation({
  ...publishDocumentContract,
  handler: () => {
    throw new ConvexError({ code: "NOT_IMPLEMENTED" });
  },
});

export const withdraw = mutation({
  ...withdrawDocumentContract,
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
