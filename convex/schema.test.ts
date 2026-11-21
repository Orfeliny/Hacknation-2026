import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";

const modules = import.meta.glob("/convex/**/*.*s");

const NOW = 1_763_700_000_000;

describe("domain schema", () => {
  it("lists every table group next to notes", () => {
    expect(Object.keys(schema.tables).sort()).toEqual(
      [
        "aiInteractions",
        "auditLog",
        "competencyAssessments",
        "conversations",
        "drafts",
        "employees",
        "firstReviews",
        "hrSignals",
        "knowledgeChunks",
        "mailMessages",
        "notes",
        "observations",
        "regulationWatch",
        "reminders",
        "reviews",
        "selfNotes",
      ].sort(),
    );
  });

  it("stores a minimal row in each table and reads it back through every index", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const employeeId = await ctx.db.insert("employees", {
        firstName: "Anna",
        lastName: "Przykładowa",
        position: "Główny specjalista",
        unit: "Wydział Kadr",
        createdAt: NOW,
        supervisorId: undefined,
        demoPersona: "employee",
        seedKey: "emp-1",
        authSubject: "sub-1",
      });
      const reviewId = await ctx.db.insert("reviews", {
        employeeId,
        evaluatorId: employeeId,
        stage: "setup",
        createdAt: NOW,
      });
      const observationId = await ctx.db.insert("observations", {
        employeeId,
        authorId: employeeId,
        date: "2026-11-21",
        text: "Terminowo przygotowany raport.",
        sentiment: "positive",
        createdAt: NOW,
      });
      await ctx.db.insert("selfNotes", {
        employeeId,
        text: "x",
        createdAt: NOW,
      });
      const conversationId = await ctx.db.insert("conversations", {
        employeeId,
        authorId: employeeId,
        kind: "opening",
        createdAt: NOW,
        reviewId,
      });
      const draftId = await ctx.db.insert("drafts", {
        reviewId,
        section: "strength",
        text: "x",
        status: "proposed",
        createdAt: NOW,
        observationIds: [observationId],
      });
      await ctx.db.insert("hrSignals", {
        employeeId,
        supervisorId: employeeId,
        kind: "workload",
        reason: "x",
        detectedAt: NOW,
      });
      const firstReviewId = await ctx.db.insert("firstReviews", {
        employeeId,
        evaluatorId: employeeId,
        stage: "start",
        createdAt: NOW,
      });
      const reminderId = await ctx.db.insert("reminders", {
        recipientId: employeeId,
        kind: "upcoming",
        dueDate: "2026-12-01",
        message: "x",
        createdAt: NOW,
        reviewId,
        stage: "opening",
        firstReviewId,
      });
      await ctx.db.insert("competencyAssessments", {
        employeeId,
        assessorId: employeeId,
        competencyId: "c1",
        modelVersion: "1",
        createdAt: NOW,
        reviewId,
        firstReviewId,
      });
      await ctx.db.insert("knowledgeChunks", {
        sourceId: "rozp-2016",
        sourceTitle: "Rozporządzenie",
        locator: "§ 11",
        text: "skala ocen cząstkowych",
        order: 1,
      });
      await ctx.db.insert("auditLog", {
        actorRole: "hr",
        action: "view",
        entity: "reviews",
        entityId: reviewId,
        at: NOW,
        reviewId,
      });
      await ctx.db.insert("aiInteractions", {
        module: "drafting",
        provider: "mock",
        model: "mock",
        sentPrompt: "[OSOBA_1]",
        output: "{}",
        createdAt: NOW,
        reviewId,
        employeeId,
        draftId,
      });
      await ctx.db.insert("mailMessages", {
        recipientId: employeeId,
        kind: "meeting_invitation",
        subject: "x",
        body: "x",
        channel: "demo_inbox",
        status: "queued",
        createdAt: NOW,
        reviewId,
        conversationId,
        reminderId,
        dedupeKey: "k1",
      });
      await ctx.db.insert("regulationWatch", {
        eliId: "DU/2016/470",
        title: "x",
        checkedAt: NOW,
      });

      const one = async (p: Promise<unknown[]>) =>
        expect(await p).toHaveLength(1);
      await one(
        ctx.db
          .query("employees")
          .withIndex("by_supervisor", (q) => q.eq("supervisorId", undefined))
          .collect(),
      );
      await one(
        ctx.db
          .query("employees")
          .withIndex("by_demoPersona", (q) => q.eq("demoPersona", "employee"))
          .collect(),
      );
      await one(
        ctx.db
          .query("employees")
          .withIndex("by_seedKey", (q) => q.eq("seedKey", "emp-1"))
          .collect(),
      );
      await one(
        ctx.db
          .query("employees")
          .withIndex("by_authSubject", (q) => q.eq("authSubject", "sub-1"))
          .collect(),
      );
      await one(
        ctx.db
          .query("reviews")
          .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
          .collect(),
      );
      await one(
        ctx.db
          .query("reviews")
          .withIndex("by_evaluator", (q) => q.eq("evaluatorId", employeeId))
          .collect(),
      );
      await one(
        ctx.db
          .query("reviews")
          .withIndex("by_stage", (q) => q.eq("stage", "setup"))
          .collect(),
      );
      await one(
        ctx.db
          .query("observations")
          .withIndex("by_employee_date", (q) =>
            q.eq("employeeId", employeeId).eq("date", "2026-11-21"),
          )
          .collect(),
      );
      await one(
        ctx.db
          .query("observations")
          .withIndex("by_author", (q) => q.eq("authorId", employeeId))
          .collect(),
      );
      await one(
        ctx.db
          .query("selfNotes")
          .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
          .collect(),
      );
      await one(
        ctx.db
          .query("conversations")
          .withIndex("by_review", (q) => q.eq("reviewId", reviewId))
          .collect(),
      );
      await one(
        ctx.db
          .query("conversations")
          .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
          .collect(),
      );
      await one(
        ctx.db
          .query("conversations")
          .withIndex("by_author", (q) => q.eq("authorId", employeeId))
          .collect(),
      );
      await one(
        ctx.db
          .query("drafts")
          .withIndex("by_review", (q) => q.eq("reviewId", reviewId))
          .collect(),
      );
      await one(
        ctx.db
          .query("hrSignals")
          .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
          .collect(),
      );
      await one(
        ctx.db
          .query("hrSignals")
          .withIndex("by_supervisor", (q) => q.eq("supervisorId", employeeId))
          .collect(),
      );
      await one(
        ctx.db
          .query("reminders")
          .withIndex("by_recipient", (q) => q.eq("recipientId", employeeId))
          .collect(),
      );
      await one(
        ctx.db
          .query("reminders")
          .withIndex("by_review_stage_kind", (q) =>
            q
              .eq("reviewId", reviewId)
              .eq("stage", "opening")
              .eq("kind", "upcoming"),
          )
          .collect(),
      );
      await one(
        ctx.db
          .query("reminders")
          .withIndex("by_firstReview_stage_kind", (q) =>
            q.eq("firstReviewId", firstReviewId),
          )
          .collect(),
      );
      await one(
        ctx.db
          .query("competencyAssessments")
          .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
          .collect(),
      );
      await one(
        ctx.db
          .query("competencyAssessments")
          .withIndex("by_review", (q) => q.eq("reviewId", reviewId))
          .collect(),
      );
      await one(
        ctx.db
          .query("competencyAssessments")
          .withIndex("by_firstReview", (q) =>
            q.eq("firstReviewId", firstReviewId),
          )
          .collect(),
      );
      await one(
        ctx.db
          .query("knowledgeChunks")
          .withIndex("by_source", (q) => q.eq("sourceId", "rozp-2016"))
          .collect(),
      );
      await one(
        ctx.db
          .query("knowledgeChunks")
          .withSearchIndex("search_text", (q) => q.search("text", "skala"))
          .collect(),
      );
      await one(
        ctx.db
          .query("firstReviews")
          .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
          .collect(),
      );
      await one(
        ctx.db
          .query("firstReviews")
          .withIndex("by_evaluator", (q) => q.eq("evaluatorId", employeeId))
          .collect(),
      );
      await one(
        ctx.db
          .query("auditLog")
          .withIndex("by_review", (q) => q.eq("reviewId", reviewId))
          .collect(),
      );
      await one(
        ctx.db
          .query("auditLog")
          .withIndex("by_entity", (q) =>
            q.eq("entity", "reviews").eq("entityId", reviewId),
          )
          .collect(),
      );
      await one(
        ctx.db
          .query("aiInteractions")
          .withIndex("by_review", (q) => q.eq("reviewId", reviewId))
          .collect(),
      );
      await one(
        ctx.db
          .query("aiInteractions")
          .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
          .collect(),
      );
      await one(
        ctx.db
          .query("mailMessages")
          .withIndex("by_recipient", (q) => q.eq("recipientId", employeeId))
          .collect(),
      );
      await one(
        ctx.db
          .query("mailMessages")
          .withIndex("by_dedupeKey", (q) => q.eq("dedupeKey", "k1"))
          .collect(),
      );
      await one(
        ctx.db
          .query("mailMessages")
          .withIndex("by_review", (q) => q.eq("reviewId", reviewId))
          .collect(),
      );
      await one(
        ctx.db
          .query("regulationWatch")
          .withIndex("by_eliId", (q) => q.eq("eliId", "DU/2016/470"))
          .collect(),
      );
    });
  });

  it("stores a review with every optional shape from D5-D7", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const employeeId = await ctx.db.insert("employees", {
        firstName: "Jan",
        lastName: "Testowy",
        position: "Radca",
        unit: "Departament Prawny",
        createdAt: NOW,
        positionKind: "non_managerial",
        corpsRole: "official",
        serviceGrade: 3,
        serviceGradeSince: "2023-04-01",
      });
      const fileId = await ctx.storage.store(new Blob(["%PDF-1.7"]));
      const reviewId = await ctx.db.insert("reviews", {
        employeeId,
        evaluatorId: employeeId,
        stage: "writing",
        createdAt: NOW,
        sheet: "C",
        round: 2,
        dueDate: "2027-03-16",
        signatures: [
          {
            role: "employee",
            signerId: employeeId,
            signedAt: NOW,
            scope: "part_one",
            place: "Warszawa",
            deemedById: employeeId,
          },
          {
            role: "evaluator",
            signerId: employeeId,
            signedAt: NOW,
            scope: "assessment",
            method: "signed_file",
            fileId,
            signatureDetected: true,
          },
        ],
        deadlineChanges: [
          {
            reason: "absence_extension",
            status: "approved",
            previousDate: "2027-03-16",
            newDate: "2027-05-02",
            createdAt: NOW,
          },
          {
            reason: "employee_request",
            status: "requested",
            previousDate: "2027-05-02",
            newDate: "2027-06-01",
            createdAt: NOW,
            requestedById: employeeId,
          },
        ],
        objection: {
          filedAt: NOW,
          text: "Nie zgadzam się z oceną kryterium rzetelność.",
          decision: "redo",
          decidedAt: NOW,
          decidedById: employeeId,
        },
      });
      const review = await ctx.db.get(reviewId);
      expect(review?.signatures).toHaveLength(2);
      expect(review?.objection?.decision).toBe("redo");
    });
  });

  it("rejects an unknown union literal", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.run(async (ctx) => {
        await ctx.db.insert("employees", {
          firstName: "A",
          lastName: "B",
          position: "C",
          unit: "D",
          createdAt: NOW,
          // @ts-expect-error "senior" was replaced by "office_head" (§ 3 ust. 2)
          positionKind: "senior",
        });
      }),
    ).rejects.toThrow();
  });
});
