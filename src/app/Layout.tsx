import { Outlet } from "react-router";
import { Footer } from "./Footer";
import { Header } from "./Header";
import type { NavItem } from "./navigation";
import { OfflineBanner } from "./OfflineBanner";
import { RouteRegistryContext } from "./routeRegistry";
import { SideNav } from "./SideNav";
import { SkipLink } from "./SkipLink";

export function Layout({ nav, offline }: { nav: NavItem[]; offline: boolean }) {
  return (
    <RouteRegistryContext value={nav.map((item) => item.path)}>
      <SkipLink />
      {offline && <OfflineBanner />}
      <Header nav={nav} />
      <div className="mx-auto flex max-w-6xl gap-8 p-8">
        <SideNav nav={nav} />
        <main id="tresc" tabIndex={-1} className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
      <Footer />
    </RouteRegistryContext>
  );
}
