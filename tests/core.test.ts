import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { executeLab } from "../lib/lab";
import { reviewSource } from "../lib/source-review";
import { cvssScore } from "../lib/cvss";
import { initialWorkspace } from "../lib/workspace";
import { parseWorkspace, verifyRunDigest } from "../lib/workspace-validation";
import { createHash } from "node:crypto";
import { findingQualification, submissionReadiness } from "../lib/readiness";

test("workspace packets reject malformed vectors and duplicate IDs", () => {
  const state = initialWorkspace();
  assert.equal(parseWorkspace(state).findings.length, 5);
  assert.throws(
    () =>
      parseWorkspace({
        ...state,
        findings: [{ ...state.findings[0], cvss: {} }],
      }),
    /Invalid assessment/,
  );
  assert.throws(
    () =>
      parseWorkspace({
        ...state,
        findings: [state.findings[0], state.findings[0]],
      }),
    /Duplicate/,
  );
});
test("fixture evidence survives JSON round-trip and detects tampering", async () => {
  const record = {
    id: "test-run",
    mode: "hardened" as const,
    createdAt: new Date().toISOString(),
    results: executeLab("hardened"),
    provenance: "Unit-test fixture",
  };
  const run = {
    ...record,
    digest: createHash("sha256").update(JSON.stringify(record)).digest("hex"),
  };
  const state = parseWorkspace(
    JSON.parse(JSON.stringify({ ...initialWorkspace(), runs: [run] })),
  );
  assert.equal(await verifyRunDigest(state.runs[0]), true);
  state.runs[0].provenance = "Changed";
  assert.equal(await verifyRunDigest(state.runs[0]), false);
});

test("baseline demonstrates failures while positive controls still pass", () => {
  const results = executeLab("baseline");
  assert.equal(results.length, 8);
  assert.equal(results.filter((r) => r.passed).length, 0);
  assert.ok(results.some((r) => r.assertions.some((a) => a.passed)));
  assert.equal(
    results.find((r) => r.id === "TOKEN-07")!.assertions[1].passed,
    false,
  );
});
test("hardened models pass all assertions, including URL and expiry edge cases", () => {
  const results = executeLab("hardened");
  assert.ok(results.every((r) => r.passed));
  assert.equal(
    results.reduce((n, r) => n + r.assertions.length, 0),
    25,
  );
  const urls = results.find((r) => r.id === "URL-05")!;
  assert.equal(urls.assertions[2].actual, "false");
  assert.equal(urls.assertions[4].actual, "false");
});
test("CVSS handles maximum, zero impact and scope-changed vectors", () => {
  assert.equal(
    cvssScore({
      AV: "N",
      AC: "L",
      PR: "N",
      UI: "N",
      S: "U",
      C: "H",
      I: "H",
      A: "H",
    }),
    9.8,
  );
  assert.equal(
    cvssScore({
      AV: "N",
      AC: "L",
      PR: "N",
      UI: "N",
      S: "U",
      C: "N",
      I: "N",
      A: "N",
    }),
    0,
  );
  assert.equal(
    cvssScore({
      AV: "N",
      AC: "L",
      PR: "N",
      UI: "R",
      S: "C",
      C: "L",
      I: "L",
      A: "N",
    }),
    6.1,
  );
});
test("source inventory uses AST nodes, ignores comments, and hashes actual bytes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "sentinel-test-"));
  try {
    await mkdir(path.join(root, "src"));
    await writeFile(
      path.join(root, "src", "sample.ts"),
      '// element.innerHTML = unsafe;\nconst literal = "innerHTML";\nnode.innerHTML = text;\nfetch(destination);\nfetch("https://example.org");\nvalidateApiKey(request);\n',
    );
    const first = await reviewSource(root);
    assert.equal(first.files, 1);
    assert.deepEqual(
      first.signals.map((s) => s.kind),
      ["HTML sink", "Dynamic fetch", "Auth control"],
    );
    assert.deepEqual(
      first.signals.map((s) => s.line),
      [3, 4, 6],
    );
    assert.equal(first.digest, (await reviewSource(root)).digest);
    await writeFile(
      path.join(root, "src", "sample.ts"),
      "fetch(otherDestination);",
    );
    assert.notEqual(first.digest, (await reviewSource(root)).digest);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("submission readiness cannot claim verification without its evidence chain", () => {
  const state = initialWorkspace();
  assert.equal(submissionReadiness(state).score, 0);
  assert.ok(findingQualification(state, state.findings[0]).length >= 3);

  const qualified = {
    ...state.findings[0],
    verification: "verified" as const,
    evidenceIds: ["api/example.ts:10 SHA-256 abc"],
    safePoc: "A controlled local regression test reproduced the behavior.",
    businessImpact: "The affected workflow could expose restricted user data.",
  };
  const complete = {
    ...state,
    scope: { ...state.scope, confirmed: true, reference: "ROE-001" },
    source: {
      id: "source-1",
      createdAt: new Date().toISOString(),
      commit: "a".repeat(40),
      dirty: false,
      files: 1,
      routes: 1,
      signals: [],
      digest: "b".repeat(64),
      truncated: false,
      limitation: "Test inventory",
    },
    findings: [qualified, ...state.findings.slice(1)],
  };
  assert.deepEqual(findingQualification(complete, qualified), []);
  assert.equal(submissionReadiness(complete).verifiedCount, 1);
  assert.equal(submissionReadiness(complete).score, 75);
});
