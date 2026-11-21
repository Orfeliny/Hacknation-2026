// The app header and the offline banner live in the shared layout; hide them for paper.
export const PRINT_CSS = `
@page { size: A4; margin: 12mm; }
@media print {
  header, [role="status"] { display: none !important; }
  main { max-width: none !important; padding: 0 !important; }
  body { background: #fff !important; }
}`;
