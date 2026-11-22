import { HandoverPackagePage } from "./HandoverPackagePage";

export default {
  path: "/pakiet-nastepcy",
  navLabel: "Pakiet dla następcy",
  order: 36,
  roles: ["supervisor"],
  hideInNav: true,
  element: <HandoverPackagePage />,
};
