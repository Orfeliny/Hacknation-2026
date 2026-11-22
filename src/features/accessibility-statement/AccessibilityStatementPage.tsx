import type { ReactNode } from "react";
import statementSource from "../../../docs/zgloszenie/deklaracja-dostepnosci.md?raw";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusAlert } from "../../components/ui/StatusAlert";
import { parseStatement, type Inline } from "./parseStatement";

function renderInlines(inlines: Inline[]): ReactNode[] {
  return inlines.map((inline, index) => {
    if (inline.kind === "strong") {
      return <strong key={index}>{inline.text}</strong>;
    }
    if (inline.kind === "code") {
      return (
        <code key={index} className="bg-surface-muted rounded px-1 text-sm">
          {inline.text}
        </code>
      );
    }
    return inline.text;
  });
}

function plainText(inlines: Inline[]): string {
  return inlines.map((inline) => inline.text).join("");
}

export function AccessibilityStatementPage({
  source = statementSource,
}: {
  source?: string;
}) {
  const blocks = parseStatement(source);
  const title = blocks.find(
    (block) => block.kind === "heading" && block.level === 1,
  );
  return (
    <>
      <title>Deklaracja dostępności</title>
      <PageHeader
        title={
          title && title.kind === "heading"
            ? plainText(title.inlines)
            : "Deklaracja dostępności"
        }
      />
      <div className="flex max-w-3xl flex-col gap-4">
        {blocks.map((block, index) => {
          switch (block.kind) {
            case "heading":
              return block.level === 1 ? null : (
                <h2 key={index} className="text-ink mt-4 text-xl font-bold">
                  {renderInlines(block.inlines)}
                </h2>
              );
            case "quote":
              return (
                <StatusAlert key={index} tone="info" live={false}>
                  {renderInlines(block.inlines)}
                </StatusAlert>
              );
            case "list":
              return (
                <ul key={index} className="flex list-disc flex-col gap-2 pl-6">
                  {block.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{renderInlines(item)}</li>
                  ))}
                </ul>
              );
            case "paragraph":
              return <p key={index}>{renderInlines(block.inlines)}</p>;
          }
        })}
      </div>
    </>
  );
}
