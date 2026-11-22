import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { formatDate } from "../../lib/format";
import { PersonCard } from "./PersonCard";
import {
  canSend,
  defaultChoice,
  groupBySuccessor,
  observationNoun,
  total,
  type Choice,
  type PersonPlan,
} from "./plan";

const TITLE = "Zmiana oceniającego i zgoda";

type Outcome = { tone: "success" | "info" | "danger"; text: string };

function Workspace() {
  const actor = { role: "supervisor" } as const;
  const plan = useQuery(api.observations.queries.handoverPlan, { actor });
  const handOver = useMutation(api.observations.mutations.handOver);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [excluded, setExcluded] = useState<Record<string, boolean>>({});
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>();
  const [busy, setBusy] = useState(false);

  if (plan === undefined) return <p>Ładowanie…</p>;
  if (plan.length === 0) {
    return (
      <StatusAlert tone="info" live={false}>
        Kadry nie wskazały jeszcze nowego oceniającego dla Twoich pracowników.
        Gdy to zrobią, zobaczysz tu osoby, których dotyczy zmiana, i zdecydujesz
        o przekazaniu obserwacji.
      </StatusAlert>
    );
  }

  const choiceOf = (p: PersonPlan): Choice =>
    choices[p.employeeId] ?? defaultChoice(p);
  const selected = plan.filter(
    (p) => canSend(p) && choiceOf(p) === "successor" && !excluded[p.employeeId],
  );
  const entryCount = selected.reduce((sum, p) => sum + total(p), 0);
  const groups = groupBySuccessor(selected);
  const successorNames = [...groups.values()].map((g) => g.name).join(", ");
  const successors = [...new Set(plan.map((p) => p.successorName))];
  const effective = plan
    .map((p) => p.effectiveFrom)
    .filter((d): d is string => d !== null)
    .sort()[0];

  async function save() {
    if (selected.length === 0) {
      setOutcome({
        tone: "info",
        text: "Nie ma nic do przekazania. Nic nie zostało zapisane.",
      });
      return;
    }
    if (!consent) {
      setConsentError(true);
      return;
    }
    setConsentError(false);
    setBusy(true);
    try {
      let sent = 0;
      for (const [toEvaluatorId, group] of groups) {
        sent += await handOver({
          actor,
          toEvaluatorId,
          observationIds: group.people.flatMap((p) => p.observationIds),
        });
      }
      setOutcome({
        tone: "success",
        text: `Zapisano zgodę. Przekazano ${sent} ${observationNoun(sent)} (${successorNames}).`,
      });
    } catch (e) {
      setOutcome({
        tone: "danger",
        text: e instanceof Error ? e.message : "Nie udało się zapisać decyzji.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={TITLE}
        description={
          <>
            Nowy oceniający: {successors.join(", ")}
            {effective ? `, od ${formatDate(effective)}` : ""}.
          </>
        }
      />
      <section aria-labelledby="h-osoby" className="flex flex-col gap-4">
        <div>
          <h2 id="h-osoby" className="text-ink text-xl font-bold">
            Co dzieje się z oceną każdej osoby
          </h2>
          <p className="text-muted">
            Jeśli nadzorowałeś pracownika co najmniej 6 miesięcy i spełnione są
            warunki z przepisu, możesz sporządzić ocenę przed odejściem. W
            przeciwnym razie następca oceni pracownika za cały okres.
          </p>
        </div>
        {plan.map((person) => (
          <PersonCard
            key={person.employeeId}
            person={person}
            choice={choiceOf(person)}
            include={!excluded[person.employeeId]}
            onChoice={(value) =>
              setChoices((c) => ({ ...c, [person.employeeId]: value }))
            }
            onInclude={(value) =>
              setExcluded((c) => ({ ...c, [person.employeeId]: !value }))
            }
          />
        ))}
      </section>
      <div className="flex flex-wrap items-start gap-8">
        <section
          aria-labelledby="h-zgoda"
          className="flex min-w-0 flex-[999_1_30rem] flex-col gap-4"
        >
          <h2 id="h-zgoda" className="text-ink text-xl font-bold">
            Twoja zgoda na przekazanie
          </h2>
          <p>
            <strong>
              Bez Twojej zgody następca nie dostanie żadnych wpisów.
            </strong>{" "}
            Kadry widzą je tak jak dotąd. Następca zobaczy tylko zaznaczone
            pakiety, a każdy wpis zachowa Twoje nazwisko i datę.
          </p>
          {selected.length > 0 ? (
            <div>
              <label className="flex min-h-11 items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-2 size-5"
                  checked={consent}
                  aria-invalid={consentError || undefined}
                  aria-describedby={consentError ? "zgoda-blad" : undefined}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  Zgadzam się przekazać zaznaczone obserwacje ({entryCount}{" "}
                  {entryCount === 1 ? "wpis" : "wpisów"}, {selected.length}{" "}
                  {selected.length === 1 ? "osoba" : "osób"}): {successorNames}
                </span>
              </label>
              {consentError ? (
                <p id="zgoda-blad" className="text-danger font-semibold">
                  Zaznacz zgodę, żeby przekazać obserwacje.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-muted">
              Nie ma obserwacji, które można tu przekazać.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy} onClick={() => void save()}>
              Zapisz decyzje
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setConsent(false);
                setConsentError(false);
                setOutcome({
                  tone: "info",
                  text: "Nic nie przekazano. Następca nie dostanie żadnych wpisów.",
                });
              }}
            >
              Nie przekazuj niczego
            </Button>
          </div>
          {outcome ? (
            <StatusAlert tone={outcome.tone}>{outcome.text}</StatusAlert>
          ) : null}
        </section>
        <aside
          aria-label="Co się stanie"
          className="flex min-w-0 flex-[1_1_18rem] flex-col gap-4"
        >
          <Card>
            <h3 className="text-ink font-semibold">Co zobaczy następca</h3>
            <p className="text-muted">
              Przekazane wpisy pojawią się w jego dzienniku obserwacji, z datą
              zgody. Oceniani nadal nie widzą obserwacji.
            </p>
          </Card>
          <Card>
            <h3 className="text-ink font-semibold">Co dostaną kadry</h3>
            <p className="text-muted">
              Kadry widzą wpisy jak dotąd i wiedzą, które oceny zamkniesz przed
              odejściem.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Content() {
  const role = useDemoRole();
  if (role !== "supervisor") {
    return (
      <Card>
        Zgodę na przekazanie obserwacji wyraża odchodzący przełożony. Wybierz
        rolę „Przełożony” w nagłówku.
      </Card>
    );
  }
  return <Workspace />;
}

export function HandoverPage() {
  const online = getEnv().convexUrl !== undefined;
  return (
    <>
      <title>{TITLE}</title>
      {online ? (
        <Content />
      ) : (
        <>
          <PageHeader title={TITLE} />
          <StatusAlert tone="info">
            Ten widok wymaga połączenia z backendem (tryb offline).
          </StatusAlert>
        </>
      )}
    </>
  );
}
