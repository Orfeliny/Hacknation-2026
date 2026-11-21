import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import schema from "../schema";
import type { DraftOutput } from "./prompts";

const modules = import.meta.glob("/convex/**/*.*s");

const boss = { role: "supervisor" } as const;

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

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

type World = { review: Id<"reviews">; employee: Id<"employees"> };

// A review with ratings for two criteria and three observations: a development one for the
// criterion rated high (a mismatch), a positive one for the other, and an untagged one.
async function setup(ratings = true) {
  const t = convexTest(schema, modules);
  const world = await t.run(async (ctx): Promise<World> => {
    const base = { position: "Specjalista", unit: "Wydział", createdAt: 0 };
    const supervisor = await ctx.db.insert("employees", {
      ...base,
      firstName: "Katarzyna",
      lastName: "Szef",
      demoPersona: "supervisor",
    });
    const employee = await ctx.db.insert("employees", {
      ...base,
      firstName: "Joanna",
      lastName: "Mazur",
      supervisorId: supervisor,
      demoPersona: "employee",
    });
    const review = await ctx.db.insert("reviews", {
      employeeId: employee,
      evaluatorId: supervisor,
      stage: "writing",
      createdAt: 1,
      sheet: "C",
      periodStart: "2025-01-01",
      ratings: ratings
        ? [
            { criterionId: "komunikacja", levelId: "7" },
            { criterionId: "rzetelnosc", levelId: "5" },
          ]
        : [],
    });
    const note = (
      date: string,
      text: string,
      sentiment: "positive" | "development" | "neutral",
      criterionId?: string,
    ) =>
      ctx.db.insert("observations", {
        employeeId: employee,
        authorId: supervisor,
        date,
        text,
        sentiment,
        criterionId,
        createdAt: 0,
      });
    await note(
      "2026-06-01",
      "Joanna Mazur mówi niejasno na naradach.",
      "development",
      "komunikacja",
    );
    await note(
      "2026-05-01",
      "Oddaje opinie w terminie.",
      "positive",
      "rzetelnosc",
    );
    await note("2026-04-01", "Pomogła nowej osobie.", "neutral");
    return { review, employee };
  });
  return { t, ...world };
}

const answer = (patch: Partial<DraftOutput> = {}): DraftOutput => ({
  criteria: [
    {
      criterionId: "komunikacja",
      text: "Uzasadnienie komunikacji.",
      evidence: ["O1"],
    },
    {
      criterionId: "rzetelnosc",
      text: "Uzasadnienie rzetelności.",
      evidence: ["O2"],
    },
  ],
  strengths: [{ text: "Terminowość.", evidence: ["O2"] }],
  developmentAreas: [
    { key: "a1", text: "Jasność wypowiedzi.", evidence: ["O1"] },
  ],
  developmentActions: [
    { areaKey: "a1", text: "Kurs wystąpień.", evidence: [] },
  ],
  feedbackTips: [{ text: "Zacznij od faktu." }],
  ...patch,
});

const reply = (content: unknown) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(content) } }],
    }),
    { status: 200 },
  );

const drafts = async (t: ReturnType<typeof convexTest>) =>
  (await t.run((ctx) => ctx.db.query("drafts").collect())) as Doc<"drafts">[];

const requestOf = (fetchMock: ReturnType<typeof vi.fn>) => {
  const body = String((fetchMock.mock.calls[0]?.[1] as { body: string }).body);
  const messages = (
    JSON.parse(body) as { messages: { role: string; content: string }[] }
  ).messages;
  return {
    body,
    user: messages.find((m) => m.role === "user")?.content ?? "",
  };
};

