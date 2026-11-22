import { DeadlineShiftPage } from "./DeadlineShiftPage";

export default {
  path: "/przesuniecie-terminu",
  navLabel: "Przesunięcie terminu",
  order: 25,
  roles: ["supervisor"],
  hideInNav: true,
  element: <DeadlineShiftPage />,
};
