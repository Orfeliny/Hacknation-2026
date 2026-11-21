import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { addDays } from "../rules/dates";
import schema from "../schema";
import { MAX_QUESTION_LENGTH } from "./limits";

const modules = import.meta.glob("/convex/**/*.*s");

const TODAY = "2026-11-21";
const supervisor = { role: "supervisor" } as const;

const OPENAI_ENV = {
  AI_PROVIDER: "openai-compatible",
  AI_BASE_URL: "https://llm.example.com/v1",
  AI_MODEL: "bielik",
  AI_API_KEY: "secret-key",
  AI_MAX_RETRIES: "0",
};

function stubEnv(env: Record<string, string>) {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const base = { position: "Główny analityk", unit: "Wydział", createdAt: 0 };
    const boss = await ctx.db.insert("employees", {
      ...base,
      firstName: "Katarzyna",
      lastName: "Szef",
      demoPersona: "supervisor",
    });
    const analyst = await ctx.db.insert("employees", {
      ...base,
      firstName: "Joanna",
      lastName: "Mazur",
      supervisorId: boss,
    });
    const outsider = await ctx.db.insert("employees", {
      ...base,
      firstName: "Olga",
      lastName: "Obca",
    });
    for (const days of [4, 15, 27]) {
      await ctx.db.insert("observations", {
        employeeId: analyst,
        authorId: boss,
        date: addDays(TODAY, -days),
        text: "Tajna treść: Joanna Mazur zostaje po godzinach.",
        sentiment: "neutral",
        wellbeing: true,
        createdAt: 0,
      });
    }
    return { boss, analyst, outsider };
  });
  const { team } = await t.query(api.hrPartner.queries.listForSupervisor, {
    actor: supervisor,
  });
  const signal = team.at(0)?.signals.at(0);
  if (!signal) throw new Error("The setup produced no signal");
  return { t, ...ids, signal };
}

const reply = (content: unknown) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(content) } }],
    }),
    { status: 200 },
  );

