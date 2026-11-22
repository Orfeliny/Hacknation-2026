import { Button } from "../../components/ui/Button";
import { formatDate } from "../../lib/format";
import type { Reminder } from "./types";

export function RemindersPanel({
  reminders,
  onDismiss,
}: {
  reminders: readonly Reminder[];
  onDismiss: (reminder: Reminder) => void;
}) {
  return (
    <section aria-labelledby="h-powiad" className="space-y-3">
      <h2 id="h-powiad" className="text-xl font-bold">
        Moje przypomnienia
      </h2>
      {reminders.length === 0 ? (
        <p>Nie masz otwartych przypomnień.</p>
      ) : (
        <ul className="space-y-3">
          {reminders.map((r) => (
            <li key={r._id} className="border-divider border-b pb-3">
              <div>{r.message}</div>
              <div className="text-muted text-sm">
                Termin: {formatDate(r.dueDate)}
              </div>
              <Button
                variant="secondary"
                className="mt-2"
                onClick={() => onDismiss(r)}
              >
                {`Odrzuć przypomnienie (termin ${formatDate(r.dueDate)}): ${r.message}`}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
