import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createMockProvider } from "./mock";
import { AIProviderError } from "./types";

const notesSummary = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
});

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as AIProviderError;
  }
  throw new Error("expected rejection");
}

describe("mock provider", () => {
  const provider = createMockProvider();

  it("returns canned Polish text with provider metadata", async () => {
    const result = await provider.generateText({
      prompt: "Spotkanie z zespołem w sprawie budżetu",
    });
    expect(result.provider).toBe("mock");
    expect(result.model).toBe("mock");
    expect(result.text).toContain("Podsumowanie");
    expect(result.text).toContain("Spotkanie z zespołem w");
  });

  it("is deterministic for the same input", async () => {
    const a = await provider.generateText({ prompt: "to samo" });
    const b = await createMockProvider().generateText({ prompt: "to samo" });
    expect(a).toEqual(b);
    const s1 = await provider.generateStructuredOutput({
      prompt: "x",
      schema: notesSummary,
      schemaName: "notesSummary",
    });
    const s2 = await provider.generateStructuredOutput({
      prompt: "x",
      schema: notesSummary,
      schemaName: "notesSummary",
    });
    expect(s1).toEqual(s2);
  });

  it("derives text from the input", async () => {
    const a = await provider.generateText({ prompt: "krótki" });
    const b = await provider.generateText({
      prompt: "zupełnie inny, dłuższy tekst",
    });
    expect(a.text).not.toBe(b.text);
  });

  it("forces an unavailable error with [mock:error]", async () => {
    const error = await failure(
      provider.generateText({ prompt: "[mock:error] cokolwiek" }),
    );
    expect(error).toBeInstanceOf(AIProviderError);
    expect(error.code).toBe("unavailable");
    expect(error.retryable).toBe(true);
  });

  it("forces a timeout with [mock:timeout]", async () => {
    const error = await failure(
      provider.generateText({ prompt: "[mock:timeout]" }),
    );
    expect(error.code).toBe("timeout");
  });

  it("applies scenarios to structured output too", async () => {
    const error = await failure(
      provider.generateStructuredOutput({
        prompt: "[mock:error]",
        schema: notesSummary,
        schemaName: "notesSummary",
      }),
    );
    expect(error.code).toBe("unavailable");
  });

  it("returns the notesSummary fixture validated by the schema", async () => {
    const result = await provider.generateStructuredOutput({
      prompt: "x",
      schema: notesSummary,
      schemaName: "notesSummary",
    });
    expect(result.data.summary.length).toBeGreaterThan(0);
    expect(result.data.keyPoints.length).toBeGreaterThan(0);
    expect(result.provider).toBe("mock");
  });

  it("rejects an unknown schemaName with a config error", async () => {
    const error = await failure(
      provider.generateStructuredOutput({
        prompt: "x",
        schema: z.object({}),
        schemaName: "nope",
      }),
    );
    expect(error.code).toBe("config");
    expect(error.retryable).toBe(false);
  });

  it("does not resolve inherited names like toString as fixtures", async () => {
    const error = await failure(
      provider.generateStructuredOutput({
        prompt: "x",
        schema: z.unknown(),
        schemaName: "toString",
      }),
    );
    expect(error.code).toBe("config");
  });

  it("reports bad_response when the fixture fails the given schema", async () => {
    const error = await failure(
      provider.generateStructuredOutput({
        prompt: "x",
        schema: z.object({ other: z.number() }),
        schemaName: "notesSummary",
      }),
    );
    expect(error.code).toBe("bad_response");
  });

  describe("mockFixture", () => {
    const schema = z.object({ tip: z.string() });

    it("returns the module's fixture for a schemaName the mock does not know", async () => {
      const result = await provider.generateStructuredOutput({
        prompt: "x",
        schema,
        schemaName: "conversationPlan",
        mockFixture: { tip: "Zacznij od celu rozmowy." },
      });
      expect(result.data).toEqual({ tip: "Zacznij od celu rozmowy." });
    });

    it("reports bad_response when the module's fixture fails the schema", async () => {
      const error = await failure(
        provider.generateStructuredOutput({
          prompt: "x",
          schema,
          schemaName: "conversationPlan",
          mockFixture: { tip: 1 } as unknown as { tip: string },
        }),
      );
      expect(error.code).toBe("bad_response");
    });

    it("prefers its own fixture for a known schemaName", async () => {
      const result = await provider.generateStructuredOutput({
        prompt: "x",
        schema: z.object({
          summary: z.string(),
          keyPoints: z.array(z.string()),
        }),
        schemaName: "notesSummary",
        mockFixture: { summary: "inne", keyPoints: [] },
      });
      expect(result.data.summary).not.toBe("inne");
    });

    it("still lets [mock:error] win", async () => {
      const error = await failure(
        provider.generateStructuredOutput({
          prompt: "[mock:error] x",
          schema,
          schemaName: "conversationPlan",
          mockFixture: { tip: "x" },
        }),
      );
      expect(error.code).toBe("unavailable");
    });
  });

  it("exposes fixed provider info", () => {
    expect(provider.getProviderInfo()).toEqual({ id: "mock", model: "mock" });
  });
});

describe("mock embed", () => {
  const provider = createMockProvider();
  const dot = (a: number[], b: number[]) =>
    a.reduce((sum, x, i) => sum + x * (b[i] ?? 0), 0);

  it("returns one normalised 1024-dimension vector per text, deterministically", async () => {
    const first = await provider.embed({ texts: ["ocena okresowa", "urlop"] });
    const again = await provider.embed({ texts: ["ocena okresowa", "urlop"] });
    expect(first.vectors).toHaveLength(2);
    expect(first.vectors[0]).toHaveLength(1024);
    expect(first.vectors).toEqual(again.vectors);
    expect(dot(first.vectors[0], first.vectors[0])).toBeCloseTo(1, 6);
  });

  it("puts texts that share words closer than unrelated ones", async () => {
    const { vectors } = await provider.embed({
      texts: [
        "sprzeciw od oceny okresowej w terminie 7 dni",
        "termin na sprzeciw od oceny okresowej",
        "przepis na zurek z jajkiem",
      ],
    });
    expect(dot(vectors[0], vectors[1])).toBeGreaterThan(
      dot(vectors[0], vectors[2]),
    );
  });

  it("rejects an empty batch and a batch over the limit", async () => {
    await expect(provider.embed({ texts: [] })).rejects.toMatchObject({
      code: "config",
    });
    await expect(
      provider.embed({ texts: new Array<string>(65).fill("x") }),
    ).rejects.toMatchObject({ code: "config" });
  });

  it("can be told to fail", async () => {
    await expect(
      provider.embed({ texts: ["[mock:error] x"] }),
    ).rejects.toMatchObject({ code: "unavailable" });
  });
});