describe("drafting.actions.generate", () => {
  it("builds a draft in mock mode: each fragment cites an observation or says there is no basis", async () => {
    vi.stubEnv("AI_PROVIDER", "");
    const { t, review } = await setup();
    const result = await t.action(api.drafting.actions.generate, {
      actor: boss,
      reviewId: review,
    });
    expect(result).toMatchObject({ ok: true, provider: "mock" });
    const rows = await drafts(t);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.status).toBe("proposed");
      expect(
        (row.observationIds ?? []).length > 0 || row.noEvidence === true,
      ).toBe(true);
    }
    const sections = new Set(rows.map((r) => r.section));
    expect(sections).toContain("criterion_justification");
    expect(sections).toContain("feedback_tip");
  });

  it("stores the rating vs observation mismatch on the justification of that criterion", async () => {
    vi.stubEnv("AI_PROVIDER", "");
    const { t, review } = await setup();
    await t.action(api.drafting.actions.generate, {
      actor: boss,
      reviewId: review,
    });
    const rows = await drafts(t);
    const flagged = rows.find(
      (r) =>
        r.section === "criterion_justification" &&
        r.criterionId === "komunikacja",
    );
    const fine = rows.find(
      (r) =>
        r.section === "criterion_justification" &&
        r.criterionId === "rzetelnosc",
    );
    expect(flagged?.inconsistency).toMatch(/Wysoka ocena/);
    expect(fine?.inconsistency).toBeUndefined();
  });

  it("records the call in the AI register without any name", async () => {
    vi.stubEnv("AI_PROVIDER", "");
    const { t, review } = await setup();
    const result = await t.action(api.drafting.actions.generate, {
      actor: boss,
      reviewId: review,
    });
    expect(result.ok).toBe(true);
    const rows = await t.run(
      async (ctx): Promise<Doc<"aiInteractions">[]> =>
        await ctx.db.query("aiInteractions").collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      module: "drafting.generate",
      provider: "mock",
      reviewId: review,
    });
    expect(rows[0]?.sentPrompt).toContain("[PRACOWNIK]");
    expect(rows[0]?.sentPrompt + rows[0]?.output).not.toMatch(
      /Joanna|Mazur|Katarzyna|Szef/,
    );
    expect(result.ok && result.interactionId).toBe(rows[0]?._id);
  });

  it("sends the ratings as facts, no name and no request to choose a rating", async () => {
    stubEnv(OPENAI_ENV);
    const fetchMock = vi.fn().mockResolvedValue(reply(answer()));
    vi.stubGlobal("fetch", fetchMock);
    const { t, review } = await setup();
    const result = await t.action(api.drafting.actions.generate, {
      actor: boss,
      reviewId: review,
    });
    expect(result.ok).toBe(true);
    const { body, user } = requestOf(fetchMock);
    expect(body).not.toMatch(/Joanna|Mazur|Katarzyna|Szef/);
    expect(user).toContain(
      "poziom wybrany przez przełożonego: powyżej oczekiwań",
    );
    expect(user).toContain(
      "O1 [2026-06-01, rozwojowa, kryterium: Komunikacja]",
    );
    expect(user).toContain("[PRACOWNIK] mówi niejasno");
    expect(user).toContain("Napisz projekt treści oceny");
    expect(user).not.toMatch(
      /zaproponuj ocen|wybierz ocen|jaką ocenę|jaki poziom/i,
    );
  });

  it("restores the name in the stored text", async () => {
    stubEnv(OPENAI_ENV);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        reply(
          answer({
            strengths: [
              { text: "[PRACOWNIK] jest terminowa.", evidence: ["O2"] },
            ],
          }),
        ),
      ),
    );
    const { t, review } = await setup();
    await t.action(api.drafting.actions.generate, {
      actor: boss,
      reviewId: review,
    });
    const strength = (await drafts(t)).find((r) => r.section === "strength");
    expect(strength?.text).toBe("Joanna Mazur jest terminowa.");
  });

  it("drops an observation label the model invented and marks the fragment as having no basis", async () => {
    stubEnv(OPENAI_ENV);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          reply(
            answer({ strengths: [{ text: "Zmyślone.", evidence: ["O77"] }] }),
          ),
        ),
    );
    const { t, review } = await setup();
    await t.action(api.drafting.actions.generate, {
      actor: boss,
      reviewId: review,
    });
    const strength = (await drafts(t)).find((r) => r.section === "strength");
    expect(strength).toMatchObject({ noEvidence: true, observationIds: [] });
  });

  it("links an action to its area through relatedDraftId", async () => {
    stubEnv(OPENAI_ENV);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(answer())));
    const { t, review } = await setup();
    await t.action(api.drafting.actions.generate, {
      actor: boss,
      reviewId: review,
    });
    const rows = await drafts(t);
    const area = rows.find((r) => r.section === "development_area");
    const action = rows.find((r) => r.section === "development_action");
    expect(action?.relatedDraftId).toBe(area?._id);
  });

  it("refuses a review with no ratings and never calls the model", async () => {
    stubEnv(OPENAI_ENV);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { t, review } = await setup(false);
    const result = await t.action(api.drafting.actions.generate, {
      actor: boss,
      reviewId: review,
    });
    expect(result).toEqual({
      ok: false,
      code: "denied",
      message: "Najpierw wybierz oceny kryteriów, potem poproś o projekt.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await drafts(t)).toEqual([]);
  });

  it("blocks an answer that names a rating level, stores nothing and leaves manual writing working", async () => {
    stubEnv(OPENAI_ENV);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        reply(
          answer({
            criteria: [
              {
                criterionId: "komunikacja",
                text: "Proponuję ocenę: powyżej oczekiwań.",
                evidence: ["O1"],
              },
            ],
          }),
        ),
      ),
    );
    const { t, review } = await setup();
    const result = await t.action(api.drafting.actions.generate, {
      actor: boss,
      reviewId: review,
    });
    expect(result).toMatchObject({ ok: false, code: "guardrail" });
    expect(await drafts(t)).toEqual([]);
    await t.mutation(api.drafting.mutations.addManual, {
      actor: boss,
      reviewId: review,
      section: "criterion_justification",
      criterionId: "komunikacja",
      text: "Własne uzasadnienie.",
    });
    expect(await drafts(t)).toHaveLength(1);
  });

  it("returns a typed error when the provider fails and manual writing still works", async () => {
    stubEnv(OPENAI_ENV);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("nope", { status: 401 })),
    );
    const { t, review } = await setup();
    const result = await t.action(api.drafting.actions.generate, {
      actor: boss,
      reviewId: review,
    });
    expect(result).toMatchObject({ ok: false, code: "auth" });
    expect(JSON.stringify(result)).not.toContain("secret-key");
    await t.mutation(api.drafting.mutations.addManual, {
      actor: boss,
      reviewId: review,
      section: "strength",
      text: "Własna mocna strona.",
    });
    expect(await drafts(t)).toHaveLength(1);
  });

  it("keeps the fragments the evaluator decided when it generates again", async () => {
    vi.stubEnv("AI_PROVIDER", "");
    const { t, review } = await setup();
    await t.action(api.drafting.actions.generate, {
      actor: boss,
      reviewId: review,
    });
    const first = (await drafts(t)).find((r) => r.section === "strength");
    expect(first).toBeDefined();
    await t.mutation(api.drafting.mutations.setStatus, {
      actor: boss,
      draftId: first!._id,
      status: "accepted",
    });
    const again = await t.action(api.drafting.actions.generate, {
      actor: boss,
      reviewId: review,
    });
    expect(again.ok).toBe(true);
    const rows = await drafts(t);
    expect(
      rows.filter((r) => r.status === "accepted").map((r) => r._id),
    ).toEqual([first!._id]);
    expect(rows.filter((r) => r.status === "proposed").length).toBeGreaterThan(
      0,
    );
  });

  it("refuses the employee and never calls the model", async () => {
    stubEnv(OPENAI_ENV);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { t, review } = await setup();
    const result = await t.action(api.drafting.actions.generate, {
      actor: { role: "employee" },
      reviewId: review,
    });
    expect(result).toMatchObject({ ok: false, code: "denied" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
