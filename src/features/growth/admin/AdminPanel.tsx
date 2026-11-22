import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import {
  ADVICE_TOPIC_LABELS,
  DEVELOPMENT_FORM_LABELS,
  GROWTH_SOURCE_LABELS,
} from "../../../../convex/growth/constants";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { StatusAlert } from "../../../components/ui/StatusAlert";
import { useDemoRole } from "../../../lib/demoRole";
import { ArticleForm, ArticlePreview } from "./ArticleForm";
import { FormError } from "./fields";
import { messageOf } from "./helpers";
import { OptionForm } from "./OptionForm";

type Option = Doc<"developmentOptions">;
type Article = Doc<"adviceArticles">;
type Editing<T> = { kind: "none" } | { kind: "new" } | { kind: "edit"; row: T };

function Catalog() {
  const role = useDemoRole();
  const rows = useQuery(api.growth.admin.listOptionsAdmin, {
    actor: { role },
  });
  const setActive = useMutation(api.growth.admin.setOptionActive);
  const [editing, setEditing] = useState<Editing<Option>>({ kind: "none" });
  const [error, setError] = useState<string | null>(null);

  async function toggle(option: Option) {
    setError(null);
    try {
      await setActive({
        actor: { role },
        optionId: option._id,
        active: !option.active,
      });
    } catch (e) {
      setError(messageOf(e));
    }
  }

  if (editing.kind !== "none") {
    return (
      <OptionForm
        key={editing.kind === "edit" ? editing.row._id : "new"}
        option={editing.kind === "edit" ? editing.row : undefined}
        onDone={() => setEditing({ kind: "none" })}
      />
    );
  }
  return (
    <div className="space-y-3">
      <Button type="button" onClick={() => setEditing({ kind: "new" })}>
        Dodaj wpis
      </Button>
      <FormError message={error} />
      {rows === undefined ? (
        <p role="status">Ładowanie katalogu…</p>
      ) : rows.length === 0 ? (
        <p role="status">Katalog jest pusty.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((option) => (
            <li key={option._id}>
              <Card className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{option.title}</p>
                  <p className="flex flex-wrap gap-2 text-xs">
                    <span>{DEVELOPMENT_FORM_LABELS[option.form]}</span>
                    <span>{GROWTH_SOURCE_LABELS[option.source]}</span>
                    {!option.active && <Badge>Wyłączony</Badge>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={`Edytuj wpis ${option.title}`}
                    onClick={() => setEditing({ kind: "edit", row: option })}
                  >
                    Edytuj
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={`${option.active ? "Wyłącz" : "Włącz"} wpis ${option.title}`}
                    onClick={() => void toggle(option)}
                  >
                    {option.active ? "Wyłącz" : "Włącz"}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Articles() {
  const role = useDemoRole();
  const rows = useQuery(api.growth.admin.listArticlesAdmin, {
    actor: { role },
  });
  const setPublished = useMutation(api.growth.admin.setArticlePublished);
  const [editing, setEditing] = useState<Editing<Article>>({ kind: "none" });
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(article: Article) {
    setError(null);
    try {
      await setPublished({
        actor: { role },
        articleId: article._id,
        published: !article.published,
      });
    } catch (e) {
      setError(messageOf(e));
    }
  }

  if (editing.kind !== "none") {
    return (
      <ArticleForm
        key={editing.kind === "edit" ? editing.row._id : "new"}
        article={editing.kind === "edit" ? editing.row : undefined}
        onDone={() => setEditing({ kind: "none" })}
      />
    );
  }
  return (
    <div className="space-y-3">
      <Button type="button" onClick={() => setEditing({ kind: "new" })}>
        Dodaj poradę
      </Button>
      <FormError message={error} />
      {rows === undefined ? (
        <p role="status">Ładowanie porad…</p>
      ) : rows.length === 0 ? (
        <p role="status">Nie ma jeszcze porad.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((article) => (
            <li key={article._id} className="space-y-2">
              <Card className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{article.title}</p>
                  <p className="flex flex-wrap gap-2 text-xs">
                    <span>{ADVICE_TOPIC_LABELS[article.topic]}</span>
                    <Badge>
                      {article.published ? "Opublikowana" : "Szkic"}
                    </Badge>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={`Podgląd porady ${article.title}`}
                    aria-expanded={previewId === article._id}
                    onClick={() =>
                      setPreviewId(
                        previewId === article._id ? null : article._id,
                      )
                    }
                  >
                    {previewId === article._id ? "Ukryj podgląd" : "Podgląd"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={`Edytuj poradę ${article.title}`}
                    onClick={() => setEditing({ kind: "edit", row: article })}
                  >
                    Edytuj
                  </Button>
                  <Button
                    type="button"
                    aria-label={`${article.published ? "Wycofaj" : "Opublikuj"} poradę ${article.title}`}
                    onClick={() => void toggle(article)}
                  >
                    {article.published ? "Wycofaj" : "Opublikuj"}
                  </Button>
                </div>
              </Card>
              {previewId === article._id && (
                <ArticlePreview
                  title={article.title}
                  summary={article.summary}
                  sections={article.sections}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// HR only. The demo role is a stand-in for login (#42): the backend checks it too, but it is not real security.
export function AdminPanel() {
  const role = useDemoRole();
  const [tab, setTab] = useState<"catalog" | "advice">("catalog");
  if (role !== "hr") {
    return (
      <StatusAlert tone="warning">
        Zarządzanie treścią katalogu i porad jest dostępne dla roli „Kadry”.
      </StatusAlert>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="group" aria-label="Rodzaj treści">
        <Button
          type="button"
          aria-pressed={tab === "catalog"}
          variant={tab === "catalog" ? "primary" : "secondary"}
          onClick={() => setTab("catalog")}
        >
          Katalog rozwoju
        </Button>
        <Button
          type="button"
          aria-pressed={tab === "advice"}
          variant={tab === "advice" ? "primary" : "secondary"}
          onClick={() => setTab("advice")}
        >
          Porady
        </Button>
      </div>
      {tab === "catalog" ? <Catalog /> : <Articles />}
    </div>
  );
}