describe("hrPartner.actions.recommend", () => {
  it("returns concrete actions with the mock provider and stores them on the signal", async () => {
    vi.stubEnv("AI_PROVIDER", "");
    const { t, analyst, signal } = await setup();
    const result = await t.action(api.hrPartner.actions.recommend, {
      actor: supervisor,
      employeeId: analyst,
      kind: signal.kind,
      reason: signal.reason,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.provider).toBe("mock");
    expect(result.recommendations.length).toBeGreaterThanOrEqual(3);
    expect(result.recommendations.map((r) => r.kind)).toContain("conversation");
    const { team } = await t.query(api.hrPartner.queries.listForSupervisor, {
      actor: supervisor,
    });
    const stored = team.at(0)?.signals.at(0);
    expect(stored?.signalId).not.toBeNull();
    expect(stored?.recommendations).toEqual(result.recommendations);
  });

  it("sends the model no name and no observation text, and restores the name in the answer", async () => {
    stubEnv(OPENAI_ENV);
    const fetchMock = vi.fn().mockResolvedValue(
      reply({
        recommendations: [
          {
            text: "Porozmawiaj z [PRACOWNIK] o priorytetach.",
            kind: "conversation",
          },
          { text: "Odciąż jedno zadanie.", kind: "organizational" },
          { text: "Zaplanuj przerwę.", kind: "wellbeing" },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { t, analyst, signal } = await setup();
    const result = await t.action(api.hrPartner.actions.recommend, {
      actor: supervisor,
      employeeId: analyst,
      kind: signal.kind,
      reason: signal.reason,
    });
    const body = String(
      (fetchMock.mock.calls[0]?.[1] as { body: string }).body,
    );
    expect(body).not.toMatch(/Joanna|Mazur|Tajna treść|po godzinach/);
    expect(body).toContain("[PRACOWNIK]");
    expect(body).toContain("dotyczące obciążenia lub dobrostanu 3");
    expect(body).toMatch(/nie proponujesz oceny okresowej ani jej poziomu/);
    expect(result.ok && result.recommendations[0]?.text).toBe(
      "Porozmawiaj z Joanna Mazur o priorytetach.",
    );
  });

  it("returns a typed error when the provider fails and the list keeps working", async () => {
    stubEnv(OPENAI_ENV);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("nope", { status: 401 })),
    );
    const { t, analyst, signal } = await setup();
    const result = await t.action(api.hrPartner.actions.recommend, {
      actor: supervisor,
      employeeId: analyst,
      kind: signal.kind,
      reason: signal.reason,
    });
    expect(result).toMatchObject({ ok: false, code: "auth" });
    expect(JSON.stringify(result)).not.toContain("secret-key");
    const { team } = await t.query(api.hrPartner.queries.listForSupervisor, {
      actor: supervisor,
    });
    expect(team[0]?.signals).toHaveLength(1);
    expect(team[0]?.signals[0]?.signalId).toBeNull();
  });

  it("refuses a caller who is not the supervisor and a signal that is no longer current", async () => {
    vi.stubEnv("AI_PROVIDER", "");
    const { t, analyst, outsider, signal } = await setup();
    const denied = await t.action(api.hrPartner.actions.recommend, {
      actor: { role: "employee" },
      employeeId: analyst,
      kind: signal.kind,
      reason: signal.reason,
    });
    expect(denied).toMatchObject({ ok: false, code: "denied" });
    const stranger = await t.action(api.hrPartner.actions.recommend, {
      actor: supervisor,
      employeeId: outsider,
      kind: signal.kind,
      reason: signal.reason,
    });
    expect(stranger).toMatchObject({ ok: false, code: "denied" });
    const stale = await t.action(api.hrPartner.actions.recommend, {
      actor: supervisor,
      employeeId: analyst,
      kind: signal.kind,
      reason: "inny powód",
    });
    expect(stale).toEqual({
      ok: false,
      code: "denied",
      message: "Sygnał jest już nieaktualny.",
    });
  });

  it("uses the mock fixture only on the mock path and rejects an answer that breaks the schema", async () => {
    stubEnv(OPENAI_ENV);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        reply({
          recommendations: [{ text: "Tylko jedno.", kind: "wellbeing" }],
        }),
      ),
    );
    const { t, analyst, signal } = await setup();
    const result = await t.action(api.hrPartner.actions.recommend, {
      actor: supervisor,
      employeeId: analyst,
      kind: signal.kind,
      reason: signal.reason,
    });
    expect(result).toMatchObject({ ok: false, code: "bad_response" });
  });
});

describe("hrPartner.actions.ask", () => {
  it("answers with the mock provider, with or without a chosen employee", async () => {
    vi.stubEnv("AI_PROVIDER", "");
    const { t, analyst } = await setup();
    for (const employeeId of [undefined, analyst]) {
      const result = await t.action(api.hrPartner.actions.ask, {
        actor: supervisor,
        employeeId,
        question: "Jak porozmawiać o obciążeniu?",
      });
      expect(result).toMatchObject({ ok: true, provider: "mock" });
      if (result.ok) {
        expect(result.answer).not.toBe("");
        expect(result.suggestions.length).toBeGreaterThan(0);
      }
    }
  });

  it("pseudonymises names typed in the question", async () => {
    stubEnv(OPENAI_ENV);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        reply({ answer: "Zacznij od rozmowy z [PRACOWNIK].", suggestions: [] }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { t, analyst } = await setup();
    const result = await t.action(api.hrPartner.actions.ask, {
      actor: supervisor,
      employeeId: analyst,
      question:
        "Czy Joanna Mazur potrzebuje odciążenia? Mazur ostatnio zostaje dłużej.",
    });
    const body = String(
      (fetchMock.mock.calls[0]?.[1] as { body: string }).body,
    );
    expect(body).not.toMatch(/Joanna|Mazur|Katarzyna|Szef/);
    expect(body).toContain("[PRACOWNIK]");
    expect(result.ok && result.answer).toBe(
      "Zacznij od rozmowy z Joanna Mazur.",
    );
  });

  it("rejects an empty or too long question before calling the model", async () => {
    stubEnv(OPENAI_ENV);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { t } = await setup();
    const empty = await t.action(api.hrPartner.actions.ask, {
      actor: supervisor,
      question: "   ",
    });
    const long = await t.action(api.hrPartner.actions.ask, {
      actor: supervisor,
      question: "a".repeat(MAX_QUESTION_LENGTH + 1),
    });
    expect(empty).toMatchObject({ ok: false, code: "empty" });
    expect(long).toMatchObject({ ok: false, code: "too_long" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a question of exactly the maximum length", async () => {
    vi.stubEnv("AI_PROVIDER", "");
    const { t } = await setup();
    const result = await t.action(api.hrPartner.actions.ask, {
      actor: supervisor,
      question: "a".repeat(MAX_QUESTION_LENGTH),
    });
    expect(result.ok).toBe(true);
  });

  it("refuses an employee who is not the caller's report and the wrong role", async () => {
    vi.stubEnv("AI_PROVIDER", "");
    const { t, outsider, analyst } = await setup();
    expect(
      await t.action(api.hrPartner.actions.ask, {
        actor: supervisor,
        employeeId: outsider,
        question: "Pytanie",
      }),
    ).toMatchObject({ ok: false, code: "denied" });
    expect(
      await t.action(api.hrPartner.actions.ask, {
        actor: { role: "hr" },
        employeeId: analyst,
        question: "Pytanie",
      }),
    ).toMatchObject({ ok: false, code: "denied" });
  });

  it("returns a typed error when the provider times out", async () => {
    stubEnv(OPENAI_ENV);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("busy", { status: 429 })),
    );
    const { t } = await setup();
    const result = await t.action(api.hrPartner.actions.ask, {
      actor: supervisor,
      question: "Pytanie",
    });
    expect(result).toMatchObject({ ok: false, code: "rate_limited" });
  });
});
