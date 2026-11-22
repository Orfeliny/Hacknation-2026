import { describe, expect, it, vi } from "vitest";
import { fetchSource, SourceError } from "./fetchSource";
import {
  checkPublicHttpsUrl,
  eliFromUrl,
  fileNameFromUrl,
  isPrivateHost,
  normalizeUrl,
} from "./urlSafety";
import { fileKindOf, parseFileInput, parseUrlInput } from "./validation";

describe("urlSafety", () => {
  it.each([
    "localhost",
    "intranet",
    "foo.local",
    "10.1.2.3",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "100.64.0.1",
    "[::1]",
    "[fd00::1]",
    "[::ffff:127.0.0.1]",
  ])("treats %s as private", (host) => {
    expect(isPrivateHost(host)).toBe(true);
  });

  it.each(["eli.gov.pl", "8.8.8.8", "[2001:4860:4860::8888]"])(
    "treats %s as public",
    (host) => {
      expect(isPrivateHost(host)).toBe(false);
    },
  );

  it("accepts only public https links", () => {
    expect(checkPublicHttpsUrl("https://eli.gov.pl/x").ok).toBe(true);
    expect(checkPublicHttpsUrl("http://eli.gov.pl/x")).toMatchObject({
      ok: false,
    });
    expect(checkPublicHttpsUrl("https://user:pw@eli.gov.pl/x").ok).toBe(false);
    expect(checkPublicHttpsUrl("https://eli.gov.pl:8443/x").ok).toBe(false);
    expect(checkPublicHttpsUrl("https://192.168.0.1/x").ok).toBe(false);
    expect(checkPublicHttpsUrl("nie adres").ok).toBe(false);
  });

  it("reads the ELI id and the text address", () => {
    const url = new URL("https://eli.gov.pl/api/acts/DU/2016/470/text.html");
    expect(eliFromUrl(url)).toEqual({
      eliId: "DU/2016/470",
      textUrl: "https://eli.gov.pl/api/acts/DU/2016/470/text.html",
    });
    expect(
      eliFromUrl(new URL("https://eli.gov.pl/eli/DU/2016/470/ogl")),
    ).toMatchObject({
      eliId: "DU/2016/470",
    });
    expect(
      eliFromUrl(new URL("https://example.com/api/acts/DU/2016/470")),
    ).toBeNull();
  });

  it("names the file after the last path segment and normalises the key", () => {
    const url = new URL("https://example.com/a/b/Regulamin%20pracy.pdf#x");
    expect(fileNameFromUrl(url)).toBe("Regulamin pracy.pdf");
    expect(normalizeUrl(new URL("https://Example.com/a/#x"))).toBe(
      "example.com/a",
    );
  });
});

describe("validation", () => {
  const base = { title: "  Regulamin   pracy ", scope: "office" as const };

  it("normalises the title and requires a unit for scope unit", () => {
    const parsed = parseFileInput({ ...base, fileName: "r.PDF" });
    expect(parsed).toMatchObject({ title: "Regulamin pracy", kind: "pdf" });
    expect(() =>
      parseFileInput({ ...base, scope: "unit", fileName: "r.pdf" }),
    ).toThrow(/jednostk/);
  });

  it("refuses .doc with the DOCX hint and unknown types", () => {
    expect(() => fileKindOf("a.doc")).toThrow(/zapisz dokument jako DOCX/);
    expect(() => fileKindOf("a.exe")).toThrow(/Nieobsługiwany/);
    expect(fileKindOf("a.md")).toBe("markdown");
  });

  it("validates the checklist", () => {
    const checklist = {
      validityScope: "Cały urząd",
      legalBasis: "Art. 1",
      effectiveDate: "2026-02-30",
      publicationDate: "2026-01-01",
      polishLanguage: true,
      publicationConsent: true,
    };
    expect(() =>
      parseFileInput({ ...base, fileName: "r.pdf", checklist }),
    ).toThrow(/istniejącą datę/);
    expect(() =>
      parseFileInput({
        ...base,
        fileName: "r.pdf",
        checklist: { ...checklist, effectiveDate: "2026-02-01" },
      }),
    ).not.toThrow();
  });

  it("rejects http and private links", () => {
    expect(() =>
      parseUrlInput({ ...base, url: "http://eli.gov.pl/x" }),
    ).toThrow(/https/);
    expect(() => parseUrlInput({ ...base, url: "https://10.0.0.1/x" })).toThrow(
      /wewnętrzną/,
    );
  });
});

function response(body: string, init: ResponseInit = {}) {
  return new Response(body, init);
}

describe("fetchSource", () => {
  const publicResolve = () => Promise.resolve(["93.184.216.34"]);

  it("downloads a public document", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        response("<p>Tekst</p>", { headers: { "content-type": "text/html" } }),
      ),
    );
    const result = await fetchSource("https://example.com/a.html", {
      fetch: fetchMock as unknown as typeof fetch,
      resolve: publicResolve,
    });
    expect(new TextDecoder().decode(result.bytes)).toBe("<p>Tekst</p>");
    expect(result.contentType).toBe("text/html");
  });

  it("refuses a redirect to a private host", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        response("", {
          status: 302,
          headers: { location: "https://169.254.169.254/latest" },
        }),
      ),
    );
    await expect(
      fetchSource("https://example.com/a", {
        fetch: fetchMock as unknown as typeof fetch,
        resolve: publicResolve,
      }),
    ).rejects.toThrow(/sieć wewnętrzną/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuses a name that resolves to a private address", async () => {
    const fetchMock = vi.fn();
    await expect(
      fetchSource("https://example.com/a", {
        fetch: fetchMock as unknown as typeof fetch,
        resolve: () => Promise.resolve(["10.0.0.5"]),
      }),
    ).rejects.toBeInstanceOf(SourceError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops at the size limit", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(response("x".repeat(100))));
    await expect(
      fetchSource("https://example.com/a", {
        fetch: fetchMock as unknown as typeof fetch,
        resolve: publicResolve,
        maxBytes: 10,
      }),
    ).rejects.toThrow(/za duży/);
  });

  it("reports server errors and follows no endless redirects", async () => {
    const notFound = vi.fn(() =>
      Promise.resolve(response("", { status: 404 })),
    );
    await expect(
      fetchSource("https://example.com/a", {
        fetch: notFound as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/404/);
    const loop = vi.fn(() =>
      Promise.resolve(
        response("", {
          status: 301,
          headers: { location: "https://example.com/b" },
        }),
      ),
    );
    await expect(
      fetchSource("https://example.com/a", {
        fetch: loop as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/przekierowań/);
  });
});
