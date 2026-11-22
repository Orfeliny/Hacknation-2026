import { BlogPage } from "./BlogPage";

export default {
  path: "/blog-rozwoju",
  navLabel: "Blog rozwoju",
  order: 49,
  element: <BlogPage />,
  navHide: [
    {
      profile: "asystent",
      roles: ["supervisor", "employee", "hr", "director", "admin"],
    },
  ],
};
