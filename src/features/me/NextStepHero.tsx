import type { ReactNode } from "react";

export function NextStepHero({
  id,
  title,
  children,
  action,
}: {
  id: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="border-ink flex flex-wrap items-center justify-between gap-x-8 gap-y-4 rounded-xl border-2 bg-white p-6"
    >
      <div className="flex-1 basis-[420px] space-y-1">
        <p className="text-muted text-sm font-bold">Twój następny krok</p>
        <h2 id={id} className="text-[22px] font-bold">
          {title}
        </h2>
        <div className="max-w-[64ch]">{children}</div>
      </div>
      {action}
    </section>
  );
}
