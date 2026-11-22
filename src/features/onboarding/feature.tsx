import { OnboardingDialog } from "./OnboardingDialog";
import { OnboardingPage } from "./OnboardingPage";

export default {
  path: "/przewodnik",
  navLabel: "Przewodnik",
  order: 90,
  hideInNav: true,
  element: <OnboardingPage />,
  overlay: <OnboardingDialog />,
};
