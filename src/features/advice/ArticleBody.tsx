import { useAdvice } from "../../lib/backend/advice";

export function ArticleBody({ slug }: { slug: string }) {
  const { data } = useAdvice({ slug });

  if (data === undefined) {
    return (
      <p role="status" className="text-muted">
        Wczytuję tekst porady…
      </p>
    );
  }
  if (data === null) {
    return (
      <p role="status" className="text-muted">
        Ta porada nie jest już dostępna.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4 pt-2">
      {data.sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-2">
          <h3 className="text-ink text-base font-bold">{section.heading}</h3>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.bullets.length > 0 ? (
            <ul className="list-disc pl-6">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
