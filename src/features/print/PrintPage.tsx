import { useQuery } from "convex/react";
import { Component, useMemo, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { PageTitle } from "../../components/ui/PageTitle";
import { useDemoRole } from "../../lib/demoRole";
import { getEnv } from "../../lib/env";
import { useRecordExport } from "../audit/useAudit";
import { buildExport } from "./exportSchema";
import { DEMO_REVIEW_ID, fixtureSheet } from "./fixtures";
import { PRINT_CSS } from "./printStyles";
import {
  buildSheetModel,
  SheetNotChosenError,
  type PrintableSheet,
  type SheetModel,
} from "./sheetModel";
import { SheetView } from "./SheetView";

const SHEETS = ["A", "B", "C"] as const;
const CONVEX_ID = /^[a-z0-9]{32}$/;

const LINK_CLASS = "text-primary underline";

function downloadJson(model: SheetModel) {
  const data = buildExport(model, new Date());
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ocena-${model.sheet}-${model.reviewId}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function SheetUnavailable() {
  return (
    <div
      role="alert"
      className="space-y-3 rounded border border-red-300 bg-red-50 p-4"
    >
      <p>
        Nie można wyświetlić tej oceny. Nie istnieje albo wybrana rola nie ma do
        niej dostępu.
      </p>
      <Link className={LINK_CLASS} to="/druk">
        Wróć do listy ocen
      </Link>
    </div>
  );
}

class SheetErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <SheetUnavailable />;
  }
}

function SheetScreen({ data }: { data: PrintableSheet }) {
  const built = useMemo(() => {
    try {
      return { model: buildSheetModel(data) };
    } catch (error) {
      if (error instanceof SheetNotChosenError) return { model: null };
      throw error;
    }
  }, [data]);
  if (!built.model) {
    return (
      <p>
        Ta ocena nie ma jeszcze wybranego arkusza (A, B lub C), więc nie ma
        czego drukować.
      </p>
    );
  }
  const { model } = built;
  return (
    <div className="space-y-4">
      <style>{PRINT_CSS}</style>
      <h1 className="sr-only">Wydruk arkusza oceny</h1>
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link className={LINK_CLASS} to="/druk">
          Wróć do listy ocen
        </Link>
        <Button onClick={() => window.print()}>Drukuj / zapisz jako PDF</Button>
        <Button onClick={() => downloadJson(model)}>Pobierz JSON</Button>
        <span className="text-sm text-slate-600">
          Etap: {data.stageLabel}. Pola jeszcze niewypełnione drukują się jako
          puste linie.
        </span>
      </div>
      <div
        role="region"
        aria-label="Arkusz oceny"
        tabIndex={0}
        className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-indigo-600 print:overflow-visible"
      >
        <SheetView model={model} />
      </div>
    </div>
  );
}

function OnlineSheet({ reviewId }: { reviewId: string }) {
  const role = useDemoRole();
  const data = useQuery(api.print.queries.getSheet, {
    actor: { role },
    reviewId: reviewId as Id<"reviews">,
  });
  useRecordExport(data ? (reviewId as Id<"reviews">) : undefined);
  if (data === undefined) return <p>Ładowanie arkusza…</p>;
  if (data === null) return <SheetUnavailable />;
  return <SheetScreen data={data} />;
}

function OnlineList() {
  const role = useDemoRole();
  const rows = useQuery(api.print.queries.listPrintable, { actor: { role } });
  if (rows === undefined) return <p>Ładowanie ocen…</p>;
  if (rows.length === 0) {
    return <p>Brak ocen dostępnych dla wybranej roli.</p>;
  }
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.reviewId}>
          <Link
            className={LINK_CLASS}
            to={`/druk?ocena=${encodeURIComponent(row.reviewId)}`}
          >
            {row.employeeName || "(brak danych)"}
          </Link>{" "}
          <span className="text-sm text-slate-600">
            arkusz {row.sheet ?? "nie wybrano"}, etap {row.stageLabel}
            {row.round > 1 ? `, podejście ${row.round}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PrintPage() {
  return (
    <>
      <PageTitle>Wydruk arkusza oceny</PageTitle>
      <PrintContent />
    </>
  );
}

function PrintContent() {
  const [params] = useSearchParams();
  const reviewId = params.get("ocena");
  const online = getEnv().convexUrl !== undefined;

  if (import.meta.env.DEV && reviewId === DEMO_REVIEW_ID) {
    const requested = params.get("arkusz");
    const sheet = SHEETS.find((candidate) => candidate === requested) ?? "C";
    return <SheetScreen data={fixtureSheet(sheet)} />;
  }
  if (!online) {
    return (
      <section className="space-y-2">
        <h1 className="text-ink text-2xl font-bold">Wydruk arkusza</h1>
        <p>
          Wydruk wymaga połączenia z backendem Convex. Uruchom{" "}
          <code>npm run dev</code>, aby go połączyć.
        </p>
      </section>
    );
  }
  if (reviewId && !CONVEX_ID.test(reviewId)) return <SheetUnavailable />;
  if (reviewId) {
    return (
      <SheetErrorBoundary key={reviewId}>
        <OnlineSheet reviewId={reviewId} />
      </SheetErrorBoundary>
    );
  }
  return (
    <section className="space-y-4">
      <h1 className="text-ink text-2xl font-bold">Wydruk arkusza</h1>
      <p>Wybierz ocenę, którą chcesz wydrukować lub pobrać jako JSON.</p>
      <OnlineList />
    </section>
  );
}
