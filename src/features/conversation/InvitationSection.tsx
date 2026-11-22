import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { formatDateTime, today } from "../../lib/format";
import { buildConversationIcs, downloadIcs, localIsoDate } from "./ics";
import { firstError, scheduleFormSchema } from "./schema";
import {
  fullName,
  type Actor,
  type Conversation,
  type Employee,
} from "./types";

export function InvitationSection({
  employee,
  conversation,
  evaluator,
  actor,
}: {
  employee: Employee;
  conversation: Conversation;
  evaluator: { name: string; email: string } | undefined;
  actor: Actor;
}) {
  const schedule = useMutation(api.mail.mutations.scheduleConversation);
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState(
    String(conversation.durationMinutes ?? 60),
  );
  const [location, setLocation] = useState(conversation.location ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<
    { tone: "success" | "danger"; text: string } | undefined
  >();
  const scheduledAt = conversation.scheduledAt;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus(undefined);
    const parsed = scheduleFormSchema.safeParse({
      startsAt,
      durationMinutes: duration === "" ? Number.NaN : Number(duration),
      location,
    });
    if (!parsed.success) {
      setErrors(firstError(parsed.error));
      return;
    }
    const start = new Date(parsed.data.startsAt).getTime();
    if (start <= today().getTime()) {
      setErrors({ startsAt: "Termin rozmowy musi być w przyszłości." });
      return;
    }
    setErrors({});
    try {
      await schedule({
        actor,
        conversationId: conversation._id,
        scheduledAt: start,
        durationMinutes: parsed.data.durationMinutes,
        ...(parsed.data.location ? { location: parsed.data.location } : {}),
      });
      setStatus({
        tone: "success",
        text:
          scheduledAt === undefined
            ? "Zaproszenie zostało wysłane do pracownika."
            : "Zmieniono termin. Pracownik dostał nowe zaproszenie.",
      });
    } catch {
      setStatus({
        tone: "danger",
        text: "Nie udało się wysłać zaproszenia. Spróbuj ponownie.",
      });
    }
  }

  function download() {
    if (scheduledAt === undefined || !evaluator) return;
    const ics = buildConversationIcs({
      conversationId: conversation._id,
      employeeId: employee._id,
      kind: conversation.kind,
      scheduledAt,
      durationMinutes: conversation.durationMinutes ?? 60,
      location: conversation.location,
      icsUid: conversation.icsUid,
      icsSequence: conversation.icsSequence,
      evaluator,
      employee: { name: fullName(employee), email: employee.email },
    });
    downloadIcs(`rozmowa-${localIsoDate(new Date(scheduledAt))}.ics`, ics);
  }

  return (
    <section aria-labelledby="h-zaproszenie">
      <Card className="space-y-4">
        <h2 id="h-zaproszenie" className="text-[22px] font-bold">
          Zaproszenie na rozmowę
        </h2>
        {scheduledAt !== undefined ? (
          <p>
            Planowana rozmowa: {formatDateTime(scheduledAt)}
            {conversation.location ? `, ${conversation.location}` : ""}.
          </p>
        ) : (
          <p className="text-muted">
            Wyślij pracownikowi zaproszenie z plikiem .ics. Kalendarz doda
            termin sam.
          </p>
        )}
        <form
          onSubmit={(event) => void submit(event)}
          noValidate
          className="space-y-4"
        >
          <div className="flex flex-wrap gap-4">
            <Field label="Termin rozmowy" error={errors.startsAt}>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </Field>
            <Field label="Czas trwania (minuty)" error={errors.durationMinutes}>
              <Input
                type="number"
                inputMode="numeric"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              />
            </Field>
            <Field label="Miejsce (opcjonalnie)" error={errors.location}>
              <Input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              {scheduledAt !== undefined
                ? "Przełóż rozmowę"
                : "Wyślij zaproszenie"}
            </Button>
            {scheduledAt !== undefined ? (
              <Button variant="secondary" onClick={download}>
                Pobierz plik .ics
              </Button>
            ) : null}
          </div>
        </form>
        {status ? (
          <StatusAlert tone={status.tone}>{status.text}</StatusAlert>
        ) : null}
      </Card>
    </section>
  );
}
