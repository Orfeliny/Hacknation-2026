import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import { buildIcs, escapeText, foldLine } from "./ics";
import { generic, invitation } from "./templates";

const modules = import.meta.glob("/convex/**/*.*s");

const START = Date.UTC(2027, 2, 10, 9, 0);

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const boss = await ctx.db.insert("employees", {
      firstName: "Katarzyna",
      lastName: "Wiśniewska",
      position: "Naczelnik",
      unit: "W",
      createdAt: 0,
      demoPersona: "supervisor",
      email: "k.wisniewska@urzad.example",
    });
    const anna = await ctx.db.insert("employees", {
      firstName: "Anna",
      lastName: "Przykładowa",
      position: "Główny specjalista",
      unit: "W",
      createdAt: 0,
      demoPersona: "employee",
      supervisorId: boss,
      email: "a.przykladowa@urzad.example",
    });
    const reviewId = await ctx.db.insert("reviews", {
      employeeId: anna,
      evaluatorId: boss,
      stage: "evaluation",
      createdAt: 0,
    });
    const conversationId = await ctx.db.insert("conversations", {
      employeeId: anna,
      authorId: boss,
      kind: "evaluation",
      createdAt: 0,
      reviewId,
    });
    return { boss, anna, reviewId, conversationId };
  });
  return { t, ...ids };
}

describe("ics", () => {
  const ics = buildIcs({
    uid: "c1@asystent-ocen",
    sequence: 0,
    start: START,
    durationMinutes: 60,
    summary: "Rozmowa oceniająca; pokój 12, II piętro",
    location: "Pokój 12",
    stamp: START - 86_400_000,
    organizer: { name: "Katarzyna Wiśniewska", email: "k@urzad.example" },
    attendee: { name: "Anna Przykładowa", email: "a@urzad.example" },
  });

  it("is a REQUEST with UTC times, CRLF line ends and a stable UID", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("METHOD:REQUEST\r\n");
    expect(ics).toContain("UID:c1@asystent-ocen\r\n");
    expect(ics).toContain("DTSTART:20270310T090000Z\r\n");
    expect(ics).toContain("DTEND:20270310T100000Z\r\n");
    expect(ics).toContain("SEQUENCE:0");
    expect(
      ics
        .split("\r\n")
        .every((line) => new TextEncoder().encode(line).length <= 75),
    ).toBe(true);
  });

  it("escapes separators and folds long lines with UTF-8 counted in bytes", () => {
    expect(ics.replace(/\r\n /g, "")).toContain(
      "SUMMARY:Rozmowa oceniająca\\; pokój 12\\, II piętro",
    );
    expect(escapeText("a\nb\\c")).toBe("a\\nb\\\\c");
    const folded = foldLine(`DESCRIPTION:${"ą".repeat(60)}`);
    expect(folded).toContain("\r\n ");
    expect(folded.replace(/\r\n /g, "")).toBe(`DESCRIPTION:${"ą".repeat(60)}`);
  });
});

describe("templates", () => {
  it("never carry review content, only what to do and when", () => {
    const text = invitation({
      kind: "evaluation",
      evaluatorName: "Katarzyna Wiśniewska",
      start: START,
      rescheduled: false,
    });
    expect(text.subject).toMatch(/^Zaproszenie: rozmowę oceniającą/);
    expect(text.body).toContain("10 marca 2027");
    expect(
      generic({
        subject: "Termin",
        action: "Uzupełnij ocenę.",
        dueDate: "2027-03-16",
      }).body,
    ).toContain("Termin: 2027-03-16.");
  });
});

describe("scheduleConversation", () => {
  it("sends the employee an invitation with an .ics into the demo inbox", async () => {
    const { t, conversationId } = await setup();
    await t.mutation(api.mail.mutations.scheduleConversation, {
      actor: { role: "supervisor" },
      conversationId,
      scheduledAt: START,
      durationMinutes: 60,
      location: "Pokój 12",
    });
    const inbox = await t.query(api.mail.queries.inbox, {
      actor: { role: "employee" },
    });
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({
      kind: "meeting_invitation",
      channel: "demo_inbox",
      status: "sent",
    });
    expect(inbox[0]?.ics).toContain("ATTENDEE;CN=Anna Przykładowa");
    expect(inbox[0]?.body).not.toMatch(/ocena cząstkowa|uzasadnienie/i);
  });

  it("updates the same calendar event on reschedule", async () => {
    const { t, conversationId } = await setup();
    const schedule = (scheduledAt: number) =>
      t.mutation(api.mail.mutations.scheduleConversation, {
        actor: { role: "supervisor" },
        conversationId,
        scheduledAt,
        durationMinutes: 45,
      });
    await schedule(START);
    await schedule(START + 86_400_000);
    const inbox = await t.query(api.mail.queries.inbox, {
      actor: { role: "employee" },
    });
    expect(inbox).toHaveLength(2);
    expect(inbox[0]?.subject).toMatch(/^Zmiana terminu/);
    expect(inbox[0]?.ics).toContain("SEQUENCE:1");
    const uids = inbox.map((m) => /UID:(.*)\r\n/.exec(m.ics ?? "")?.[1]);
    expect(new Set(uids).size).toBe(1);
    const ics = await t.query(api.mail.queries.conversationIcs, {
      actor: { role: "employee" },
      conversationId,
    });
    expect(ics).toContain("SEQUENCE:1");
  });

  it("lets only the conversation's author schedule it and rejects odd durations", async () => {
    const { t, conversationId } = await setup();
    await expect(
      t.mutation(api.mail.mutations.scheduleConversation, {
        actor: { role: "employee" },
        conversationId,
        scheduledAt: START,
        durationMinutes: 60,
      }),
    ).rejects.toThrow(/oceniający/);
    await expect(
      t.mutation(api.mail.mutations.scheduleConversation, {
        actor: { role: "supervisor" },
        conversationId,
        scheduledAt: START,
        durationMinutes: 5,
      }),
    ).rejects.toThrow(/czas trwania/);
  });
});

describe("enqueue", () => {
  it("drops a second message with the same dedupe key", async () => {
    const { t, anna } = await setup();
    const send = () =>
      t.mutation(internal.mail.queue.enqueue, {
        recipientId: anna,
        kind: "reminder",
        subject: "Termin oceny",
        body: "Uzupełnij ocenę.",
        dedupeKey: "rev-1#review#2027-03-16",
      });
    expect(await send()).not.toBeNull();
    expect(await send()).toBeNull();
  });
});
