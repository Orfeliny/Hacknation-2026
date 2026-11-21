import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { MESSAGES } from "./access";
import {
  MAX_SIGNED_FILE_BYTES,
  detectPadesSignature,
  looksLikePdf,
} from "./pades";

const modules = import.meta.glob("/convex/**/*.*s");

const supervisor = { role: "supervisor" as const };
const employee = { role: "employee" as const };
const hr = { role: "hr" as const };
const director = { role: "director" as const };

const bytesOf = (text: string) =>
  Uint8Array.from(text, (ch) => ch.charCodeAt(0));

const pad = (n: number) => String(n).padStart(10, "0");

// A minimal PDF with a PAdES-shaped signature dictionary. /Contents is a fake CMS blob (no
// certificate, no personal data); /ByteRange is computed so the hole is exactly the hex string.
function signedPdf(
  subFilter = "ETSI.CAdES.detached",
  contents = "3082010a0201013100".padEnd(64, "a"),
): Uint8Array<ArrayBuffer> {
  const placeholder = `/ByteRange [${pad(0)} ${pad(0)} ${pad(0)} ${pad(0)}]`;
  const head = [
    "%PDF-1.7",
    "1 0 obj << /Type /Catalog /Pages 2 0 R /AcroForm << /Fields [4 0 R] /SigFlags 3 >> >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Annots [4 0 R] >> endobj",
    "4 0 obj << /Type /Annot /Subtype /Widget /FT /Sig /T (Podpis) /V 5 0 R /Rect [0 0 0 0] /P 3 0 R >> endobj",
    `5 0 obj << /Type /Sig /Filter /Adobe.PPKLite /SubFilter /${subFilter} ${placeholder} /Contents <`,
  ].join("\n");
  const tail = `> /M (D:20261121120000Z) >>\nendobj\ntrailer << /Root 1 0 R >>\n%%EOF\n`;
  const text = head + contents + tail;
  const b = head.length - 1;
  const c = head.length + contents.length + 1;
  const range = `/ByteRange [${pad(0)} ${pad(b)} ${pad(c)} ${pad(text.length - c)}]`;
  return bytesOf(text.replace(placeholder, range));
}

const unsignedPdf = () =>
  bytesOf(
    [
      "%PDF-1.7",
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >> endobj",
      "trailer << /Root 1 0 R >>",
      "%%EOF",
    ].join("\n"),
  );

describe("detectPadesSignature", () => {
  it("finds a PAdES and a PKCS#7 signature", () => {
    expect(detectPadesSignature(signedPdf())).toEqual({
      detected: true,
      subFilter: "ETSI.CAdES.detached",
    });
    expect(
      detectPadesSignature(signedPdf("adbe.pkcs7.detached")).detected,
    ).toBe(true);
  });

  it("finds nothing in an unsigned PDF", () => {
    expect(looksLikePdf(unsignedPdf())).toBe(true);
    expect(detectPadesSignature(unsignedPdf()).detected).toBe(false);
  });

  it("rejects a prepared but empty signature field and a timestamp only", () => {
    expect(
      detectPadesSignature(signedPdf(undefined, "0".repeat(64))).detected,
    ).toBe(false);
    expect(detectPadesSignature(signedPdf("ETSI.RFC3161")).detected).toBe(
      false,
    );
  });

  it("rejects a /ByteRange that does not point at /Contents", () => {
    const text = String.fromCharCode(...signedPdf()).replace(
      /\/ByteRange \[(\d+) (\d+)/,
      (_, a: string, b: string) => `/ByteRange [${a} ${pad(Number(b) - 1)}`,
    );
    expect(detectPadesSignature(bytesOf(text)).detected).toBe(false);
  });
});

const MANDATORY_C = [
  "wykorzystywanie_wiedzy",
  "rzetelnosc",
  "organizacja_pracy",
  "wspolpraca",
  "komunikacja",
];

async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.employees.seed.run, {});
  const anna = (
    await t.query(api.reviews.queries.candidates, { actor: supervisor })
  ).find((c) => c.name.startsWith("Anna"))!;
  const reviewId = await t.mutation(api.reviews.mutations.start, {
    actor: supervisor,
    employeeId: anna._id,
  });
  await t.mutation(api.reviews.mutations.save, {
    actor: supervisor,
    reviewId,
    patch: {
      openingConversationDate: "2026-01-12",
      expectations: MANDATORY_C.map((criterionId) => ({
        criterionId,
        text: "Oczekiwanie",
      })),
    },
  });
  return { t, reviewId };
}

type T = Awaited<ReturnType<typeof setup>>["t"];

const store = (
  t: T,
  bytes: Uint8Array<ArrayBuffer>,
  type = "application/pdf",
) => t.run((ctx) => ctx.storage.store(new Blob([bytes], { type })));

