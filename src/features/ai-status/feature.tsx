import { AiStatusPage } from "./AiStatusPage";

export default {
  path: "/model-ai",
  navLabel: "Model AI",
  order: 80,
  element: <AiStatusPage />,
  navHide: [
    {
      profile: "asystent",
      roles: ["supervisor", "employee", "hr", "director", "admin"],
    },
  ],
};
