import type {
  askContract,
  KnowledgeDocumentRow,
  registerDocumentContract,
  removeDocumentContract,
} from "../../../../convex/lib/contracts/knowledgeDocs";
import {
  actorLabel,
  createDemoStore,
  demoId,
  msFromToday,
  type ArgsOf,
} from "../useDemo";

export const knowledgeStore = createDemoStore<KnowledgeDocumentRow[]>(() => [
  {
    documentId: demoId("knowledgeDocuments", "regulamin"),
    title: "Regulamin pracy urzędu",
    fileName: "regulamin-pracy.pdf",
    scope: "office",
    status: "indexed",
    pseudonymized: true,
    uploadedByName: "Barbara Dąbrowska",
    uploadedAt: msFromToday(-40),
    indexedAt: msFromToday(-40),
    chunkCount: 42,
  },
  {
    documentId: demoId("knowledgeDocuments", "zarzadzenie"),
    title: "Zarządzenie w sprawie ocen okresowych",
    fileName: "zarzadzenie-oceny.docx",
    scope: "unit",
    unit: "Wydział Kontroli Planowej",
    status: "indexing",
    pseudonymized: true,
    uploadedByName: "Barbara Dąbrowska",
    uploadedAt: msFromToday(-1),
    chunkCount: 0,
  },
  {
    documentId: demoId("knowledgeDocuments", "procedura"),
    title: "Procedura zgłaszania nieobecności",
    fileName: "procedura-nieobecnosci.pdf",
    scope: "office",
    status: "queued",
    pseudonymized: false,
    uploadedByName: "Barbara Dąbrowska",
    uploadedAt: msFromToday(0),
    chunkCount: 0,
  },
  {
    documentId: demoId("knowledgeDocuments", "skan"),
    title: "Instrukcja kancelaryjna (skan)",
    fileName: "instrukcja-kancelaryjna-skan.pdf",
    scope: "office",
    status: "failed",
    error: "Nie udało się odczytać tekstu: plik to skan bez warstwy tekstowej.",
    pseudonymized: false,
    uploadedByName: "Barbara Dąbrowska",
    uploadedAt: msFromToday(-5),
    chunkCount: 0,
  },
]);

let uploadCounter = 0;
export const nextUploadUrl = () => `demo://upload/${(uploadCounter += 1)}`;

export function registerDocument(
  rows: KnowledgeDocumentRow[],
  args: ArgsOf<typeof registerDocumentContract>,
) {
  const documentId = demoId("knowledgeDocuments", `new-${rows.length + 1}`);
  const row: KnowledgeDocumentRow = {
    documentId,
    title: args.title,
    fileName: args.fileName,
    scope: args.scope,
    ...(args.unit === undefined ? {} : { unit: args.unit }),
    status: "queued",
    pseudonymized: false,
    uploadedByName: actorLabel(args.actor.role),
    uploadedAt: Date.now(),
    chunkCount: 0,
  };
  return { state: [row, ...rows], result: documentId };
}

export function removeDocument(
  rows: KnowledgeDocumentRow[],
  args: ArgsOf<typeof removeDocumentContract>,
) {
  return {
    state: rows.filter((r) => r.documentId !== args.documentId),
    result: null,
  };
}

export function ask(
  rows: KnowledgeDocumentRow[],
  args: ArgsOf<typeof askContract>,
) {
  const office = rows.find((r) => r.status === "indexed");
  if (!office || !/(urlop|ocen|termin|praca)/i.test(args.question)) {
    return { answer: null, citations: [] };
  }
  return {
    answer:
      "Według regulaminu urzędu wniosek składa się do przełożonego, a zgodę wydaje kierownik komórki. Termin oceny okresowej wynika z przepisów o służbie cywilnej.",
    citations: [
      {
        kind: "office" as const,
        title: office.title,
        locator: "§ 12 ust. 2",
        documentId: office.documentId,
      },
      {
        kind: "law" as const,
        title: "Ustawa o służbie cywilnej",
        locator: "art. 51",
      },
    ],
  };
}