const attach = (
  t: T,
  reviewId: Id<"reviews">,
  actor: { role: "supervisor" | "employee" | "hr" | "director" },
  scope: "part_one" | "assessment",
  storageId: Id<"_storage">,
) =>
  t.action(api.signatures.actions.attachSignedFile, {
    actor,
    reviewId,
    scope,
    storageId,
    place: "Warszawa",
  });

const fileExists = (t: T, id: Id<"_storage">) =>
  t.run(async (ctx) => (await ctx.db.system.get(id)) !== null);

async function toSigning(t: T, reviewId: Id<"reviews">) {
  const advance = () =>
    t.mutation(api.reviews.mutations.advance, { actor: supervisor, reviewId });
  const save = (patch: object) =>
    t.mutation(api.reviews.mutations.save, {
      actor: supervisor,
      reviewId,
      patch,
    });
  await advance();
  await save({ periodStart: "2026-01-12", periodEnd: "2026-11-01" });
  await advance();
  await save({ evaluationConversationDate: "2026-11-05" });
  await advance();
  await save({
    ratings: MANDATORY_C.map((criterionId) => ({ criterionId, levelId: "7" })),
    developmentPlan: { summary: "Szkolenie z analizy danych." },
  });
  await advance();
}

describe("signed file upload", () => {
  it("records part I (§ 6 ust. 2) from signed files of both sides", async () => {
    const { t, reviewId } = await setup();
    const url = await t.mutation(api.signatures.mutations.generateUploadUrl, {
      actor: employee,
      reviewId,
    });
    expect(url).toMatch(/^https:/);

    const forEvaluator = await store(t, signedPdf());
    await expect(
      attach(t, reviewId, supervisor, "part_one", forEvaluator),
    ).resolves.toEqual({ subFilter: "ETSI.CAdES.detached" });
    await attach(
      t,
      reviewId,
      employee,
      "part_one",
      await store(t, signedPdf()),
    );

    const list = await t.query(api.signatures.queries.listForReview, {
      actor: employee,
      reviewId,
    });
    const partOne = list!.moments.find((m) => m.scope === "part_one")!;
    expect(partOne.source).toMatch(/§ 6 ust\. 2/);
    for (const entry of partOne.entries) {
      expect(entry).toMatchObject({
        signed: true,
        method: "signed_file",
        signatureDetected: true,
        place: "Warszawa",
        status: "Podpis elektroniczny wykryty w pliku",
      });
      expect(entry.signed && entry.fileUrl).toMatch(/^https:/);
    }
    const audit = await t.run((ctx) =>
      ctx.db
        .query("auditLog")
        .withIndex("by_review", (q) => q.eq("reviewId", reviewId))
        .collect(),
    );
    expect(audit.map((a) => a.details)).toContain(
      "employee:part_one:signed_file",
    );
    await t.mutation(api.reviews.mutations.advance, {
      actor: supervisor,
      reviewId,
    });
  });

  it("rejects a file without a signature with „Nie znaleziono podpisu” and deletes it", async () => {
    const { t, reviewId } = await setup();
    const id = await store(t, unsignedPdf());
    await expect(
      attach(t, reviewId, supervisor, "part_one", id),
    ).rejects.toThrow(/Nie znaleziono podpisu/);
    expect(await fileExists(t, id)).toBe(false);
    const review = await t.run((ctx) => ctx.db.get(reviewId));
    expect(review?.signatures).toEqual([]);
  });

  it("limits the type and the size of the file", async () => {
    const { t, reviewId } = await setup();
    const text = await store(t, signedPdf(), "text/plain");
    await expect(
      attach(t, reviewId, supervisor, "part_one", text),
    ).rejects.toThrow(MESSAGES.notPdf);
    expect(await fileExists(t, text)).toBe(false);

    const fake = await store(t, bytesOf("not a pdf /ByteRange"));
    await expect(
      attach(t, reviewId, supervisor, "part_one", fake),
    ).rejects.toThrow(MESSAGES.notPdf);

    const big = new Uint8Array(MAX_SIGNED_FILE_BYTES + 1);
    big.set(signedPdf());
    const huge = await store(t, big);
    await expect(
      attach(t, reviewId, supervisor, "part_one", huge),
    ).rejects.toThrow(/za duży/);
    expect(await fileExists(t, huge)).toBe(false);
  });

  it("lets only the evaluator and the reviewed employee attach, and keeps the file of others", async () => {
    const { t, reviewId } = await setup();
    const id = await store(t, unsignedPdf());
    for (const actor of [hr, director]) {
      await expect(attach(t, reviewId, actor, "part_one", id)).rejects.toThrow(
        MESSAGES.notSigner,
      );
      await expect(
        t.mutation(api.signatures.mutations.generateUploadUrl, {
          actor,
          reviewId,
        }),
      ).rejects.toThrow(MESSAGES.notSigner);
    }
    expect(await fileExists(t, id)).toBe(true);
  });

  it("follows the review's signing rules: stage, order and no double signature", async () => {
    const { t, reviewId } = await setup();
    await expect(
      attach(
        t,
        reviewId,
        supervisor,
        "assessment",
        await store(t, signedPdf()),
      ),
    ).rejects.toThrow(/na etapie „Podpisy”/);
    await attach(
      t,
      reviewId,
      supervisor,
      "part_one",
      await store(t, signedPdf()),
    );
    await expect(
      attach(t, reviewId, supervisor, "part_one", await store(t, signedPdf())),
    ).rejects.toThrow(/już złożony/);
  });

  it("refuses a file already attached and keeps it for the first signature", async () => {
    const { t, reviewId } = await setup();
    const file = await store(t, signedPdf());
    await attach(t, reviewId, supervisor, "part_one", file);
    await expect(
      attach(t, reviewId, employee, "part_one", file),
    ).rejects.toThrow(MESSAGES.fileReused);
    expect(await fileExists(t, file)).toBe(true);
  });

  it("signs the assessment (§ 12) with a file and opens the objection window", async () => {
    const { t, reviewId } = await setup();
    await attach(
      t,
      reviewId,
      supervisor,
      "part_one",
      await store(t, signedPdf()),
    );
    await t.mutation(api.reviews.mutations.sign, {
      actor: employee,
      reviewId,
      scope: "part_one",
      place: "Warszawa",
    });
    await toSigning(t, reviewId);
    await expect(
      attach(t, reviewId, employee, "assessment", await store(t, signedPdf())),
    ).rejects.toThrow(/po oceniającym/);
    await attach(
      t,
      reviewId,
      supervisor,
      "assessment",
      await store(t, signedPdf("adbe.pkcs7.detached")),
    );
    await attach(
      t,
      reviewId,
      employee,
      "assessment",
      await store(t, signedPdf()),
    );

    const list = await t.query(api.signatures.queries.listForReview, {
      actor: hr,
      reviewId,
    });
    expect(list?.stage).toBe("objection_window");
    const assessment = list!.moments.find((m) => m.scope === "assessment")!;
    expect(assessment.source).toMatch(/§ 12/);
    expect(assessment.entries.every((e) => e.signed)).toBe(true);
    const partOne = list!.moments.find((m) => m.scope === "part_one")!;
    expect(partOne.entries.map((e) => e.signed && e.method)).toEqual([
      "signed_file",
      "in_app",
    ]);
  });
});

