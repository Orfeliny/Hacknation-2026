import { Link } from "react-router";
import { useRegisteredPaths } from "./routeRegistry";

const FOOTER_LINKS = [
  { path: "/deklaracja-dostepnosci", label: "Deklaracja dostępności" },
  { path: "/zasady", label: "Zasady i paleta" },
  { path: "/przepisy", label: "Przepisy" },
  { path: "/logowanie", label: "Logowanie (demo)" },
] as const;

export function Footer() {
  const registered = useRegisteredPaths();
  const links = FOOTER_LINKS.filter((link) => registered.includes(link.path));
  return (
    <footer className="border-divider text-muted flex flex-wrap items-center gap-x-6 gap-y-2 border-t px-10 py-4 text-sm print:hidden">
      <p>© 2026 [NAZWA URZĘDU] · Azymut · wersja reguł 2016-04-23</p>
      <ul className="ml-auto flex flex-wrap gap-6">
        {links.map((link) => (
          <li key={link.path}>
            <Link to={link.path} className="text-primary">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </footer>
  );
}
