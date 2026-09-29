import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ts from "typescript";

export interface SourceSignal {
  file: string;
  line: number;
  kind: string;
  note: string;
  hash: string;
}
export interface SourceReview {
  id: string;
  createdAt: string;
  sourceMode: "configured" | "demo";
  sourceLabel: string;
  commit: string;
  dirty: boolean;
  files: number;
  routes: number;
  signals: SourceSignal[];
  digest: string;
  truncated: boolean;
  limitation: string;
}
export async function reviewSource(
  root: string,
  options: {
    sourceMode?: SourceReview["sourceMode"];
    sourceLabel?: string;
  } = {},
): Promise<SourceReview> {
  const signals: SourceSignal[] = [];
  let files = 0,
    routes = 0,
    truncated = false;
  const manifest: string[] = [];
  async function walk(dir: string) {
    const entries = await fs
      .readdir(dir, { withFileTypes: true })
      .catch(() => []);
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (files >= 6000) {
        truncated = true;
        break;
      }
      if (
        entry.isSymbolicLink() ||
        ["node_modules", ".git", ".next", "dist", "generated"].includes(
          entry.name,
        )
      )
        continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
        continue;
      }
      if (!/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) continue;
      if ((await fs.stat(absolute)).size > 1_000_000) {
        truncated = true;
        continue;
      }
      const content = await fs.readFile(absolute, "utf8");
      const file = path.relative(root, absolute).replaceAll("\\", "/");
      const hash = createHash("sha256").update(content).digest("hex");
      manifest.push(`${file}:${hash}`);
      files++;
      if (file.startsWith("api/") && !entry.name.startsWith("_")) routes++;
      const source = ts.createSourceFile(
        file,
        content,
        ts.ScriptTarget.Latest,
        true,
        /tsx|jsx/.test(entry.name) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      function record(node: ts.Node, kind: string, note: string) {
        if (signals.length >= 1500) {
          truncated = true;
          return;
        }
        signals.push({
          file,
          line:
            source.getLineAndCharacterOfPosition(node.getStart(source)).line +
            1,
          kind,
          note,
          hash,
        });
      }
      function visit(node: ts.Node) {
        if (
          ts.isBinaryExpression(node) &&
          node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          ts.isPropertyAccessExpression(node.left) &&
          ["innerHTML", "outerHTML"].includes(node.left.name.text)
        )
          record(
            node,
            "HTML sink",
            "Review input provenance and context-specific escaping. Sink presence alone does not prove XSS.",
          );
        if (ts.isCallExpression(node)) {
          const expression = node.expression;
          const name = ts.isIdentifier(expression)
            ? expression.text
            : ts.isPropertyAccessExpression(expression)
              ? expression.name.text
              : "";
          if (
            name === "fetch" &&
            node.arguments.length &&
            !ts.isStringLiteral(node.arguments[0])
          )
            record(
              node,
              "Dynamic fetch",
              "Trace the destination through allowlists, DNS resolution and redirect controls.",
            );
          if (
            [
              "validateApiKey",
              "requireAuth",
              "getAuth",
              "verifyToken",
            ].includes(name)
          )
            record(
              node,
              "Auth control",
              "Observed control call; route coverage and enforcement still require review.",
            );
          if (["unsafeRawHtml", "insertAdjacentHTML"].includes(name))
            record(
              node,
              "HTML sink",
              "Review this explicit HTML insertion and its caller-controlled inputs.",
            );
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  const stat = await fs.stat(root).catch(() => null);
  if (!stat?.isDirectory())
    throw new Error(
      "Source checkout unavailable. Set WORLDMONITOR_SOURCE to your local repository and restart the server.",
    );
  for (const dir of ["api", "src", "server", "convex"])
    await walk(path.join(root, dir));
  let commit = "unavailable",
    dirty = true;
  try {
    commit = (
      await promisify(execFile)("git", ["-C", root, "rev-parse", "HEAD"], {
        timeout: 5000,
      })
    ).stdout.trim();
    dirty = Boolean(
      (
        await promisify(execFile)(
          "git",
          ["-C", root, "status", "--porcelain", "--untracked-files=no"],
          { timeout: 5000 },
        )
      ).stdout.trim(),
    );
  } catch {
    /* File hashes still identify the reviewed content without git. */
  }
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    sourceMode: options.sourceMode || "configured",
    sourceLabel: options.sourceLabel || "Configured source checkout",
    commit,
    dirty,
    files,
    routes,
    signals,
    digest: createHash("sha256").update(manifest.join("\n")).digest("hex"),
    truncated,
    limitation: `${options.sourceMode === "demo" ? "Demo fixture source is for workflow demonstration only; it is not World Monitor target evidence. " : ""}AST inventory of api, src, server and convex only. API file count is not endpoint coverage. Signals are review candidates, not confirmed vulnerabilities. File hashes capture reviewed bytes; Git metadata alone does not cover untracked files.`,
  };
}
