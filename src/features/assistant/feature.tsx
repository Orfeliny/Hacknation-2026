import { AssistantPage } from "./AssistantPage";

export default {
  path: "/kompas",
  navLabel: "Kompas",
  order: 46,
  element: <AssistantPage />,
  navHide: [
    {
      profile: "asystent",
      roles: ["supervisor", "employee", "hr", "director", "admin"],
    },
  ],
};
