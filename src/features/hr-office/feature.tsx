import { HrOfficePage } from "./HrOfficePage";

export default {
  path: "/kadry",
  navLabel: "Pulpit",
  order: 10,
  roles: ["hr"],
  startFor: ["hr"],
  element: <HrOfficePage />,
};
