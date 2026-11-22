import { AdvicePage } from "./AdvicePage";

export default {
  path: "/porady",
  navLabel: "Porady",
  order: 52,
  element: <AdvicePage />,
  navGroup: "help" as const,
  navHide: [{ profile: "asystent", roles: ["hr", "director", "admin"] }],
};
