# Sentinel demo sequence

Use the actual local app. Never present fixture failures as World Monitor vulnerabilities.

## Five-minute walkthrough

1. **Scope (30 seconds).** Open Scope & authorization. Name the analyst and record the real written authorization reference, if available. Explain that this build only reads a local checkout and executes in-process models.
2. **Architecture (30 seconds).** Select the Edge API gateway, then the browser and desktop. Explain credential-bearing flows and trust boundaries. The diagram is a reference model, not verified deployment discovery.
3. **Source review (45 seconds).** Run Review repository. Show the pinned commit, actual file count and signal location. Filter to HTML sink or Dynamic fetch. Create a review candidate using the plus icon. Its evidence reference includes the file hash. Explain that a signal is not automatically a vulnerability.
4. **Controlled validation (60 seconds).** Run Vulnerable baseline. Show an assertion's expected and observed output. Switch to Hardened fixture and run again. Show the same assertion passing. Both implementations execute in process; this does not test or patch target handlers.
5. **Evidence (30 seconds).** Open Evidence vault. Click a fixture hash to recompute it. Download one record and inspect the actual assertion output and timestamp.
6. **Finding and remediation (45 seconds).** Edit the source-linked candidate's reproduction procedure, impact and proposed fix. Adjust its provisional CVSS vector. Move a planned task through the remediation board. Neither action confirms a vulnerability or a fix.
7. **Report (40 seconds).** Toggle sections in Report studio. Export Markdown, print to PDF, and export the full packet. All three preserve the distinction between target research and fixture evidence.

## The remaining submission requirement

PS 26163 requires at least one valid target vulnerability with controlled reproduction, impact and practical remediation. This app supports that work but does not itself establish one. Complete the target-specific investigation on an authorized local checkout, capture the failing regression test, make the narrow patch, and repeat the same test. Include source revision, exact commands, output, redacted evidence, assumptions and limitations in the report. Do not relabel a generic fixture as target evidence.

## Judge questions

- **Are these actual tests?** Yes, model assertions run on the server. Target handlers are not executed by the fixture lab.
- **Are the source signals proven bugs?** No. The TypeScript AST identifies operations worth reviewing; data-flow and exploitability analysis remain analyst work.
- **What does the hash prove?** It detects changes relative to a captured digest. It is not a signature, timestamp authority, or independent attestation.
- **Does it scan production?** No. This version has no production network testing capability.
- **How is data retained?** This browser stores the local workspace. Export and validated restore provide portable backups. Shared multi-user storage is outside this build.
