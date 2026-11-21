import type { Doc } from "../_generated/dataModel";

// Delivery of a reminder. #37 adds channels that queue e-mails; the default only marks it delivered
// in the app, so the demo works without a mail server.
export type NotificationChannel = {
  id: string;
  deliver(
    reminder: Pick<Doc<"reminders">, "recipientId" | "message" | "dueDate">,
  ): {
    delivered: boolean;
  };
};

export const inAppChannel: NotificationChannel = {
  id: "in_app",
  deliver: () => ({ delivered: true }),
};
