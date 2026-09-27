"use client";
import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Activity,
  ArrowDownToLine,
  ClipboardCheck,
  FileCode2,
  FileText,
  Fingerprint,
  FlaskConical,
  GitBranch,
  LayoutDashboard,
  Globe2,
  ShieldCheck,
  LockKeyhole,
  Menu,
  ChevronRight,
  Moon,
  Play,
  Plus,
  Settings2,
  Shield,
  Sun,
  X,
} from "lucide-react";
import { components } from "@/lib/seed/architecture";
import { initialWorkspace } from "@/lib/workspace";
import { parseWorkspace, verifyRunDigest } from "@/lib/workspace-validation";
import type { Workspace } from "@/lib/workspace";
import type { Finding } from "@/lib/types";
import type { LabMode, LabRun } from "@/lib/lab";
import type { SourceReview } from "@/lib/source-review";
import { findingQualification } from "@/lib/readiness";
import { Button, Empty, SearchInput, Severity, download } from "./ui";
import { Lab, SourcePanel, Surface } from "./assessment-tools";
import { Overview } from "./overview";
import {
  Evidence,
  FindingDetail,
  Remediation,
  Report,
  Scope,
  statusLabel,
} from "./assessment-records";

type View =
  | "overview"
  | "surface"
  | "source"
  | "lab"
  | "findings"
  | "evidence"
  | "remediation"
  | "report"
  | "scope";
