import { Link } from "react-router";

export function Crumbs({ label }: { label: string }) {
  return (
    <nav aria-label="Ścieżka nawigacji" className="text-muted mb-4 text-sm">
      <Link to="/moja-ocena" className="text-primary underline">
        Moja ocena
      </Link>
      <span aria-hidden="true"> / </span>
      <span aria-current="page">{label}</span>
    </nav>
  );
}
