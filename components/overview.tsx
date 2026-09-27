"use client";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  FileCode2,
  FileText,
  Fingerprint,
  FlaskConical,
  FolderGit2,
  Globe2,
  LockKeyhole,
  Shield,
  ShieldCheck,
} from "lucide-react";
import type { Workspace } from "@/lib/workspace";
import { cvssScore, severityFromScore } from "@/lib/cvss";
import { Empty, Heading, Metric, Pill, Severity, date } from "./ui";
type Destination =
  "source" | "lab" | "report" | "scope" | "findings" | "evidence";
export function Overview({
  workspace: w,
  go,
  select,
}: {
  workspace: Workspace;
  go: (v: Destination) => void;
  select: (id: string) => void;
}) {
  const last = w.runs[0],
    passed = last?.results.filter((r) => r.passed).length || 0;
  return (
    <>
      <div className="assessment-banner">
        <div>
          <span className="banner-icon">
            <Globe2 size={26} strokeWidth={1.4} />
          </span>
          <div>
            <strong>World Monitor</strong>
            <p>
              Real-time intelligence platform <span>/</span> Web, API & desktop
            </p>
          </div>
        </div>
        <Pill tone="green">Assessment in progress</Pill>
      </div>
      <div className="metrics">
        <Metric
          label="Review candidates"
          value={w.findings.length}
          sub="Unverified target hypotheses"
          icon={Shield}
          tone="orange"
        />
        <Metric
          label="Source files reviewed"
          value={w.source?.files ?? "--"}
          sub={
            w.source
              ? `${w.source.signals.length} signals to inspect`
              : "Repository review pending"
          }
          icon={FolderGit2}
          tone="violet"
        />
        <Metric
          label="Latest fixture pass rate"
          value={
            last ? `${Math.round((passed / last.results.length) * 100)}%` : "--"
          }
          sub={
            last ? `${last.mode} / 8 controls tested` : "No tests executed yet"
          }
          icon={FlaskConical}
          tone="green"
        />
        <Metric
          label="Evidence records"
          value={w.runs.length + (w.source ? 1 : 0)}
          sub="Captured from actual execution"
          icon={Fingerprint}
          tone="blue"
        />
      </div>
      <div className="overview-grid">
        <section className="work-section">
          <Heading
            label="ASSESSMENT PIPELINE"
            title="From surface to proof"
            action={<span className="muted mono">03 stages</span>}
          />
          <div className="pipeline">
            {[
              {
                label: "Discover",
                text: "Map code & trust boundaries",
                done: !!w.source,
                icon: FolderGit2,
                target: "source" as Destination,
              },
              {
                label: "Validate",
                text: "Execute controlled assertions",
                done: w.runs.length > 0,
                icon: FlaskConical,
                target: "lab" as Destination,
              },
              {
                label: "Deliver",
                text: "Assemble reproducible evidence",
                done: false,
                icon: FileText,
                target: "report" as Destination,
              },
            ].map((s, i) => (
              <button
                className="pipeline-stage"
                key={s.label}
                onClick={() => go(s.target)}
              >
                <div>
                  <span className={`stage-icon ${s.done ? "done" : ""}`}>
                    {s.done ? <Check size={20} /> : <s.icon size={20} />}
                  </span>
                  <span className="mono muted">0{i + 1}</span>
                </div>
                <strong>
                  {s.label}
                  <ArrowUpRight size={15} />
                </strong>
                <p>{s.text}</p>
                <small>{s.done ? "Evidence captured" : "Ready to begin"}</small>
              </button>
            ))}
          </div>
          <div className="scope-summary">
            <LockKeyhole size={15} />
            <span>
              Local fixtures. Target findings need separate validation.
            </span>
            <button className="text-button" onClick={() => go("scope")}>
              View scope
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
        <section className="work-section">
          <Heading label="VALIDATION COVERAGE" title="Control families" />
          <div className="coverage">
            <div className="donut">
              <svg
                viewBox="0 0 120 120"
                aria-label={`${passed} of 8 fixture controls passed`}
              >
                <circle
                  cx="60"
                  cy="60"
                  r="49"
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth="9"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="49"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="9"
                  strokeDasharray={`${(passed / 8) * 308} 308`}
                  transform="rotate(-90 60 60)"
                  strokeLinecap="round"
                />
              </svg>
              <div>
                <strong>
                  {passed}
                  <small>/8</small>
                </strong>
                <span>passing</span>
              </div>
            </div>
            <div className="coverage-legend">
              <span>
                <i className="dot green" />
                Passed<b>{passed}</b>
              </span>
              <span>
                <i className="dot red" />
                Failed<b>{last ? 8 - passed : 0}</b>
              </span>
              <span>
                <i className="dot gray" />
                Not run<b>{last ? 0 : 8}</b>
              </span>
            </div>
          </div>
          <p className="footnote">
            {last
              ? `Latest: ${last.mode} fixtures. ${date(last.createdAt)}.`
              : "Coverage is computed after execution. No posture score is assumed."}
          </p>
        </section>
      </div>
      <div className="overview-bottom">
        <section className="work-section">
          <Heading
            label="REVIEW QUEUE"
            title="Where to focus next"
            action={
              <button className="text-button" onClick={() => go("findings")}>
                All findings
                <ArrowRight size={14} />
              </button>
            }
          />
          <div className="risk-list">
            {w.findings.slice(0, 4).map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  select(f.id);
                  go("findings");
                }}
              >
                <span
                  className={`severity-line ${severityFromScore(cvssScore(f.cvss))}`}
                />
                <div>
                  <small className="mono">
                    {f.id} <span> / {f.cwe}</span>
                  </small>
                  <strong>{f.title}</strong>
                </div>
                <Severity finding={f} />
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </section>
        <section className="work-section">
          <Heading
            label="AUDIT TRAIL"
            title="Recent evidence"
            action={<Fingerprint size={18} className="muted" />}
          />
          {!last && !w.source ? (
            <Empty
              title="Your evidence starts here"
              text="Run the local suite or inspect the repository to capture your first record."
              action={
                <button className="text-button" onClick={() => go("lab")}>
                  Run a baseline
                  <ArrowRight size={14} />
                </button>
              }
            />
          ) : (
            <div className="timeline">
              {w.runs.slice(0, 4).map((r) => (
                <button key={r.id} onClick={() => go("evidence")}>
                  <span className="timeline-mark">
                    <FlaskConical size={14} />
                  </span>
                  <div>
                    <strong>
                      {r.mode === "baseline" ? "Baseline" : "Hardened"} fixture
                      run
                    </strong>
                    <p>
                      {r.results.filter((t) => t.passed).length}/8 controls
                      passed
                    </p>
                    <small>{date(r.createdAt)}</small>
                  </div>
                </button>
              ))}
              {w.source && (
                <button onClick={() => go("source")}>
                  <span className="timeline-mark">
                    <FileCode2 size={14} />
                  </span>
                  <div>
                    <strong>Repository inventory captured</strong>
                    <p>{w.source.files} files inspected</p>
                    <small>{date(w.source.createdAt)}</small>
                  </div>
                </button>
              )}
            </div>
          )}
        </section>
      </div>
      <div className="bottom-note">
        <ShieldCheck size={15} />
        <span>Every result has a source, a scope, and a limitation.</span>
        <span className="mono">SENTINEL / 01</span>
      </div>
    </>
  );
}
