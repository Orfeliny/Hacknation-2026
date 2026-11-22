import { MAX_EMBED_TEXT_CHARS } from "../ai/types";

export type Chunk = { locator: string; text: string; order: number };

export const MAX_CHUNK_BODY = 1200;
const MAX_PREFIX = 400;

// An article or a paragraph sign opens a unit; ELI also marks every numbered point as a heading,
// and those stay inside their unit.
const UNIT_HEADING = /^(art\.?|artykuł|§)\s*\d+/i;
const POINT_HEADING = /^(\d+[a-z]?|[a-z])[.)]/i;
const HEADING = /^(#{1,6})\s+(.*)$/;
const FALLBACK_LEVEL = 3;

type Heading = { level: number; text: string };
type Section = { path: string[]; lines: string[] };

function cleanHeading(raw: string): string {
  return raw
    .replace(/\\(?=[^\w\s])/g, "")
    .replace(/[*_]+/g, "")
    .replace(/\s+#+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLines(markdown: string) {
  return markdown.split("\n").map((line) => {
    const match = HEADING.exec(line);
    return match
      ? {
          heading: {
            level: (match[1] ?? "#").length,
            text: cleanHeading(match[2] ?? ""),
          },
          line,
        }
      : { heading: null, line };
  });
}

function splitSections(markdown: string): Section[] {
  const lines = parseLines(markdown);
  const headings = lines.flatMap((entry) =>
    entry.heading ? [entry.heading] : [],
  );
  const units = headings.filter((h) => UNIT_HEADING.test(h.text));
  const hasUnits = units.length > 0;
  const unitLevel = Math.min(...units.map((h) => h.level));

  const sections: Section[] = [{ path: [], lines: [] }];
  let stack: Heading[] = [];
  const current = () => sections[sections.length - 1];

  for (const { heading, line } of lines) {
    if (!heading) {
      current().lines.push(line);
      continue;
    }
    const isUnit = hasUnits && UNIT_HEADING.test(heading.text);
    const isBody = hasUnits
      ? !isUnit &&
        (heading.level > unitLevel || POINT_HEADING.test(heading.text))
      : heading.level > FALLBACK_LEVEL;
    if (isBody) {
      current().lines.push(heading.text);
      continue;
    }
    // A unit replaces the previous unit; any other heading closes the deeper headings it replaces.
    stack = isUnit
      ? stack.filter((h) => !UNIT_HEADING.test(h.text))
      : stack.filter(
          (h) => h.level < heading.level && !UNIT_HEADING.test(h.text),
        );
    stack.push(heading);
    sections.push({ path: stack.map((h) => h.text), lines: [] });
  }
  return sections;
}

function splitBody(body: string): string[] {
  if (body.length <= MAX_CHUNK_BODY) return [body];
  const pieces = body
    .split(/\n{2,}/)
    .flatMap((paragraph) =>
      paragraph.length <= MAX_CHUNK_BODY ? [paragraph] : splitLong(paragraph),
    );
  const parts: string[] = [];
  let buffer = "";
  for (const piece of pieces) {
    if (buffer && buffer.length + piece.length + 2 > MAX_CHUNK_BODY) {
      parts.push(buffer);
      buffer = piece;
    } else {
      buffer = buffer ? `${buffer}\n\n${piece}` : piece;
    }
  }
  if (buffer) parts.push(buffer);
  return parts;
}

function splitLong(paragraph: string): string[] {
  const out: string[] = [];
  let buffer = "";
  for (const sentence of paragraph.split(/(?<=[.;:!?])\s+/)) {
    for (let i = 0; i < sentence.length; i += MAX_CHUNK_BODY) {
      const piece = sentence.slice(i, i + MAX_CHUNK_BODY);
      if (buffer && buffer.length + piece.length + 1 > MAX_CHUNK_BODY) {
        out.push(buffer);
        buffer = piece;
      } else {
        buffer = buffer ? `${buffer} ${piece}` : piece;
      }
    }
  }
  if (buffer) out.push(buffer);
  return out;
}

// Splits parsed Markdown into pieces of about MAX_CHUNK_BODY characters along articles and
// paragraph signs. Each text starts with the document title and the heading path (the locator).
export function chunkMarkdown(markdown: string, title: string): Chunk[] {
  const chunks: Chunk[] = [];
  for (const section of splitSections(markdown)) {
    const body = section.lines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (!body) continue;
    const base =
      section.path.length > 0 ? section.path.join(" > ") : "Początek dokumentu";
    const parts = splitBody(body);
    parts.forEach((part, index) => {
      const locator =
        parts.length > 1 ? `${base} (cz. ${index + 1}/${parts.length})` : base;
      const prefix = `${title}\n${locator}`.slice(0, MAX_PREFIX);
      chunks.push({
        locator,
        text: `${prefix}\n\n${part}`.slice(0, MAX_EMBED_TEXT_CHARS),
        order: chunks.length,
      });
    });
  }
  return chunks;
}
