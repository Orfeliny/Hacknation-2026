import { ConvexError } from "convex/values";
import { Link, useRouteError } from "react-router";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { PageTitle } from "../components/ui/PageTitle";
import { StatusAlert } from "../components/ui/StatusAlert";
import { useDemoRole } from "../lib/demoRole";
import { startPathFor, type NavItem } from "./navigation";

type Kind =
  | { kind: "denied"; message: string }
  | { kind: "missing" }
  | { kind: "failed" };

function classifyRouteError(error: unknown): Kind {
  if (error instanceof ConvexError) {
    const data: unknown = error.data;
    if (typeof data === "object" && data !== null && "code" in data) {
      const { code, message } = data as { code: unknown; message?: unknown };
      if (code === "denied" && typeof message === "string") {
        return { kind: "denied", message };
      }
    }
  }
  // A malformed id reaches the client only as text inside a generic Error.
  if (error instanceof Error && /ArgumentValidationError/.test(error.message)) {
    return { kind: "missing" };
  }
  return { kind: "failed" };
}

export function RouteError({ nav }: { nav: NavItem[] }) {
  const error = useRouteError();
  const start = startPathFor(nav, useDemoRole()) ?? "/";
  const result = classifyRouteError(error);

  const title =
    result.kind === "missing" ? "Nie znaleziono" : "Coś poszło nie tak";
  return (
    <>
      <PageTitle>{title}</PageTitle>
      <PageHeader title={title} />
      <Card className="space-y-3">
        {result.kind === "denied" ? (
          <StatusAlert tone="info">{result.message}</StatusAlert>
        ) : (
          <p>
            {result.kind === "missing"
              ? "Nie ma takiej pozycji albo adres jest nieprawidłowy."
              : "Nie udało się wyświetlić tej strony. Spróbuj ponownie za chwilę."}
          </p>
        )}
        <Link to={start}>Wróć na swoją stronę startową</Link>
      </Card>
    </>
  );
}
