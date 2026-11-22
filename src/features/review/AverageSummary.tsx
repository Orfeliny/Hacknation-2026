import { StatusAlert } from "../../components/ui/StatusAlert";
import type { ReviewView } from "./types";

const averageFormat = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function AverageSummary({
  preview,
  ratedCount,
}: {
  preview: NonNullable<ReviewView["preview"]>;
  ratedCount: number;
}) {
  const positive = preview.result === "positive";
  return (
    <section
      aria-labelledby="average-heading"
      className="border-divider space-y-2 rounded-md border p-4"
    >
      <h3 id="average-heading" className="text-base font-semibold">
        Średnia z Twoich ocen
      </h3>
      <p className="text-3xl font-bold" aria-live="polite">
        {averageFormat.format(preview.average)}
      </p>
      <p className="text-muted">
        Średnia z {ratedCount} kryteriów. Podstawa: § 11. Średnią wylicza
        aplikacja z Twoich ocen. Asystent AI nigdy nie proponuje ocen.
      </p>
      <p>
        Poziom ogólny: <strong>{preview.levelLabel}</strong>
        {preview.average >= 9 && ". Wyższego poziomu nie ma"}
      </p>
      <StatusAlert tone={positive ? "success" : "danger"} live={false}>
        Ocena {positive ? "pozytywna" : "negatywna"}
      </StatusAlert>
    </section>
  );
}
