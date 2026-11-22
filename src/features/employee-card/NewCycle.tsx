import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DemoDataNote } from "../../components/ui/DemoDataNote";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { Textarea } from "../../components/ui/Textarea";
import { formatDate } from "../../lib/format";

type Errors = { start?: string; reason?: string };

export function NewCycle({ name }: { name: string }) {
  const [start, setStart] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState<string | undefined>();

  function submit(event: FormEvent) {
    event.preventDefault();
    const found: Errors = {};
    if (!start) found.start = "Podaj początek nowego cyklu.";
    if (!reason.trim()) found.reason = "Uzasadnienie jest wymagane.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setDone(`Nowy cykl oceny dla ${name} zaczyna się ${formatDate(start)}.`);
    setStart("");
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
          <h2 id="h-cykl" className="text-lg font-bold">
            Nowy cykl oceny
          </h2>
          <p className="text-muted text-sm">
            Przepisy nie opisują każdej sytuacji, na przykład powrotu po kilku
            latach na inne stanowisko i do innego przełożonego. Wtedy możesz
            zakończyć obecny cykl i ręcznie rozpocząć nowy.
          </p>
        </div>
        <DemoDataNote />
        {done ? <StatusAlert tone="success">{done}</StatusAlert> : null}
        <Field label="Początek nowego cyklu" error={errors.start}>
          <Input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
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
