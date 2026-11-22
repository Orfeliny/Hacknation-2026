import { PageTitle } from "../../components/ui/PageTitle";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { getEnv } from "../../lib/env";
import { AwaitingNotice } from "./AwaitingNotice";
import { HrHeader } from "./HrHeader";
import { LivePanel } from "./LivePanel";

export function HrOfficePage() {
  const online = getEnv().convexUrl !== undefined;
  return (
    <div className="space-y-8">
      <PageTitle>Panel kadr</PageTitle>
      {online ? (
        <LivePanel />
      ) : (
        <>
          <HrHeader />
          <StatusAlert tone="warning">
            Tryb offline: backend Convex nie jest skonfigurowany, więc tablica
            ocen, statystyki i przypomnienia są niedostępne.
          </StatusAlert>
        </>
      )}
      <AwaitingNotice />
    </div>
  );
}
