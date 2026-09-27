"use client";
import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  ClipboardCheck,
  Database,
  FileText,
  Fingerprint,
  LockKeyhole,
  Shield,
  X,
  Check,
} from "lucide-react";
import { components, remediationTasks } from "@/lib/seed/architecture";
import { CVSS_METRICS, cvssScore, vectorString } from "@/lib/cvss";
import type { Finding, FindingStatus } from "@/lib/types";
import type { Workspace } from "@/lib/workspace";
import type { LabRun } from "@/lib/lab";
import { submissionReadiness } from "@/lib/readiness";
import {
  Button,
  Empty,
  Heading,
  Pill,
  SearchInput,
  Severity,
  date,
  download,
} from "./ui";

export const statusLabel: Record<FindingStatus, string> = {
  open: "Open",
  "in-remediation": "In progress",
  fixed: "Fixed",
  accepted: "Accepted risk",
  "false-positive": "False positive",
};
export function FindingDetail({
  finding: f,
  update,
  note,
  setNote,
}: {
  finding: Finding;
  update: (f: Finding) => boolean;
  note: string;
  setNote: (v: string) => void;
}) {
  const [tab, setTab] = useState("Overview");
  return (
    <article className="finding-detail">
      <div className="finding-detail-top">
        <span className="mono muted">
          {f.id} / {f.cwe}
        </span>
        <Pill tone={f.verification === "verified" ? "green" : "orange"}>
          {f.verification === "verified"
            ? "Verified target finding"
            : "Unverified hypothesis"}
        </Pill>
      </div>
      <h2>{f.title}</h2>
      <p className="finding-summary">{f.summary}</p>
      <div className="finding-meta">
        <label>
          Status
          <select
            value={f.status}
            onChange={(e) =>
              update({ ...f, status: e.target.value as FindingStatus })
            }
          >
            {Object.entries(statusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span>Component</span>
          <strong>
            {components.find((c) => c.id === f.componentId)?.name ||
              f.componentId}
          </strong>
        </div>
        <div>
          <span>Indicative severity</span>
          <Severity finding={f} />
        </div>
      </div>
      <div className="tabs" role="tablist">
        {[
          "Overview",
          "Reproduction",
          "CVSS scoring",
          "Analyst notes",
          "Edit record",
        ].map((t) => (
          <button
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={tab === t ? "active" : ""}
            key={t}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="finding-body">
        {tab === "Edit record" && (
          <FindingEditor key={f.id} finding={f} update={update} />
        )}
        {tab === "Overview" && (
          <>
            <h3>Description</h3>
            <p>{f.description}</p>
            <h3>Potential business impact</h3>
            <p>{f.businessImpact}</p>
            <h3>Evidence references</h3>
            {f.evidenceIds.length ? (
              <ul className="evidence-references">
                {f.evidenceIds.map((ref, i) => (
                  <li className="mono" key={i}>
                    {ref}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No evidence linked yet.</p>
            )}
            <h3>Remediation recommendations</h3>
            <ol className="numbered">
              {f.remediation.map((r, i) => (
                <li key={i}>
                  <span>{i + 1}</span>
                  {r}
                </li>
              ))}
            </ol>
            <div className="inline-note">
              <LockKeyhole size={16} />
              <p>
                Target-specific evidence is required. Workflow status does not
                establish verification.
              </p>
            </div>
          </>
        )}
        {tab === "Reproduction" && (
          <>
            <h3>Validation procedure</h3>
            <ol className="numbered">
              {f.stepsToReproduce.map((s, i) => (
                <li key={i}>
                  <span>{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <h3>Proposed controlled proof</h3>
            <p>{f.safePoc}</p>
            <h3>Retest</h3>
            <Pill>{f.retest.status}</Pill>
            <p>{f.retest.notes}</p>
            <div className="inline-note">
              <Fingerprint size={16} />
              <p>
                Seeded procedures are research starting points. Lab models are
                independent of these target-specific claims.
              </p>
            </div>
          </>
        )}
        {tab === "CVSS scoring" && (
          <>
            <div className="cvss-summary">
              <strong>{cvssScore(f.cvss).toFixed(1)}</strong>
              <div>
                <Severity finding={f} />
                <code>{vectorString(f.cvss)}</code>
              </div>
            </div>
            <p className="muted">
              CVSS v3.1 base score. Provisional until exploit conditions and
              impact are demonstrated.
            </p>
            <div className="form-grid">
              {CVSS_METRICS.map((m) => (
                <label key={m.key} title={m.help}>
                  {m.label}
                  <select
                    value={f.cvss[m.key]}
                    onChange={(e) =>
                      update({
                        ...f,
                        cvss: { ...f.cvss, [m.key]: e.target.value },
                      })
                    }
                  >
                    {m.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </>
        )}
        {tab === "Analyst notes" && (
          <>
            <h3>Investigation notebook</h3>
            <label className="note-label">
              Observations, target revision, reproduction output and open
              questions
              <textarea
                rows={14}
                maxLength={20000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Record your investigation..."
              />
            </label>
            <p className="footnote">
              Saved in this browser and included in the assessment packet.
            </p>
          </>
        )}
      </div>
    </article>
  );
}
function FindingEditor({
  finding: f,
  update,
}: {
  finding: Finding;
  update: (f: Finding) => boolean;
}) {
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="finding-form"
      onChange={() => setSaved(false)}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const value = (name: string) => String(data.get(name) || "").trim();
        const list = (name: string) =>
          value(name)
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
        if (!value("title") || !value("description")) return;
        const accepted = update({
          ...f,
          title: value("title"),
          summary: value("summary"),
          description: value("description"),
          cwe: value("cwe"),
          componentId: value("component"),
          verification: value("verification") as Finding["verification"],
          businessImpact: value("impact"),
          stepsToReproduce: list("steps"),
          safePoc: value("poc"),
          remediation: list("remediation"),
          evidenceIds: list("evidence"),
          retest: {
            status: value("retest") as Finding["retest"]["status"],
            notes: value("retestNotes"),
            date: new Date().toISOString(),
          },
        });
        setSaved(accepted);
      }}
    >
      <label>
        Finding title
        <input name="title" defaultValue={f.title} required maxLength={180} />
      </label>
      <label>
        Summary
        <textarea
          name="summary"
          defaultValue={f.summary}
          rows={2}
          maxLength={2000}
        />
      </label>
      <label>
        Description
        <textarea
          name="description"
          defaultValue={f.description}
          required
          rows={4}
          maxLength={12000}
        />
      </label>
      <div className="form-grid">
        <label>
          Evidence status
          <select name="verification" defaultValue={f.verification}>
            <option value="unverified">Unverified hypothesis</option>
            <option value="verified">Verified target finding</option>
          </select>
        </label>
        <label>
          Component
          <select name="component" defaultValue={f.componentId}>
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          CWE
          <input name="cwe" defaultValue={f.cwe} maxLength={40} />
        </label>
      </div>
      <label>
        Reproduction steps (one per line)
        <textarea
          name="steps"
          defaultValue={f.stepsToReproduce.join("\n")}
          rows={4}
          maxLength={12000}
        />
      </label>
      <label>
        Controlled proof of concept
        <textarea
          name="poc"
          defaultValue={f.safePoc}
          rows={4}
          maxLength={12000}
        />
      </label>
      <label>
        Business impact
        <textarea
          name="impact"
          defaultValue={f.businessImpact}
          rows={3}
          maxLength={8000}
        />
      </label>
      <label>
        Remediation actions (one per line)
        <textarea
          name="remediation"
          defaultValue={f.remediation.join("\n")}
          rows={4}
          maxLength={12000}
        />
      </label>
      <label>
        Evidence references (one per line)
        <textarea
          name="evidence"
          defaultValue={f.evidenceIds.join("\n")}
          rows={3}
          maxLength={8000}
        />
      </label>
      <label>
        Retest outcome
        <select name="retest" defaultValue={f.retest.status}>
          <option value="not-retested">Not retested</option>
          <option value="pass">Pass (analyst reported)</option>
          <option value="fail">Fail</option>
          <option value="partial">Partial</option>
        </select>
      </label>
      <label>
        Retest notes
        <textarea
          name="retestNotes"
          defaultValue={f.retest.notes}
          rows={3}
          maxLength={8000}
        />
      </label>
      <button className="button primary" type="submit">
        <Check size={15} />
        Save finding
      </button>
      {saved && (
        <span role="status" className="text-green">
          Finding saved.
        </span>
      )}
    </form>
  );
}
export function Evidence({
  workspace: w,
  notify,
}: {
  workspace: Workspace;
  notify: (v: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null),
    [query, setQuery] = useState("");
  const records = w.runs.map((r) => ({
    id: r.id,
    title: `${r.mode === "baseline" ? "Baseline" : "Hardened"} fixture execution`,
    at: r.createdAt,
    digest: r.digest,
    data: r,
  }));
  const chosen = records.find((r) => r.id === selected);
  async function verify(run: LabRun) {
    const { digest, ...record } = run;
    const buffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(record)),
    );
    const actual = Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    notify(
      actual === digest
        ? "Integrity verified: captured run matches its SHA-256 digest."
        : "Integrity mismatch: record changed since capture.",
    );
  }
  return (
    <>
      <div className="context-strip">
        <Fingerprint size={18} />
        <span>{records.length + (w.source ? 1 : 0)} captured records</span>
        <span className="muted">
          SHA-256 integrity / browser-local retention / last 30 runs
        </span>
      </div>
      <div className="toolbar">
        <SearchInput
          query={query}
          setQuery={setQuery}
          placeholder="Search evidence by title or ID..."
        />
        <span className="muted">Created by execution</span>
      </div>
      {!records.length && !w.source ? (
        <div className="work-section">
          <Empty
            title="No evidence captured yet"
            text="Run a fixture suite or review the repository. Execution output will appear here with timestamps and provenance."
          />
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Evidence record</th>
                <th>Provenance</th>
                <th>Captured</th>
                <th>Integrity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records
                .filter((r) =>
                  `${r.title} ${r.id}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((r) => (
                  <tr key={r.id}>
                    <td>
                      <button
                        className="table-link"
                        onClick={() => setSelected(r.id)}
                      >
                        {r.title}
                        <ArrowUpRight size={13} />
                      </button>
                      <small className="mono muted">{r.id.slice(0, 13)}</small>
                    </td>
                    <td>
                      <Pill tone="violet">Fixture run</Pill>
                      <small className="muted">Educational model</small>
                    </td>
                    <td>{date(r.at)}</td>
                    <td>
                      <button
                        className="text-button mono"
                        title={r.digest}
                        onClick={() => verify(r.data)}
                      >
                        <Fingerprint size={14} />
                        {r.digest.slice(0, 10)}...
                      </button>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        title="Download evidence JSON"
                        aria-label={`Download ${r.title}`}
                        onClick={() =>
                          download(
                            `evidence-${r.id}.json`,
                            JSON.stringify(r.data, null, 2),
                          )
                        }
                      >
                        <ArrowDownToLine size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              {w.source &&
                "source repository inventory".includes(query.toLowerCase()) && (
                  <tr>
                    <td>
                      <strong>Repository inventory</strong>
                      <small className="mono muted">
                        {w.source.id.slice(0, 13)}
                      </small>
                    </td>
                    <td>
                      <Pill tone="blue">Source observation</Pill>
                      <small className="muted">Local source bytes</small>
                    </td>
                    <td>{date(w.source.createdAt)}</td>
                    <td>
                      <span className="mono" title={w.source.digest}>
                        {w.source.digest.slice(0, 10)}...
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        title="Download source inventory"
                        aria-label="Download source inventory"
                        onClick={() =>
                          download(
                            "source-evidence.json",
                            JSON.stringify(w.source, null, 2),
                          )
                        }
                      >
                        <ArrowDownToLine size={17} />
                      </button>
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      )}
      {chosen && (
        <section className="work-section evidence-preview">
          <Heading
            title={chosen.title}
            action={
              <button
                className="icon-button"
                aria-label="Close evidence preview"
                onClick={() => setSelected(null)}
              >
                <X size={18} />
              </button>
            }
          />
          <p>{chosen.data.provenance}</p>
          <pre>{JSON.stringify(chosen.data, null, 2)}</pre>
        </section>
      )}
      <p className="footnote">
        Hashes detect changes relative to the digest; they are not digital
        signatures or independent attestations. Source hashes identify reviewed
        bytes. Export packets to preserve evidence beyond this browser.
      </p>
    </>
  );
}
export function Remediation({
  workspace: w,
  setTask,
}: {
  workspace: Workspace;
  setTask: (id: string, status: string) => void;
}) {
  const done = remediationTasks.filter(
    (t) => (w.tasks[t.id] || "todo") === "done",
  ).length;
  return (
    <>
      <div className="remediation-summary">
        <div>
          <ClipboardCheck size={21} />
          <strong>
            {done} of {remediationTasks.length} actions completed
          </strong>
        </div>
        <div className="progress-track">
          <span
            style={{ width: `${(done / remediationTasks.length) * 100}%` }}
          />
        </div>
        <span className="muted">Planned work / target fixes unverified</span>
      </div>
      <div className="kanban">
        {[
          { id: "todo", title: "To do", tone: "gray" },
          { id: "in-progress", title: "In progress", tone: "orange" },
          { id: "done", title: "Complete", tone: "green" },
        ].map((column) => (
          <section key={column.id}>
            <Heading
              title={column.title}
              action={
                <span className={`tag ${column.tone}`}>
                  {
                    remediationTasks.filter(
                      (t) => (w.tasks[t.id] || "todo") === column.id,
                    ).length
                  }
                </span>
              }
            />
            {remediationTasks
              .filter((t) => (w.tasks[t.id] || "todo") === column.id)
              .map((t) => (
                <article className="task-card" key={t.id}>
                  <div>
                    <span className="mono muted">{t.id}</span>
                    <Pill>{t.effort} effort</Pill>
                  </div>
                  <h3>{t.title}</h3>
                  <p>{t.detail}</p>
                  <div className="task-tags">
                    {t.findingIds.map((f) => (
                      <span className="mono" key={f}>
                        {f}
                      </span>
                    ))}
                    <span>Week {t.targetWeek}</span>
                  </div>
                  <footer>
                    <span>{t.owner}</span>
                    <select
                      aria-label={`Status for ${t.title}`}
                      value={w.tasks[t.id] || "todo"}
                      onChange={(e) => setTask(t.id, e.target.value)}
                    >
                      <option value="todo">To do</option>
                      <option value="in-progress">In progress</option>
                      <option value="done">Complete</option>
                    </select>
                  </footer>
                </article>
              ))}
            {!remediationTasks.some(
              (t) => (w.tasks[t.id] || "todo") === column.id,
            ) && <div className="empty-column">No actions in this stage</div>}
          </section>
        ))}
      </div>
    </>
  );
}
const reportOptions = [
  "Executive summary",
  "Scope & methodology",
  "Technical findings",
  "Validation evidence",
  "Remediation plan",
];
function reportMarkdown(w: Workspace, included: string[]) {
  const readiness = submissionReadiness(w);
  const status = readiness.verifiedCount
    ? `${readiness.verifiedCount} target-specific finding(s) verified.`
    : "No confirmed target vulnerability is established by this workspace.";
  const lines = [
    "# Sentinel | World Monitor Security Assessment",
    `Prepared by: ${w.scope.assessor}`,
    `Generated: ${new Date().toISOString()}`,
    `Status: ${readiness.label}. ${status}`,
  ];
  if (included.includes(reportOptions[0]))
    lines.push(
      "## Executive summary",
      `${readiness.verifiedCount} verified target findings; ${w.findings.length - readiness.verifiedCount} research candidates; ${w.runs.length} fixture runs; ${w.source?.files || 0} source files inventoried. Readiness: ${readiness.score}/100.`,
    );
  if (included.includes(reportOptions[1]))
    lines.push(
      "## Scope & methodology",
      w.scope.environment,
      `Authorization: ${w.scope.reference || "Not recorded"}`,
      `Source commit: ${w.source?.commit || "Not captured"}`,
      "Read-only AST inventory and in-process assertions. No production activity performed.",
    );
  if (included.includes(reportOptions[2]))
    for (const f of w.findings)
      lines.push(
        `## ${f.id}: ${f.title}`,
        `Verification: ${f.verification === "verified" ? "verified target finding" : "unverified hypothesis"} | Workflow: ${statusLabel[f.status]}`,
        `Component: ${f.componentId} | ${f.cwe}`,
        `Provisional CVSS: ${cvssScore(f.cvss)} (${vectorString(f.cvss)})`,
        f.description,
        "### Reproduction plan",
        ...f.stepsToReproduce.map((s, i) => `${i + 1}. ${s}`),
        "### Controlled proof proposal",
        f.safePoc,
        "### Potential business impact",
        f.businessImpact,
        "### Remediation",
        ...f.remediation.map((r) => `- ${r}`),
        "### Analyst notes",
        w.notes[f.id] || "None recorded.",
        "### Evidence references",
        ...f.evidenceIds.map((ref) => `- ${ref}`),
      );
  if (included.includes(reportOptions[3])) {
    lines.push("## Validation evidence");
    for (const r of w.runs) {
      lines.push(
        `### ${r.mode} / ${r.id}`,
        r.createdAt,
        r.provenance,
        `SHA-256: ${r.digest}`,
      );
      for (const result of r.results)
        lines.push(
          `- ${result.id}: ${result.passed ? "PASS" : "FAIL"} (${result.assertions.filter((a) => a.passed).length}/${result.assertions.length} assertions)`,
        );
    }
    if (w.source)
      lines.push(
        `Source inventory: ${w.source.files} files, ${w.source.signals.length} signals. SHA-256: ${w.source.digest}`,
        w.source.limitation,
      );
  }
  if (included.includes(reportOptions[4])) {
    lines.push("## Remediation plan");
    for (const t of remediationTasks)
      lines.push(
        `- ${t.title} | ${t.owner} | ${w.tasks[t.id] || "todo"} | ${t.detail}`,
      );
  }
  return lines.join("\n\n");
}
export function Report({
  workspace: w,
  packet,
}: {
  workspace: Workspace;
  packet: () => void;
}) {
  const [included, setIncluded] = useState(reportOptions);
  const readiness = submissionReadiness(w);
  return (
    <div className="report-layout">
      <aside className="report-controls no-print">
        <Heading label="REPORT CONTENTS" title="Build your deliverable" />
        <div className="report-checks">
          {reportOptions.map((r, i) => (
            <label key={r}>
              <input
                type="checkbox"
                aria-label={r}
                checked={included.includes(r)}
                onChange={() =>
                  setIncluded((s) =>
                    s.includes(r) ? s.filter((t) => t !== r) : [...s, r],
                  )
                }
              />
              <span>{r}</span>
              <small>0{i + 1}</small>
            </label>
          ))}
        </div>
        <Button
          primary
          disabled={!included.length}
          onClick={() =>
            download(
              "worldmonitor-assessment.md",
              reportMarkdown(w, included),
              "text/markdown",
            )
          }
        >
          <ArrowDownToLine size={15} />
          Export Markdown
        </Button>
        <Button disabled={!included.length} onClick={() => window.print()}>
          <FileText size={15} />
          Print / Save PDF
        </Button>
        <Button onClick={packet}>
          <Database size={15} />
          Full evidence packet
        </Button>
        <div className="report-readiness">
          <div className="readiness-head">
            <Shield size={18} />
            <strong>{readiness.score}/100</strong>
            <span>{readiness.label}</span>
          </div>
          <div className="readiness-track">
            <span style={{ width: `${readiness.score}%` }} />
          </div>
          <div className="readiness-checks">
            {readiness.checks.map((check) => (
              <div key={check.id} className={check.complete ? "complete" : ""}>
                {check.complete ? <Check size={13} /> : <X size={13} />}
                <span>{check.label}</span>
                <small>+{check.weight}</small>
              </div>
            ))}
          </div>
          <p>
            Fixture failures demonstrate the harness only. A finding becomes
            verified after authorization, pinned source and target evidence are
            linked.
          </p>
        </div>
      </aside>
      <article className="report-paper">
        <header>
          <div className="report-brand">
            <Shield size={25} />
            <strong>SENTINEL</strong>
            <span>WORKING DRAFT</span>
          </div>
          <div className="report-rule" />
          <span className="overline">SECURITY ASSESSMENT / 26163</span>
          <h2>World Monitor</h2>
          <p>Technical assessment & evidence report</p>
          <div className="report-metadata">
            <span>
              Prepared by<strong>{w.scope.assessor}</strong>
            </span>
            <span>
              Issued<strong>{new Date().toLocaleDateString()}</strong>
            </span>
            <span>
              Version<strong>Working draft 1.0</strong>
            </span>
          </div>
        </header>
        {included.includes(reportOptions[0]) && (
          <section>
            <span className="report-section-number">01</span>
            <h3>Executive summary</h3>
            <p>
              The workspace contains {w.findings.length} research candidates and{" "}
              {w.runs.length} captured fixture runs. Target-specific
              verification is recorded for {readiness.verifiedCount} finding(s).
              The lab demonstrates security controls using isolated models.
            </p>
            <div className="report-stats">
              <div>
                <strong>{w.findings.length}</strong>
                <span>Review candidates</span>
              </div>
              <div>
                <strong>{w.runs.length}</strong>
                <span>Fixture records</span>
              </div>
              <div>
                <strong>{readiness.verifiedCount}</strong>
                <span>Confirmed target issues</span>
              </div>
            </div>
          </section>
        )}
        {included.includes(reportOptions[1]) && (
          <section>
            <span className="report-section-number">02</span>
            <h3>Scope & methodology</h3>
            <p>
              {w.scope.environment}. Authorization:{" "}
              {w.scope.reference || "not recorded"}. Assessment uses local
              static analysis and controlled model execution. No production
              tests are executed.
            </p>
            <p className="mono">
              Source revision: {w.source?.commit || "not captured"}
            </p>
          </section>
        )}
        {included.includes(reportOptions[2]) && (
          <section>
            <span className="report-section-number">03</span>
            <h3>Technical findings</h3>
            {w.findings.map((f) => (
              <div className="report-finding" key={f.id}>
                <div>
                  <span className="mono">{f.id}</span>
                  <Severity finding={f} />
                </div>
                <h4>{f.title}</h4>
                <small>
                  {f.verification === "verified"
                    ? "Verified target finding"
                    : "Unverified hypothesis"}{" "}
                  / {statusLabel[f.status]} / {f.componentId}
                </small>
                <p>{f.description}</p>
                <h5>Reproduction plan</h5>
                <ol>
                  {f.stepsToReproduce.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
                <h5>Controlled proof proposal</h5>
                <p>{f.safePoc}</p>
                <h5>Evidence references</h5>
                {f.evidenceIds.length ? (
                  <ul>
                    {f.evidenceIds.map((ref, i) => (
                      <li className="mono" key={i}>
                        {ref}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No target evidence linked.</p>
                )}
                <h5>Retest record</h5>
                <p>
                  {f.retest.status}. {f.retest.notes}
                </p>
                <h5>Potential impact</h5>
                <p>{f.businessImpact}</p>
                <h5>Remediation</h5>
                <ul>
                  {f.remediation.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
                <p className="mono">
                  {vectorString(f.cvss)} / indicative score only
                </p>
                {w.notes[f.id] && (
                  <>
                    <h5>Analyst notes</h5>
                    <p className="preserve-lines">{w.notes[f.id]}</p>
                  </>
                )}
              </div>
            ))}
          </section>
        )}
        {included.includes(reportOptions[3]) && (
          <section>
            <span className="report-section-number">04</span>
            <h3>Validation evidence</h3>
            {!w.runs.length && <p>No executions captured.</p>}
            {w.runs.map((r) => (
              <div className="report-evidence" key={r.id}>
                <strong>
                  {r.mode}: {r.results.filter((t) => t.passed).length}/
                  {r.results.length} controls passed
                </strong>
                <p>{r.provenance}</p>
                <small>{date(r.createdAt)}</small>
                <code>SHA-256 {r.digest}</code>
              </div>
            ))}
            {w.source && (
              <p>
                Source inventory: {w.source.files} files,{" "}
                {w.source.signals.length} signals. {w.source.limitation}
              </p>
            )}
          </section>
        )}
        {included.includes(reportOptions[4]) && (
          <section>
            <span className="report-section-number">05</span>
            <h3>Remediation plan</h3>
            {remediationTasks.map((t) => (
              <p key={t.id}>
                <strong>{t.title}</strong>
                <br />
                {t.owner} / {w.tasks[t.id] || "todo"}. {t.detail}
              </p>
            ))}
          </section>
        )}
        <footer>
          SENTINEL / WORLD MONITOR
          <span>Explicit evidence. Explicit limitations.</span>
        </footer>
      </article>
    </div>
  );
}
export function Scope({
  workspace: w,
  update,
  restore,
}: {
  workspace: Workspace;
  update: (s: Workspace["scope"]) => void;
  restore: (file: File) => Promise<void>;
}) {
  return (
    <div className="scope-layout">
      <section className="work-section">
        <Heading label="ENGAGEMENT DETAILS" title="Assessment configuration" />
        <div className="finding-form">
          <label>
            Assessment lead
            <input
              value={w.scope.assessor}
              onChange={(e) => update({ ...w.scope, assessor: e.target.value })}
              maxLength={100}
            />
          </label>
          <label>
            Written authorization reference
            <input
              value={w.scope.reference}
              placeholder="Not recorded"
              onChange={(e) =>
                update({ ...w.scope, reference: e.target.value })
              }
              maxLength={200}
            />
          </label>
          <label>
            Testing environment
            <textarea
              value={w.scope.environment}
              onChange={(e) =>
                update({ ...w.scope, environment: e.target.value })
              }
              rows={3}
              maxLength={2000}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={w.scope.confirmed}
              onChange={(e) =>
                update({ ...w.scope, confirmed: e.target.checked })
              }
            />
            I have reviewed the scope with my assessment team.
          </label>
          <label>
            Restore an assessment packet
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void restore(file);
                e.target.value = "";
              }}
            />
            <small>
              Replaces this workspace after validation. A backup of the current
              workspace downloads first.
            </small>
          </label>
        </div>
      </section>
      <section className="work-section">
        <Heading label="EXECUTION BOUNDARIES" title="Current scope" />
        {[
          {
            label: "Local World Monitor source checkout",
            text: "Read-only static analysis",
            inScope: true,
          },
          {
            label: "In-process educational fixtures",
            text: "Controlled execution and comparison",
            inScope: true,
          },
          {
            label: "World Monitor production",
            text: "No requests from this tool",
            inScope: false,
          },
          {
            label: "Third-party providers & user data",
            text: "Excluded from testing",
            inScope: false,
          },
        ].map((s) => (
          <div className="scope-row" key={s.label}>
            {s.inScope ? (
              <Check size={17} className="text-green" />
            ) : (
              <LockKeyhole size={16} className="muted" />
            )}
            <div>
              <strong>{s.label}</strong>
              <small>{s.text}</small>
            </div>
            <Pill tone={s.inScope ? "green" : "neutral"}>
              {s.inScope ? "In scope" : "Excluded"}
            </Pill>
          </div>
        ))}
        <div className="inline-note">
          <Database size={17} />
          <p>
            Single-analyst workspace, stored in this browser. Export packets for
            backup. Shared persistence and multi-user authentication are not
            enabled.
          </p>
        </div>
      </section>
    </div>
  );
}
