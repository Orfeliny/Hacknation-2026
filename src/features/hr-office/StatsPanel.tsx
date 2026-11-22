import { criterionLabel } from "./labels";
import type { Stats } from "./types";

type Bucket = Stats["levels"][number];

function BucketList({ title, buckets }: { title: string; buckets: Bucket[] }) {
  return (
    <div>
      <h3 className="font-bold">{title}</h3>
      {buckets.length === 0 ? (
        <p className="text-muted">Brak danych.</p>
      ) : (
        <ul>
          {buckets.map((b) => (
            <li
              key={b.label}
              className="border-divider flex justify-between gap-4 border-b py-1"
            >
              <span>{criterionLabel(b.label)}</span>
              {"hidden" in b ? (
                <span className="text-muted text-right">
                  ukryte (mała grupa)
                </span>
              ) : (
                <strong>{b.count}</strong>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StatsPanel({ stats }: { stats: Stats }) {
  return (
    <section aria-labelledby="h-stat" className="space-y-3">
      <h2 id="h-stat" className="text-xl font-bold">
        Statystyki urzędu
      </h2>
      <p className="text-muted max-w-prose">
        Same liczby, bez nazwisk. Grupy poniżej minimalnej wielkości są ukryte,
        żeby nie wskazywać pojedynczych osób.
      </p>
      <p>
        Ocen łącznie: <strong>{stats.total}</strong>, zamkniętych:{" "}
        <strong>{stats.closed}</strong>
        {stats.onTimeShare !== null
          ? `, w terminie: ${Math.round(stats.onTimeShare * 100)}%`
          : ", udział ocen w terminie ukryty (mała grupa)"}
        .
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-6">
        <BucketList title="Poziomy ogólne" buckets={stats.levels} />
        <BucketList
          title="Najczęstsze kryteria dodatkowe"
          buckets={stats.topAdditionalCriteria}
        />
        <BucketList
          title="Najczęstsze obszary rozwoju"
          buckets={stats.topDevelopmentAreas}
        />
      </div>
    </section>
  );
}
