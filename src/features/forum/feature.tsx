import { ForumPage } from "./ForumPage";

export default {
  path: "/forum",
  navLabel: "Forum",
  order: 55,
  element: <ForumPage />,
  navHide: [
    {
      profile: "asystent",
      roles: ["supervisor", "employee", "hr", "director", "admin"],
    },
  ],
};
