import type { SVGAttributes } from "react";

const paths = {
  info: "M12 11v6m0-10v.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
  success: "m8 12 3 3 5-6M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
  warning:
    "M12 9v5m0 3v.01M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z",
  danger: "M12 8v5m0 3v.01M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3L8.3 3Z",
  external:
    "M14 4h6v6m0-6L10 14M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  sparkle: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z",
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  className = "size-5",
  ...props
}: { name: IconName } & Omit<SVGAttributes<SVGSVGElement>, "name">) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
