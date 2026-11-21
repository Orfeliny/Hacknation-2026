import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card } from "../../components/ui/Card";
import { getEnv } from "../../lib/env";
import { __Name__Form } from "./__Name__Form";

function Online__Name__() {
  const entries = useQuery(api.__name__.queries.list);
  const add = useMutation(api.__name__.mutations.add);
  return (
    <>
      <__Name__Form
        offline={false}
        onSubmit={async ({ text }) => {
          await add({ text });
        }}
      />
      {entries === undefined ? (
        <p>Ładowanie…</p>
      ) : entries.length === 0 ? (
        <p>Brak wpisów.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry._id}>
              <Card>{entry.text}</Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function __Name__Page() {
  const online = getEnv().convexUrl !== undefined;
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">__Name__</h1>
      {online ? (
        <Online__Name__ />
      ) : (
        <__Name__Form offline onSubmit={() => Promise.resolve()} />
      )}
    </section>
  );
}
