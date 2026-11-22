import { HandoverPage } from "./HandoverPage";

export default {
  path: "/zmiana-oceniajacego",
  navLabel: "Zmiana oceniającego",
  order: 35,
  roles: ["supervisor"],
  element: <HandoverPage />,
};
