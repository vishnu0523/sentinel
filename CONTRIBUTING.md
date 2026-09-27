# Contributing

## Development

1. Install Node.js 20 or 22.
2. Run `npm ci`.
3. Copy `.env.example` to `.env` and set `WORLDMONITOR_SOURCE` only when you have an authorized local checkout.
4. Run `npm run dev`.

Before opening a pull request, run:

```sh
npm run verify
npx playwright install chromium
npm run test:e2e
```

## Evidence rules

- Treat AST signals as review candidates, not vulnerability verdicts.
- Never relabel fixture behavior as target behavior.
- A verified target finding requires authorization, a pinned source revision, linked evidence, reproducible steps, a controlled proof, impact, and remediation.
- Redact secrets and personal data before committing artifacts.
- Keep changes focused and add tests proportional to risk.
