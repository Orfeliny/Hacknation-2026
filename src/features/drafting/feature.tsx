import { DraftingPage } from "./DraftingPage";

// The review wizard already links to /projekt?ocena=<id>.
export default {
  path: "/projekt",
  navLabel: "Projekt oceny",
  order: 25,
  element: <DraftingPage />,
};
