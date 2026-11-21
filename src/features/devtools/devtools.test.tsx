import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import DevPage from "./DevPage";
import { readRelations, readTables } from "./introspect";
import { EXAMPLES, STAGES, TABLES } from "./metadata";
import { reviewStage } from "../../../convex/lib/validators";

const tables = readTables();

describe("devtools data model", () => {
  it("reads every schema table with fields and indexes", () => {
    const reviews = tables.find((t) => t.name === "reviews");
    expect(tables).toHaveLength(16);
    expect(reviews?.fields.find((f) => f.name === "evaluatorId")).toMatchObject(
      {
        type: "id(employees)",
        required: true,
      },
    );
    expect(reviews?.indexes.map((i) => i.name)).toContain("by_stage");
  });

  it("has metadata for every table", () => {
    expect(Object.keys(TABLES).sort()).toEqual(
      tables.map((t) => t.name).sort(),
    );
  });

  it("describes every review stage from the validator, in order", () => {
    expect(STAGES.map((s) => s.id)).toEqual(
      reviewStage.members.map((m) => m.value),
    );
  });

  it("derives relations from id fields", () => {
    expect(readRelations(tables)).toContainEqual({
      from: "mailMessages",
      field: "conversationId",
      to: "conversations",
    });
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

  it("switches views", async () => {
    render(
      <MemoryRouter initialEntries={["/dev"]}>
        <DevPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: "Model danych (dev)" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Proces" }));
    expect(screen.getByText(/Sprzeciw w rozpatrzeniu/)).toBeInTheDocument();
  });
});
