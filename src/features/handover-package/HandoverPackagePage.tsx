import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { RouteLink } from "../../app/index";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { formatDate } from "../../lib/format";
import { entryNoun } from "../handover/plan";

const TITLE = "Pakiet dla następcy";
const BACK = "/zmiana-oceniajacego";
const actor = { role: "supervisor" } as const;

type Outcome = { tone: "success" | "info" | "danger"; text: string };

const excerpt = (text: string) =>
  text.length > 70 ? `${text.slice(0, 70).trimEnd()}…` : text;

function BackLink() {
  return <RouteLink to={BACK}>Wróć do zmiany oceniającego</RouteLink>;
}

function Workspace({ employeeId }: { employeeId: string }) {
  const plan = useQuery(api.observations.queries.handoverPlan, { actor });
  const timeline = useQuery(api.observations.queries.timeline, {
    actor,
    employeeId: employeeId as Id<"employees">,
  });
  const handOver = useMutation(api.observations.mutations.handOver);
  const revoke = useMutation(api.observations.mutations.revokeHandover);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [outcome, setOutcome] = useState<Outcome>();
  const [busy, setBusy] = useState(false);

  if (plan === undefined || timeline === undefined) return <p>Ładowanie…</p>;
  const person = plan.find((p) => p.employeeId === employeeId);
  if (!person) {
    return (
      <div className="flex flex-col gap-4">
        <StatusAlert tone="info" live={false}>
          Nie ma pakietu dla tej osoby. Kadry nie wskazały jeszcze nowego
          oceniającego albo nie masz o niej wpisów.
        </StatusAlert>
        <BackLink />
      </div>
    );
  }

  const entries = timeline.filter((o) => o.mine);
  const fresh = !entries.some((o) => o.handover);
  const isChecked = (o: (typeof entries)[number]) =>
    overrides[o._id] ?? (fresh ? true : o.handover !== undefined);
  const checkedCount = entries.filter(isChecked).length;
  const toSend = entries.filter((o) => isChecked(o) && !o.handover);
  const toRevoke = entries.filter((o) => !isChecked(o) && o.handover);

  async function save() {
    if (!person) return;
    if (toSend.length === 0 && toRevoke.length === 0) {
      setOutcome({ tone: "info", text: "Nie ma zmian do zapisania." });
      return;
    }
    setBusy(true);
    try {
      if (toSend.length > 0) {
        await handOver({
          actor,
          toEvaluatorId: person.successorId,
          observationIds: toSend.map((o) => o._id),
        });
      }
      for (const o of toRevoke) {
        await revoke({ actor, observationId: o._id });
      }
      setOverrides({});
      setOutcome({
        tone: "success",
        text: `Zapisano pakiet. Przekazano ${toSend.length}, wycofano ${toRevoke.length}.`,
      });
    } catch (e) {
      setOutcome({
        tone: "danger",
        text: e instanceof Error ? e.message : "Nie udało się zapisać pakietu.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <PageHeader
        title={`${TITLE}: ${person.employeeName}`}
        description={`${person.position}. Zaznacz wpisy, które zobaczy ${person.successorName}. Odznaczone zostają tylko u Ciebie i w kadrach.`}
      />
      <div className="flex flex-wrap items-start gap-8">
        <section
          aria-labelledby="h-wpisy"
          className="flex min-w-0 flex-[999_1_30rem] flex-col gap-3"
        >
          <h2 id="h-wpisy" className="text-ink text-xl font-bold">
            Twoje obserwacje ({entries.length})
          </h2>
          {entries.length === 0 ? (
            <p className="text-muted">Nie masz wpisów o tej osobie.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {entries.map((o) => (
                <li key={o._id}>
                  <Card>
                    <label className="flex min-h-11 items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-2 size-5"
                        aria-label={`Przekaż wpis z ${formatDate(o.date)}: ${excerpt(o.text)}`}
                        checked={isChecked(o)}
                        onChange={(e) =>
                          setOverrides((c) => ({
                            ...c,
                            [o._id]: e.target.checked,
                          }))
                        }
                      />
                      <span>
                        <strong>{formatDate(o.date)}</strong>
                        {o.handover
                          ? ` · przekazany: ${o.sharedWithName ?? ""}`
                          : ""}
                        <span className="block">{o.text}</span>
                      </span>
                    </label>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside
          aria-label="Podsumowanie"
          className="flex min-w-0 flex-[1_1_18rem] flex-col gap-4"
        >
          <Card className="flex flex-col gap-3">
            <h2 className="text-ink font-semibold">Podsumowanie</h2>
            <p>
              Przekażesz {checkedCount} z {entries.length}{" "}
              {entryNoun(entries.length)} następcy: {person.successorName}.
            </p>
            <Button disabled={busy} onClick={() => void save()}>
              Zapisz pakiet
            </Button>
            {outcome ? (
              <StatusAlert tone={outcome.tone}>{outcome.text}</StatusAlert>
            ) : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Content() {
  const role = useDemoRole();
  const [params] = useSearchParams();
  const employeeId = params.get("pracownik");
  if (role !== "supervisor") {
    return (
      <Card>
        Pakiet dla następcy przygotowuje odchodzący przełożony. Wybierz rolę
        „Przełożony” w nagłówku.
      </Card>
    );
  }
  if (!employeeId) {
    return (
      <div className="flex flex-col gap-4">
        <StatusAlert tone="info" live={false}>
          Wybierz osobę na ekranie zmiany oceniającego.
        </StatusAlert>
        <BackLink />
      </div>
    );
  }
  return <Workspace employeeId={employeeId} />;
}

export function HandoverPackagePage() {
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
