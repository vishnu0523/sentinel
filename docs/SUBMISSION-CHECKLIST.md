# Submission checklist

## Repository

- [ ] Repository visibility matches the disclosure plan.
- [ ] The default branch is `main` and GitHub Actions is green.
- [ ] No secrets or private evidence appear in Git history.
- [ ] `README.md`, `SECURITY.md`, and `CONTRIBUTING.md` render correctly.
- [ ] A clean clone passes `npm ci`, `npm run verify`, and `npm run test:e2e`.

## Assessment evidence

- [ ] Written authorization and scope reference are recorded.
- [ ] The reviewed World Monitor commit and source digest are captured.
- [ ] At least one target-specific vulnerability is safely reproduced.
- [ ] The finding contains exact reproduction steps and controlled PoC output.
- [ ] Business impact and CVSS are based on demonstrated conditions.
- [ ] Evidence is hashed, redacted, and linked to the finding.
- [ ] Remediation is practical and a passing retest is recorded.
- [ ] Hypotheses remain explicitly unverified.

## Deliverables

- [ ] Export the Markdown report, printable PDF, and JSON evidence packet.
- [ ] Review every exported claim against the linked evidence.
- [ ] Prepare a five-minute demo using `docs/DEMO.md`.
- [ ] Record a backup demo video and keep a local offline build.
- [ ] Verify the current SIH portal fields, file limits, deadlines, and team details.

## Go/no-go rule

Do not present the assessment as satisfying PS 26163 until at least one valid target vulnerability has been verified. A polished interface, fixture failure, static-analysis signal, or dependency audit result is not a substitute for target-specific evidence.
