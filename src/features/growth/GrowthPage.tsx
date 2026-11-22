import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageTitle } from "../../components/ui/PageTitle";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { AdminPanel } from "./admin/AdminPanel";
import { Catalog } from "./Catalog";
import { contextFrom, rozwojHref, type IprzContext } from "./context";
import { ForumSection, NEW_THREAD_KIND_ID } from "./ForumSection";
import { IprzGate } from "./IprzContextBar";
import type { ThreadKind } from "./labels";
import { OptionDetailView } from "./OptionDetail";
import { useCatalogFilters } from "./useCatalogFilters";

const linkButton =
  "border-primary text-primary hover:bg-surface-muted inline-flex min-h-11 items-center rounded-md border bg-white px-4 py-2 font-semibold";

export function GrowthPage() {
  const online = getEnv().convexUrl !== undefined;
  const [params] = useSearchParams();
  const context = contextFrom(params);
  const filters = useCatalogFilters(context?.area ?? null);
  const [newKind, setNewKind] = useState<ThreadKind>("question");
  const optionId = params.get("wpis");
  const managing = params.get("zarzadzanie") === "1";
  const isHr = useDemoRole() === "hr";
  const browsing = !optionId && !managing;

  function startThread(kind: ThreadKind) {
    setNewKind(kind);
    document.getElementById(NEW_THREAD_KIND_ID)?.focus();
  }

  const content = (verified: IprzContext | undefined) => (
    <>
      {managing && online ? (
        <AdminPanel />
      ) : optionId && online ? (
        <OptionDetailView optionId={optionId} context={verified} />
      ) : (
        <>
          <section aria-labelledby="h-oferty" className="flex flex-col gap-4">
            <h2 id="h-oferty" className="text-[22px] font-bold">
              Oferty
            </h2>
            {online ? (
              <Catalog filters={filters} context={verified} />
            ) : (
              <p className="text-muted">
                Tryb offline: katalog ofert wymaga połączenia z backendem.
              </p>
            )}
          </section>
          <ForumSection kind={newKind} onKindChange={setNewKind} />
        </>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Forum rozwoju</PageTitle>
      <nav aria-label="Ścieżka nawigacji" className="text-muted">
        <Link to="/pulpit" className="text-primary underline">
          Pulpit
        </Link>{" "}
        <span aria-hidden="true">/</span>{" "}
        <span aria-current="page">Forum rozwoju</span>
      </nav>
      <PageHeader
        title="Forum rozwoju"
        description="Szkolenia, warsztaty, mentoring i staże w urzędzie w jednym miejscu. Wnioski z IPRZ mogą rozwijać mocne strony, nie tylko uzupełniać braki."
        actions={
          browsing ? (
            <>
              {isHr && (
                <Link
                  className={linkButton}
                  to={rozwojHref(params, { zarzadzanie: "1" })}
                >
                  Zarządzaj treścią
                </Link>
              )}
              <Button variant="secondary" onClick={() => startThread("offer")}>
                Zaproponuj ofertę
              </Button>
              <Button onClick={() => startThread("question")}>
                Dodaj wątek
              </Button>
            </>
          ) : (
            <Link className={linkButton} to={rozwojHref(params)}>
              Cały katalog
            </Link>
          )
        }
      />
      {browsing && (
        <div
          role="note"
          className="bg-ink flex items-start gap-3 rounded-lg px-4 py-3 text-white"
        >
          <Icon name="info" className="mt-0.5 size-5 shrink-0" />
          <p>
            <strong>Forum widzi cały urząd.</strong> Nie pisz o niczyjej ocenie,
            obserwacjach ani sprawach osobistych. Wpisy moderuje komórka szkoleń
            z kadrami.
          </p>
        </div>
      )}
      {online ? (
        <IprzGate context={context}>{(verified) => content(verified)}</IprzGate>
      ) : (
        content(undefined)
      )}
    </div>
  );
}
