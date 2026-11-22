import { RouteLink } from "../../app/index";
import { ExternalLink } from "../../components/ui/ExternalLink";
import { Icon } from "../../components/ui/Icon";
import { formatDate } from "../../lib/format";
import { CalendarIcon, ClockIcon } from "./icons";
import {
  actionFor,
  dayCount,
  formalGaps,
  handoverCount,
  procedureStats,
  shiftPath,
  shortDate,
  SOON_DAYS,
  stageNote,
  type DashboardRow,
  type HandoverSummary,
  type ShiftEntry,
  type TodoItem,
} from "./model";

const CARD =
  "border-border flex flex-col gap-2 rounded-[10px] border bg-white px-[18px] py-4";
const ACTION = "mt-auto pt-1";

function DateLine({
  text,
  tone,
  clock,
}: {
  text: string;
  tone: "danger" | "warning" | "ink";
  clock: boolean;
}) {
  const color =
    tone === "danger"
      ? "text-danger"
      : tone === "warning"
        ? "text-warning"
        : "text-ink";
  return (
    <span className={`flex items-center gap-2 font-bold ${color}`}>
      {clock ? <ClockIcon /> : <CalendarIcon />}
      {text}
    </span>
  );
}

function ReviewCard({ row }: { row: DashboardRow }) {
  const action = actionFor(row);
  const note = stageNote(row);
  const overdue = row.daysLeft !== null && row.daysLeft < 0;
  const soon = row.daysLeft !== null && row.daysLeft <= SOON_DAYS;
  return (
    <li className={CARD}>
      {row.dueDate && row.daysLeft !== null && (
        <DateLine
          text={`${shortDate(row.dueDate)} · ${dayCount(row.daysLeft)}`}
          tone={overdue ? "danger" : soon ? "warning" : "ink"}
          clock={soon}
        />
      )}
      {row.shiftedFrom && (
        <p className="text-info text-sm font-semibold">
          Termin przesunięty z {formatDate(row.shiftedFrom)}
        </p>
      )}
      <span className="text-lg font-bold">{row.stageLabel}</span>
      <span>{row.employeeName}</span>
      {row.gapCount > 0 && (
        <span className="text-danger flex items-center gap-1.5 text-sm font-semibold">
          <Icon name="danger" className="size-4 shrink-0" />
          {formalGaps(row.gapCount)}
        </span>
      )}
      {note && (
        <span className="text-muted text-sm">
          {note.text}
          {note.basis && (
            <>
              {" "}
              Podstawa:{" "}
              <ExternalLink
                href={note.basis.href}
                aria-label={`${note.basis.ariaLabel} (otwiera się w nowej karcie)`}
              >
                {note.basis.label}
              </ExternalLink>
            </>
          )}
        </span>
      )}
      <div className={ACTION}>
        <RouteLink to={action.to} className="text-primary font-semibold">
          {action.label}
          <span className="sr-only">{action.srSuffix}</span>
        </RouteLink>
      </div>
    </li>
  );
}

function ShiftCard({ shift }: { shift: ShiftEntry }) {
  return (
    <li className={CARD}>
      <DateLine
        text={`Wniosek z ${formatDate(shift.createdAt).slice(0, 5)}`}
        tone="ink"
        clock={false}
      />
      <span className="text-lg font-bold">Wniosek o przesunięcie terminu</span>
      <span>{shift.employeeName}</span>
      <span className="text-muted text-sm">
        Decyzja należy do Ciebie. Nie musisz uwzględnić wniosku.
      </span>
      <div className={ACTION}>
        <RouteLink
          to={shiftPath(shift.reviewId, shift.changeIndex)}
          className="text-primary font-semibold"
        >
          Rozstrzygnij wniosek
          <span className="sr-only">: {shift.employeeName}</span>
        </RouteLink>
      </div>
    </li>
  );
}

function HandoverCard({ summary }: { summary: HandoverSummary }) {
  const { dueDate, daysLeft } = summary;
  const soon = daysLeft !== null && daysLeft <= SOON_DAYS;
  return (
    <li className={CARD}>
      {dueDate && daysLeft !== null && (
        <DateLine
          text={`do ${shortDate(dueDate).replace(/^\S+\s/, "")} · ${dayCount(daysLeft)}`}
          tone={daysLeft < 0 ? "danger" : soon ? "warning" : "ink"}
          clock={soon}
        />
      )}
      <span className="text-lg font-bold">Zmiana oceniającego</span>
      <span>{handoverCount(summary.count)}</span>
      <span className="text-muted text-sm">
        Zdecyduj o ocenach i o przekazaniu obserwacji.
      </span>
      <div className={ACTION}>
        <RouteLink
          to="/zmiana-oceniajacego"
          className="text-primary font-semibold"
        >
          Podejmij decyzje
        </RouteLink>
      </div>
    </li>
  );
}

function Stat({
  value,
  tone,
  children,
}: {
  value: number;
  tone: "danger" | "warning";
  children: string;
}) {
  const color =
    value === 0
      ? "text-ink"
      : tone === "danger"
        ? "text-danger"
        : "text-warning";
  return (
    <li>
      <strong className={color}>{value}</strong> {children}
    </li>
  );
}

export function TodoSection({
  items,
  handover,
}: {
  items: TodoItem[];
  handover: HandoverSummary | null;
}) {
  const stats = procedureStats(
    items.flatMap((i) => (i.kind === "review" ? [i.row] : [])),
  );
  const empty = items.length === 0 && handover === null;
  return (
    <section
      aria-labelledby="h-dzialania"
      className="border-border space-y-5 rounded-xl border bg-white p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <h2 id="h-dzialania" className="text-[22px] font-bold">
            Do zrobienia
          </h2>
          <p className="text-muted mt-1 text-[15px]">
            Sprawy, które czekają na Ciebie, od najbliższego terminu.
          </p>
        </div>
        <ul
          aria-label="Stan procedury"
          className="text-muted flex flex-wrap gap-x-5 gap-y-2 text-[15px]"
        >
          <Stat value={stats.overdue} tone="danger">
            po terminie
          </Stat>
          <Stat
            value={stats.soon}
            tone="warning"
          >{`w ciągu ${SOON_DAYS} dni`}</Stat>
          <Stat value={stats.gaps} tone="danger">
            braki formalne
          </Stat>
        </ul>
      </div>
      {empty ? (
        <p>Nic nie czeka na Twoją decyzję.</p>
      ) : (
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          {items.map((item) =>
            item.kind === "review" ? (
              <ReviewCard key={`r-${item.row.reviewId}`} row={item.row} />
            ) : (
              <ShiftCard
                key={`s-${item.shift.reviewId}-${item.shift.changeIndex}`}
                shift={item.shift}
              />
            ),
          )}
          {handover && <HandoverCard summary={handover} />}
        </ol>
      )}
    </section>
  );
}
