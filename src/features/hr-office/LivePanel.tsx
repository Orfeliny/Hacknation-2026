import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useDemoRole } from "../../lib/demoRole";
import { formatDate } from "../../lib/format";
import { buildAttention } from "./attention";
import { AttentionTable } from "./AttentionTable";
import { RemindersPanel } from "./RemindersPanel";
import { StageDistribution } from "./StageDistribution";
import { StatsPanel } from "./StatsPanel";
import type { BoardRow, Reminder } from "./types";

function reminderText(row: BoardRow): string {
  return `Ocena okresowa: ${row.employee} jest po terminie (${formatDate(row.dueDate!)}).`;
}

function Workspace({ role }: { role: "hr" | "admin" }) {
  const actor = { role };
  const board = useQuery(api.hrDashboard.queries.statusBoard, { actor });
  const objections = useQuery(api.objections.queries.listForDirector, {
    actor,
  });
  const stats = useQuery(api.hrDashboard.queries.stats, { actor });
  const reminders = useQuery(api.hrDashboard.queries.myReminders, { actor });
  const sendManual = useMutation(api.hrDashboard.mutations.sendManual);
  const dismiss = useMutation(api.hrDashboard.mutations.dismiss);
  const [sent, setSent] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  if (!board || !objections || !stats || !reminders) {
    return <p>Ładowanie panelu kadr…</p>;
  }

  const items = buildAttention(board, objections);
  const pending = items.flatMap((i) =>
    i.kind === "overdue" && i.row.evaluator && !sent.has(i.row.reviewId)
      ? [i.row]
      : [],
  );

  async function remind(rows: readonly BoardRow[]) {
    setError(null);
    const done = new Set(sent);
    try {
      for (const row of rows) {
        await sendManual({
          actor,
          reviewId: row.reviewId,
          message: reminderText(row),
          dueDate: row.dueDate!,
        });
        done.add(row.reviewId);
      }
    } catch {
      setError("Nie udało się wysłać przypomnienia. Spróbuj ponownie.");
    }
    setSent(done);
  }

  async function dismissOne(reminder: Reminder) {
    setError(null);
    try {
      await dismiss({ actor, reminderId: reminder._id });
    } catch {
      setError("Nie udało się odrzucić przypomnienia.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted">
          W systemie jest {stats.total} ocen, w tym {stats.closed} zamkniętych.
        </p>
        <Button
          disabled={pending.length === 0}
          onClick={() => void remind(pending)}
        >
          {`Wyślij przypomnienia (${pending.length})`}
        </Button>
      </div>
      {error ? <StatusAlert tone="danger">{error}</StatusAlert> : null}
      {sent.size > 0 && !error ? (
        <StatusAlert tone="success">
          Wysłano przypomnienia do oceniających: {sent.size}.
        </StatusAlert>
      ) : null}
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-10">
        <div className="space-y-8">
          <section aria-labelledby="h-uwaga" className="space-y-3">
            <h2 id="h-uwaga" className="text-xl font-bold">
              Wymaga uwagi kadr
            </h2>
            <AttentionTable
              items={items}
              sent={sent}
              onRemind={(row) => void remind([row])}
            />
          </section>
          <StageDistribution
            board={board}
            objectionsAtDirector={objections.length}
          />
          <StatsPanel stats={stats} />
        </div>
        <aside aria-label="Powiadomienia i rozliczalność" className="space-y-8">
          <RemindersPanel
            reminders={reminders}
            onDismiss={(r) => void dismissOne(r)}
          />
          <Card>
            <h3 className="font-bold">Rozliczalność</h3>
            <p className="text-muted mt-1">
              Każdy wgląd, zmianę etapu, potwierdzenie zapoznania i eksport
              zapisujemy w dzienniku zdarzeń. Zapytania do AI trafiają do
              rejestru AI.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function LivePanel() {
  const role = useDemoRole();
  if (role !== "hr" && role !== "admin") {
    return (
      <Card>
        Ten widok jest dla roli „kadry”. Wybierz ją w nagłówku, żeby zobaczyć
        panel kadr.
      </Card>
    );
  }
  return <Workspace role={role} />;
}
