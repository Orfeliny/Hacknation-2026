import { EmployeeResultPage } from "./EmployeeResultPage";

export default {
  path: "/wynik-oceny",
  navLabel: "Wynik oceny",
  order: 36,
  roles: ["employee"],
  hideInNav: true,
  element: <EmployeeResultPage />,
};
