import { DashboardPage } from "./DashboardPage";

export default {
  path: "/pulpit",
  navLabel: "Pulpit",
  order: 5,
  element: <DashboardPage />,
  roles: ["supervisor"] as "supervisor"[],
  startFor: ["supervisor"] as "supervisor"[],
};
