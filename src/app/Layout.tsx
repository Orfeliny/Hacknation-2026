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
      <div className="flex print:block">
        <SideNav nav={nav} />
        <main
          id="tresc"
          tabIndex={-1}
          className="max-w-[1180px] min-w-0 flex-1 px-10 py-8 print:max-w-none print:p-0"
        >
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
