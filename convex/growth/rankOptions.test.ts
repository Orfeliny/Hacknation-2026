import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { RANK_THRESHOLD } from "./suggestCore";

const modules = import.meta.glob("/convex/**/*.*s");

const OPENAI_ENV = {
  AI_PROVIDER: "openai-compatible",
  AI_BASE_URL: "https://llm.example.com/v1",
  AI_MODEL: "bielik",
  AI_API_KEY: "secret-key",
  AI_MAX_RETRIES: "0",
};

const reply = (content: unknown) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(content) } }],
    }),
    { status: 200 },
  );

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function useOpenAI() {
  for (const [key, value] of Object.entries(OPENAI_ENV)) {
    vi.stubEnv(key, value);
  }
}

async function catalog(count: number) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const out: Id<"developmentOptions">[] = [];
    for (let i = 0; i < count; i += 1) {
      out.push(
        await ctx.db.insert("developmentOptions", {
          title: `Pozycja ${String(i).padStart(2, "0")}`,
          description: "Opis",
          form: "szkolenie",
          criterionIds: ["komunikacja"],
          level: "podstawowy",
          cost: "brak_danych",
          source: "demo",
          active: true,
        }),
      );
    }
    return out;
  });
  return { t, ids };
}

const rank = (t: Awaited<ReturnType<typeof catalog>>["t"]) =>
  t.action(api.growth.rankOptions.rankOptions, {
    criterionIds: ["komunikacja"],
  });

const MANY = RANK_THRESHOLD + 2;

describe("rankOptions", () => {
  it("does not call a model for few candidates", async () => {
    useOpenAI();
    const { t } = await catalog(RANK_THRESHOLD);
    const result = await rank(t);
    expect(result.ranking).toBe("rules");
    expect(result.note).toBeUndefined();
    expect(result.suggestions).toHaveLength(RANK_THRESHOLD);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("works in mock mode without network and says the ranking is missing", async () => {
    vi.stubEnv("AI_PROVIDER", "");
    const { t } = await catalog(MANY);
    const result = await rank(t);
    expect(result.ranking).toBe("rules");
    expect(result.note).toMatch(/^Bez rankingu AI/);
    expect(result.suggestions).toHaveLength(MANY);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the entries the model picked, in its order, with its rationale", async () => {
    useOpenAI();
    const { t, ids } = await catalog(MANY);
    fetchMock.mockResolvedValue(
      reply({
        selected: [
          { id: ids[3], rationale: "Pasuje do obszaru komunikacji." },
          { id: ids[1], rationale: "Dobre uzupełnienie." },
        ],
      }),
    );
    const result = await rank(t);
    expect(result.ranking).toBe("ai");
    expect(result.suggestions.map((s) => s.option._id)).toEqual([
      ids[3],
      ids[1],
    ]);
    expect(result.suggestions[0]?.rationale).toBe(
      "Pasuje do obszaru komunikacji.",
    );
    const body = String(
      (fetchMock.mock.calls[0]?.[1] as { body: string }).body,
    );
    expect(body).toContain(ids[3]);
    expect(body).toContain("Pozycja 03");
  });

  it("rejects an id outside the list and falls back to the rules", async () => {
    useOpenAI();
    const { t, ids } = await catalog(MANY);
    fetchMock.mockResolvedValue(
      reply({
        selected: [
          { id: ids[0], rationale: "Dobre." },
          { id: "zmyslone-id-123", rationale: "Wymyślone szkolenie." },
        ],
      }),
    );
    const result = await rank(t);
    expect(result.ranking).toBe("rules");
    expect(result.note).toMatch(/^Bez rankingu AI/);
    expect(result.suggestions).toHaveLength(MANY);
    expect(JSON.stringify(result)).not.toContain("zmyslone-id-123");
  });

  it("rejects a repeated id", async () => {
    useOpenAI();
    const { t, ids } = await catalog(MANY);
    fetchMock.mockResolvedValue(
      reply({
        selected: [
          { id: ids[0], rationale: "Raz." },
          { id: ids[0], rationale: "Drugi raz." },
        ],
      }),
    );
    expect((await rank(t)).ranking).toBe("rules");
  });

  it("falls back to the rules when the model is unavailable", async () => {
    useOpenAI();
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    const { t } = await catalog(MANY);
    const result = await rank(t);
    expect(result.ranking).toBe("rules");
    expect(result.note).toBe("Bez rankingu AI: AI jest niedostępne.");
    expect(result.suggestions).toHaveLength(MANY);
  });

  it("falls back when the configuration is invalid", async () => {
    vi.stubEnv("AI_PROVIDER", "openai-compatible");
    vi.stubEnv("AI_BASE_URL", "");
    const { t } = await catalog(MANY);
    const result = await rank(t);
    expect(result.ranking).toBe("rules");
    expect(result.note).toMatch(/^Bez rankingu AI/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
