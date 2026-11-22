import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { CHECKLISTS, KIND_LABELS, type ConversationKind } from "./kinds";

export function Checklist({ kind }: { kind: ConversationKind }) {
  const items = CHECKLISTS[kind];
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  const toggle = (item: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (!next.delete(item)) next.add(item);
      return next;
    });
  return (
    <section aria-labelledby="h-lista">
      <Card className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="h-lista" className="text-xl font-bold">
            Lista kontrolna: rozmowa {KIND_LABELS[kind].toLowerCase()}
          </h2>
          <span className="text-muted">
            Gotowe: {done.size} z {items.length}
          </span>
        </div>
        <p className="text-muted text-sm">
          Lista jest tylko dla Ciebie i nie jest zapisywana.
        </p>
        <ul>
          {items.map((item) => (
            <li key={item}>
              <label className="border-border flex min-h-11 items-start gap-3 border-t py-2 first:border-t-0">
                <input
                  type="checkbox"
                  className="accent-primary mt-1 size-5 shrink-0"
                  checked={done.has(item)}
                  onChange={() => toggle(item)}
                />
                <span>{item}</span>
              </label>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
