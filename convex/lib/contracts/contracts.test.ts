import { convexTest } from "convex-test";
import { v, type Infer } from "convex/values";
import { describe, expect, expectTypeOf, it } from "vitest";
import { api } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import * as deadlineShiftMutations from "../../deadlineShift/mutations";
import * as deadlineShiftQueries from "../../deadlineShift/queries";
import * as forumMutations from "../../forum/mutations";
import * as forumQueries from "../../forum/queries";
import * as growthAdvice from "../../growth/advice";
import * as knowledgeAssistant from "../../knowledge/assistant";
import * as knowledgeDocuments from "../../knowledge/documents";
import schema from "../../schema";
import type { DeadlineChange } from "../../rules/types";
import { demoActor } from "../demoRole";
import * as advice from "./advice";
import * as deadlineShift from "./deadlineShift";
import * as forum from "./forum";
import * as knowledgeDocs from "./knowledgeDocs";

const modules = import.meta.glob("/convex/**/*.*s");

type Contract = { args: Record<string, unknown>; returns: unknown };
type Stub = { exportArgs(): string; exportReturns(): string };

type Entry = {
  name: string;
  stub: unknown;
  contract: Contract;
  public?: boolean;
};

const entries: Entry[] = [
  {
    name: "growth/advice:listAdvice",
    stub: growthAdvice.listAdvice,
    contract: advice.listAdviceContract,
    public: true,
  },
  {
    name: "growth/advice:getAdvice",
    stub: growthAdvice.getAdvice,
    contract: advice.getAdviceContract,
    public: true,
  },
  {
    name: "deadlineShift/queries:listForSupervisor",
    stub: deadlineShiftQueries.listForSupervisor,
    contract: deadlineShift.listForSupervisorContract,
  },
  {
    name: "deadlineShift/queries:listAwaitingNotice",
    stub: deadlineShiftQueries.listAwaitingNotice,
    contract: deadlineShift.listAwaitingNoticeContract,
  },
  {
    name: "deadlineShift/queries:listForEmployee",
    stub: deadlineShiftQueries.listForEmployee,
    contract: deadlineShift.listForEmployeeContract,
  },
  {
    name: "deadlineShift/queries:get",
    stub: deadlineShiftQueries.get,
    contract: deadlineShift.getContract,
  },
  {
    name: "deadlineShift/mutations:decide",
    stub: deadlineShiftMutations.decide,
    contract: deadlineShift.decideContract,
  },
  {
    name: "deadlineShift/mutations:markNoticeSent",
    stub: deadlineShiftMutations.markNoticeSent,
    contract: deadlineShift.markNoticeSentContract,
  },
  {
    name: "knowledge/documents:list",
    stub: knowledgeDocuments.list,
    contract: knowledgeDocs.listDocumentsContract,
  },
  {
    name: "knowledge/documents:generateUploadUrl",
    stub: knowledgeDocuments.generateUploadUrl,
    contract: knowledgeDocs.generateUploadUrlContract,
  },
  {
    name: "knowledge/documents:register",
    stub: knowledgeDocuments.register,
    contract: knowledgeDocs.registerDocumentContract,
  },
  {
    name: "knowledge/documents:remove",
    stub: knowledgeDocuments.remove,
    contract: knowledgeDocs.removeDocumentContract,
  },
  {
    name: "knowledge/assistant:ask",
    stub: knowledgeAssistant.ask,
    contract: knowledgeDocs.askContract,
  },
  {
    name: "forum/queries:listThreads",
    stub: forumQueries.listThreads,
    contract: forum.listThreadsContract,
  },
  {
    name: "forum/queries:getThread",
    stub: forumQueries.getThread,
    contract: forum.getThreadContract,
  },
  {
    name: "forum/mutations:createThread",
    stub: forumMutations.createThread,
    contract: forum.createThreadContract,
  },
  {
    name: "forum/mutations:reply",
    stub: forumMutations.reply,
    contract: forum.replyContract,
  },
  {
    name: "forum/mutations:report",
    stub: forumMutations.report,
    contract: forum.reportContract,
  },
];

const exported = (stub: unknown) => stub as Stub;
// `json` is the validator's wire form; Convex leaves it out of the public types.
const json = (validator: unknown) =>
  JSON.stringify((validator as { json: unknown }).json);

describe("backend contract (B1, B2, B4, B5)", () => {
  it("covers every function of the spec", () => {
    expect(entries).toHaveLength(18);
  });

  it.each(entries)(
    "$name registers exactly the contract's args and returns",
    ({ stub, contract }) => {
      expect(exported(stub).exportArgs()).toBe(
        json(v.object(contract.args as Record<string, never>)),
      );
      expect(exported(stub).exportReturns()).toBe(json(contract.returns));
    },
  );

  it.each(entries)(
    "$name takes actor: demoActor unless it is public",
    ({ contract, public: isPublic }) => {
      if (isPublic) {
        expect(contract.args).not.toHaveProperty("actor");
      } else {
        expect(json(contract.args.actor)).toBe(json(demoActor));
      }
    },
  );

  it("marks exactly the B1 reads as public", () => {
    expect(
      entries.filter((entry) => entry.public).map((entry) => entry.name),
    ).toEqual(["growth/advice:listAdvice", "growth/advice:getAdvice"]);
  });
});

describe("stubs", () => {
  const actor = { role: "supervisor" } as const;
  const notImplemented = { data: { code: "NOT_IMPLEMENTED" } };

  it("B1 query throws NOT_IMPLEMENTED", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.query(api.growth.advice.listAdvice, {}),
    ).rejects.toMatchObject(notImplemented);
  });

  it("B2 query throws NOT_IMPLEMENTED", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.query(api.deadlineShift.queries.listForSupervisor, { actor }),
    ).rejects.toMatchObject(notImplemented);
  });

  it("B4 mutation and action throw NOT_IMPLEMENTED", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.knowledge.documents.generateUploadUrl, { actor }),
    ).rejects.toMatchObject(notImplemented);
    await expect(
      t.action(api.knowledge.assistant.ask, { actor, question: "Ile urlopu?" }),
    ).rejects.toMatchObject(notImplemented);
  });

  it("B5 query throws NOT_IMPLEMENTED", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.query(api.forum.queries.listThreads, { actor }),
    ).rejects.toMatchObject(notImplemented);
  });

  it("rejects a call without actor before reaching the stub", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.query(
        api.deadlineShift.queries.listForSupervisor,
        {} as { actor: typeof actor },
      ),
    ).rejects.toThrow(/actor/);
  });
});

describe("contract types follow the tables", () => {
  it("keeps advice literals equal to the stored ones", () => {
    expectTypeOf<advice.AdviceListItem["topic"]>().toEqualTypeOf<
      Doc<"adviceArticles">["topic"]
    >();
  });

  it("keeps the shift row's reason and status equal to the deadline change", () => {
    expectTypeOf<deadlineShift.ShiftRequest["reason"]>().toEqualTypeOf<
      DeadlineChange["reason"]
    >();
    expectTypeOf<deadlineShift.ShiftRequest["status"]>().toEqualTypeOf<
      DeadlineChange["status"]
    >();
  });

  it("derives the exported types from the validators", () => {
    expectTypeOf<forum.ForumThreadRow>().toEqualTypeOf<
      Infer<typeof forum.forumThreadRow>
    >();
    expectTypeOf<knowledgeDocs.KnowledgeDocumentRow["status"]>().toEqualTypeOf<
      Doc<"knowledgeDocuments">["status"]
    >();
  });
});
