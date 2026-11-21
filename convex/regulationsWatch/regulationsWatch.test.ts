import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import { parseEliMetadata } from "./eli";

const modules = import.meta.glob("/convex/**/*.*s");

const meta = (eliId: string, changeDate: string) => ({
  ELI: eliId,
  title: "Akt",
  changeDate,
  status: "obowiązujący",
  references: { "Akty zmieniające": [{ id: "DU/2024/1" }] },
});

function stubEli(changeDate: string, failing: string[] = []) {
  const fetchMock = vi.fn<typeof fetch>((input) => {
    const url = input instanceof Request ? input.url : input.toString();
    const eliId = url.split("/acts/")[1] ?? "";
    if (failing.includes(eliId))
      return Promise.resolve(new Response("", { status: 503 }));
    return Promise.resolve(
      new Response(JSON.stringify(meta(eliId, changeDate))),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("REGULATIONS_SOURCE", "eli");
  return fetchMock;
}

async function withRoles() {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    for (const demoPersona of ["hr", "supervisor"] as const) {
      await ctx.db.insert("employees", {
        firstName: demoPersona,
        lastName: "X",
        position: "P",
        unit: "U",
        createdAt: 0,
        demoPersona,
      });
    }
  });
  return t;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("ELI metadata", () => {
  it("reads the change date, status and amending acts", () => {
    expect(
      parseEliMetadata(meta("DU/2008/1505", "2026-05-12T15:01:13")),
    ).toEqual({
      eliId: "DU/2008/1505",
      title: "Akt",
      changeDate: "2026-05-12T15:01:13",
      status: "obowiązujący",
      amendingActs: ["DU/2024/1"],
    });
    expect(() => parseEliMetadata({ ELI: "x" })).toThrow();
  });
});

describe("regulation watch", () => {
  it("records the first check silently and flags a later change until acknowledged", async () => {
    const t = await withRoles();
    stubEli("2024-03-14T21:30:57");
    const first = await t.action(internal.regulationsWatch.actions.check, {});
    expect(first.every((r) => r.ok && r.changed === false)).toBe(true);
    expect(
      (await t.query(api.regulationsWatch.queries.list, {})).some(
        (r) => r.changed,
      ),
    ).toBe(false);

    stubEli("2026-12-01T10:00:00");
    const second = await t.action(internal.regulationsWatch.actions.check, {});
    expect(second.every((r) => r.changed)).toBe(true);
    const flagged = await t.query(api.regulationsWatch.queries.list, {});
    expect(flagged.filter((r) => r.changed)).toHaveLength(2);

    await t.mutation(api.regulationsWatch.mutations.acknowledge, {
      actor: { role: "hr" },
      eliId: "DU/2016/470",
    });
    const after = await t.query(api.regulationsWatch.queries.list, {});
    expect(after.find((r) => r.eliId === "DU/2016/470")?.changed).toBe(false);
    expect(after.find((r) => r.eliId === "DU/2008/1505")?.changed).toBe(true);
  });

  it("keeps the last state when the ELI API fails", async () => {
    const t = await withRoles();
    stubEli("2024-03-14T21:30:57", ["DU/2008/1505"]);
    const results = await t.action(internal.regulationsWatch.actions.check, {});
    expect(results).toContainEqual({
      eliId: "DU/2008/1505",
      ok: false,
      error: "ELI DU/2008/1505: HTTP 503",
    });
    expect(await t.query(api.regulationsWatch.queries.list, {})).toHaveLength(
      1,
    );
  });

  it("lets only HR or the admin run a check or acknowledge a change", async () => {
    const t = await withRoles();
    stubEli("2024-03-14T21:30:57");
    await expect(
      t.action(api.regulationsWatch.actions.checkNow, {
        actor: { role: "supervisor" },
      }),
    ).rejects.toThrow(/kadry/);
    expect(
      await t.action(api.regulationsWatch.actions.checkNow, {
        actor: { role: "hr" },
      }),
    ).toHaveLength(2);
    await expect(
      t.mutation(api.regulationsWatch.mutations.acknowledge, {
        actor: { role: "supervisor" },
        eliId: "DU/2016/470",
      }),
    ).rejects.toThrow(/kadry/);
  });
});

describe("mock source (default)", () => {
  it("works offline without calling the network", async () => {
    const t = await withRoles();
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const results = await t.action(internal.regulationsWatch.actions.check, {});
    expect(results.every((r) => r.ok)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    const rows = await t.query(api.regulationsWatch.queries.list, {});
    expect(rows.map((r) => r.lastChangeDate)).toContain("2024-03-14T21:30:57");
  });

  it("simulates an amendment for the demo, for HR only", async () => {
    const t = await withRoles();
    await expect(
      t.action(api.regulationsWatch.actions.simulateAmendment, {
        actor: { role: "supervisor" },
        eliId: "DU/2016/470",
      }),
    ).rejects.toThrow(/kadry/);
    expect(
      await t.action(api.regulationsWatch.actions.simulateAmendment, {
        actor: { role: "hr" },
        eliId: "DU/2016/470",
      }),
    ).toEqual({ changed: true });
    const rows = await t.query(api.regulationsWatch.queries.list, {});
    expect(rows.find((r) => r.eliId === "DU/2016/470")?.changed).toBe(true);
  });
});
