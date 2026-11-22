import { HrPartnerPage } from "./HrPartnerPage";

export default {
  path: "/hr-partner",
  navLabel: "HR partner",
  order: 40,
  roles: ["supervisor"],
  element: <HrPartnerPage />,
  navHide: [{ profile: "asystent", roles: ["supervisor"] }],
};
