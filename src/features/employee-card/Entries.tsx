import { Link } from "react-router";
import { useRouteRegistered } from "../../app/index";
import { Card } from "../../components/ui/Card";
import { Icon } from "../../components/ui/Icon";
import { fullName, type CardData } from "./card";

const OBSERVATIONS_PATH = "/obserwacje";

export function Entries({
  card,
  employeeId,
}: {
  card: CardData;
  employeeId: string;
}) {
  const observations = useRouteRegistered(OBSERVATIONS_PATH);
  return (
    <section aria-labelledby="h-wpisy">
      <Card className="space-y-3">
        <h2 id="h-wpisy" className="text-section font-bold">
          Obserwacje i notatki
        </h2>
        <div className="bg-ink flex gap-2.5 rounded-lg px-3.5 py-3 text-white">
          <Icon name="info" className="mt-0.5 size-5 shrink-0" />
          <p>
            <strong>Kadry widzą oba rodzaje wpisów.</strong> Pracownik nie widzi
            obserwacji przełożonego, a przełożony nie widzi notatek pracownika.
            Każdy wgląd kadr zapisujemy w dzienniku zdarzeń.
          </p>
        </div>
        <div className="border-divider flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-3">
          <span>
            <strong>Obserwacje</strong>{" "}
            <span className="text-muted">
              prowadzi{" "}
              {card.supervisor ? fullName(card.supervisor) : "oceniający"}
            </span>
          </span>
          {observations ? (
            <Link
              className="text-primary inline-flex min-h-11 items-center font-semibold"
              to={`${OBSERVATIONS_PATH}?pracownik=${encodeURIComponent(employeeId)}`}
            >
              Otwórz obserwacje: {fullName(card.employee)}
            </Link>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
