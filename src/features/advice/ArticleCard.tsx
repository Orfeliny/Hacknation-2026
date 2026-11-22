import { useId, useState } from "react";
import type { AdviceListItem } from "../../../convex/lib/contracts/advice";
import { ADVICE_TOPIC_LABELS } from "../../../convex/growth/constants";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ArticleBody } from "./ArticleBody";

export function ArticleCard({ article }: { article: AdviceListItem }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const headingId = useId();
  const meta = [
    ADVICE_TOPIC_LABELS[article.topic],
    article.readingMinutes ? `${article.readingMinutes} min czytania` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      aria-labelledby={headingId}
      className="border-border flex flex-col gap-2 rounded-xl border bg-white p-5"
    >
      <p className="text-muted text-sm font-bold">{meta}</p>
      <h2 id={headingId} className="text-ink text-xl leading-snug font-bold">
        {article.title}
      </h2>
      <p>{article.summary}</p>
      <p className="text-muted flex flex-wrap items-center gap-2 text-sm">
        {article.sourceRef ? <span>Źródło: {article.sourceRef}</span> : null}
        {article.isDemo ? <Badge>Dane demonstracyjne</Badge> : null}
        {!article.sourceRef && !article.isDemo ? (
          <span>Źródło: brak informacji</span>
        ) : null}
      </p>
      <div>
        <Button
          variant="ghost"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={`${open ? "Zwiń" : "Czytaj dalej"}: ${article.title}`}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Zwiń" : "Czytaj dalej"}
        </Button>
      </div>
      <div id={bodyId} hidden={!open}>
        {open ? <ArticleBody slug={article.slug} /> : null}
      </div>
    </li>
  );
}
