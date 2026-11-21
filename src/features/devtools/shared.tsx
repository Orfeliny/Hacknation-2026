import { SOURCES, type SourceId } from "./metadata";

export function IssueLink({ n }: { n: number }) {
  return (
    <a
      href={`https://github.com/Orfeliny/Hacknation-2026/issues/${n}`}
      className="text-indigo-700 underline focus-visible:outline-2 focus-visible:outline-indigo-600"
    >
      #{n}
    </a>
  );
}

export function SourceBadge({ id }: { id: SourceId }) {
  return (
    <span
      title={SOURCES[id].hint}
      className="rounded-md border border-slate-300 px-1.5 py-0.5 text-xs whitespace-nowrap text-slate-700"
    >
      {SOURCES[id].label}
    </span>
  );
}
