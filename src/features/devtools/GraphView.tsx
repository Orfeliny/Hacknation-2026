import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Card } from "../../components/ui/Card";
import {
  NODE_HEIGHT,
  borderPoint,
  buildGraph,
  layout,
  neighbours,
  nodeWidth,
  type Point,
} from "./graph";
import { readRelations, type TableInfo } from "./introspect";
import { AREAS, STAGES, TABLES, areaOf, fieldSource } from "./metadata";
import { IssueLink, SourceBadge } from "./shared";

const WIDTH = 1100;
const HEIGHT = 720;
const IDENTITY = { x: 0, y: 0, k: 1 };

type Drag =
  | { kind: "node"; id: string; offset: Point; moved: boolean }
  | { kind: "pan"; start: Point; origin: { x: number; y: number } };

function controlButton(active = false) {
  return `rounded-md border px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
    active
      ? "border-indigo-600 bg-indigo-600 text-white"
      : "border-slate-300 text-slate-900 hover:bg-slate-50"
  }`;
}

export function GraphView({ tables }: { tables: TableInfo[] }) {
  const graph = useMemo(
    () => buildGraph(tables, readRelations(tables)),
    [tables],
  );
  const initial = useMemo(
    () => layout(graph.nodes, graph.edges, { width: WIDTH, height: HEIGHT }),
    [graph],
  );
  const [positions, setPositions] = useState(initial);
  const [view, setView] = useState(IDENTITY);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [stage, setStage] = useState("");
  const [query, setQuery] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);

  const focus = selected ?? hovered;
  const stageTables = STAGES.find((s) => s.id === stage)?.writes;
  const lit = useMemo(() => {
    if (focus) return neighbours(focus, graph.edges);
    if (stageTables) return new Set(stageTables);
    return null;
  }, [focus, graph.edges, stageTables]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
      setView((v) => ({ ...v, k: Math.min(3, Math.max(0.4, v.k * factor)) }));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const toSvg = (event: PointerEvent): Point => {
    const matrix = svgRef.current?.getScreenCTM?.();
    if (!matrix) return { x: event.clientX, y: event.clientY };
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
    return { x: (p.x - view.x) / view.k, y: (p.y - view.y) / view.k };
  };

  const onNodeDown = (id: string) => (event: PointerEvent) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const p = toSvg(event);
    const at = positions[id]!;
    drag.current = {
      kind: "node",
      id,
      offset: { x: p.x - at.x, y: p.y - at.y },
      moved: false,
    };
  };

  const onBackgroundDown = (event: PointerEvent) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = {
      kind: "pan",
      start: { x: event.clientX, y: event.clientY },
      origin: { x: view.x, y: view.y },
    };
  };

  const onMove = (event: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === "node") {
      const p = toSvg(event);
      d.moved = true;
      setPositions((all) => ({
        ...all,
        [d.id]: { x: p.x - d.offset.x, y: p.y - d.offset.y },
      }));
    } else {
      const rect = svgRef.current?.getBoundingClientRect();
      const scale = rect && rect.width > 0 ? WIDTH / rect.width : 1;
      setView((v) => ({
        ...v,
        x: d.origin.x + (event.clientX - d.start.x) * scale,
        y: d.origin.y + (event.clientY - d.start.y) * scale,
      }));
    }
  };

  const onUp = (id?: string) => () => {
    const d = drag.current;
    drag.current = null;
    if (id && d?.kind === "node" && !d.moved)
      setSelected((s) => (s === id ? null : id));
    if (!id && d?.kind === "pan") setSelected(null);
  };

  const onNodeKey = (id: string) => (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelected((s) => (s === id ? null : id));
    }
    if (event.key === "Escape") setSelected(null);
  };

  const matches = query
    ? graph.nodes.filter((n) =>
        n.id.toLowerCase().includes(query.toLowerCase()),
      )
    : [];

  const table = tables.find((t) => t.name === selected);
  const meta = selected ? TABLES[selected] : undefined;
  const outgoing = graph.edges.filter((e) => e.from === selected);
  const incoming = graph.edges.filter(
    (e) => e.to === selected && e.from !== selected,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-sm font-medium">
          <span className="block">Szukaj tabeli</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches[0]) setSelected(matches[0].id);
            }}
            list="devtools-tables"
            placeholder="np. reviews"
            className="w-48 rounded-md border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-indigo-600"
          />
          <datalist id="devtools-tables">
            {graph.nodes.map((n) => (
              <option key={n.id} value={n.id} />
            ))}
          </datalist>
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span className="block">Etap procesu</span>
          <select
            value={stage}
            onChange={(e) => {
              setStage(e.target.value);
              setSelected(null);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            <option value="">wszystkie</option>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={controlButton()}
          onClick={() => setView((v) => ({ ...v, k: Math.min(3, v.k * 1.2) }))}
        >
          Przybliż
        </button>
        <button
          type="button"
          className={controlButton()}
          onClick={() =>
            setView((v) => ({ ...v, k: Math.max(0.4, v.k / 1.2) }))
          }
        >
          Oddal
        </button>
        <button
          type="button"
          className={controlButton()}
          onClick={() => {
            setView(IDENTITY);
            setPositions(initial);
          }}
        >
          Przywróć układ
        </button>
      </div>

      <ul
        aria-label="Obszary"
        className="flex flex-wrap gap-3 text-xs text-slate-700"
      >
        {Object.values(AREAS).map((area) => (
          <li key={area.label} className="flex items-center gap-1">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 rounded-sm border"
              style={{ background: area.fill, borderColor: area.stroke }}
            />
            {area.label}
          </li>
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="group"
          aria-label="Graf relacji między tabelami. Kliknij tabelę, przeciągnij, aby przesunąć; kółko myszy przybliża."
          className="h-[70vh] min-h-96 w-full touch-none rounded-lg border border-slate-200 bg-white select-none"
          onPointerDown={onBackgroundDown}
          onPointerMove={onMove}
          onPointerUp={onUp()}
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
            </marker>
            <marker
              id="arrow-lit"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#4f46e5" />
            </marker>
          </defs>
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {graph.edges.map((edge) => {
              const a = positions[edge.from];
              const b = positions[edge.to];
              if (!a || !b) return null;
              const active = focus
                ? edge.from === focus || edge.to === focus
                : false;
              const dim =
                lit &&
                !active &&
                !(
                  stageTables &&
                  !focus &&
                  lit.has(edge.from) &&
                  lit.has(edge.to)
                );
              if (edge.from === edge.to) {
                const top = { x: a.x, y: a.y - NODE_HEIGHT / 2 };
                return (
                  <g key={`${edge.from}-${edge.to}`} opacity={dim ? 0.12 : 1}>
                    <path
                      d={`M ${top.x - 12} ${top.y} C ${top.x - 30} ${top.y - 40}, ${top.x + 30} ${top.y - 40}, ${top.x + 12} ${top.y}`}
                      fill="none"
                      stroke={active ? "#4f46e5" : "#94a3b8"}
                      strokeWidth={active ? 2 : 1.2}
                      markerEnd={`url(#${active ? "arrow-lit" : "arrow"})`}
                    />
                    {active && (
                      <text
                        x={top.x}
                        y={top.y - 34}
                        textAnchor="middle"
                        className="fill-indigo-700 text-[11px]"
                      >
                        {edge.fields.join(", ")}
                      </text>
                    )}
                  </g>
                );
              }
              const start = borderPoint(a, edge.from, b);
              const end = borderPoint(b, edge.to, a);
              return (
                <g key={`${edge.from}-${edge.to}`} opacity={dim ? 0.12 : 1}>
                  <line
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={active ? "#4f46e5" : "#94a3b8"}
                    strokeWidth={active ? 2 : 1.2}
                    markerEnd={`url(#${active ? "arrow-lit" : "arrow"})`}
                  />
                  {active && (
                    <text
                      x={(start.x + end.x) / 2}
                      y={(start.y + end.y) / 2 - 6}
                      textAnchor="middle"
                      className="fill-indigo-700 text-[11px]"
                      paintOrder="stroke"
                      stroke="white"
                      strokeWidth={4}
                    >
                      {edge.fields.join(", ")}
                    </text>
                  )}
                </g>
              );
            })}
            {graph.nodes.map((node) => {
              const p = positions[node.id];
              if (!p) return null;
              const area = AREAS[areaOf(node.id)];
              const w = nodeWidth(node.id);
              const isSelected = selected === node.id;
              const dim = lit && !lit.has(node.id);
              return (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`Tabela ${node.id}, ${node.fieldCount} pól, obszar ${area.label}`}
                  transform={`translate(${p.x - w / 2} ${p.y - NODE_HEIGHT / 2})`}
                  opacity={dim ? 0.25 : 1}
                  className="cursor-pointer focus:outline-none [&:focus-visible>rect]:stroke-[3]"
                  onPointerDown={onNodeDown(node.id)}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    onUp(node.id)();
                  }}
                  onPointerEnter={() => setHovered(node.id)}
                  onPointerLeave={() => setHovered(null)}
                  onKeyDown={onNodeKey(node.id)}
                >
                  <rect
                    width={w}
                    height={NODE_HEIGHT}
                    rx={8}
                    fill={area.fill}
                    stroke={isSelected ? "#1e1b4b" : area.stroke}
                    strokeWidth={isSelected ? 3 : 1.5}
                  />
                  <text
                    x={w / 2}
                    y={19}
                    textAnchor="middle"
                    className="fill-slate-900 font-mono text-[13px] font-semibold"
                  >
                    {node.id}
                  </text>
                  <text
                    x={w / 2}
                    y={35}
                    textAnchor="middle"
                    className="fill-slate-600 text-[11px]"
                  >
                    {node.fieldCount} pól
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        <Card
          className="max-h-[70vh] space-y-4 overflow-y-auto"
          aria-live="polite"
        >
          {!table && (
            <div className="space-y-2 text-sm text-slate-600">
              <h2 className="text-base font-bold text-slate-900">
                Jak czytać graf
              </h2>
              <p>
                Kliknij tabelę albo wybierz ją klawiszem Enter, żeby zobaczyć
                pola, źródła danych i powiązania. Strzałka prowadzi od pola{" "}
                <code>id(...)</code> do tabeli, na którą wskazuje.
              </p>
              <p>
                Przeciągnij tabelę, żeby ją przesunąć. Przeciągnij tło, żeby
                przewinąć. Kółko myszy przybliża.
              </p>
              <p>
                „Etap procesu” podświetla tabele, do których dany etap zapisuje
                dane.
              </p>
            </div>
          )}
          {table && (
            <>
              <div className="space-y-1">
                <h2 className="font-mono text-xl font-bold">{table.name}</h2>
                <p className="text-sm text-slate-600">
                  {AREAS[areaOf(table.name)].label}
                </p>
                {meta && (
                  <p className="text-sm text-slate-600">
                    {meta.purpose} Moduł: <code>convex/{meta.module}/</code>
                    {meta.issues.length > 0 && " · "}
                    {meta.issues.map((n, i) => (
                      <span key={n}>
                        {i > 0 && ", "}
                        <IssueLink n={n} />
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <RelationList
                title="Wskazuje na"
                edges={outgoing}
                target={(e) => e.to}
                onPick={setSelected}
              />
              <RelationList
                title="Wskazują tutaj"
                edges={incoming}
                target={(e) => e.from}
                onPick={setSelected}
              />
              <div className="space-y-2">
                <h3 className="text-sm font-medium">
                  Pola ({table.fields.length})
                </h3>
                <ul className="space-y-2 text-sm">
                  {table.fields.map((f) => (
                    <li
                      key={f.name}
                      className="space-y-1 border-b border-slate-100 pb-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-medium">{f.name}</span>
                        <span className="text-xs text-slate-600">
                          {f.required ? "wymagane" : "opcjonalne"}
                        </span>
                        <SourceBadge id={fieldSource(table.name, f.name)} />
                      </div>
                      <p className="font-mono text-xs break-all text-slate-600">
                        {f.type}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-1 text-sm">
                <h3 className="font-medium">Indeksy</h3>
                <ul className="list-disc pl-5 font-mono text-xs text-slate-700">
                  {table.indexes.map((i) => (
                    <li key={i.name}>
                      {i.name} [{i.fields.join(", ")}]
                    </li>
                  ))}
                  {table.searchIndexes.map((i) => (
                    <li key={i.name}>
                      {i.name} (wyszukiwanie: {i.field})
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function RelationList({
  title,
  edges,
  target,
  onPick,
}: {
  title: string;
  edges: { from: string; to: string; fields: string[] }[];
  target: (e: { from: string; to: string }) => string;
  onPick: (id: string) => void;
}) {
  if (edges.length === 0) return null;
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="flex flex-wrap gap-2">
        {edges.map((e) => (
          <li key={`${e.from}-${e.to}`}>
            <button
              type="button"
              onClick={() => onPick(target(e))}
              className="rounded-md border border-slate-300 px-2 py-1 text-left text-xs hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
            >
              <span className="font-mono font-medium">{target(e)}</span>{" "}
              <span className="text-slate-600">· {e.fields.join(", ")}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
