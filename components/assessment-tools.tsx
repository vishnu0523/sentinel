"use client";
import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  Circle,
  Code2,
  FileCode2,
  Fingerprint,
  FlaskConical,
  FolderGit2,
  GitBranch,
  Layers,
  Loader2,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Terminal,
  X,
  XCircle,
} from "lucide-react";
import { boundaries, components, dataFlows } from "@/lib/seed/architecture";
import { labDefinitions } from "@/lib/lab";
import type { LabMode, LabRun } from "@/lib/lab";
import type { SourceReview, SourceSignal } from "@/lib/source-review";
import {
  Button,
  Empty,
  Heading,
  Metric,
  Pill,
  SearchInput,
  date,
  download,
} from "./ui";

export function Surface({ onSource }: { onSource: () => void }) {
  const [selected, setSelected] = useState("edge-api");
  const c = components.find((item) => item.id === selected)!;
  const flows = dataFlows.filter((f) => f.from === c.id || f.to === c.id);
  return (
    <>
      <div className="context-strip">
        <GitBranch size={16} />
        <span>Reference architecture</span>
        <span className="muted">
          Source-derived model; deployment topology unverified.
        </span>
        <Button onClick={onSource}>
          <Code2 size={14} />
          Inspect source
        </Button>
      </div>
      <div className="surface-layout">
        <section className="surface-map">
          <Heading
            title="Trust boundary map"
            action={<Pill>{components.length} components</Pill>}
          />
          <div className="map-legend">
            <span>
              <i className="dot green" />
              Data flow
            </span>
            <span>
              <i className="dot red" />
              Carries credentials
            </span>
            <span>Dashed: boundary crossing</span>
          </div>
          <div
            className="map-scroll"
            tabIndex={0}
            role="region"
            aria-label="Scrollable architecture canvas"
          >
            <svg
              viewBox="0 0 1188 620"
              role="group"
              aria-label="Interactive architecture map"
            >
              {boundaries.map((b) => (
                <g key={b.id}>
                  <rect
                    x={b.x}
                    y={b.y}
                    width={b.w}
                    height={b.h}
                    rx="6"
                    fill="var(--canvas)"
                    stroke="var(--line)"
                    strokeDasharray="5 4"
                  />
                  <text
                    x={b.x + 15}
                    y={b.y + 25}
                    fill="var(--text-muted)"
                    fontSize="15"
                    fontWeight="600"
                  >
                    {b.name.toUpperCase()}
                  </text>
                </g>
              ))}
              {dataFlows.map((f) => {
                const from = components.find((c) => c.id === f.from)!,
                  to = components.find((c) => c.id === f.to)!;
                return (
                  <path
                    key={f.id}
                    d={`M${from.x},${from.y} C${(from.x + to.x) / 2},${from.y} ${(from.x + to.x) / 2},${to.y} ${to.x},${to.y}`}
                    fill="none"
                    stroke={f.carriesSecrets ? "var(--rose)" : "var(--accent)"}
                    opacity={flows.includes(f) ? 0.8 : 0.2}
                    strokeWidth="2"
                    strokeDasharray={f.crossesBoundary ? "5 5" : undefined}
                  />
                );
              })}
              {components.map((n) => (
                <g
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  aria-label={n.name}
                  aria-pressed={n.id === selected}
                  onClick={() => setSelected(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(n.id);
                    }
                  }}
                  className="map-node"
                >
                  <rect
                    x={n.x - 81}
                    y={n.y - 27}
                    width="162"
                    height="54"
                    rx="6"
                    fill={
                      selected === n.id ? "var(--accent-soft)" : "var(--paper)"
                    }
                    stroke={selected === n.id ? "var(--accent)" : "var(--line)"}
                    strokeWidth={selected === n.id ? 2 : 1}
                  />
                  <circle
                    cx={n.x - 64}
                    cy={n.y}
                    r="4"
                    fill={
                      n.exposure === "public" ? "var(--rose)" : "var(--accent)"
                    }
                  />
                  <text
                    x={n.x - 50}
                    y={n.y + 5}
                    fill="var(--text)"
                    fontSize="15"
                    fontWeight="500"
                  >
                    {n.name}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </section>
        <aside className="detail-aside">
          <span className="detail-icon">
            <Layers size={23} />
          </span>
          <span className="overline">SELECTED COMPONENT</span>
          <h2>{c.name}</h2>
          <Pill tone={c.exposure === "public" ? "orange" : "green"}>
            {c.exposure}
          </Pill>
          <p>{c.description}</p>
          <h3>Data handled</h3>
          <div className="chip-list">
            {c.dataHandled.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <h3>
            Connected flows <span className="muted">{flows.length}</span>
          </h3>
          {flows.map((f) => (
            <div className="flow-row" key={f.id}>
              <ArrowRight size={14} />
              <div>
                <strong>{f.label}</strong>
                <small>
                  {f.protocol} /{" "}
                  {f.carriesSecrets ? "credential-bearing" : "data only"}
                </small>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}

export function SourcePanel({
  source,
  busy,
  scan,
  triage,
}: {
  source: SourceReview | null;
  busy: boolean;
  scan: () => void;
  triage: (signal: SourceSignal) => void;
}) {
  const [kind, setKind] = useState("All signals"),
    [query, setQuery] = useState("");
  const signals =
    source?.signals.filter(
      (s) =>
        `${s.file} ${s.kind}`.toLowerCase().includes(query.toLowerCase()) &&
        (kind === "All signals" || s.kind === kind),
    ) || [];
  return (
    <>
      <div className="context-strip">
        <FolderGit2 size={18} />
        <div>
          <strong>
            {source?.sourceMode === "demo"
              ? "Demo source fixture"
              : "koala73 / worldmonitor"}
          </strong>
          <span className="muted">
            {source?.sourceLabel || "Read-only AST inventory"}
          </span>
        </div>
        <Button primary disabled={busy} onClick={scan}>
          {busy ? <Loader2 size={15} className="spin" /> : <Play size={14} />}
          {busy
            ? "Reviewing source..."
            : source
              ? "Refresh inventory"
              : "Review repository"}
        </Button>
      </div>
      {!source ? (
        <div className="work-section">
          <Empty
            icon={FolderGit2}
            title="Start with the code"
            text="Inspect a configured World Monitor checkout, or use the built-in demo fixture when no local source path is available. Every signal includes its file, line and content hash."
            action={
              <Button primary disabled={busy} onClick={scan}>
                <Code2 size={15} />
                Review repository
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="metrics three">
            <Metric
              label="Files inspected"
              value={source.files}
              sub="api, src, server, convex"
              icon={FileCode2}
              tone="blue"
            />
            <Metric
              label="API candidate files"
              value={source.routes}
              sub="Files, not endpoint coverage"
              icon={GitBranch}
              tone="violet"
            />
            <Metric
              label="Review signals"
              value={source.signals.length}
              sub="Manual validation required"
              icon={Search}
              tone="orange"
            />
          </div>
          <div className="source-provenance">
            <Pill tone={source.sourceMode === "demo" ? "orange" : "green"}>
              {source.sourceMode === "demo"
                ? "Demo source"
                : "Configured source"}
            </Pill>
            <span className="mono">Commit {source.commit.slice(0, 12)}</span>
            <Pill tone={source.dirty ? "orange" : "green"}>
              {source.dirty ? "Working tree modified" : "Tracked tree clean"}
            </Pill>
            <span className="muted">Captured {date(source.createdAt)}</span>
          </div>
          <div className="toolbar">
            <SearchInput
              query={query}
              setQuery={setQuery}
              placeholder="Filter by file or signal..."
            />
            <select
              aria-label="Signal type"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {[
                "All signals",
                "HTML sink",
                "Dynamic fetch",
                "Auth control",
              ].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <span className="muted">{signals.length} signals</span>
            <Button
              onClick={() =>
                download(
                  "source-inventory.json",
                  JSON.stringify(source, null, 2),
                )
              }
            >
              <ArrowDownToLine size={14} />
              JSON
            </Button>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Source location</th>
                  <th>Signal</th>
                  <th>Review guidance</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {signals.slice(0, 150).map((s, i) => (
                  <tr key={`${s.file}:${s.line}:${i}`}>
                    <td>
                      <strong className="mono source-file">
                        {s.file}:{s.line}
                      </strong>
                      <small className="mono muted" title={s.hash}>
                        SHA-256 {s.hash.slice(0, 20)}...
                      </small>
                    </td>
                    <td>
                      <Pill
                        tone={s.kind === "Auth control" ? "green" : "orange"}
                      >
                        {s.kind}
                      </Pill>
                    </td>
                    <td>{s.note}</td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Create candidate for ${s.file}:${s.line}`}
                        title="Create review candidate"
                        onClick={() => triage(s)}
                      >
                        <Plus size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!signals.length && (
              <Empty
                title="No matching signals"
                text="Try another filter or inspect the exported inventory."
              />
            )}
          </div>
          <p className="footnote">
            {signals.length > 150 &&
              "Showing first 150 matches; JSON includes all captured signals. "}
            {source.truncated && "Inventory limit reached. "}
            {source.limitation}
          </p>
        </>
      )}
    </>
  );
}

export function Lab({
  runs,
  busy,
  run,
}: {
  runs: LabRun[];
  busy: string | null;
  run: (m: LabMode) => void;
}) {
  const [mode, setMode] = useState<LabMode>("baseline"),
    [selected, setSelected] = useState(labDefinitions[0].id);
  const latest = runs.find((r) => r.mode === mode),
    other = runs.find((r) => r.mode !== mode);
  const result = latest?.results.find((r) => r.id === selected),
    def = labDefinitions.find((d) => d.id === selected)!;
  return (
    <>
      <div className="lab-banner">
        <div>
          <span className="overline">CONTROLLED VALIDATION</span>
          <h2>One assertion. Two implementations.</h2>
          <p>
            Execute intentionally vulnerable and corrected models of eight
            security controls.
          </p>
        </div>
        <span className="lab-emblem">
          <FlaskConical size={36} strokeWidth={1.2} />
        </span>
      </div>
      <div className="toolbar">
        <div className="segmented" aria-label="Fixture implementation">
          {(["baseline", "hardened"] as const).map((m) => (
            <button
              key={m}
              aria-pressed={mode === m}
              className={mode === m ? "selected" : ""}
              onClick={() => setMode(m)}
            >
              {m === "baseline" ? (
                <Code2 size={14} />
              ) : (
                <ShieldCheck size={14} />
              )}
              {m === "baseline" ? "Vulnerable baseline" : "Hardened fixture"}
            </button>
          ))}
        </div>
        <span className="muted lab-provenance">In-process / no network</span>
        <Button primary disabled={!!busy} onClick={() => run(mode)}>
          {busy ? <Loader2 className="spin" size={15} /> : <Play size={14} />}
          {busy ? "Executing..." : "Run 8 controls"}
        </Button>
      </div>
      <div className="lab-layout">
        <section className="test-list">
          <div className="test-list-header">
            <span>SECURITY CONTROLS</span>
            <span>
              {latest
                ? `${latest.results.filter((r) => r.passed).length}/8 passed`
                : "Not run"}
            </span>
          </div>
          {labDefinitions.map((d) => {
            const r = latest?.results.find((r) => r.id === d.id);
            return (
              <button
                key={d.id}
                className={selected === d.id ? "selected" : ""}
                onClick={() => setSelected(d.id)}
              >
                {r ? (
                  r.passed ? (
                    <CheckCheck size={17} className="text-green" />
                  ) : (
                    <XCircle size={17} className="text-red" />
                  )
                ) : (
                  <Circle size={16} className="muted" />
                )}
                <div>
                  <strong>{d.title}</strong>
                  <small>
                    {d.id} / {d.category}
                  </small>
                </div>
                <ChevronRight size={14} />
              </button>
            );
          })}
        </section>
        <section className="test-detail">
          <Heading
            label={`${def.id} / ${def.cwe}`}
            title={def.title}
            action={
              result ? (
                <Pill tone={result.passed ? "green" : "red"}>
                  {result.passed ? "Passed" : "Failed"}
                </Pill>
              ) : (
                <Pill>Not run</Pill>
              )
            }
          />
          <p className="muted">{def.remediation}</p>
          <div className="code-comparison">
            <div>
              <span>
                <i className="dot red" />
                Baseline
              </span>
              <pre>{def.before}</pre>
            </div>
            <div>
              <span>
                <i className="dot green" />
                Correction
              </span>
              <pre>{def.after}</pre>
            </div>
          </div>
          <Heading
            title="Assertion results"
            action={
              result && (
                <span className="mono muted">
                  {result.durationMs.toFixed(2)} ms
                </span>
              )
            }
          />
          {!result ? (
            <Empty
              icon={Terminal}
              title="Ready for execution"
              text="Run this implementation to capture expected and observed values."
            />
          ) : (
            <div className="assertions">
              {result.assertions.map((a, i) => (
                <div key={i}>
                  <span>
                    {a.passed ? (
                      <Check size={15} className="text-green" />
                    ) : (
                      <X size={15} className="text-red" />
                    )}
                  </span>
                  <div>
                    <strong>{a.name}</strong>
                    <div className="assert-values">
                      <span>
                        Expected <code>{a.expected}</code>
                      </span>
                      <span>
                        Observed <code>{a.actual}</code>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {latest && (
            <div className="run-footer">
              <Fingerprint size={14} />
              <span className="mono" title={latest.digest}>
                SHA-256 {latest.digest.slice(0, 22)}...
              </span>
              <span>{date(latest.createdAt)}</span>
            </div>
          )}
        </section>
      </div>
      {latest && other && (
        <div className="comparison-strip">
          <CheckCheck size={20} />
          <div>
            <strong>Before / after evidence available</strong>
            <p>
              Baseline:{" "}
              {
                runs
                  .find((r) => r.mode === "baseline")!
                  .results.filter((r) => r.passed).length
              }
              /8 passed. Hardened:{" "}
              {
                runs
                  .find((r) => r.mode === "hardened")!
                  .results.filter((r) => r.passed).length
              }
              /8 passed. Both records are in the evidence vault.
            </p>
          </div>
        </div>
      )}
      <p className="footnote">
        These models do not execute World Monitor handlers and cannot confirm
        vulnerabilities or fixes in the target. HTML assertions compare strings;
        URL assertions do not test DNS rebinding or redirects.
      </p>
    </>
  );
}
