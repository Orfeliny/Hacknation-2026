import { ObservationsPage } from "./ObservationsPage";

export default {
  path: "/obserwacje",
  navLabel: "Dziennik obserwacji",
  order: 30,
  roles: ["supervisor", "hr"],
  element: <ObservationsPage />,
};
