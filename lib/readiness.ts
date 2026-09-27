import type { Finding } from "./types";
import type { Workspace } from "./workspace";

export interface ReadinessCheck {
  id: string;
  label: string;
  detail: string;
  weight: number;
  complete: boolean;
}

export function findingQualification(
  workspace: Workspace,
  finding: Finding,
): string[] {
  const missing: string[] = [];
  if (!workspace.scope.confirmed || !workspace.scope.reference.trim())
    missing.push("record written authorization");
  if (!workspace.source || workspace.source.commit === "unavailable")
    missing.push("capture a pinned source revision");
  if (!finding.evidenceIds.length)
    missing.push("link target-specific evidence");
  if (!finding.stepsToReproduce.length)
    missing.push("record reproducible validation steps");
  if (finding.safePoc.trim().length < 30)
    missing.push("document the controlled proof of concept");
  if (finding.businessImpact.trim().length < 30)
    missing.push("document concrete business impact");
  if (!finding.remediation.length)
    missing.push("provide a remediation recommendation");
  return missing;
}

export function submissionReadiness(workspace: Workspace) {
  const baseline = workspace.runs.some((run) => run.mode === "baseline");
  const hardened = workspace.runs.some((run) => run.mode === "hardened");
  const verified = workspace.findings.filter(
    (finding) => finding.verification === "verified",
  );
  const evidenceComplete = verified.some(
    (finding) => findingQualification(workspace, finding).length === 0,
  );
  const checks: ReadinessCheck[] = [
    {
      id: "authorization",
      label: "Authorization recorded",
      detail: "Written rules-of-engagement reference and confirmation",
      weight: 15,
      complete:
        workspace.scope.confirmed && Boolean(workspace.scope.reference.trim()),
    },
    {
      id: "revision",
      label: "Target revision pinned",
      detail: "Source bytes, commit and inventory digest captured",
      weight: 15,
      complete:
        Boolean(workspace.source) && workspace.source?.commit !== "unavailable",
    },
    {
      id: "controls",
      label: "Control pair executed",
      detail: "Baseline and hardened fixture evidence retained",
      weight: 15,
      complete: baseline && hardened,
    },
    {
      id: "finding",
      label: "Valid vulnerability confirmed",
      detail: "At least one target-specific finding is verified",
      weight: 25,
      complete: verified.length > 0,
    },
    {
      id: "proof",
      label: "Proof package complete",
      detail: "Evidence, reproduction, impact and remediation are linked",
      weight: 20,
      complete: evidenceComplete,
    },
    {
      id: "retest",
      label: "Remediation retested",
      detail: "A verified finding includes a passing retest record",
      weight: 10,
      complete: verified.some((finding) => finding.retest.status === "pass"),
    },
  ];
  const score = checks.reduce(
    (total, check) => total + (check.complete ? check.weight : 0),
    0,
  );
  return {
    score,
    checks,
    verifiedCount: verified.length,
    label:
      score === 100
        ? "Submission ready"
        : score >= 70
          ? "Evidence review"
          : score >= 40
            ? "Validation in progress"
            : "Working draft",
  };
}
