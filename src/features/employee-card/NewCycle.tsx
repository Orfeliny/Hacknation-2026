import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DemoDataNote } from "../../components/ui/DemoDataNote";
import { Field } from "../../components/ui/Field";
import { DateField } from "../../components/ui/DateField";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import { formatDate } from "../../lib/format";

type Errors = { start?: string; reason?: string };

export function NewCycle({ name }: { name: string }) {
  const [start, setStart] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formKey, setFormKey] = useState(0);
  const [done, setDone] = useState<string | undefined>();

  function submit(event: FormEvent) {
    event.preventDefault();
    const found: Errors = {};
    if (!start) found.start = "Podaj początek nowego cyklu.";
    if (!reason.trim()) found.reason = "Uzasadnienie jest wymagane.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setDone(
      `Podgląd: nowy cykl dla ${name} zaczynałby się ${formatDate(start)}. Nic nie zostało zapisane w systemie.`,
    );
    setStart("");
    setFormKey((k) => k + 1);
    setReason("");
  }

  return (
    <Card>
      <form
        noValidate
        onSubmit={submit}
        className="space-y-4"
        aria-labelledby="h-cykl"
      >
        <div>
          <h2 id="h-cykl" className="text-section font-bold">
            Nowy cykl oceny
          </h2>
          <p className="max-w-[72ch]">
            Przepisy nie opisują każdej sytuacji, na przykład powrotu po kilku
            latach na inne stanowisko i do innego przełożonego. Wtedy możesz
            zakończyć obecny cykl i ręcznie rozpocząć nowy.
          </p>
        </div>
        <DemoDataNote />
        {done ? <StatusAlert tone="success">{done}</StatusAlert> : null}
        <div>
          <DateField
            key={formKey}
            label="Początek nowego cyklu"
            value={start}
            onChange={setStart}
          />
          {errors.start ? (
            <p className="text-danger mt-1 text-sm font-semibold">
              {errors.start}
            </p>
          ) : null}
        </div>
        <Field
          label="Uzasadnienie (wymagane)"
          hint="Uzasadnienie trafi do dziennika zdarzeń."
          error={errors.reason}
        >
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <Button type="submit">Rozpocznij nowy cykl</Button>
      </form>
    </Card>
  );
}
