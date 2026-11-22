import { ObjectionsPage } from "./ObjectionsPage";

export default {
  path: "/sprzeciwy",
  navLabel: "Sprzeciwy",
  order: 45,
  roles: ["director", "hr", "admin"],
  startFor: ["director"],
  element: <ObjectionsPage />,
};
