import { Badge } from "./Badge";
import { Icon } from "./Icon";

export type AiMode = "mock" | "local" | "external" | "invalid" | "unknown";

const labels: Record<AiMode, string> = {
  mock: "AI demonstracyjne",
  local: "AI: model lokalny, dane w sieci urzędu",
  external: "AI: model zewnętrzny, dane pseudonimizowane",
  invalid: "AI: błędna konfiguracja",
  unknown: "AI: sprawdzanie stanu",
};

export function AiBadge({ mode }: { mode: AiMode }) {
  return (
    <Badge>
      <Icon name="sparkle" className="size-4" />
      <span>{labels[mode]}</span>
    </Badge>
  );
}
