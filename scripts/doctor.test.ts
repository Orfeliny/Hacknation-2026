import { describe, expect, it } from "vitest";
import {
  nodeMajor,
  parseArgs,
  runChecks,
  runDoctor,
  secretNames,
  vercelLinked,
} from "./doctor.mjs";

type Run = (
  command: string,
  args: string[],
) => { status: number; stdout: string; stderr: string };
const ok = (stdout = "") => ({ status: 0, stdout, stderr: "" });
const bad = () => ({ status: 1, stdout: "", stderr: "boom" });
const ALL = [
  "CONVEX_DEPLOY_KEY",
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID",
];
const SECRET_VALUE = "SUPERSECRET-123";
const CHROMIUM = "/cache/chromium/chrome";
const norm = (p: string) => p.replace(/\\/g, "/");

function makeDeps(
  over: {
    run?: Run;
    files?: Record<string, string>;
    existing?: string[];
    nodeVersion?: string;
  } = {},
) {
  const files: Record<string, string> = {
    ".nvmrc": "24\n",
    ".env.local": `CONVEX_DEPLOYMENT=dev:fox-1 # ${SECRET_VALUE}\n`,
    ".vercel/project.json": JSON.stringify({ projectId: "p", orgId: "o" }),
    ...over.files,
  };
  const existing = new Set(
    over.existing ?? ["/home/.convex/config.json", CHROMIUM],
  );
  const run: Run =
    over.run ??
    ((command, args) => {
      const line = `${command} ${args.join(" ")}`;
      if (line === "gh auth status") return ok();
      if (line === "git remote get-url origin")
        return ok("git@github.com:o/r.git\n");
      if (line.startsWith("gh repo view")) return ok("{}");
      if (line.startsWith("gh secret list"))
        return ok(JSON.stringify(ALL.map((name) => ({ name }))));
      if (args[0] === "-e") return ok(`${CHROMIUM}\n`);
      return bad();
    });
  return {
    run,
    readFile: (p: string) => files[norm(p)] ?? null,
    exists: (p: string) => existing.has(norm(p)),
    root: ".",
    home: "/home",
    nodeVersion: over.nodeVersion ?? "v24.15.0",
    log: () => {},
  };
}

const failing = (results: { id: string; ok: boolean }[]) =>
  results.filter((r) => !r.ok).map((r) => r.id);

describe("doctor helpers", () => {
  it("parses node major and args", () => {
    expect(nodeMajor("v24.1.2")).toBe(24);
    expect(nodeMajor("")).toBeNaN();
    expect(nodeMajor("lts/*")).toBeNaN();
    expect(parseArgs(["--json"])).toEqual({ json: true });
    expect(() => parseArgs(["--x"])).toThrow(/Nieznana opcja/);
  });

  it("reads secret names and the vercel link", () => {
    expect(secretNames('[{"name":"A"},{"name":"B"}]')).toEqual(["A", "B"]);
    expect(secretNames("nope")).toBeNull();
    expect(secretNames("{}")).toBeNull();
    expect(vercelLinked('{"projectId":"p","orgId":"o"}')).toBe(true);
    expect(vercelLinked('{"projectId":"p"}')).toBe(false);
    expect(vercelLinked(null)).toBe(false);
  });
});

describe("runChecks", () => {
  it("passes on a ready machine", () => {
    expect(failing(runChecks(makeDeps()))).toEqual([]);
  });

  it("fails node on a different major", () => {
    expect(failing(runChecks(makeDeps({ nodeVersion: "v25.0.0" })))).toEqual([
      "node",
    ]);
  });

  it("fails when gh is not logged in", () => {
    const base = makeDeps();
    const run: Run = (c, a) => (c === "gh" ? bad() : base.run(c, a));
    const failed = failing(runChecks({ ...base, run }));
    expect(failed).toEqual(
      expect.arrayContaining([
        "gh-auth",
        "gh-repo",
        "secrets-production",
        "secrets-preview",
      ]),
    );
  });

  it("fails on a missing secret and names it in the fix", () => {
    const base = makeDeps();
    const run: Run = (c, a) =>
      a.join(" ").includes("secret list --env preview")
        ? ok(JSON.stringify([{ name: "VERCEL_TOKEN" }]))
        : base.run(c, a);
    const results = runChecks({ ...base, run });
    expect(failing(results)).toEqual(["secrets-preview"]);
    expect(results.find((r) => !r.ok)?.fix).toContain("CONVEX_DEPLOY_KEY");
  });

  it("fails convex, vercel and playwright when state is missing", () => {
    const deps = makeDeps({
      existing: [],
      files: { ".env.local": "", ".vercel/project.json": "" },
    });
    expect(failing(runChecks(deps))).toEqual([
      "convex-login",
      "convex-deployment",
      "vercel-link",
      "playwright-chromium",
    ]);
  });
});

