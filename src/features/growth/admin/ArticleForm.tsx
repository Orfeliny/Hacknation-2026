import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { parseArticleInput } from "../../../../convex/growth/adminValidation";
import {
  ADVICE_TOPICS,
  ADVICE_TOPIC_LABELS,
  type AdviceTopic,
} from "../../../../convex/growth/constants";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { useDemoRole } from "../../../lib/demoRole";
import { Field, FormError, TextField } from "./fields";
import { messageOf, selectClass, textareaClass } from "./helpers";

type Article = Doc<"adviceArticles">;
type Section = Article["sections"][number];

// Paragraphs are separated by a blank line, bullets by a line break.
type SectionDraft = { heading: string; paragraphs: string; bullets: string };

const toDraft = (section: Section): SectionDraft => ({
  heading: section.heading,
  paragraphs: section.paragraphs.join("\n\n"),
  bullets: section.bullets.join("\n"),
});

const lines = (value: string, separator: RegExp) =>
  value
    .split(separator)
    .map((line) => line.trim())
    .filter(Boolean);

const toSection = (draft: SectionDraft): Section => ({
  heading: draft.heading,
  paragraphs: lines(draft.paragraphs, /\n\s*\n/),
  bullets: lines(draft.bullets, /\n/),
});

export function ArticlePreview({
  title,
  summary,
  sections,
}: {
  title: string;
  summary: string;
  sections: Section[];
}) {
  return (
    <Card className="space-y-3" aria-label="Podgląd porady">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-slate-700">{summary}</p>
      {sections.map((section, index) => (
        <div key={index} className="space-y-1">
          <h4 className="font-medium">{section.heading}</h4>
          {section.paragraphs.map((paragraph, i) => (
            <p key={i} className="text-sm">
              {paragraph}
            </p>
          ))}
          {section.bullets.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-sm">
              {section.bullets.map((bullet, i) => (
                <li key={i}>{bullet}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </Card>
  );
}

export function ArticleForm({
  article,
  onDone,
}: {
  article?: Article;
  onDone: () => void;
}) {
  const role = useDemoRole();
  const save = useMutation(api.growth.admin.saveArticle);
  const [title, setTitle] = useState(article?.title ?? "");
  const [summary, setSummary] = useState(article?.summary ?? "");
  const [topic, setTopic] = useState<AdviceTopic>(article?.topic ?? "inne");
  const [minutes, setMinutes] = useState(
    article?.readingMinutes ? String(article.readingMinutes) : "",
  );
  const [sourceRef, setSourceRef] = useState(article?.sourceRef ?? "");
  const [sections, setSections] = useState<SectionDraft[]>(
    article?.sections.map(toDraft) ?? [
      { heading: "", paragraphs: "", bullets: "" },
    ],
  );
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function change(index: number, patch: Partial<SectionDraft>) {
    setSections((all) =>
      all.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  function build() {
    const readingMinutes = minutes.trim() === "" ? undefined : Number(minutes);
    return {
      title,
      summary,
      sections: sections.map(toSection),
      ...(readingMinutes === undefined ? {} : { readingMinutes }),
      sourceRef,
    };
  }

  function check(): ReturnType<typeof build> | null {
    const fields = build();
    try {
      parseArticleInput(fields);
      setError(null);
      return fields;
    } catch (e) {
      setError(messageOf(e));
      return null;
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const fields = check();
    if (!fields) return;
    setBusy(true);
    try {
      await save({
        actor: { role },
        ...(article ? { articleId: article._id } : {}),
        ...fields,
        topic,
      });
      onDone();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  const draft = build();

  return (
    <form
      onSubmit={(e) => void submit(e)}
      aria-label={article ? "Edycja porady" : "Nowa porada"}
      className="space-y-3"
      noValidate
    >
      <TextField
        id="art-title"
        label="Tytuł"
        value={title}
        onChange={setTitle}
      />
      <Field id="art-summary" label="Streszczenie">
        <textarea
          id="art-summary"
          className={textareaClass}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="art-topic" label="Temat">
          <select
            id="art-topic"
            className={selectClass}
            value={topic}
            onChange={(e) => setTopic(e.target.value as AdviceTopic)}
          >
            {ADVICE_TOPICS.map((value) => (
              <option key={value} value={value}>
                {ADVICE_TOPIC_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>
        <TextField
          id="art-minutes"
          label="Czas czytania w minutach (opcjonalnie)"
          type="number"
          value={minutes}
          onChange={setMinutes}
        />
      </div>
      <TextField
        id="art-source"
        label="Źródło (opcjonalnie)"
        value={sourceRef}
        onChange={setSourceRef}
      />

      {sections.map((section, index) => (
        <fieldset
          key={index}
          className="space-y-2 rounded-md border border-slate-200 p-3"
        >
          <legend className="px-1 text-sm font-medium">
            Sekcja {index + 1}
          </legend>
          <TextField
            id={`art-heading-${index}`}
            label={`Nagłówek sekcji ${index + 1}`}
            value={section.heading}
            onChange={(heading) => change(index, { heading })}
          />
          <Field
            id={`art-paragraphs-${index}`}
            label={`Akapity sekcji ${index + 1}`}
            hint="Akapity oddziel pustą linią."
          >
            <textarea
              id={`art-paragraphs-${index}`}
              className={textareaClass}
              value={section.paragraphs}
              onChange={(e) => change(index, { paragraphs: e.target.value })}
            />
          </Field>
          <Field
            id={`art-bullets-${index}`}
            label={`Punkty sekcji ${index + 1}`}
            hint="Każdy punkt w osobnej linii."
          >
            <textarea
              id={`art-bullets-${index}`}
              className={textareaClass}
              value={section.bullets}
              onChange={(e) => change(index, { bullets: e.target.value })}
            />
          </Field>
          {sections.length > 1 && (
            <Button
              type="button"
              className="bg-slate-600"
              onClick={() =>
                setSections((all) => all.filter((_, i) => i !== index))
              }
            >
              Usuń sekcję {index + 1}
            </Button>
          )}
        </fieldset>
      ))}
      <Button
        type="button"
        className="bg-slate-600"
        onClick={() =>
          setSections((all) => [
            ...all,
            { heading: "", paragraphs: "", bullets: "" },
          ])
        }
      >
        Dodaj sekcję
      </Button>

      {previewing && (
        <ArticlePreview
          title={draft.title}
          summary={draft.summary}
          sections={draft.sections}
        />
      )}
      <FormError message={error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          Zapisz poradę
        </Button>
        <Button
          type="button"
          className="bg-slate-600"
          onClick={() => {
            if (previewing) setPreviewing(false);
            else if (check()) setPreviewing(true);
          }}
        >
          {previewing ? "Ukryj podgląd" : "Podgląd"}
        </Button>
        <Button type="button" className="bg-slate-600" onClick={onDone}>
          Anuluj
        </Button>
      </div>
    </form>
  );
}
