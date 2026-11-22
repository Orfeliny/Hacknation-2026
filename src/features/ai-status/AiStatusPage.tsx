import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageTitle } from "../../components/ui/PageTitle";
import { getEnv } from "../../lib/env";
import { AiBadge } from "./AiBadge";

function OnlineBadge() {
  const status = useQuery(api.aiStatus.queries.status);
  if (status === undefined) return <p>Ładowanie statusu AI…</p>;
  return <AiBadge status={status} />;
}

export function AiStatusPage() {
  const online = getEnv().convexUrl !== undefined;
  return (
    <section className="space-y-4">
      <PageTitle>Model AI</PageTitle>
      <PageHeader title="Model AI" />
      {online ? (
        <OnlineBadge />
      ) : (
        <p>Status modelu wymaga połączenia z backendem Convex.</p>
      )}
      <Card className="space-y-2">
        <h2 className="text-ink text-xl font-bold">Jak zmienić dostawcę</h2>
        <p>
          Ta strona tylko pokazuje stan. Dostawcę wybiera administrator w
          środowisku Convex, nie aplikacja:
        </p>
        <pre className="bg-surface-muted overflow-x-auto rounded p-2 text-sm">
          {`npx convex env set AI_PROVIDER mock
npx convex env set AI_PROVIDER openai-compatible`}
        </pre>
        <p>
          Dla <code>openai-compatible</code> ustaw też <code>AI_BASE_URL</code>,{" "}
          <code>AI_MODEL</code> i <code>AI_API_KEY</code>. Klucz trafia tylko do
          środowiska Convex, nigdy do zmiennych <code>VITE_*</code>.
        </p>
      </Card>
    </section>
  );
}
