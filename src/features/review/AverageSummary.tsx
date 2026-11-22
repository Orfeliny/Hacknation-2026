import { Card } from "../../components/ui/Card";
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
    <Card aria-labelledby="average-heading" className="space-y-2">
      <h2 id="average-heading" className="text-lg font-bold">
        Średnia z Twoich ocen
      </h2>
      <p className="text-3xl font-bold">
        {averageFormat.format(preview.average)}
      </p>
      <p className="text-muted text-sm">
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
    </Card>
  );
}
