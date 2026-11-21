import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";

// tsconfig.app.json typechecks this file via _generated/api.d.ts; Node types there would hide browser-only bugs in src/.
declare const process: { env: Record<string, string | undefined> };

export type MailKind = Doc<"mailMessages">["kind"];

export type MailInput = {
  recipientId: Id<"employees">;
  kind: MailKind;
  subject: string;
  body: string;
  reviewId?: Id<"reviews">;
  conversationId?: Id<"conversations">;
  reminderId?: Id<"reminders">;
  ics?: string;
  dedupeKey?: string;
};

// MAIL_TRANSPORT=smtp leaves messages queued for an SMTP sender (needs a dependency PR); the
// default demo inbox delivers inside the app, so the demo needs no mail server.
export function transport(): "demo_inbox" | "smtp" {
  return process.env.MAIL_TRANSPORT === "smtp" ? "smtp" : "demo_inbox";
}

export async function enqueueMail(
  ctx: MutationCtx,
  input: MailInput,
): Promise<Id<"mailMessages"> | null> {
  if (input.dedupeKey) {
    const duplicate = await ctx.db
      .query("mailMessages")
      .withIndex("by_dedupeKey", (q) => q.eq("dedupeKey", input.dedupeKey))
      .first();
    if (duplicate) return null;
  }
  const channel = transport();
  const now = Date.now();
  return await ctx.db.insert("mailMessages", {
    ...input,
    channel,
    status: channel === "demo_inbox" ? "sent" : "queued",
    sentAt: channel === "demo_inbox" ? now : undefined,
    createdAt: now,
  });
}

// For other modules: `ctx.scheduler.runAfter(0, internal.mail.queue.enqueue, {...})`.
export const enqueue = internalMutation({
  args: {
    recipientId: v.id("employees"),
    kind: v.union(
      v.literal("cycle_started"),
      v.literal("meeting_invitation"),
      v.literal("reminder"),
      v.literal("deadline_notice"),
      v.literal("assessment_ready"),
      v.literal("review_changed"),
      v.literal("objection"),
      v.literal("promotion"),
      v.literal("other"),
    ),
    subject: v.string(),
    body: v.string(),
    reviewId: v.optional(v.id("reviews")),
    reminderId: v.optional(v.id("reminders")),
    dedupeKey: v.optional(v.string()),
  },
  handler: (ctx, args) => enqueueMail(ctx, args),
});
