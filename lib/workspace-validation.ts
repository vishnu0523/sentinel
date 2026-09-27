import { z } from "zod";
import type { Workspace } from "./workspace";

const text = z.string().max(20000);
const id = z.string().min(1).max(150);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const time = z
  .string()
  .refine((v) => Number.isFinite(Date.parse(v)), "Invalid timestamp");
const strings = z.array(text).max(100);
const cvss = z.object({
  AV: z.enum(["N", "A", "L", "P"]),
  AC: z.enum(["L", "H"]),
  PR: z.enum(["N", "L", "H"]),
  UI: z.enum(["N", "R"]),
  S: z.enum(["U", "C"]),
  C: z.enum(["N", "L", "H"]),
  I: z.enum(["N", "L", "H"]),
  A: z.enum(["N", "L", "H"]),
});
const finding = z.object({
  id,
  title: text.min(1),
  summary: text,
  description: text,
  componentId: id,
  cwe: text,
  owasp: text,
  cvss,
  status: z.enum([
    "open",
    "in-remediation",
    "fixed",
    "accepted",
    "false-positive",
  ]),
  verification: z.enum(["unverified", "verified"]),
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  evidenceIds: strings,
  checkIds: strings,
  stepsToReproduce: strings,
  safePoc: text,
  businessImpact: text,
  remediation: strings,
  retest: z.object({
    status: z.enum(["not-retested", "pass", "fail", "partial"]),
    notes: text,
    date: time.optional(),
  }),
  createdAt: time,
  updatedAt: time,
});
const assertion = z.object({
  name: text,
  expected: text,
  actual: text,
  passed: z.boolean(),
});
const result = z.object({
  id,
  title: text,
  category: text,
  cwe: text,
  remediation: text,
  before: text,
  after: text,
  assertions: z.array(assertion).min(1).max(100),
  passed: z.boolean(),
  durationMs: z.number().nonnegative(),
});
const run = z.object({
  id,
  mode: z.enum(["baseline", "hardened"]),
  createdAt: time,
  results: z.array(result).length(8),
  provenance: text,
  digest: hash,
});
const source = z.object({
  id,
  createdAt: time,
  commit: text,
  dirty: z.boolean(),
  files: z.number().int().nonnegative(),
  routes: z.number().int().nonnegative(),
  signals: z
    .array(
      z.object({
        file: text,
        line: z.number().int().positive(),
        kind: text,
        note: text,
        hash,
      }),
    )
    .max(1500),
  digest: hash,
  truncated: z.boolean(),
  limitation: text,
});
const schema = z.object({
  version: z.literal(2),
  findings: z.array(finding).max(200),
  runs: z.array(run).max(30),
  source: source.nullable(),
  notes: z.record(text),
  tasks: z.record(z.enum(["todo", "in-progress", "done"])),
  scope: z.object({
    assessor: text,
    reference: text,
    environment: text,
    confirmed: z.boolean(),
  }),
});

export function parseWorkspace(input: unknown): Workspace {
  const checked = schema.safeParse(input);
  if (!checked.success)
    throw new Error(
      `Invalid assessment packet: ${checked.error.issues[0].path.join(".") || "workspace"}.`,
    );
  const value = input as Workspace;
  if (
    new Set(value.findings.map((f) => f.id)).size !== value.findings.length ||
    new Set(value.runs.map((r) => r.id)).size !== value.runs.length
  )
    throw new Error("Duplicate record IDs in assessment packet.");
  for (const r of value.runs)
    for (const result of r.results) {
      if (
        result.passed !== result.assertions.every((a) => a.passed) ||
        result.assertions.some((a) => a.passed !== (a.expected === a.actual))
      )
        throw new Error(
          "Inconsistent assertion outcomes in assessment packet.",
        );
    }
  // Preserve captured run property order because the digest covers its original JSON bytes.
  return {
    version: 2,
    findings: value.findings,
    runs: value.runs,
    source: value.source,
    tasks: value.tasks,
    notes: value.notes,
    scope: value.scope,
  };
}
export async function verifyRunDigest(run: Workspace["runs"][number]) {
  const { digest, ...record } = run;
  const data = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(record)),
  );
  return (
    Array.from(new Uint8Array(data))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("") === digest
  );
}
