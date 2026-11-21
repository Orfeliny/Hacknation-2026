import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Card } from "../../components/ui/Card";
import { DEMO_ROLES, useDemoRole } from "../../lib/demoRole";
import { ACTION_LABEL } from "./labels";

const roleLabel = (role: string) =>
  DEMO_ROLES.find((r) => r.value === role)?.label ?? role;

export function AccessHistory({ reviewId }: { reviewId: Id<"reviews"> }) {
  const role = useDemoRole();
  const rows = useQuery(
    api.audit.queries.accessHistory,
    role === "hr" ? { actor: { role }, reviewId } : "skip",
  );
  if (role !== "hr") return null;
  return (
    <Card className="space-y-2">
      <h2 className="text-lg font-semibold">Historia dostępu</h2>
      {rows === undefined ? (
        <p className="text-sm">Ładowanie historii…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm">Nikt jeszcze nie otwierał tej oceny.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((row) => (
            <li key={row._id}>
              <time className="text-slate-500">
                {new Date(row.at).toLocaleString("pl-PL")}
              </time>{" "}
              {row.actorName ?? "Ktoś"} ({roleLabel(row.actorRole)}){" "}
              {ACTION_LABEL[row.action] ?? row.action}
              {row.details ? ` (${row.details})` : ""}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
