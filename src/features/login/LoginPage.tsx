import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import logo from "../../app/assets/azymut-logo-160.png";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DemoDataNote } from "../../components/ui/DemoDataNote";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { DEMO_PERSONAS, setDemoRole } from "../../lib/demoRole";
import {
  codeSchema,
  DEMO_CODE,
  emailSchema,
  FIXTURE_ACCOUNTS,
  findAccount,
} from "./fixtures";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string>();
  const [code, setCode] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [codeError, setCodeError] = useState<string>();

  function sendLink(event: FormEvent) {
    event.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setSentTo(undefined);
      setEmailError(parsed.error.issues[0]?.message);
      return;
    }
    if (!findAccount(parsed.data)) {
      setSentTo(undefined);
      setEmailError("Nie ma konta demonstracyjnego dla tego adresu.");
      return;
    }
    setEmailError(undefined);
    setCodeError(undefined);
    setCode("");
    setSentTo(parsed.data);
  }

  function signIn(event: FormEvent) {
    event.preventDefault();
    const account = sentTo ? findAccount(sentTo) : undefined;
    if (!account) return;
    const parsed = codeSchema.safeParse(code);
    if (!parsed.success) {
      setCodeError(parsed.error.issues[0]?.message);
      return;
    }
    if (parsed.data !== DEMO_CODE) {
      setCodeError("Kod jest nieprawidłowy. Wpisz kod z tej strony.");
      return;
    }
    setDemoRole(account.role);
    void navigate("/");
  }

  const persona = sentTo ? findAccount(sentTo) : undefined;

  return (
    <div className="mx-auto flex max-w-3xl flex-wrap items-start justify-center gap-8">
      <Card className="flex w-full max-w-md flex-col gap-5 p-8">
        <img
          src={logo}
          alt=""
          width={96}
          height={96}
          className="size-24 self-center"
        />
        <StatusAlert tone="warning" live={false}>
          Logowanie demonstracyjne. Nie ma tu prawdziwego uwierzytelniania, nic
          nie jest wysyłane e-mailem, a kod pokazujemy na stronie.
        </StatusAlert>
        <DemoDataNote />
        <div>
          <h1 className="text-ink text-3xl font-bold">Zaloguj się</h1>
          <p className="text-muted mt-2">
            Wpisz służbowy adres e-mail. W wersji docelowej wyślemy na niego
            jednorazowy link i kod.
          </p>
        </div>
        <form
          aria-label="Logowanie adresem e-mail"
          onSubmit={sendLink}
          noValidate
          className="flex flex-col gap-4"
        >
          <Field
            label="Służbowy e-mail"
            hint="Przyjmujemy adresy w domenie urzędu albo urzędu nadrzędnego."
            error={emailError}
          >
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Button type="submit">Wyślij link</Button>
        </form>

        {sentTo && persona ? (
          <form
            aria-label="Logowanie kodem"
            onSubmit={signIn}
            noValidate
            className="border-border flex flex-col gap-4 rounded-lg border p-4"
          >
            <StatusAlert tone="success">
              Link „wysłany” na {sentTo}. W demonstracji kod to {DEMO_CODE}.
              Zalogujesz się jako {DEMO_PERSONAS[persona.role].name}.
            </StatusAlert>
            <Field label="Kod z e-maila" error={codeError}>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6 cyfr"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </Field>
            <Button type="submit" variant="secondary">
              Zaloguj
            </Button>
          </form>
        ) : null}
      </Card>

      <aside
        aria-label="Konta demonstracyjne"
        className="flex w-full max-w-xs flex-col gap-4 pt-2"
      >
        <h2 className="text-ink text-lg font-semibold">Konta demonstracyjne</h2>
        <ul className="text-muted flex flex-col gap-2">
          {FIXTURE_ACCOUNTS.map((account) => (
            <li key={account.email}>
              <span className="text-ink font-semibold">
                {DEMO_PERSONAS[account.role].name}
              </span>
              <br />
              {account.email}
            </li>
          ))}
        </ul>
        <p className="text-muted">
          Dozwolone domeny i połączenie z Active Directory ustawia administrator
          w Ustawieniach urzędu.
        </p>
      </aside>
    </div>
  );
}
