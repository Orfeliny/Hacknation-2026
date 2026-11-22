import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { RouteLink } from "../../app/index";
import { conversationPath, type DashboardRow } from "./model";

export type Reminder = FunctionReturnType<
  typeof api.hrDashboard.queries.myReminders
>[number];

export type GrowthOption = FunctionReturnType<
  typeof api.growth.options.listOptions
>[number];

const PANEL = "border-border space-y-4 rounded-xl border bg-white px-6 py-5";
const BUTTON =
  "border-border text-ink hover:bg-surface-muted rounded-lg border px-4 font-semibold";

function Feedback({
  reminders,
  rows,
}: {
  reminders: Reminder[] | undefined;
  rows: DashboardRow[];
}) {
  const nudges = (reminders ?? []).flatMap((r) => {
    const row = rows.find((x) => x.reviewId === r.reviewId);
    return r.kind === "feedback_nudge" && row ? [{ r, row }] : [];
  });
  return (
    <section aria-labelledby="h-feedback" className={PANEL}>
      <div>
        <h2 id="h-feedback" className="text-xl font-bold">
          Bieżąca informacja zwrotna
        </h2>
        <p className="text-muted mt-1 text-[15px]">
          To tylko zalecenia. Nikt nie sprawdza, czy z nich korzystasz.
        </p>
      </div>
      {reminders === undefined ? null : nudges.length === 0 ? (
        <p>Na razie nic nie warto przypominać.</p>
      ) : (
        <ul className="space-y-3">
          {nudges.map(({ r, row }) => (
            <li
              key={r._id}
              className="border-divider flex flex-col items-start gap-2 rounded-[10px] border px-4 py-3.5"
            >
              <span className="font-bold">Może warto porozmawiać</span>
              <span>{r.message}</span>
              <RouteLink
                to={conversationPath(row, "biezaca")}
                className={BUTTON}
              >
                Przygotuj rozmowę bieżącą
                <span className="sr-only">: {row.employeeName}</span>
              </RouteLink>
            </li>
          ))}
        </ul>
      )}
      <p className="text-muted text-sm">
        Podpowiedzi powstają na podstawie terminów i Twoich obserwacji.
      </p>
    </section>
  );
}

function Growth({ options }: { options: GrowthOption[] | undefined }) {
  const newest = options
    ?.slice()
    .sort((a, b) => b._creationTime - a._creationTime)
    .at(0);
  if (!newest) return null;
  return (
    <section aria-labelledby="h-forum" className={`${PANEL} !space-y-2`}>
      <h2 id="h-forum" className="text-xl font-bold">
        Nowe w Forum rozwoju
      </h2>
      <p>{newest.title}</p>
      <RouteLink to="/rozwoj" className="text-primary font-semibold">
        Zobacz oferty
      </RouteLink>
    </section>
  );
}

export function Aside({
  reminders,
  rows,
  options,
}: {
  reminders: Reminder[] | undefined;
  rows: DashboardRow[];
  options: GrowthOption[] | undefined;
}) {
  return (
    <aside
      aria-label="Podpowiedzi"
      className="flex min-w-0 grow basis-[300px] flex-col gap-6"
    >
      <Feedback reminders={reminders} rows={rows} />
      <Growth options={options} />
    </aside>
  );
}