describe("runChecks hardening", () => {
  const withRun = (fn: (c: string, a: string[]) => ReturnType<Run>) => {
    const base = makeDeps();
    return { ...base, run: ((c, a) => fn(c, a) ?? base.run(c, a)) as Run };
  };
  const fixOf = (results: { id: string; fix?: string }[], id: string) =>
    results.find((r) => r.id === id)?.fix;

  it("fails gh-repo for a non-github remote", () => {
    const deps = withRun((c) =>
      c === "git" ? ok("https://gitlab.com/o/r.git") : (undefined as never),
    );
    const results = runChecks(deps);
    expect(failing(results)).toContain("gh-repo");
    expect(fixOf(results, "gh-repo")).toBeTruthy();
  });

  it("fails gh-repo when there is no remote", () => {
    const results = runChecks(
      withRun((c) => (c === "git" ? bad() : (undefined as never))),
    );
    expect(failing(results)).toContain("gh-repo");
    expect(fixOf(results, "gh-repo")).toBeTruthy();
  });

  it("does not crash when commands are not found (127)", () => {
    const notFound = { status: 127, stdout: "", stderr: "ENOENT" };
    const results = runChecks(withRun(() => notFound));
    expect(failing(results)).toEqual(
      expect.arrayContaining(["gh-auth", "gh-repo", "playwright-chromium"]),
    );
    expect(results.filter((r) => !r.ok).every((r) => r.fix)).toBe(true);
  });

  it("explains an unreadable secret list instead of claiming all missing", () => {
    for (const list of [bad(), ok("not json")]) {
      const results = runChecks(
        withRun((_c, a) => (a[0] === "secret" ? list : (undefined as never))),
      );
      const fix = fixOf(results, "secrets-preview") ?? "";
      expect(fix).toContain("gh auth status");
      expect(fix).toContain("environments/preview");
      expect(fix).not.toContain("brakuje");
    }
  });

  it("flags .nvmrc mismatch and a missing .nvmrc", () => {
    expect(failing(runChecks(makeDeps({ files: { ".nvmrc": "22" } })))).toEqual(
      ["node"],
    );
    const empty = runChecks(makeDeps({ files: { ".nvmrc": "" } }));
    expect(failing(empty)).toEqual(["node"]);
    expect(fixOf(empty, "node")).toContain("fnm use 24");
    const base = makeDeps();
    const missing = runChecks({
      ...base,
      readFile: (p) => (p.endsWith(".nvmrc") ? null : base.readFile(p)),
    });
    expect(failing(missing)).toEqual(["node"]);
    expect(fixOf(missing, "node")).toContain("fnm use 24");
  });

  it("never prints secret-looking command output", () => {
    const leaky = { status: 1, stdout: SECRET_VALUE, stderr: SECRET_VALUE };
    for (const argv of [[], ["--json"]]) {
      const lines: string[] = [];
      runDoctor(argv, {
        ...withRun(() => leaky),
        log: (l) => lines.push(l),
      });
      expect(lines.join(" ")).not.toContain(SECRET_VALUE);
    }
  });
});

describe("runDoctor", () => {
  it("exits 0 and prints only PASS lines", () => {
    const lines: string[] = [];
    expect(runDoctor([], { ...makeDeps(), log: (l) => lines.push(l) })).toBe(0);
    expect(lines.every((l) => l.startsWith("PASS"))).toBe(true);
  });

  it("exits 1 with fixes on failure and never leaks secrets", () => {
    for (const argv of [[], ["--json"]]) {
      const lines: string[] = [];
      const code = runDoctor(argv, {
        ...makeDeps({ nodeVersion: "v25.0.0", existing: [] }),
        log: (l) => lines.push(l),
      });
      const out = lines.join("\n");
      expect(code).toBe(1);
      expect(out).not.toContain(SECRET_VALUE);
      expect(out).toContain("npx convex login");
    }
  });

  it("emits a JSON array of {id, ok, fix?}", () => {
    const lines: string[] = [];
    runDoctor(["--json"], { ...makeDeps(), log: (l) => lines.push(l) });
    const parsed = JSON.parse(lines.join("\n")) as {
      id: string;
      ok: boolean;
    }[];
    expect(parsed).toHaveLength(9);
    expect(parsed[0]).toEqual({ id: "node", ok: true });
  });

  it("exits 2 on an unknown option", () => {
    expect(runDoctor(["--wat"], makeDeps())).toBe(2);
  });
});
