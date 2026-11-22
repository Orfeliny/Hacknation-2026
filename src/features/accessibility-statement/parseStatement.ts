export type Inline =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "code"; text: string };

export type Block =
  | { kind: "heading"; level: 1 | 2; inlines: Inline[] }
  | { kind: "paragraph"; inlines: Inline[] }
  | { kind: "quote"; inlines: Inline[] }
  | { kind: "list"; items: Inline[][] };

const INLINE = /\*\*(.+?)\*\*|`(.+?)`/g;

export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of source.matchAll(INLINE)) {
    if (match.index > last) {
      out.push({ kind: "text", text: source.slice(last, match.index) });
    }
    if (match[1] !== undefined) out.push({ kind: "strong", text: match[1] });
    else if (match[2] !== undefined) out.push({ kind: "code", text: match[2] });
    last = match.index + match[0].length;
  }
  if (last < source.length)
    out.push({ kind: "text", text: source.slice(last) });
  return out;
}

// Covers only what the statement uses: `#`/`##` headings, `>` quotes, `-` lists, paragraphs.
export function parseStatement(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: Inline[][] | undefined;

  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({
        kind: "paragraph",
        inlines: parseInline(paragraph.join(" ")),
      });
      paragraph = [];
    }
    if (list) {
      blocks.push({ kind: "list", items: list });
      list = undefined;
    }
  };

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = /^(#{1,2})\s+(.*)$/.exec(line);
    if (line === "") {
      flush();
    } else if (heading?.[1] && heading[2] !== undefined) {
      flush();
      blocks.push({
        kind: "heading",
        level: heading[1].length === 1 ? 1 : 2,
        inlines: parseInline(heading[2]),
      });
    } else if (line.startsWith(">")) {
      flush();
      blocks.push({
        kind: "quote",
        inlines: parseInline(line.replace(/^>\s?/, "")),
      });
    } else if (line.startsWith("- ")) {
      if (paragraph.length > 0) flush();
      list ??= [];
      list.push(parseInline(line.slice(2)));
    } else {
      if (list) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}
