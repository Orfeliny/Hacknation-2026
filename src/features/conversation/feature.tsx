import { ConversationPage } from "./ConversationPage";

export default {
  path: "/rozmowy",
  navLabel: "Rozmowy",
  order: 30,
  roles: ["supervisor"],
  element: <ConversationPage />,
};
