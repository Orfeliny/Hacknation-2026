import type { Relation, TableInfo } from "./introspect";

export type GraphNode = { id: string; fieldCount: number };
export type GraphEdge = { from: string; to: string; fields: string[] };
export type Point = { x: number; y: number };

export const NODE_HEIGHT = 44;
export const nodeWidth = (id: string) => Math.max(96, id.length * 8 + 32);

export function buildGraph(tables: TableInfo[], relations: Relation[]) {
  const nodes: GraphNode[] = tables.map((t) => ({
    id: t.name,
    fieldCount: t.fields.length,
  }));
  const byPair = new Map<string, GraphEdge>();
  for (const r of relations) {
    const key = `${r.from}->${r.to}`;
    const edge = byPair.get(key) ?? { from: r.from, to: r.to, fields: [] };
    edge.fields.push(r.field);
    byPair.set(key, edge);
  }
  return { nodes, edges: [...byPair.values()] };
}

export function neighbours(id: string, edges: GraphEdge[]): Set<string> {
  const out = new Set<string>([id]);
  for (const e of edges) {
    if (e.from === id) out.add(e.to);
    if (e.to === id) out.add(e.from);
  }
  return out;
}

// Deterministic Fruchterman-Reingold layout: the same schema always gives the same picture.
export function layout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  {
    width,
    height,
    iterations = 500,
  }: { width: number; height: number; iterations?: number },
): Record<string, Point> {
  const n = Math.max(nodes.length, 1);
  const k = Math.sqrt((width * height) / n) * 0.75;
  const pos = new Map<string, Point>();
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / n;
    pos.set(node.id, {
      x: width / 2 + Math.cos(angle) * width * 0.35,
      y: height / 2 + Math.sin(angle) * height * 0.35,
    });
  });
  const links = edges.filter(
    (e) => e.from !== e.to && pos.has(e.from) && pos.has(e.to),
  );
  let temperature = width / 8;
  for (let step = 0; step < iterations; step++) {
    const disp = new Map(nodes.map((node) => [node.id, { x: 0, y: 0 }]));
    for (const a of nodes) {
      for (const b of nodes) {
        if (a.id === b.id) continue;
        const pa = pos.get(a.id)!;
        const pb = pos.get(b.id)!;
        const dx = pa.x - pb.x || 0.01;
        const dy = pa.y - pb.y || 0.01;
        const d = Math.max(Math.hypot(dx, dy), 1);
        const force = (k * k) / d;
        const da = disp.get(a.id)!;
        da.x += (dx / d) * force;
        da.y += (dy / d) * force;
      }
    }
    for (const e of links) {
      const pa = pos.get(e.from)!;
      const pb = pos.get(e.to)!;
      const dx = pa.x - pb.x;
      const dy = pa.y - pb.y;
      const d = Math.max(Math.hypot(dx, dy), 1);
      const force = (d * d) / k;
      const da = disp.get(e.from)!;
      const db = disp.get(e.to)!;
      da.x -= (dx / d) * force;
      da.y -= (dy / d) * force;
      db.x += (dx / d) * force;
      db.y += (dy / d) * force;
    }
    for (const node of nodes) {
      const p = pos.get(node.id)!;
      const d = disp.get(node.id)!;
      const len = Math.max(Math.hypot(d.x, d.y), 0.01);
      const halfW = nodeWidth(node.id) / 2 + 8;
      const halfH = NODE_HEIGHT / 2 + 8;
      p.x = Math.min(
        width - halfW,
        Math.max(halfW, p.x + (d.x / len) * Math.min(len, temperature)),
      );
      p.y = Math.min(
        height - halfH,
        Math.max(halfH, p.y + (d.y / len) * Math.min(len, temperature)),
      );
    }
    temperature = Math.max(temperature * 0.985, 1);
  }
  return Object.fromEntries(pos);
}

// Where the segment from the centre of a node towards `to` leaves the node's rectangle.
export function borderPoint(center: Point, id: string, to: Point): Point {
  const dx = to.x - center.x;
  const dy = to.y - center.y;
  if (dx === 0 && dy === 0) return center;
  const halfW = nodeWidth(id) / 2;
  const halfH = NODE_HEIGHT / 2;
  const scale = Math.min(
    dx === 0 ? Infinity : halfW / Math.abs(dx),
    dy === 0 ? Infinity : halfH / Math.abs(dy),
  );
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}
