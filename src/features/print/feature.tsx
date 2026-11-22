import { PrintPage } from "./PrintPage";

// The review id travels in the query string (/druk?ocena=<id>): the menu is built from every
// feature path, so a path with :id would put a dead link in it.
export default {
  path: "/druk",
  navLabel: "Wydruk",
  order: 60,
  hideInNav: true,
  element: <PrintPage />,
};
