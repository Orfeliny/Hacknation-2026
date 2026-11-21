// Messages say what to do, by when and where to look; never the content of a review,
// because e-mails get forwarded and read on phones.

const KIND_LABEL = {
  opening: "rozmowę rozpoczynającą ocenę okresową",
  evaluation: "rozmowę oceniającą",
  feedback: "rozmowę informacji zwrotnej",
} as const;

export type ConversationKind = keyof typeof KIND_LABEL;

const when = (ms: number) =>
  new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(new Date(ms));

export function invitation(input: {
  kind: ConversationKind;
  evaluatorName: string;
  start: number;
  location?: string;
  rescheduled: boolean;
}) {
  const label = KIND_LABEL[input.kind];
  const subject = `${input.rescheduled ? "Zmiana terminu: " : "Zaproszenie: "}${label}, ${when(input.start)}`;
  const body = [
    `${input.evaluatorName} zaprasza Cię na ${label}.`,
    `Termin: ${when(input.start)}${input.location ? `, miejsce: ${input.location}` : ""}.`,
    "Szczegóły znajdziesz w aplikacji. Zaproszenie możesz dodać do kalendarza z załącznika.",
  ].join("\n");
  return { subject, body };
}

export function generic(input: {
  subject: string;
  action: string;
  dueDate?: string;
}) {
  return {
    subject: input.subject,
    body: [
      input.action,
      input.dueDate ? `Termin: ${input.dueDate}.` : null,
      "Szczegóły znajdziesz w aplikacji.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
