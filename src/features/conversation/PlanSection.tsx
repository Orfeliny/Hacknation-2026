import { useAction } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AiBadge, type AiMode } from "../../components/ui/AiBadge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import { useAiStatus } from "../../lib/backend/aiStatus";
import { criterionName, type ConversationKind } from "./kinds";
import type { Actor, Conversation } from "./types";

type SuggestedCriterion = { criterionId: string; reason: string };

export function PlanSection({
  conversation,
  actor,
  kind,
}: {
  conversation: Conversation;
  actor: Actor;
  kind: ConversationKind;
}) {
  const prepare = useAction(api.conversations.actions.prepare);
  const { data: ai } = useAiStatus();
  const mode: AiMode = ai === undefined ? "unknown" : ai.state;
  const [situation, setSituation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [suggested, setSuggested] = useState<SuggestedCriterion[]>([]);
  const [hidden, setHidden] = useState(false);
  const plan = conversation.plan;

  async function suggest() {
    setBusy(true);
    setError(undefined);
    setHidden(false);
    try {
      const result = await prepare({
        actor,
        conversationId: conversation._id,
        ...(situation.trim() ? { situation: situation.trim() } : {}),
      });
      if (result.ok) setSuggested(result.plan.suggestedCriteria ?? []);
      else setError(result.message);
    } catch {
      setError("AI jest niedostępne. Możesz napisać plan samodzielnie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="h-pytania">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="h-pytania" className="text-[22px] font-bold">
            Plan i pytania pomocnicze
          </h2>
          <AiBadge mode={mode} />
        </div>
        <p className="text-muted">
          Podpowiedź AI: tylko pytania i plan rozmowy, nigdy oceny. Pytania
          powstają z kryteriów arkusza i obserwacji, po pseudonimizacji.
        </p>
        <Field
          label="Co chcesz poruszyć (opcjonalnie)"
          hint="Krótko, bez danych osobowych. Trafia do AI po pseudonimizacji."
        >
          <Textarea
            rows={2}
            maxLength={2000}
            value={situation}
            onChange={(event) => setSituation(event.target.value)}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void suggest()} disabled={busy}>
            {busy ? "Przygotowuję pytania…" : "Podpowiedz pytania"}
          </Button>
          {plan ? (
            <Button
              variant="secondary"
              onClick={() => void suggest()}
              disabled={busy}
            >
              Pokaż inne pytania
            </Button>
          ) : null}
          {plan ? (
            <Button
              variant="ghost"
              aria-expanded={!hidden}
              onClick={() => setHidden((value) => !value)}
            >
              {hidden ? "Pokaż podpowiedzi" : "Ukryj podpowiedzi"}
            </Button>
          ) : null}
        </div>
        {error ? <StatusAlert tone="danger">{error}</StatusAlert> : null}
        {!plan && !error ? (
          <p className="text-muted">
            Nie ma jeszcze planu. Możesz poprosić AI o pytania albo przygotować
            rozmowę samodzielnie.
          </p>
        ) : null}
        {plan && !hidden ? (
          <div className="space-y-4">
            {plan.goal ? (
              <div>
                <h3 className="font-bold">Cel rozmowy</h3>
                <p>{plan.goal}</p>
              </div>
            ) : null}
            {plan.agenda?.length ? (
              <div>
                <h3 className="font-bold">Agenda</h3>
                <ol className="list-decimal space-y-1 pl-6">
                  {plan.agenda.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>
            ) : null}
            {plan.questions?.length ? (
              <div>
                <h3 className="font-bold">Pytania pomocnicze</h3>
                <ul className="list-disc space-y-2 pl-6">
                  {plan.questions.map((q) => (
                    <li key={`${q.criterionId ?? ""}:${q.text}`}>
                      {q.criterionId ? (
                        <span className="text-muted">
                          {criterionName(q.criterionId)}:{" "}
                        </span>
                      ) : null}
                      {q.text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {plan.tips?.length ? (
              <div>
                <h3 className="font-bold">Wskazówki</h3>
                <ul className="list-disc space-y-1 pl-6">
                  {plan.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {plan.difficultScenario ? (
              <div>
                <h3 className="font-bold">Trudny scenariusz</h3>
                <p>{plan.difficultScenario}</p>
              </div>
            ) : null}
            {kind === "opening" && suggested.length > 0 ? (
              <div>
                <h3 className="font-bold">Kryteria dodatkowe do rozważenia</h3>
                <ul className="list-disc space-y-1 pl-6">
                  {suggested.map((s) => (
                    <li key={s.criterionId}>
                      {criterionName(s.criterionId)}: {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-muted text-sm">
              Asystent nie proponuje ocen i nie ocenia odpowiedzi.
            </p>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
