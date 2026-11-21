import { lazy, Suspense } from "react";

// Lazy, so the Maelstrom bundle is a separate chunk and its cost can be measured.
const SpikePage = lazy(() => import("./SpikePage"));

export function LazySpike() {
  return (
    <Suspense fallback={<p>Ładowanie…</p>}>
      <SpikePage />
    </Suspense>
  );
}
