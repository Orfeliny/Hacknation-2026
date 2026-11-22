import { useAuth } from "react-oidc-context";
import { Button } from "../components/ui/Button";

// Rendered only in `oidc` mode, where the provider exists.
export function SignOutButton() {
  const auth = useAuth();
  return (
    <Button variant="secondary" onClick={() => void auth.signoutRedirect()}>
      Wyloguj
    </Button>
  );
}
