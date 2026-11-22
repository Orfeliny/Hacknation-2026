import type { AiMode } from "../../components/ui/AiBadge";
import { useAiStatus } from "../../lib/backend/aiStatus";

export function useAiMode(): AiMode {
  const { data } = useAiStatus();
  return data === undefined ? "unknown" : data.state;
}
