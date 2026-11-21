import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";
import { buildIcs } from "./ics";
import { enqueueMail } from "./queue";
import { invitation } from "./templates";

const fullName = (p: { firstName: string; lastName: string }) =>
  `${p.firstName} ${p.lastName}`;

const fallbackEmail = (id: string) => `${id}@urzad.example`;

// The evaluator sets the date of a conversation; the employee gets an invitation with an .ics
// file. A reschedule keeps the UID and bumps SEQUENCE, so calendars update the same event.
export const scheduleConversation = mutation({
  args: {
    actor: demoActor,
    conversationId: v.id("conversations"),
    scheduledAt: v.number(),
    durationMinutes: v.number(),
    location: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { actor, conversationId, scheduledAt, durationMinutes, location },
  ) => {
    const resolved = await resolveActor(ctx, actor);
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) throw new Error("Nie znaleziono rozmowy.");
    if (conversation.authorId !== resolved.employee?._id) {
      throw new Error(
        "Termin rozmowy ustala oceniający, który ją przygotowuje.",
      );
    }
    if (
      !Number.isFinite(scheduledAt) ||
      durationMinutes < 15 ||
      durationMinutes > 480
    ) {
      throw new Error("Podaj termin i czas trwania od 15 minut do 8 godzin.");
    }
    const evaluator = resolved.employee;
    const employee = await ctx.db.get(conversation.employeeId);
    if (!employee) throw new Error("Nie znaleziono pracownika.");

    const rescheduled = conversation.icsUid !== undefined;
    const uid = conversation.icsUid ?? `${conversationId}@asystent-ocen`;
    const sequence = rescheduled ? (conversation.icsSequence ?? 0) + 1 : 0;
    await ctx.db.patch(conversationId, {
      scheduledAt,
      durationMinutes,
      location,
      icsUid: uid,
      icsSequence: sequence,
      updatedAt: Date.now(),
    });

    const text = invitation({
      kind: conversation.kind,
      evaluatorName: fullName(evaluator),
      start: scheduledAt,
      location,
      rescheduled,
    });
    const ics = buildIcs({
      uid,
      sequence,
      start: scheduledAt,
      durationMinutes,
      summary: text.subject,
      description: text.body,
      location,
      stamp: Date.now(),
      organizer: {
        name: fullName(evaluator),
        email: evaluator.email ?? fallbackEmail(evaluator._id),
      },
      attendee: {
        name: fullName(employee),
        email: employee.email ?? fallbackEmail(employee._id),
      },
    });
    return await enqueueMail(ctx, {
      recipientId: employee._id,
      kind: "meeting_invitation",
      subject: text.subject,
      body: text.body,
      reviewId: conversation.reviewId,
      conversationId,
      ics,
      dedupeKey: `${uid}#${sequence}`,
    });
  },
});
