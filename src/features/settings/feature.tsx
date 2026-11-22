import { SettingsPage } from "./SettingsPage";

export default {
  path: "/ustawienia",
  navLabel: "Ustawienia",
  order: 90,
  roles: ["hr", "admin"],
  startFor: ["admin"],
  element: <SettingsPage />,
};
