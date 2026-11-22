const CHROME = /<(nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi;

// A web page (gov.pl) wraps its text in menus and footers: keep <main> when there is one and drop
// the navigation blocks that remain.
export function pageContent(html: string): string {
  const main = /<main\b[^>]*>([\s\S]*)<\/main>/i.exec(html)?.[1];
  return (main ?? html).replace(CHROME, "");
}
