import { Badge } from "./Badge";
import { Icon } from "./Icon";

export type AiMode = "mock" | "local" | "external" | "unknown";

const labels: Record<AiMode, string> = {
  mock: "AI demonstracyjne",
  local: "model lokalny, dane w sieci urzędu",
  external: "model zewnętrzny, dane pseudonimizowane",
  unknown: "sprawdzanie stanu AI",
};

export function AiBadge({ mode }: { mode: AiMode }) {
  return (
    <Badge>
      <Icon name="sparkle" className="size-4" />
      <span>AI: {labels[mode]}</span>
    </Badge>
  );
}
