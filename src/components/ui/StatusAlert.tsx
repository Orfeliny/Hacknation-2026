import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type Tone = "danger" | "warning" | "info" | "success";

const toneClass: Record<Tone, string> = {
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
  success: "text-success",
};

const toneIcon: Record<Tone, IconName> = {
  danger: "danger",
  warning: "warning",
  info: "info",
  success: "success",
};

export function StatusAlert({
  tone,
  children,
  className = "",
  live = true,
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
  live?: boolean;
}) {
  return (
    <div
      role={live ? (tone === "danger" ? "alert" : "status") : undefined}
      className={`border-border flex items-start gap-2 rounded-md border bg-white p-3 ${className}`}
    >
      <Icon
        name={toneIcon[tone]}
        className={`mt-0.5 size-5 shrink-0 ${toneClass[tone]}`}
      />
      <div className={`font-semibold ${toneClass[tone]}`}>{children}</div>
    </div>
  );
}
