import { FirstReviewPage } from "./FirstReviewPage";

export default {
  path: "/pierwsza-ocena",
  navLabel: "Pierwsza ocena",
  order: 22,
  profiles: ["kompas"] as const,
  roles: ["supervisor", "hr", "admin", "director"],
  element: <FirstReviewPage />,
};
