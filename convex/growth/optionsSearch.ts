// Case and diacritic insensitive: "zarzadzanie" finds "zarządzanie". "ł" has no Unicode decomposition.
export function normalizeText(text: string): string {
  return text
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

// Every word of the query must appear somewhere in the fields; an empty query matches everything.
export function matchesSearch(fields: string[], query: string): boolean {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeText(fields.join(" "));
  return words.every((word) => haystack.includes(word));
}
