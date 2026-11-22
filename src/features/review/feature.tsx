import { ReviewPage } from "./ReviewPage";

export default {
  path: "/oceny",
  navLabel: "Oceny okresowe",
  order: 20,
  element: <ReviewPage />,
  roles: ["supervisor"] as "supervisor"[],
};
