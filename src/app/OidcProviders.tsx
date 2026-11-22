import { ConvexProviderWithAuth, type ConvexReactClient } from "convex/react";
import { WebStorageStateStore } from "oidc-client-ts";
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { AuthProvider, useAuth } from "react-oidc-context";
import type { AuthSettings } from "../lib/auth";

type Oidc = Extract<AuthSettings, { mode: "oidc" }>;

// Convex validates an OIDC ID token, so the ID token (not the access token) is handed to it. The identity of
// `fetchAccessToken` must change only when the signed-in user does: a new function makes Convex authenticate
// again, and `useAuth()` returns a new object on every state change, so an unstable one loops forever.
function useConvexAuth() {
  const auth = useAuth();
  const latest = useRef(auth);
  useEffect(() => {
    latest.current = auth;
  });
  const { isLoading, isAuthenticated } = auth;
  const userId = auth.user?.profile.sub;
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (forceRefreshToken) {
        const renewed = await latest.current.signinSilent();
        return renewed?.id_token ?? null;
      }
      return latest.current.user?.id_token ?? null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see the comment above
    [userId],
  );
  return useMemo(
    () => ({ isLoading, isAuthenticated, fetchAccessToken }),
    [isLoading, isAuthenticated, fetchAccessToken],
  );
}

// Authorization Code with PKCE. The tokens live in sessionStorage, so they do not survive closing the tab.
export function OidcProviders({
  settings,
  client,
  children,
}: {
  settings: Oidc;
  client: ConvexReactClient;
  children: ReactNode;
}) {
  const config = useMemo(
    () => ({
      authority: settings.authority,
      client_id: settings.clientId,
      redirect_uri: window.location.origin + "/",
      post_logout_redirect_uri: window.location.origin + "/",
      response_type: "code",
      scope: "openid profile email",
      automaticSilentRenew: true,
      userStore: new WebStorageStateStore({ store: window.sessionStorage }),
      onSigninCallback: () => {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      },
    }),
    [settings],
  );
  return (
    <AuthProvider {...config}>
      <ConvexProviderWithAuth client={client} useAuth={useConvexAuth}>
        {children}
      </ConvexProviderWithAuth>
    </AuthProvider>
  );
}
