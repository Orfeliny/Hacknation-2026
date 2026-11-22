import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { AdminPanel } from "./admin/AdminPanel";
import { Catalog } from "./Catalog";
import { contextFrom, rozwojHref } from "./context";
import { ForumSection, NEW_THREAD_KIND_ID } from "./ForumSection";
import { IprzContextBar } from "./IprzContextBar";
import type { ThreadKind } from "./labels";
import { OptionDetailView } from "./OptionDetail";
import { useCatalogFilters } from "./useCatalogFilters";

const linkButton =
  "inline-flex min-h-11 items-center rounded-md px-4 font-semibold";

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

  return (
    <div className="flex flex-col gap-6">
      <title>Forum rozwoju</title>
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
      {browsing && context && <IprzContextBar context={context} />}
      {managing && online ? (
        <AdminPanel />
      ) : optionId && online ? (
        <OptionDetailView optionId={optionId} />
      ) : (
        <>
          <section aria-labelledby="h-oferty" className="flex flex-col gap-4">
            <h2 id="h-oferty" className="text-xl font-bold">
              Oferty
            </h2>
            {online ? (
              <Catalog filters={filters} context={context} />
            ) : (
              <p className="text-muted">
                Tryb offline: katalog ofert wymaga połączenia z backendem.
              </p>
            )}
          </section>
          <ForumSection kind={newKind} onKindChange={setNewKind} />
        </>
      )}
    </div>
  );
}