describe("deemed acknowledgement", () => {
  it("lets HR record it after the evaluator's signature and moves on", async () => {
    const { t, reviewId } = await setup();
    for (const actor of [supervisor, employee]) {
      await t.mutation(api.reviews.mutations.sign, {
        actor,
        reviewId,
        scope: "part_one",
        place: "Warszawa",
      });
    }
    await toSigning(t, reviewId);
    const deem = (actor: typeof hr | typeof employee) =>
      t.mutation(api.signatures.mutations.recordDeemedAcknowledgement, {
        actor,
        reviewId,
        place: "Warszawa",
      });
    await expect(deem(employee)).rejects.toThrow(MESSAGES.notDeemer);
    await expect(deem(hr)).rejects.toThrow(/po oceniającym/);
    await t.mutation(api.reviews.mutations.sign, {
      actor: supervisor,
      reviewId,
      scope: "assessment",
      place: "Warszawa",
    });
    await deem(hr);

    const list = await t.query(api.signatures.queries.listForReview, {
      actor: supervisor,
      reviewId,
    });
    expect(list?.stage).toBe("objection_window");
    const entry = list!.moments
      .find((m) => m.scope === "assessment")!
      .entries.find((e) => e.role === "employee")!;
    expect(entry).toMatchObject({ signed: true, method: "deemed" });
    expect(entry.status).toMatch(/Fikcja zapoznania/);
  });
});

describe("listForReview", () => {
  it("shows both moments as missing at the start and hides the review from others", async () => {
    const { t, reviewId } = await setup();
    const list = await t.query(api.signatures.queries.listForReview, {
      actor: supervisor,
      reviewId,
    });
    expect(list?.moments.map((m) => m.scope)).toEqual([
      "part_one",
      "assessment",
    ]);
    expect(
      list?.moments.flatMap((m) => m.entries).every((e) => !e.signed),
    ).toBe(true);

    await t.run(async (ctx) => {
      const rows = await ctx.db.query("employees").collect();
      const anna = rows.find((e) => e.firstName === "Anna")!;
      await ctx.db.patch(anna._id, { demoPersona: undefined });
      await ctx.db.insert("employees", {
        firstName: "Obcy",
        lastName: "Pracownik",
        position: "x",
        unit: "x",
        createdAt: 0,
        corpsRole: "official",
        demoPersona: "employee",
      });
    });
    expect(
      await t.query(api.signatures.queries.listForReview, {
        actor: employee,
        reviewId,
      }),
    ).toBeNull();
  });
});
