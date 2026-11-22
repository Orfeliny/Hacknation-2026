import { ObservationsPage } from "./ObservationsPage";

export default {
  path: "/obserwacje",
  navLabel: "Dziennik obserwacji",
  order: 32,
  roles: ["supervisor", "hr"],
  element: <ObservationsPage />,
};
