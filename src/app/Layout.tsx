import type { ReactElement } from "react";
import { Outlet } from "react-router";
import { Footer } from "./Footer";
import { Header } from "./Header";
import type { NavItem } from "./navigation";
import { OfflineBanner } from "./OfflineBanner";
import { RouteRegistryContext } from "./routeRegistry";
import { SideNav } from "./SideNav";
import { SkipLink } from "./SkipLink";

export function Layout({
  nav,
  offline,
  overlays = [],
}: {
  nav: NavItem[];
  offline: boolean;
  overlays?: ReactElement[];
}) {
  return (
    <RouteRegistryContext value={nav.map((item) => item.path)}>
      <SkipLink />
      {offline && (
        <div className="print:hidden">
          <OfflineBanner />
        </div>
      )}
      <div className="print:hidden">
        <Header nav={nav} />
      </div>
      <div className="mx-auto flex max-w-6xl gap-8 p-8 print:block print:max-w-none print:p-0">
        <SideNav nav={nav} />
        <main id="tresc" tabIndex={-1} className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
      <Footer />
      {overlays.map((overlay, index) => (
        <div key={index} className="print:hidden">
          {overlay}
        </div>
      ))}
    </RouteRegistryContext>
  );
}
