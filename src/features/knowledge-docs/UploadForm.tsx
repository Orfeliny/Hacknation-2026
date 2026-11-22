import { useState, type FormEvent } from "react";
import { z } from "zod";
import {
  KNOWLEDGE_LIMITS,
  type KnowledgeDocumentRow,
} from "../../../convex/lib/contracts/knowledgeDocs";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { StatusAlert } from "../../components/ui/StatusAlert";
import {
  useGenerateUploadUrl,
  useRegisterDocument,
} from "../../lib/backend/knowledgeDocs";
import { demoId } from "../../lib/backend/useDemo";

const SUPPORTED = /\.(pdf|docx|html?|md)$/i;
const uploadResponse = z.object({ storageId: z.string().min(1) });

type Scope = Extract<KnowledgeDocumentRow["scope"], "office" | "unit">;
type Errors = Partial<Record<"title" | "file" | "unit", string>>;

function validate(
  title: string,
  file: File | null,
  scope: Scope,
  unit: string,
): Errors {
  const errors: Errors = {};
  if (!title.trim()) errors.title = "Wpisz tytuł dokumentu.";
  else if (title.trim().length > KNOWLEDGE_LIMITS.title)
    errors.title = `Tytuł może mieć najwyżej ${KNOWLEDGE_LIMITS.title} znaków.`;
  if (!file) errors.file = "Wybierz plik do dodania.";
  else if (/\.doc$/i.test(file.name))
    errors.file = "Pliki .doc nie są obsługiwane: zapisz dokument jako DOCX.";
  else if (!SUPPORTED.test(file.name))
    errors.file = "Obsługiwane formaty: PDF, DOCX, HTML i Markdown.";
  else if (file.size > KNOWLEDGE_LIMITS.maxFileBytes)
    errors.file = "Plik może mieć najwyżej 20 MB.";
  if (scope === "unit" && !unit.trim())
    errors.unit = "Wpisz nazwę komórki organizacyjnej.";
  return errors;
}

export function UploadForm({ offline }: { offline: boolean }) {
  const generateUploadUrl = useGenerateUploadUrl();
  const register = useRegisterDocument();
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<Scope>("office");
  const [unit, setUnit] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    { tone: "success" | "danger"; text: string } | undefined
  >();

  async function upload(chosen: File): Promise<Id<"_storage">> {
    const url = await generateUploadUrl({});
    if (offline) return demoId("_storage", `upload-${Date.now()}`);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": chosen.type || "application/octet-stream" },
      body: chosen,
    });
    if (!response.ok) throw new Error("upload failed");
    return uploadResponse.parse(await response.json())
      .storageId as Id<"_storage">;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(title, file, scope, unit);
    setErrors(found);
    setResult(undefined);
    if (Object.keys(found).length > 0 || !file) return;
    setBusy(true);
    try {
      const storageId = await upload(file);
      await register({
        storageId,
        title: title.trim(),
        fileName: file.name,
        scope,
        ...(scope === "unit" ? { unit: unit.trim() } : {}),
      });
      setResult({
        tone: "success",
        text: `Dodano dokument „${title.trim()}”. Status: w kolejce do indeksowania.`,
      });
      setTitle("");
      setUnit("");
      setFile(null);
      setFileKey((key) => key + 1);
    } catch {
      setResult({
        tone: "danger",
        text: "Nie udało się dodać dokumentu. Spróbuj ponownie.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form
        onSubmit={(event) => void onSubmit(event)}
        noValidate
        className="flex flex-col gap-4"
      >
        <h2 className="text-ink text-xl font-bold">Dodaj dokument</h2>
        <Field label="Tytuł dokumentu" error={errors.title}>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field
          label="Plik"
          hint="PDF, DOCX, HTML lub Markdown, do 20 MB."
          error={errors.file}
        >
          <Input
            key={fileKey}
            type="file"
            accept=".pdf,.docx,.html,.htm,.md"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </Field>
        <Field label="Zakres">
          <Select
            value={scope}
            onChange={(event) => setScope(event.target.value as Scope)}
          >
            <option value="office">Cały urząd</option>
            <option value="unit">Komórka organizacyjna</option>
          </Select>
        </Field>
        {scope === "unit" ? (
          <Field
            label="Komórka organizacyjna"
            hint="Dokument będzie cytowany tylko osobom z tej komórki."
            error={errors.unit}
          >
            <Input
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
            />
          </Field>
        ) : null}
        <div>
          <Button type="submit" disabled={busy}>
            {busy ? "Dodawanie…" : "Dodaj dokument do bazy wiedzy"}
          </Button>
        </div>
        {result ? (
          <StatusAlert tone={result.tone}>{result.text}</StatusAlert>
        ) : null}
      </form>
    </Card>
  );
}
