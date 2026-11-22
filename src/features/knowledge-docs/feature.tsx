import { KnowledgeDocsPage } from "./KnowledgeDocsPage";

export default {
  path: "/ustawienia/dokumenty",
  navLabel: "Dokumenty urzędu",
  order: 65,
  roles: ["hr", "admin"],
  element: <KnowledgeDocsPage />,
};
