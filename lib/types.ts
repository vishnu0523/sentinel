// Core domain model for the assessment. Mirrors prisma/schema.prisma.

export type Severity = "critical" | "high" | "medium" | "low" | "info";

/** How far a claim has been substantiated. Seeded content is always "demo". */
export type Verification = "demo" | "unverified" | "verified";

export type HandlingClass = "TLP:CLEAR" | "TLP:GREEN" | "TLP:AMBER" | "TLP:RED";

export interface Assessment {
  id: string;
  name: string;
  target: string;
  sourceRepo: string;
  status: "planning" | "in-progress" | "reporting" | "closed";
  startDate: string;
  endDate: string;
  leadAssessor: string;
  authorizationRef: string;
  objective: string;
}

export interface ScopeItem {
  id: string;
  asset: string;
  kind:
    | "web"
    | "api"
    | "auth"
    | "data"
    | "infra"
    | "mcp"
    | "desktop"
    | "third-party"
    | "source";
  inScope: boolean;
  notes: string;
}

export type ZoneId =
  "client" | "edge" | "managed" | "backend" | "agent" | "local" | "external";

export interface Component {
  id: string;
  name: string;
  short: string;
  kind: string;
  zone: ZoneId;
  description: string;
  exposure: "public" | "authenticated" | "internal" | "local";
  dataHandled: string[];
  /** Layout position on the attack-surface canvas (viewBox units). */
  x: number;
  y: number;
}

export interface TrustBoundary {
  id: ZoneId;
  name: string;
  description: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DataFlow {
  id: string;
  from: string;
  to: string;
  label: string;
  protocol: string;
  crossesBoundary: boolean;
  carriesSecrets: boolean;
}

export type CheckCategory =
  | "auth"
  | "authz"
  | "cors"
  | "api"
  | "xss"
  | "ssrf"
  | "mcp"
  | "deps"
  | "desktop";

/**
 * fixture          — evaluated entirely against local modelled fixtures; always safe.
 * passive-network  — a single unauthenticated GET to an allow-listed in-scope host; no payloads.
 * active-local     — sends crafted inputs, but only to an in-process mock target. Blocked in
 *                    production-safe mode because the same technique would be intrusive live.
 */
export type CheckMode = "fixture" | "passive-network" | "active-local";

export type CheckStatus =
  "passed" | "failed" | "warning" | "not-run" | "blocked";

export interface TestCheck {
  id: string;
  category: CheckCategory;
  title: string;
  objective: string;
  componentId: string;
  mode: CheckMode;
  asvs: string;
  relatedFindingIds: string[];
}

export interface LogLine {
  level: "info" | "pass" | "fail" | "warn";
  text: string;
}

export interface TestResult {
  checkId: string;
  status: CheckStatus;
  summary: string;
  expected: string;
  observed: string;
  log: LogLine[];
  executedAt: string;
  durationMs: number;
  target: string;
}

export type FindingStatus =
  "open" | "in-remediation" | "fixed" | "accepted" | "false-positive";
export type RetestStatus = "not-retested" | "pass" | "fail" | "partial";

export interface CvssVector {
  AV: "N" | "A" | "L" | "P";
  AC: "L" | "H";
  PR: "N" | "L" | "H";
  UI: "N" | "R";
  S: "U" | "C";
  C: "N" | "L" | "H";
  I: "N" | "L" | "H";
  A: "N" | "L" | "H";
}

export interface Finding {
  id: string;
  title: string;
  summary: string;
  description: string;
  componentId: string;
  owasp: string;
  cwe: string;
  cvss: CvssVector;
  status: FindingStatus;
  verification: Verification;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  evidenceIds: string[];
  checkIds: string[];
  stepsToReproduce: string[];
  safePoc: string;
  businessImpact: string;
  remediation: string[];
  retest: { status: RetestStatus; date?: string; notes: string };
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  kind: "observation" | "inference" | "assumption";
  source: string;
  accessedAt: string;
  observation: string;
  confidence: 1 | 2 | 3 | 4 | 5;
  limitation: string;
  classification: HandlingClass;
  verification: Verification;
  findingIds: string[];
  origin: "seed" | "harness" | "analyst";
}

export type RemediationPhase =
  "quick-win" | "engineering" | "guardrail" | "regression";

export interface RemediationTask {
  id: string;
  title: string;
  detail: string;
  phase: RemediationPhase;
  findingIds: string[];
  owner: string;
  effort: "S" | "M" | "L";
  targetWeek: number;
  status: "todo" | "in-progress" | "done";
}

export type ReportSectionKey =
  | "executive"
  | "scope"
  | "methodology"
  | "findings"
  | "matrix"
  | "roadmap"
  | "appendix";

export interface ReportSection {
  key: ReportSectionKey;
  title: string;
  included: boolean;
}

export interface PostureSnapshot {
  label: string;
  score: number;
  open: number;
}
