import { EmployeeCardPage } from "./EmployeeCardPage";

export default {
  path: "/kadry/pracownik",
  navLabel: "Karta pracownika",
  order: 53,
  roles: ["hr"],
  hideInNav: true,
  element: <EmployeeCardPage />,
};
