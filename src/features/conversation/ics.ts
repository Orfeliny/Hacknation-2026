import { buildIcs } from "../../../convex/mail/ics";
import { invitation } from "../../../convex/mail/templates";
import type { ConversationKind } from "./kinds";

export type IcsInput = {
  conversationId: string;
  authorId: string;
  employeeId: string;
  kind: ConversationKind;
  scheduledAt: number;
  durationMinutes: number;
  location?: string | undefined;
  icsUid?: string | undefined;
  icsSequence?: number | undefined;
  evaluator: { name: string };
  employee: { name: string; email?: string | undefined };
};

const fallbackEmail = (id: string) => `${id}@urzad.example`;

// Built in the browser from the saved appointment, so the file needs no network.
export function buildConversationIcs(input: IcsInput): string {
  const text = invitation({
    kind: input.kind,
    evaluatorName: input.evaluator.name,
    start: input.scheduledAt,
    location: input.location,
    rescheduled: (input.icsSequence ?? 0) > 0,
  });
  return buildIcs({
    uid: input.icsUid ?? `${input.conversationId}@asystent-ocen`,
    sequence: input.icsSequence ?? 0,
    start: input.scheduledAt,
    durationMinutes: input.durationMinutes,
    summary: text.subject,
    description: text.body,
    location: input.location,
    stamp: Date.now(),
    organizer: {
      name: input.evaluator.name,
      email: fallbackEmail(input.authorId),
    },
    attendee: {
      name: input.employee.name,
      email: input.employee.email ?? fallbackEmail(input.employeeId),
    },
  });
}

export function downloadIcs(filename: string, content: string): void {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const localIsoDate = (date: Date): string =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
