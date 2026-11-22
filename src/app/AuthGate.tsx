import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "react-oidc-context";
import { api } from "../../convex/_generated/api";
import { AUTH_REFUSALS, type AuthRefusal } from "../../convex/auth/constants";
import { Button } from "../components/ui/Button";
import { SessionContext, type Session } from "../lib/session";

function Screen({
  title,
  children,
  actions,
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-lg space-y-4 p-8">
      <h1 className="text-ink text-2xl font-bold">{title}</h1>
      {children}
      {actions && <div className="flex gap-2">{actions}</div>}
    </main>
  );
}

function SignedOut() {
  const auth = useAuth();
  return (
    <Screen
      title="Zaloguj się do Azymutu"
      actions={
        <Button onClick={() => void auth.signinRedirect()}>Zaloguj się</Button>
      }
    >
      <p>Zaloguj się kontem urzędu, żeby korzystać z aplikacji.</p>
    </Screen>
  );
}

function Problem({ title, text }: { title: string; text: string }) {
  const auth = useAuth();
  return (
    <Screen
      title={title}
      actions={
        <Button variant="secondary" onClick={() => void auth.signoutRedirect()}>
          Wyloguj
        </Button>
      }
    >
      <p role="alert">{text}</p>
    </Screen>
  );
}

// Waits for the server to accept the token, links the identity to an employee on the first login and only
// then shows the app, with the roles the person may act in.
function Linked({ children }: { children: ReactNode }) {
  const me = useQuery(api.auth.queries.me);
  const link = useMutation(api.auth.mutations.linkMe);
  const [refusal, setRefusal] = useState<AuthRefusal | null>(null);
  const tried = useRef(false);

  const needsLink = me?.mode === "oidc" && me.authenticated && !me.linked;
  useEffect(() => {
    if (!needsLink || tried.current) return;
    tried.current = true;
    link()
      .then((result) => {
        if (!result.ok) setRefusal(result.code);
      })
      .catch(() => setRefusal("misconfigured"));
  }, [needsLink, link]);

  const session = useMemo<Session | null>(
    () =>
      me?.mode === "oidc" && me.authenticated && me.linked
        ? { roles: me.allowedRoles, employee: me.employee }
        : null,
    [me],
  );

  if (me === undefined) return <Screen title="Ładowanie…" />;
  if (me.mode !== "oidc") {
    return (
      <Problem
        title="Błąd konfiguracji"
        text="Aplikacja i serwer mają różne ustawienia logowania. Zgłoś to administratorowi."
      />
    );
  }
  if (!me.authenticated) {
    return (
      <Problem
        title="Serwer nie przyjął logowania"
        text="Spróbuj zalogować się ponownie. Jeśli to się powtarza, zgłoś to administratorowi."
      />
    );
  }
  if (!me.linked) {
    return refusal ? (
      <Problem title="Nie można rozpocząć" text={AUTH_REFUSALS[refusal]} />
    ) : (
      <Screen title="Ładowanie…" />
    );
  }
  return <SessionContext value={session}>{children}</SessionContext>;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const convex = useConvexAuth();
  if (auth.error) {
    return (
      <Screen
        title="Logowanie nie powiodło się"
        actions={
          <Button onClick={() => void auth.signinRedirect()}>
            Spróbuj ponownie
          </Button>
        }
      >
        <p role="alert">Nie udało się zalogować. Spróbuj ponownie.</p>
      </Screen>
    );
  }
  if (auth.isLoading || convex.isLoading) return <Screen title="Ładowanie…" />;
  if (!auth.isAuthenticated) return <SignedOut />;
  return <Linked>{children}</Linked>;
}
