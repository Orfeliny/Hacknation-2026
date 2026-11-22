import { RegulationsPage } from "./RegulationsPage";

export default {
  path: "/przepisy",
  navLabel: "Przepisy",
  order: 70,
  element: <RegulationsPage />,
  navHide: [
    {
      profile: "asystent",
      roles: ["supervisor", "employee", "hr", "director", "admin"],
    },
  ],
};
