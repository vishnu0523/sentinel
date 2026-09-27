# Sentinel - World Monitor Security Assessment

A local-first analyst workspace for SIH problem statement 26163. It combines read-only source inventory, executable security fixtures, guarded finding verification, evidence integrity checks, remediation tracking, and report exports in a responsive, solid-color interface.

> **Assessment status:** the product is ready for local use and demonstration. The seeded records are research candidates, not confirmed World Monitor vulnerabilities. PS 26163 is not satisfied until an authorized, target-specific finding is safely reproduced and linked to evidence.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. The scripts bind to loopback. For a production preview:

```sh
npm run build
npm start -- --port 3001
```

Development uses `.next`; production uses `.next-production` so building does not invalidate a running dev server.

For a reproducible installation, use `npm ci` when `package-lock.json` is present. Node.js 20 or 22 is supported.

## Repository review

Set `WORLDMONITOR_SOURCE` in `.env` to the absolute path of your authorized local World Monitor checkout, then restart the server. On this workstation, the default is `~/OneDrive/Documents/ChatGPT/Earn/worldmonitor`.

The source review uses the TypeScript parser to inventory HTML assignment/call sinks, dynamic fetch calls and selected authentication controls. It covers `api`, `src`, `server`, and `convex`, excludes symlinks and generated directories, and limits files and signals. Each signal records a file, line and SHA-256 of the reviewed bytes. API file counts are not endpoint coverage. AST signals are candidates, not vulnerability verdicts.

## What works

- Overview metrics derived from workspace records, with explicit empty states.
- Keyboard-operable reference architecture map and component inspection.
- Source inventory, filtering, exports and one-click candidate creation with source hashes.
- Eight executable local model suites with 25 assertions: premium access, object ownership, caching, HTML escaping, URL policy, CORS, expiry and HTTPS links.
- Baseline/hardened comparison with actual assertion output, timings and SHA-256 evidence.
- Finding creation, full record editing, CVSS v3.1, investigation notes and retest notes.
- Guarded promotion from hypothesis to verified target finding. Verification requires authorization, a pinned revision, linked evidence, reproduction, controlled proof, impact, and remediation.
- Evidence vault with JSON preview, downloads and client-side digest verification.
- Remediation board with persistent workflow changes.
- Report section selection, complete technical Markdown, print/PDF layout and JSON packets.
- Scope configuration, browser persistence and schema-validated packet restore. Restore verifies fixture hashes and downloads the previous workspace first.
- Responsive navigation, light/dark themes, focus states and reduced-motion support.

## Verification

```sh
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev
```

`npm run verify` runs formatting, type checks, unit tests, a production build, and the production dependency audit. Browser tests start their own loopback development server when needed and use a committed synthetic source fixture in CI; they never treat that fixture as target evidence. Set `TEST_BASE_URL` to exercise another local server. Screenshots and a generated PDF are written under `artifacts/` and are ignored by Git.

GitHub Actions executes the complete verification sequence on pushes to `main` and pull requests. Dependabot checks npm dependencies monthly.

## Architecture

- Next.js 15 App Router / React 19 / TypeScript.
- CSS design tokens, Tailwind foundation, Lucide icons and Radix dialog.
- Zod validation for portable workspaces; TypeScript AST for source inspection.
- Node assertions and Playwright for functional/browser tests.
- `components/sentinel.tsx`: workspace state and shell.
- `components/assessment-tools.tsx`: architecture, source review and validation lab.
- `components/assessment-records.tsx`: findings, evidence, remediation, reports and scope.
- `lib/lab.ts`: executable educational models.
- `lib/source-review.ts`: read-only source inventory.
- `app/api/assessment/route.ts`: same-origin local execution boundary.

The original Prisma schema remains available but is not connected to the current browser-local workspace. There is no multi-user authentication or shared database service. The app must stay local until those boundaries are implemented.

## Evidence and limits

Seeded candidates are explicitly unverified and have no attached evidence. No test result is hardcoded. Fixture failures do not prove World Monitor vulnerabilities, and hardened fixture passes do not prove target fixes. HTML tests compare rendered strings rather than browser execution. URL policy tests do not cover DNS or redirects. The production dependency audit was clean on 2026-09-27; that result is time-bound and CI reruns it on every change.

The source manifest digest identifies inspected bytes; Git metadata alone does not cover untracked content. Fixture digests are integrity checks, not signed attestations. Keep exported evidence outside browser storage.

PS 26163 still requires a confirmed target vulnerability. See the [demo guide](docs/DEMO.md), [submission checklist](docs/SUBMISSION-CHECKLIST.md), [security policy](SECURITY.md), and [contribution guide](CONTRIBUTING.md) before publication.
