export type LabMode = "baseline" | "hardened";
export interface Assertion {
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
}
export interface LabResult {
  id: string;
  title: string;
  category: string;
  cwe: string;
  assertions: Assertion[];
  passed: boolean;
  durationMs: number;
  remediation: string;
  before: string;
  after: string;
}
export interface LabRun {
  id: string;
  mode: LabMode;
  createdAt: string;
  results: LabResult[];
  digest: string;
  provenance: string;
}

export const labDefinitions = [
  {
    id: "AUTH-01",
    title: "Premium access boundary",
    category: "Authentication",
    cwe: "CWE-862",
    remediation: "Require an entitled identity for every premium route.",
    before: "return Boolean(session);",
    after: 'return session?.role === "pro";',
  },
  {
    id: "IDOR-02",
    title: "Report ownership",
    category: "Authorization",
    cwe: "CWE-639",
    remediation:
      "Scope object access to the authenticated subject on every request.",
    before: "return reports.find(r => r.id === id);",
    after: "return reports.find(r => r.id === id && r.owner === user.id);",
  },
  {
    id: "CACHE-03",
    title: "Private response caching",
    category: "Data privacy",
    cwe: "CWE-525",
    remediation: "Use private, no-store for credential-dependent responses.",
    before: 'headers.set("Cache-Control", "public, max-age=300");',
    after: 'headers.set("Cache-Control", "private, no-store");',
  },
  {
    id: "HTML-04",
    title: "Untrusted feed rendering",
    category: "Input validation",
    cwe: "CWE-79",
    remediation:
      "Render source text through textContent or context-appropriate escaping.",
    before: "return `<h3>${title}</h3>`;",
    after: "return `<h3>${escapeText(title)}</h3>`;",
  },
  {
    id: "URL-05",
    title: "Outbound URL allowlist",
    category: "API security",
    cwe: "CWE-918",
    remediation:
      "Compare parsed HTTPS origins against an explicit allowlist; separately enforce DNS and redirect policy at fetch time.",
    before: 'return url.includes("feeds.example.org");',
    after:
      'const u = new URL(url);\nreturn u.origin === "https://feeds.example.org"\n  && !u.username && !u.password;',
  },
  {
    id: "CORS-06",
    title: "Cross-origin policy",
    category: "Client security",
    cwe: "CWE-942",
    remediation: "Use exact trusted-origin matching and emit Vary: Origin.",
    before: "return requestOrigin;",
    after: "return allowedOrigins.has(requestOrigin) ? requestOrigin : null;",
  },
  {
    id: "TOKEN-07",
    title: "Session expiry",
    category: "Session management",
    cwe: "CWE-613",
    remediation:
      "Reject expired sessions, including the exact expiry boundary.",
    before: "return token.subject.length > 0;",
    after: "return token.subject.length > 0 && token.expiresAt > now;",
  },
  {
    id: "LINK-08",
    title: "Secure source links",
    category: "Communication",
    cwe: "CWE-319",
    remediation: "Permit HTTPS only for this fixture's external source links.",
    before: "return input;",
    after: 'return new URL(input).protocol === "https:" ? input : null;',
  },
];

const escapeText = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

// These intentionally vulnerable models are never attached to an HTTP target.
export function executeLab(mode: LabMode): LabResult[] {
  const fixed = mode === "hardened";
  const suites: Record<string, () => Assertion[]> = {
    "AUTH-01": () =>
      ["anonymous", "free", "pro"].map((role) =>
        assertion(
          `${role} session`,
          role === "pro",
          fixed ? role === "pro" : Boolean(role),
        ),
      ),
    "IDOR-02": () =>
      ["alice", "bob"].map((user) => {
        const report = { id: "r-1", owner: "alice" };
        return assertion(
          `${user} requests r-1`,
          user === report.owner,
          fixed ? user === report.owner : report.id === "r-1",
        );
      }),
    "CACHE-03": () => {
      const headers = new Headers({
        "Cache-Control": fixed ? "private, no-store" : "public, max-age=300",
      });
      return [
        assertion(
          "Private response forbids storage",
          true,
          headers.get("Cache-Control")!.includes("no-store"),
        ),
        assertion(
          "Private response forbids shared caching",
          false,
          headers.get("Cache-Control")!.includes("public"),
        ),
      ];
    },
    "HTML-04": () =>
      [
        '<span data-sentinel="lab">sample</span>',
        "Markets & news",
        "Plain text",
      ].map((input) => {
        const output = `<h3>${fixed ? escapeText(input) : input}</h3>`;
        return assertion(
          `Render ${input}`,
          `<h3>${escapeText(input)}</h3>`,
          output,
        );
      }),
    "URL-05": () =>
      [
        ["https://feeds.example.org/news", true],
        ["https://feeds.example.org.evil.invalid/news", false],
        ["https://feeds.example.org@127.0.0.1/", false],
        ["http://feeds.example.org/news", false],
        ["https://[::ffff:127.0.0.1]/?feeds.example.org", false],
        ["not-a-url", false],
      ].map(([input, expected]) => {
        let allowed = false;
        try {
          const u = new URL(String(input));
          allowed = fixed
            ? u.origin === "https://feeds.example.org" &&
              !u.username &&
              !u.password
            : String(input).includes("feeds.example.org");
        } catch {
          /* Malformed URLs are denied. */
        }
        return assertion(String(input), expected, allowed);
      }),
    "CORS-06": () =>
      [
        "https://app.example.org",
        "https://app.example.org.evil.invalid",
        "null",
      ].map((origin) =>
        assertion(
          origin,
          origin === "https://app.example.org" ? origin : null,
          fixed
            ? origin === "https://app.example.org"
              ? origin
              : null
            : origin,
        ),
      ),
    "TOKEN-07": () =>
      [-1, 0, 1].map((offset) => {
        const now = 1_800_000_000;
        const token = { subject: "alice", expiresAt: now + offset };
        return assertion(
          `Expiry ${offset === 0 ? "at" : offset < 0 ? "before" : "after"} current time`,
          offset > 0,
          fixed
            ? token.subject.length > 0 && token.expiresAt > now
            : token.subject.length > 0,
        );
      }),
    "LINK-08": () =>
      [
        "https://source.example.org",
        "http://source.example.org",
        "javascript:void(0)",
      ].map((input) =>
        assertion(
          input,
          input.startsWith("https:") ? input : null,
          fixed ? (new URL(input).protocol === "https:" ? input : null) : input,
        ),
      ),
  };
  return labDefinitions.map((def) => {
    const started = performance.now();
    const assertions = suites[def.id]();
    return {
      ...def,
      assertions,
      passed: assertions.every((a) => a.passed),
      durationMs: Math.max(
        0.01,
        Math.round((performance.now() - started) * 100) / 100,
      ),
    };
  });
}
function assertion(
  name: string,
  expected: unknown,
  actual: unknown,
): Assertion {
  return {
    name,
    expected: JSON.stringify(expected),
    actual: JSON.stringify(actual),
    passed: expected === actual,
  };
}