const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "surface", label: "Attack surface", icon: GitBranch },
  { id: "source", label: "Source review", icon: FileCode2 },
  { id: "lab", label: "Validation lab", icon: FlaskConical },
  { id: "findings", label: "Findings", icon: Shield },
  { id: "evidence", label: "Evidence vault", icon: Fingerprint },
  { id: "remediation", label: "Remediation", icon: ClipboardCheck },
  { id: "report", label: "Report studio", icon: FileText },
] as const;
const titles: Record<View, [string, string]> = {
  overview: ["Assessment overview", "World Monitor / Security assessment"],
  surface: ["Understand the boundaries.", "Architecture / Attack surface"],
  source: ["Follow the source.", "Discovery / Repository review"],
  lab: ["Reproduce. Remediate. Retest.", "Validation / Isolated fixtures"],
  findings: ["Investigate every claim.", "Assessment / Findings workspace"],
  evidence: ["Evidence, with provenance.", "Assessment / Evidence vault"],
  remediation: ["Close the loop.", "Engineering / Remediation"],
  report: ["Make the evidence count.", "Deliverables / Report studio"],
  scope: ["Define the engagement.", "Workspace / Scope & authorization"],
};
export function Sentinel() {
  const [view, setView] = useState<View>("overview"),
    [workspace, setWorkspace] = useState<Workspace>(initialWorkspace);
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState<string | null>(null),
    [notice, setNotice] = useState("");
  const [query, setQuery] = useState(""),
    [mobile, setMobile] = useState(false),
    [dark, setDark] = useState(false);
  const [newFinding, setNewFinding] = useState(false),
    [selected, setSelected] = useState("FND-01");
  const lock = useRef(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sentinel-workspace-v2");
      if (saved) {
        setWorkspace(parseWorkspace(JSON.parse(saved)));
      }
      setDark(localStorage.getItem("sentinel-theme") === "dark");
    } catch {
      setNotice(
        "Saved workspace could not be read. A fresh workspace is open.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(
          "sentinel-workspace-v2",
          JSON.stringify(workspace),
        );
      } catch {
        setNotice(
          "Browser storage unavailable. Export your packet to preserve this assessment.",
        );
      }
    }
  }, [workspace, ready]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    if (ready) {
      try {
        localStorage.setItem("sentinel-theme", dark ? "dark" : "light");
      } catch {
        /* Storage failure is reported by the workspace save. */
      }
    }
  }, [dark, ready]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(timer);
  }, [notice]);
  function go(next: View) {
    setView(next);
    setQuery("");
    setMobile(false);
  }
  async function request(action: "run" | "source", mode?: LabMode) {
    if (lock.current) return;
    lock.current = true;
    setBusy(action === "source" ? "source" : mode!);
    try {
      const response = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, mode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed.");
      if (action === "run") {
        setWorkspace((w) => ({
          ...w,
          runs: [data as LabRun, ...w.runs].slice(0, 30),
        }));
        setNotice(
          `${mode === "baseline" ? "Baseline" : "Hardened"} run captured with SHA-256 evidence.`,
        );
      } else {
        setWorkspace((w) => ({ ...w, source: data as SourceReview }));
        setNotice(
          `Reviewed ${data.files} files. ${data.signals.length} source signals captured.`,
        );
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Operation failed.");
    } finally {
      setBusy(null);
      lock.current = false;
    }
  }
  function updateFinding(f: Finding) {
    if (f.verification === "verified") {
      const missing = findingQualification(workspace, f);
      if (missing.length) {
        setNotice(`Verification blocked: ${missing.join(", ")}.`);
        return false;
      }
    }
    setWorkspace((w) => ({
      ...w,
      findings: w.findings.map((item) =>
        item.id === f.id ? { ...f, updatedAt: new Date().toISOString() } : item,
      ),
    }));
    return true;
  }
  const current =
    workspace.findings.find((f) => f.id === selected) || workspace.findings[0];
  const open = workspace.findings.filter((f) =>
    ["open", "in-remediation"].includes(f.status),
  ).length;
  const packet = () => {
    download(
      "sentinel-assessment.json",
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          limitations:
            "Local workspace. Fixture runs do not verify target vulnerabilities. No live authorization is implied.",
          ...workspace,
        },
        null,
        2,
      ),
    );
    setNotice("Assessment packet exported.");
  };
  const matching = workspace.findings.filter((f) =>
    `${f.title} ${f.cwe} ${f.componentId} ${f.id}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="sentinel">
      {mobile && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar no-print ${mobile ? "open" : ""}`}>
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            go("overview");
          }}
        >
          <span className="brand-icon">
            <ShieldCheck size={23} />
          </span>
          <span>
            SENTINEL<small>SECURITY ASSURANCE</small>
          </span>
        </a>
        <div className="workspace-label">
          <span className="workspace-icon">
            <Globe2 size={18} />
          </span>
          <span>
            World Monitor<small>Assessment workspace</small>
          </span>
          <LockKeyhole size={13} />
        </div>
        <div className="nav-heading">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-current={view === id ? "page" : undefined}
              onClick={() => go(id)}
              className={view === id ? "active" : ""}
            >
              <Icon size={17} />
              <span>{label}</span>
              {id === "findings" && <small>{open}</small>}
              {id === "lab" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="isolation">
            <span className="live-dot" />
            <strong>Local assessment</strong>
            <p>Source review & isolated fixtures</p>
            <span className="mono">SIH 2026 / PS 26163</span>
          </div>
          <button
            className={view === "scope" ? "active" : ""}
            onClick={() => go("scope")}
          >
            <Settings2 size={17} />
            Scope & authorization
          </button>
          <div className="profile">
            <span className="avatar">SA</span>
            <span>
              Security analyst
              <small>
                {ready ? "Saved on this browser" : "Loading workspace"}
              </small>
            </span>
            <button
              className="icon-button"
              aria-label={
                dark ? "Switch to light theme" : "Switch to dark theme"
              }
              title="Change theme"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar no-print">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {navigation.find((n) => n.id === view)?.label ||
                "Scope & authorization"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="local-badge">
              <span className="live-dot" />
              Local only
            </span>
            <span className="topbar-divider" />
            <span className="mono">WM / 001</span>
            <span className="avatar small">SA</span>
          </div>
        </header>
        <main className="page-content">
          <div className="page-heading no-print">
            <div>
              <div className="overline">{titles[view][1]}</div>
              <h1>{titles[view][0]}</h1>
            </div>
            <div className="page-actions">
              <Button onClick={packet}>
                <ArrowDownToLine size={15} />
                Export packet
              </Button>
              {view === "overview" && (
                <Button primary onClick={() => go("lab")}>
                  <Play size={14} />
                  Open validation lab
                </Button>
              )}
            </div>
          </div>
          {view === "overview" && (
            <Overview workspace={workspace} go={go} select={setSelected} />
          )}
          {view === "surface" && <Surface onSource={() => go("source")} />}
          {view === "source" && (
            <SourcePanel
              source={workspace.source}
              busy={!!busy}
              scan={() => request("source")}
              triage={(signal) => {
                const reference = `${signal.file}:${signal.line} SHA-256 ${signal.hash}`;
                const existing = workspace.findings.find((f) =>
                  f.evidenceIds.includes(reference),
                );
                if (existing) {
                  setSelected(existing.id);
                  go("findings");
                  return;
                }
                const now = new Date().toISOString();
                const f: Finding = {
                  id: `FND-${crypto.randomUUID().slice(0, 8)}`,
                  title: `${signal.kind}: ${signal.file}:${signal.line}`,
                  summary: signal.note,
                  description: `AST review observed ${signal.kind.toLowerCase()} at ${signal.file}:${signal.line}. ${signal.note} Source commit: ${workspace.source?.commit}.`,
                  componentId: signal.file.startsWith("src/")
                    ? "spa"
                    : "edge-api",
                  cwe:
                    signal.kind === "HTML sink"
                      ? "CWE-79"
                      : signal.kind === "Dynamic fetch"
                        ? "CWE-918"
                        : "CWE-862",
                  owasp: "Pending classification",
                  cvss: {
                    AV: "N",
                    AC: "H",
                    PR: "N",
                    UI: "N",
                    S: "U",
                    C: "N",
                    I: "N",
                    A: "N",
                  },
                  status: "open",
                  verification: "unverified",
                  likelihood: 1,
                  impact: 1,
                  evidenceIds: [reference],
                  checkIds: [],
                  stepsToReproduce: [
                    `Inspect ${signal.file}:${signal.line} at commit ${workspace.source?.commit}.`,
                    "Trace untrusted input to the operation and identify relevant guards.",
                    "Write a target-specific regression test in the authorized local checkout.",
                  ],
                  safePoc:
                    "Pending target-specific local validation; no exploitability is established by this signal.",
                  businessImpact:
                    "Not established. Determine affected data and reachable functionality during validation.",
                  remediation: [
                    "Review the control before proposing a change; a false-positive disposition may be appropriate.",
                  ],
                  retest: {
                    status: "not-retested",
                    notes: "Source observation only.",
                  },
                  createdAt: now,
                  updatedAt: now,
                };
                setWorkspace((w) => ({ ...w, findings: [...w.findings, f] }));
                setSelected(f.id);
                go("findings");
                setNotice(
                  "Source signal linked to a new unverified candidate.",
                );
              }}
            />
          )}
          {view === "lab" && (
            <Lab
              runs={workspace.runs}
              busy={busy}
              run={(mode) => request("run", mode)}
            />
          )}
          {view === "findings" && (
            <>
              <div className="toolbar">
                <SearchInput
                  query={query}
                  setQuery={setQuery}
                  placeholder="Search findings, CWE, or component..."
                />
                <span className="muted">
                  {workspace.findings.length} candidates
                </span>
                <Button primary onClick={() => setNewFinding(true)}>
                  <Plus size={15} />
                  Add finding
                </Button>
              </div>
              <div className="findings-layout">
                <div className="finding-list">
                  {matching.map((f) => (
                    <button
                      key={f.id}
                      className={current?.id === f.id ? "selected" : ""}
                      onClick={() => setSelected(f.id)}
                    >
                      <div>
                        <span className="mono muted">{f.id}</span>
                        <Severity finding={f} />
                      </div>
                      <strong>{f.title}</strong>
                      <div>
                        <span>{f.cwe}</span>
                        <small>{statusLabel[f.status]}</small>
                      </div>
                    </button>
                  ))}
                  {!matching.length && (
                    <Empty
                      title="No matching findings"
                      text="Try another title, component or CWE."
                    />
                  )}
                </div>
                {current && (
                  <FindingDetail
                    finding={current}
                    update={updateFinding}
                    note={workspace.notes[current.id] || ""}
                    setNote={(note) =>
                      setWorkspace((w) => ({
                        ...w,
                        notes: { ...w.notes, [current.id]: note },
                      }))
                    }
                  />
                )}
              </div>
            </>
          )}
          {view === "evidence" && (
            <Evidence workspace={workspace} notify={setNotice} />
          )}
          {view === "remediation" && (
            <Remediation
              workspace={workspace}
              setTask={(id, status) =>
                setWorkspace((w) => ({
                  ...w,
                  tasks: { ...w.tasks, [id]: status },
                }))
              }
            />
          )}
          {view === "report" && (
            <Report workspace={workspace} packet={packet} />
          )}
          {view === "scope" && (
            <Scope
              workspace={workspace}
              restore={async (file) => {
                try {
                  if (file.size > 8_000_000)
                    throw new Error("Assessment packet exceeds 8 MB.");
                  const restored = parseWorkspace(
                    JSON.parse(await file.text()),
                  );
                  for (const run of restored.runs)
                    if (!(await verifyRunDigest(run)))
                      throw new Error(
                        "A fixture record failed its integrity check. Restore cancelled.",
                      );
                  download(
                    "sentinel-before-restore.json",
                    JSON.stringify(workspace, null, 2),
                  );
                  setWorkspace(restored);
                  setNotice(
                    "Packet restored. Your previous workspace was downloaded as a backup.",
                  );
                } catch (error) {
                  setNotice(
                    error instanceof Error
                      ? error.message
                      : "Invalid assessment packet.",
                  );
                }
              }}
              update={(scope) => setWorkspace((w) => ({ ...w, scope }))}
            />
          )}
        </main>
      </div>
      {notice && (
        <div className="toast no-print" role="status">
          <Activity size={17} />
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <Dialog.Root open={newFinding} onOpenChange={setNewFinding}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <div className="section-heading">
              <Dialog.Title>Add review candidate</Dialog.Title>
              <Dialog.Close asChild>
                <button className="icon-button" aria-label="Close dialog">
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="muted">
              Capture a hypothesis. New findings start unverified.
            </Dialog.Description>
            <form
              className="finding-form"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const now = new Date().toISOString();
                const f: Finding = {
                  id: `FND-${crypto.randomUUID().slice(0, 8)}`,
                  title: String(form.get("title")).trim(),
                  description: String(form.get("description")).trim(),
                  summary: String(form.get("description")).trim(),
                  componentId: String(form.get("component")),
                  cwe: String(form.get("cwe")) || "Unclassified",
                  owasp: "Pending classification",
                  cvss: {
                    AV: "N",
                    AC: "H",
                    PR: "L",
                    UI: "R",
                    S: "U",
                    C: "L",
                    I: "N",
                    A: "N",
                  },
                  status: "open",
                  verification: "unverified",
                  likelihood: 1,
                  impact: 1,
                  evidenceIds: [],
                  checkIds: [],
                  stepsToReproduce: [
                    "Document target-specific reproduction steps.",
                  ],
                  safePoc: "Pending controlled validation.",
                  businessImpact: "Pending impact assessment.",
                  remediation: ["Determine remediation after validation."],
                  retest: { status: "not-retested", notes: "" },
                  createdAt: now,
                  updatedAt: now,
                };
                if (!f.title || !f.description) return;
                setWorkspace((w) => ({ ...w, findings: [...w.findings, f] }));
                setSelected(f.id);
                setNewFinding(false);
                setNotice("Review candidate added.");
              }}
            >
              <label>
                Title
                <input name="title" required maxLength={180} autoFocus />
              </label>
              <label>
                Observation
                <textarea
                  name="description"
                  required
                  rows={4}
                  maxLength={8000}
                />
              </label>
              <div className="form-grid">
                <label>
                  Component
                  <select name="component">
                    {components.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  CWE
                  <input name="cwe" placeholder="CWE-862" maxLength={30} />
                </label>
              </div>
              <button className="button primary" type="submit">
                <Plus size={15} />
                Create candidate
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
