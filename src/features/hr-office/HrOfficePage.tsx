import { ExternalLink } from "../../components/ui/ExternalLink";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { getEnv } from "../../lib/env";
import { formatDate, today } from "../../lib/format";
import { AwaitingNotice } from "./AwaitingNotice";
import { LEGAL } from "./labels";
import { LivePanel } from "./LivePanel";

export function HrOfficePage() {
  const online = getEnv().convexUrl !== undefined;
  return (
    <div className="space-y-8">
      <title>Panel kadr</title>
      <PageHeader
        title="Oceny okresowe w urzędzie"
        description={
          <>
            Stan na {formatDate(today())}. Podstawa:{" "}
            <ExternalLink href={LEGAL.art81ust1.href}>
              {LEGAL.art81ust1.text} ustawy o służbie cywilnej
            </ExternalLink>
            .
          </>
        }
      />
      {online ? (
        <LivePanel />
      ) : (
        <StatusAlert tone="warning">
          Tryb offline: backend Convex nie jest skonfigurowany, więc tablica
          ocen, statystyki i przypomnienia są niedostępne.
        </StatusAlert>
      )}
      <AwaitingNotice />
    </div>
  );
}
