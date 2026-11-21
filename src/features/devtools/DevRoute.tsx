import { lazy, Suspense } from "react";

// Lazy, so the schema introspection stays out of the main bundle.
const DevPage = lazy(() => import("./DevPage"));

export function DevRoute() {
  return (
    <Suspense fallback={<p role="status">Ładowanie modelu domeny…</p>}>
      <DevPage />
    </Suspense>
  );
}
