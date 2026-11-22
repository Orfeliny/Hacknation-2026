import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { AiBadge, type AiMode } from "../../components/ui/AiBadge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DemoDataNote } from "../../components/ui/DemoDataNote";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageTitle } from "../../components/ui/PageTitle";
import { Select } from "../../components/ui/Select";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useAiStatus } from "../../lib/backend/aiStatus";
import { useDemoRole } from "../../lib/demoRole";
import {
  ADMIN_COMMANDS,
  DEFAULT_SETTINGS,
  INSTALLATION,
  REMINDER_OPTIONS,
  lastImportSummary,
  type ReminderFrequency,
  type SettingsValues,
} from "./fixtures";
import { isFeatureRegistered } from "./isFeatureRegistered";

function AiSection() {
  const { data } = useAiStatus();
  const mode: AiMode = data?.state ?? "unknown";
  return (
    <Card
      role="region"
      aria-labelledby="h-ai"
      className="flex flex-col gap-4 p-6"
    >
      <h2 id="h-ai" className="text-xl font-bold">
        Asystent AI
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <AiBadge mode={mode} />
        {data && (data.state === "local" || data.state === "external") ? (
          <p className="text-muted">
            Model <strong className="text-ink">{data.model}</strong>, host{" "}
            <strong className="text-ink">{data.host}</strong>
          </p>
        ) : null}
        {data?.state === "invalid" ? (
          <p className="text-danger font-semibold">{data.message}</p>
        ) : null}
      </div>
      <p>
        Dostawcę modelu ustawia administrator w środowisku Convex, nie
        aplikacja. Ta strona pokazuje tylko aktualny stan.
      </p>
      <pre className="bg-surface-muted overflow-x-auto rounded-md p-3 text-sm">
        {ADMIN_COMMANDS}
      </pre>
      <p className="text-muted">
        Dla <code>openai-compatible</code> ustaw też <code>AI_BASE_URL</code>,{" "}
        <code>AI_MODEL</code> i <code>AI_API_KEY</code>. Klucz trafia tylko do
        środowiska Convex.
      </p>
      <p className="bg-ink rounded-lg p-4 text-white">
        <strong>Pseudonimizacja jest zawsze włączona.</strong> Zanim zapytanie
        opuści urząd, zamieniamy imiona, nazwiska, nazwy komórek i daty na
        znaczniki.
      </p>
      <p className="text-muted">
        Asystent podpowiada kryteria, pytania i przykłady zachowań. Nigdy nie
        proponuje ocen. Każde zapytanie trafia do rejestru AI.
      </p>
    </Card>
  );
}

function CheckboxRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-primary mt-0.5 size-5 shrink-0"
      />
      <span>
        <strong className="block">{label}</strong>
        <span className="text-muted block">{hint}</span>
      </span>
    </label>
  );
}

