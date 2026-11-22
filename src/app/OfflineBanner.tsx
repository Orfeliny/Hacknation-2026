import { Icon } from "../components/ui/Icon";

export function OfflineBanner() {
  return (
    <div
      role="status"
      className="border-divider text-ink flex items-center gap-2 border-b px-10 py-2 text-sm"
    >
      <Icon name="info" className="size-5 shrink-0" />
      <p>
        Tryb offline: dane nie są zapisywane na serwerze. Uruchom{" "}
        <code>npm run dev</code>, aby połączyć z backendem.
      </p>
    </div>
  );
}
