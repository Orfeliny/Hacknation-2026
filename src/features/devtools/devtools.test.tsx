import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { reviewStage } from "../../../convex/lib/validators";
import DevPage from "./DevPage";
import {
  NODE_HEIGHT,
  buildGraph,
  layout,
  neighbours,
  nodeWidth,
} from "./graph";
import { readRelations, readTables } from "./introspect";
import { AREAS, EXAMPLES, STAGES, TABLES, areaOf } from "./metadata";

const tables = readTables();
const graph = buildGraph(tables, readRelations(tables));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/dev/model-domain"]}>
      <DevPage />
    </MemoryRouter>,
  );
}

describe("devtools data model", () => {
  it("reads every schema table with fields and indexes", () => {
    const reviews = tables.find((t) => t.name === "reviews");
    expect(tables).toHaveLength(18);
    expect(reviews?.fields.find((f) => f.name === "evaluatorId")).toMatchObject(
      {
        type: "id(employees)",
        required: true,
      },
    );
    expect(reviews?.indexes.map((i) => i.name)).toContain("by_stage");
  });

  it("has metadata and an area for every table", () => {
    expect(Object.keys(TABLES).sort()).toEqual(
      tables.map((t) => t.name).sort(),
    );
    const inAreas = Object.values(AREAS)
      .flatMap((a) => a.tables)
      .sort();
    expect(inAreas).toEqual(tables.map((t) => t.name).sort());
  });

  it("describes every review stage from the validator, in order", () => {
    expect(STAGES.map((s) => s.id)).toEqual(
      reviewStage.members.map((m) => m.value),
    );
  });

  it("keeps examples consistent with the schema", () => {
    for (const [name, doc] of Object.entries(EXAMPLES)) {
      const table = tables.find((t) => t.name === name);
      const fields = new Set(table?.fields.map((f) => f.name));
      for (const key of Object.keys(doc)) expect(fields).toContain(key);
      for (const field of table?.fields ?? []) {
        if (field.required) expect(doc).toHaveProperty(field.name);
      }
    }
  });
});

describe("relation graph", () => {
  it("merges id fields between the same two tables into one edge", () => {
    expect(graph.edges).toContainEqual({
      from: "reviews",
      to: "employees",
      fields: expect.arrayContaining(["employeeId", "evaluatorId"]) as unknown,
    });
    expect(neighbours("mailMessages", graph.edges)).toEqual(
      new Set([
        "mailMessages",
        "employees",
        "reviews",
        "conversations",
        "reminders",
      ]),
    );
  });

  it("lays nodes out deterministically, inside the canvas and apart", () => {
    const size = { width: 1100, height: 720 };
    const a = layout(graph.nodes, graph.edges, size);
    expect(layout(graph.nodes, graph.edges, size)).toEqual(a);
    for (const node of graph.nodes) {
      const p = a[node.id]!;
      expect(p.x - nodeWidth(node.id) / 2).toBeGreaterThanOrEqual(0);
      expect(p.x + nodeWidth(node.id) / 2).toBeLessThanOrEqual(size.width);
      expect(p.y - NODE_HEIGHT / 2).toBeGreaterThanOrEqual(0);
      expect(p.y + NODE_HEIGHT / 2).toBeLessThanOrEqual(size.height);
    }
    const ids = graph.nodes.map((n) => n.id);
    for (const x of ids)
      for (const y of ids)
        if (x < y)
          expect(
            Math.hypot(a[x]!.x - a[y]!.x, a[x]!.y - a[y]!.y),
          ).toBeGreaterThan(40);
  });

  it("shows a table's fields and relations on click and follows a relation", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /^Tabela reviews,/ }));
    const panel = screen
      .getByRole("heading", { name: "reviews" })
      .closest("div")!.parentElement!;
    expect(within(panel).getByText("previousReviewId")).toBeInTheDocument();
    await user.click(
      within(panel).getByRole("button", { name: /employees · employeeId/ }),
    );
    expect(
      screen.getByRole("heading", { name: "employees" }),
    ).toBeInTheDocument();
  });

  it("selects a table from the keyboard", async () => {
    const user = userEvent.setup();
    renderPage();
    screen.getByRole("button", { name: /^Tabela auditLog,/ }).focus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("heading", { name: "auditLog" }),
    ).toBeInTheDocument();
    expect(areaOf("auditLog")).toBe("audit");
  });

  it("dims tables a process stage does not write to", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(
      screen.getByLabelText("Etap procesu"),
      "Sporządzenie oceny (część II, III)",
    );
    expect(
      screen.getByRole("button", { name: /^Tabela drafts,/ }),
    ).toHaveAttribute("opacity", "1");
    expect(
      screen.getByRole("button", { name: /^Tabela notes,/ }),
    ).toHaveAttribute("opacity", "0.25");
  });

  it("switches to the process view", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Proces" }));
    expect(screen.getByText(/Sprzeciw w rozpatrzeniu/)).toBeInTheDocument();
  });
});