function SettingsContent() {
  const [saved, setSaved] = useState<SettingsValues>(DEFAULT_SETTINGS);
  const [values, setValues] = useState<SettingsValues>(DEFAULT_SETTINGS);
  const [message, setMessage] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);

  const patch = (change: Partial<SettingsValues>) => {
    setValues((current) => ({ ...current, ...change }));
    setMessage(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (values.domains.trim() === "") {
      setDomainError("Podaj co najmniej jedną domenę e-mail.");
      setMessage(null);
      return;
    }
    setDomainError(null);
    setSaved(values);
    setMessage(
      "Zmiany zapisane tylko w pamięci strony. W wersji demonstracyjnej znikną po jej odświeżeniu.",
    );
  };

  const cancel = () => {
    setValues(saved);
    setDomainError(null);
    setMessage(null);
  };

  const demoAction = (text: string) => () => setMessage(text);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Ustawienia urzędu</PageTitle>
      <nav aria-label="Ścieżka nawigacji" className="text-muted">
        <Link to="/pulpit" className="text-primary underline">
          Pulpit
        </Link>{" "}
        <span aria-hidden="true">/</span>{" "}
        <span aria-current="page">Ustawienia urzędu</span>
      </nav>
      <PageHeader
        title="Ustawienia urzędu"
        description="Te ustawienia dotyczą wszystkich osób w urzędzie."
      />
      <DemoDataNote />
      <div className="grid items-start gap-8 min-[1000px]:grid-cols-[minmax(0,1fr)_20rem]">
        <form
          aria-label="Ustawienia urzędu"
          onSubmit={submit}
          noValidate
          className="flex min-w-0 flex-col gap-6"
        >
          <AiSection />

          <Card
            role="region"
            aria-labelledby="h-log"
            className="flex flex-col gap-4 p-6"
          >
            <h2 id="h-log" className="text-xl font-bold">
              Logowanie
            </h2>
            <Field
              label="Dozwolone domeny e-mail"
              hint="Oddziel domeny przecinkiem. Na adres w tych domenach wyślemy link i kod do logowania."
              error={domainError}
            >
              <Input
                type="text"
                value={values.domains}
                onChange={(event) => patch({ domains: event.target.value })}
              />
            </Field>
            <CheckboxRow
              label="Logowanie przez Active Directory"
              hint="Opcjonalne. Włącz, jeśli urząd korzysta z Active Directory albo Entra ID."
              checked={values.adLogin}
              onChange={(adLogin) => patch({ adLogin })}
            />
            <CheckboxRow
              label="Drugi składnik dla kadr i dyrektora generalnego"
              hint="Kod z aplikacji uwierzytelniającej. Te osoby widzą dane wielu pracowników."
              checked={values.twoFactor}
              onChange={(twoFactor) => patch({ twoFactor })}
            />
            {isFeatureRegistered("login") ? (
              <Link
                to="/logowanie"
                className="inline-flex min-h-11 items-center font-semibold"
              >
                Zobacz ekran logowania
              </Link>
            ) : null}
          </Card>

          <Card
            role="region"
            aria-labelledby="h-dane"
            className="flex flex-col gap-4 p-6"
          >
            <h2 id="h-dane" className="text-xl font-bold">
              Dane kadrowe
            </h2>
            <p className="max-w-[70ch]">
              Systemy kadrowe w urzędach są różne. Zacznij od pliku CSV, a
              integrację dodaj później.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={demoAction(
                  "Import z pliku CSV jest w wersji demonstracyjnej wyłączony. Dane pracowników się nie zmieniły.",
                )}
              >
                Importuj pracowników
                <span className="sr-only"> z pliku CSV</span>
              </Button>
              <Button
                variant="secondary"
                onClick={demoAction(
                  "Eksport ocen jest w wersji demonstracyjnej wyłączony. Nic nie zostało pobrane.",
                )}
              >
                Eksportuj oceny
                <span className="sr-only"> do pliku JSON</span>
              </Button>
              <Button
                variant="ghost"
                onClick={demoAction(
                  "Wzór CSV jest w wersji demonstracyjnej niedostępny.",
                )}
              >
                Pobierz wzór CSV
              </Button>
            </div>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
              {[
                ["Ostatni import", lastImportSummary()],
                ["Błędy importu", "Brak"],
                ["Integracja z systemem kadrowym", "Nieskonfigurowana"],
              ].map(([term, detail]) => (
                <div
                  key={term}
                  className="bg-surface-muted rounded-lg px-4 py-3"
                >
                  <dt className="text-muted text-sm">{term}</dt>
                  <dd className="font-bold">{detail}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card
            role="region"
            aria-labelledby="h-przyp"
            className="flex flex-col gap-3 p-6"
          >
            <h2 id="h-przyp" className="text-xl font-bold">
              Przypomnienia o rozmowach bieżących
            </h2>
            <Field
              label="Domyślna częstotliwość"
              hint="To tylko zalecenie. Każdy przełożony może wyłączyć przypomnienia u siebie i nikt nie sprawdza, czy z nich korzysta."
            >
              <Select
                className="max-w-sm"
                value={values.reminders}
                onChange={(event) =>
                  patch({ reminders: event.target.value as ReminderFrequency })
                }
              >
                {REMINDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </Card>

          {isFeatureRegistered("knowledge-docs") ? (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-6">
              <p className="max-w-[60ch]">
                Dokumenty wewnętrzne urzędu, na których asystent opiera
                odpowiedzi, dodajesz w osobnym panelu.
              </p>
              <Link
                to="/ustawienia/dokumenty"
                className="inline-flex min-h-11 items-center font-semibold"
              >
                Dokumenty wewnętrzne urzędu
              </Link>
            </Card>
          ) : null}

          {message ? <StatusAlert tone="info">{message}</StatusAlert> : null}

          <Card className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <p className="text-muted">Zmiany zaczną działać po zapisaniu.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={cancel}>
                Anuluj zmiany
              </Button>
              <Button type="submit">Zapisz zmiany</Button>
            </div>
          </Card>
        </form>

        <aside
          aria-label="Informacje o instalacji"
          className="flex min-w-0 flex-col gap-6"
        >
          <Card
            role="region"
            aria-labelledby="h-stan"
            className="flex flex-col gap-3 px-6 py-5"
          >
            <h2 id="h-stan" className="text-lg font-bold">
              Stan instalacji
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-muted">Wersja reguł</dt>
              <dd>{INSTALLATION.rulesVersion}</dd>
              <dt className="text-muted">Kopia zapasowa</dt>
              <dd>{INSTALLATION.backup}</dd>
            </dl>
          </Card>
          <section aria-labelledby="h-kto" className="px-1">
            <h3 id="h-kto" className="mb-1 text-base font-bold">
              Kto widzi tę stronę
            </h3>
            <p className="text-muted">
              Tylko administratorzy i osoby w Biurze Kadr. Przełożeni i
              pracownicy widzą w nagłówku znacznik „AI” z aktualnym stanem.
            </p>
          </section>
          <section aria-labelledby="h-zg" className="px-1">
            <h3 id="h-zg" className="mb-1 text-base font-bold">
              Zgodność
            </h3>
            <p className="text-muted">
              Aplikacja spełnia WCAG 2.1 AA i wymagania KRI. Opis zabezpieczeń
              dostaniesz od administratora systemu.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const role = useDemoRole();
  if (role !== "hr" && role !== "admin") {
    return (
      <div className="flex flex-col gap-6">
        <PageTitle>Ustawienia urzędu</PageTitle>
        <PageHeader title="Ustawienia urzędu" />
        <Card>
          Ten widok jest dla roli „Kadry” albo administratora. Wybierz ją w
          nagłówku, żeby zobaczyć ustawienia urzędu.
        </Card>
      </div>
    );
  }
  return <SettingsContent />;
}
