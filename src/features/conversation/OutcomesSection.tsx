import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import { formatDate, today } from "../../lib/format";
import { localIsoDate } from "./ics";
import { firstError, outcomesFormSchema } from "./schema";
import type { ConversationKind } from "./kinds";
import type { Actor, Conversation } from "./types";

export function OutcomesSection({
  conversation,
  actor,
  kind,
  reviewId,
}: {
  conversation: Conversation;
  actor: Actor;
  kind: ConversationKind;
  reviewId: string | undefined;
}) {
  const save = useMutation(api.conversations.mutations.saveOutcomes);
  const [heldOn, setHeldOn] = useState(
    conversation.heldOn ?? localIsoDate(today()),
  );
  const [outcomes, setOutcomes] = useState(conversation.outcomes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<
    { tone: "success" | "danger"; text: string } | undefined
  >();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus(undefined);
    const parsed = outcomesFormSchema(localIsoDate(today())).safeParse({
      heldOn,
      outcomes,
    });
    if (!parsed.success) {
      setErrors(firstError(parsed.error));
      return;
    }
    setErrors({});
    try {
      await save({
        actor,
        conversationId: conversation._id,
        heldOn: parsed.data.heldOn,
        outcomes: parsed.data.outcomes,
      });
      setStatus({
        tone: "success",
        text: `Zapisano: rozmowa odbyła się ${formatDate(parsed.data.heldOn)}.`,
      });
    } catch {
      setStatus({
        tone: "danger",
        text: "Nie udało się zapisać ustaleń. Spróbuj ponownie.",
      });
    }
  }

  return (
    <section aria-labelledby="h-zapis">
      <Card className="space-y-4">
        <h2 id="h-zapis" className="text-[22px] font-bold">
          Po rozmowie
        </h2>
        <p>
          <strong>Widzisz Ty i kadry.</strong> Pracownik nie widzi tych ustaleń.
        </p>
        <form
          onSubmit={(event) => void submit(event)}
          noValidate
          className="space-y-4"
        >
          <Field
            label="Ustalenia z rozmowy"
            hint="Wpisuj tylko sprawy zawodowe. Zapisują się przy tej rozmowie, nie w dzienniku obserwacji."
            error={errors.outcomes}
          >
            <Textarea
              rows={5}
              value={outcomes}
              onChange={(event) => setOutcomes(event.target.value)}
            />
          </Field>
          <div className="w-full max-w-48">
            <Field label="Data rozmowy" error={errors.heldOn}>
              <Input
                type="date"
                value={heldOn}
                onChange={(event) => setHeldOn(event.target.value)}
              />
            </Field>
          </div>
          <Button type="submit">Oznacz jako odbytą</Button>
        </form>
        {status ? (
          <StatusAlert tone={status.tone}>{status.text}</StatusAlert>
        ) : null}
        {kind === "evaluation" && reviewId ? (
          <p className="text-muted text-sm">
            Datę rozmowy oceniającej wpisz też w{" "}
            <Link to={`/oceny?ocena=${encodeURIComponent(reviewId)}`}>
              arkuszu oceny
            </Link>
            , bo od niej zależy przejście do etapu Sporządzenie.
          </p>
        ) : null}
      </Card>
    </section>
  );
}
