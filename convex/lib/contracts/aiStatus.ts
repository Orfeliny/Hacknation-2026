import { v, type Infer } from "convex/values";

// B3 AI status. Backend: convex/aiStatus/queries.ts. Read-only: the UI never switches providers.
//
// Classification follows convex/ai/config.ts: `mock` is kind "mock" with model "mock";
// `openai-compatible` on a loopback or private host (`isPrivateHost`) is "local"; any other
// host is "external".

export const aiStatus = v.object({
  kind: v.union(v.literal("mock"), v.literal("local"), v.literal("external")),
  model: v.string(),
  // Hostname only, without scheme, path or credentials. Never a key.
  host: v.optional(v.string()),
});

// Access: public, every role and anonymous callers.
export const getAiStatusContract = {
  args: {},
  returns: aiStatus,
};

export type AiStatus = Infer<typeof aiStatus>;
