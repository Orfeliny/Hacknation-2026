import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo, type ReactNode } from "react";
import { getAuthSettings, type AuthSettings } from "../lib/auth";
import { AuthGate } from "./AuthGate";
import { OidcProviders } from "./OidcProviders";

function useClient(url: string) {
  return useMemo(() => new ConvexReactClient(url), [url]);
}

function ConvexBoundary({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  const client = useClient(url);
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}

function OidcBoundary({
  url,
  settings,
  children,
}: {
  url: string;
  settings: Extract<AuthSettings, { mode: "oidc" }>;
  children: ReactNode;
}) {
  const client = useClient(url);
  return (
    <OidcProviders settings={settings} client={client}>
      <AuthGate>{children}</AuthGate>
    </OidcProviders>
  );
}

function Blocked({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-lg space-y-4 p-8">
      <h1 className="text-ink text-2xl font-bold">Błąd konfiguracji</h1>
      <p role="alert">{message}</p>
    </main>
  );
}

export function Providers({
  convexUrl,
  children,
}: {
  convexUrl: string | undefined;
  children: ReactNode;
}) {
  let settings: AuthSettings;
  try {
    settings = getAuthSettings();
  } catch {
    return (
      <Blocked message="Ustawienia logowania są niepoprawne. Zgłoś to administratorowi." />
    );
  }
  if (settings.mode === "oidc") {
    if (!convexUrl) {
      return (
        <Blocked message="Logowanie wymaga połączenia z serwerem. Zgłoś to administratorowi." />
      );
    }
    return (
      <OidcBoundary url={convexUrl} settings={settings}>
        {children}
      </OidcBoundary>
    );
  }
  if (!convexUrl) return <>{children}</>;
  return <ConvexBoundary url={convexUrl}>{children}</ConvexBoundary>;
}
