import { useEffect, useId, useRef, useState } from "react";
import type { AdviceListItem } from "../../../convex/lib/contracts/advice";
import { ADVICE_TOPIC_LABELS } from "../../../convex/growth/constants";
import { Badge } from "../../components/ui/Badge";
import { ArticleBody, ArticleNotFound } from "./ArticleBody";
import { FailureBoundary } from "./FailureBoundary";

export function ArticleCard({
  article,
  initiallyOpen = false,
}: {
  article: AdviceListItem;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const cardRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (initiallyOpen) cardRef.current?.scrollIntoView?.({ block: "start" });
  }, [initiallyOpen]);
  const bodyId = useId();
  const headingId = useId();
  const meta = [
    ADVICE_TOPIC_LABELS[article.topic],
    article.readingMinutes ? `${article.readingMinutes} min` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      ref={cardRef}
      aria-labelledby={headingId}
      className="border-border flex flex-col gap-2.5 rounded-xl border bg-white px-[22px] py-5"
    >
      <p className="text-muted text-sm font-bold">{meta}</p>
      <h2
        id={headingId}
        className="text-ink text-[19px] leading-snug font-bold"
      >
        {article.title}
      </h2>
      <p>{article.summary}</p>
      {article.isDemo ? (
        <p>
          <Badge>Dane demonstracyjne</Badge>
        </p>
      ) : null}
      <p className="text-muted text-sm">
        Źródło: {article.sourceRef ?? "brak informacji"}
      </p>
      <div className="mt-auto">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={`${open ? "Zwiń" : "Czytaj dalej"}: ${article.title}`}
          onClick={() => setOpen((value) => !value)}
          className="text-primary inline-flex min-h-11 items-center font-bold underline underline-offset-[3px]"
        >
          {open ? "Zwiń" : "Czytaj dalej"}
        </button>
      </div>
      <div id={bodyId} hidden={!open}>
        {open ? (
          <FailureBoundary fallback={<ArticleNotFound />}>
            <ArticleBody slug={article.slug} />
          </FailureBoundary>
        ) : null}
      </div>
    </li>
  );
}
