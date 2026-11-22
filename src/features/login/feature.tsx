import { LoginPage } from "./LoginPage";

export default {
  path: "/logowanie",
  navLabel: "Logowanie",
  order: 200,
  hideInNav: true,
  element: <LoginPage />,
  layout: "bare" as const,
};
