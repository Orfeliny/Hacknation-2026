"use node";

import mammoth from "mammoth";
import TurndownService from "turndown";
import { extractText, getDocumentProxy } from "unpdf";
import type { DocumentKind } from "./validation";

// The file was read but yields no usable text: the document goes to `needs_fix`, not `failed`.
export class ConvertError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConvertError";
  }
}

const MIN_PDF_CHARS = 20;

function turndown(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });
  service.remove(["script", "style", "noscript"]);
  return service;
}

export function htmlToMarkdown(html: string): string {
  return tidy(turndown().turndown(html));
}

function tidy(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function docxToMarkdown(bytes: Uint8Array): Promise<string> {
  const { value } = await mammoth.convertToHtml({
    arrayBuffer: bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer,
  });
  return htmlToMarkdown(value);
}

async function pdfToMarkdown(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  const merged = tidy(text);
  if (merged.length < MIN_PDF_CHARS) {
    throw new ConvertError(
      "Plik PDF nie zawiera tekstu (to prawdopodobnie skan). Wgraj wersję z warstwą tekstową.",
    );
  }
  return merged;
}

export async function convertToMarkdown(
  kind: DocumentKind,
  bytes: Uint8Array,
): Promise<string> {
  const decode = () => new TextDecoder("utf-8").decode(bytes);
  let markdown: string;
  switch (kind) {
    case "pdf":
      markdown = await pdfToMarkdown(bytes);
      break;
    case "docx":
      markdown = await docxToMarkdown(bytes);
      break;
    case "html":
      markdown = htmlToMarkdown(decode());
      break;
    case "markdown":
      markdown = tidy(decode());
      break;
  }
  if (markdown.length === 0) {
    throw new ConvertError("Dokument nie zawiera tekstu.");
  }
  return markdown;
}
