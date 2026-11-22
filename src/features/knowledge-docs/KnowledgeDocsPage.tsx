import { Link } from "react-router";
import { Card } from "../../components/ui/Card";
import { DemoDataNote } from "../../components/ui/DemoDataNote";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageTitle } from "../../components/ui/PageTitle";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { useDemoRole } from "../../lib/demoRole";
import { useKnowledgeDocuments } from "../../lib/backend/knowledgeDocs";
import { AskSample } from "./AskSample";
import { DocumentList } from "./DocumentList";
import { UploadForm } from "./UploadForm";

function KnowledgeDocsContent() {
  const { data, isDemo, offline } = useKnowledgeDocuments();
  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Dokumenty wewnętrzne urzędu</PageTitle>
      <nav aria-label="Ścieżka nawigacji" className="text-muted">
        <Link to="/pulpit" className="text-primary underline">
          Pulpit
        </Link>{" "}
        <span aria-hidden="true">/</span>{" "}
        <Link to="/ustawienia" className="text-primary underline">
          Ustawienia
        </Link>{" "}
        <span aria-hidden="true">/</span>{" "}
        <span aria-current="page">Dokumenty</span>
      </nav>
      <PageHeader
        title="Dokumenty wewnętrzne urzędu"
        description="Regulaminy, zarządzenia i standardy, z których korzysta asystent w bazie wiedzy."
      />
      {isDemo ? <DemoDataNote /> : null}
      {offline ? (
        <StatusAlert tone="info">
          Tryb offline: dokumenty nie są wysyłane do serwera, a zmiany zostają
          tylko w tej sesji.
        </StatusAlert>
      ) : null}
      <Card className="flex flex-col gap-2">
        <h2 className="text-ink text-xl font-bold">Pseudonimizacja i model</h2>
        <ul className="list-disc pl-5">
          <li>
            Dane osobowe w dokumentach są pseudonimizowane przed indeksowaniem,
            zanim tekst trafi do modelu.
          </li>
          <li>
            Indeksowanie działa także z modelem lokalnym: dokumenty nie muszą
            opuszczać urzędu.
          </li>
          <li>
            Dokument przypisany do komórki jest cytowany tylko osobom z tej
            komórki.
          </li>
        </ul>
      </Card>
      {data === undefined ? (
        <p role="status">Ładowanie dokumentów…</p>
      ) : (
        <DocumentList rows={data} />
      )}
      <UploadForm offline={offline} />
      <AskSample />
    </div>
  );
}

export function KnowledgeDocsPage() {
  const role = useDemoRole();
  if (role !== "hr" && role !== "admin") {
    return (
      <div className="flex flex-col gap-6">
        <PageTitle>Dokumenty wewnętrzne urzędu</PageTitle>
        <PageHeader title="Dokumenty wewnętrzne urzędu" />
        <Card>
          Ten widok jest dla roli „Kadry” albo administratora. Wybierz ją w
          nagłówku, żeby zarządzać dokumentami urzędu.
        </Card>
      </div>
    );
  }
  return <KnowledgeDocsContent />;
}
