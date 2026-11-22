import { MePage } from "./MePage";

export default {
  path: "/moja-ocena",
  navLabel: "Moja ocena",
  order: 35,
  roles: ["employee"],
  startFor: ["employee"],
  element: <MePage />,
};
