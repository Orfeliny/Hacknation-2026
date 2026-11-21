import { DevRoute } from "./DevRoute";

export default {
  path: "/dev/model-domain",
  navLabel: "Model domeny (dev)",
  order: 900,
  devOnly: true,
  element: <DevRoute />,
};
