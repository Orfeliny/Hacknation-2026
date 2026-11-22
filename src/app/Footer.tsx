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
  if (links.length === 0) return null;
  return (
    <footer className="border-divider border-t">
      <ul className="mx-auto flex max-w-6xl flex-wrap gap-6 p-4 text-sm">
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
