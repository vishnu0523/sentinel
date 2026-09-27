// CVSS v3.1 base score, implemented from the FIRST specification (section 7).
import type { CvssVector, Severity } from "./types";

const W = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
  AC: { L: 0.77, H: 0.44 },
  UI: { N: 0.85, R: 0.62 },
  CIA: { H: 0.56, L: 0.22, N: 0 },
} as const;

function privilegesRequired(pr: CvssVector["PR"], scope: CvssVector["S"]) {
  if (pr === "N") return 0.85;
  if (pr === "L") return scope === "C" ? 0.68 : 0.62;
  return scope === "C" ? 0.5 : 0.27;
}

/** Spec-defined Roundup: smallest one-decimal number >= input, float-safe. */
export function roundUp(value: number) {
  const int = Math.round(value * 100000);
  if (int % 10000 === 0) return int / 100000;
  return (Math.floor(int / 10000) + 1) / 10;
}

export function cvssScore(v: CvssVector) {
  const iss = 1 - (1 - W.CIA[v.C]) * (1 - W.CIA[v.I]) * (1 - W.CIA[v.A]);
  const impact =
    v.S === "U"
      ? 6.42 * iss
      : 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
  const exploitability =
    8.22 * W.AV[v.AV] * W.AC[v.AC] * privilegesRequired(v.PR, v.S) * W.UI[v.UI];
  if (impact <= 0) return 0;
  return v.S === "U"
    ? roundUp(Math.min(impact + exploitability, 10))
    : roundUp(Math.min(1.08 * (impact + exploitability), 10));
}

export function severityFromScore(score: number): Severity {
  if (score >= 9) return "critical";
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  if (score > 0) return "low";
  return "info";
}

export function vectorString(v: CvssVector) {
  return `CVSS:3.1/AV:${v.AV}/AC:${v.AC}/PR:${v.PR}/UI:${v.UI}/S:${v.S}/C:${v.C}/I:${v.I}/A:${v.A}`;
}

export const CVSS_METRICS: {
  key: keyof CvssVector;
  label: string;
  help: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "AV",
    label: "Attack Vector",
    help: "How remote the attacker can be when exploiting the weakness.",
    options: [
      { value: "N", label: "Network" },
      { value: "A", label: "Adjacent" },
      { value: "L", label: "Local" },
      { value: "P", label: "Physical" },
    ],
  },
  {
    key: "AC",
    label: "Attack Complexity",
    help: "Conditions beyond the attacker's control that must exist.",
    options: [
      { value: "L", label: "Low" },
      { value: "H", label: "High" },
    ],
  },
  {
    key: "PR",
    label: "Privileges Required",
    help: "Level of privileges the attacker must hold before exploitation.",
    options: [
      { value: "N", label: "None" },
      { value: "L", label: "Low" },
      { value: "H", label: "High" },
    ],
  },
  {
    key: "UI",
    label: "User Interaction",
    help: "Whether a user other than the attacker must take an action.",
    options: [
      { value: "N", label: "None" },
      { value: "R", label: "Required" },
    ],
  },
  {
    key: "S",
    label: "Scope",
    help: "Whether impact extends beyond the vulnerable component's security authority.",
    options: [
      { value: "U", label: "Unchanged" },
      { value: "C", label: "Changed" },
    ],
  },
  {
    key: "C",
    label: "Confidentiality",
    help: "Impact on information disclosure.",
    options: [
      { value: "N", label: "None" },
      { value: "L", label: "Low" },
      { value: "H", label: "High" },
    ],
  },
  {
    key: "I",
    label: "Integrity",
    help: "Impact on trustworthiness and correctness of data.",
    options: [
      { value: "N", label: "None" },
      { value: "L", label: "Low" },
      { value: "H", label: "High" },
    ],
  },
  {
    key: "A",
    label: "Availability",
    help: "Impact on availability of the affected component.",
    options: [
      { value: "N", label: "None" },
      { value: "L", label: "Low" },
      { value: "H", label: "High" },
    ],
  },
];
