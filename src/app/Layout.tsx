import type { ReactElement } from "react";
import { Outlet, useLocation } from "react-router";
import { Footer } from "./Footer";
import { Header } from "./Header";
import type { NavItem } from "./navigation";
import logo160 from "./assets/azymut-logo-160.png";
import logo80 from "./assets/azymut-logo-80.png";
import { OfflineBanner } from "./OfflineBanner";
import { RouteRegistryContext } from "./routeRegistry";
import { SideNav } from "./SideNav";
import { SkipLink } from "./SkipLink";

function BareHeader() {
  return (
    <header className="border-divider border-b print:hidden">
      <div className="flex items-center gap-3 px-10 py-4">
        <img
          src={logo80}
          srcSet={`${logo80} 1x, ${logo160} 2x`}
          alt=""
          width={40}
          height={40}
        />
        <p className="text-primary text-lg font-bold">Azymut</p>
      </div>
    </header>
  );
}

export function Layout({
  nav,
  offline,
  overlays = [],
}: {
  nav: NavItem[];
  offline: boolean;
  overlays?: ReactElement[];
}) {
  const { pathname } = useLocation();
  const bare = nav.some(
    (item) => item.layout === "bare" && item.path === pathname,
  );
  if (bare) {
    return (
      <RouteRegistryContext value={nav.map((item) => item.path)}>
        <SkipLink />
        {offline && (
          <div className="print:hidden">
            <OfflineBanner />
          </div>
        )}
        <BareHeader />
        <main
          id="tresc"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1600px] min-w-0 px-10 py-8 print:max-w-none print:p-0"
        >
          <Outlet />
        </main>
        {overlays.map((overlay, index) => (
          <div key={index} className="print:hidden">
            {overlay}
          </div>
        ))}
      </RouteRegistryContext>
    );
  }
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
          className="max-w-[1600px] min-w-0 flex-1 px-10 py-8 print:max-w-none print:p-0"
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
