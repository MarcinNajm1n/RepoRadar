# RepoRadar Verification Matrix

Run the narrowest useful check first. Never claim a check passed when it was not run. Clearly separate new failures from pre-existing failures. Fix failures caused by the change before completion.

## Documentation Or Configuration Only

- Inspect the diff.
- Validate TOML.
- Validate JSON.
- Validate Markdown links and paths where practical.
- Run `git diff --check`.
- No application build is required unless application files changed.

## Frontend Component Changes

- Run targeted tests.
- Run typecheck.
- Run lint.
- Run build when feasible.
- Run a browser or Playwright check for the changed flow.
- Do responsive review when visual behavior changed.

## Scoring Or Growth Changes

- Add or run deterministic unit tests.
- Cover boundary cases.
- Cover baseline-only repositories.
- Cover the tiny-repository percentage-growth guard.
- Cover existing snapshots.
- Confirm no LLM involvement in raw scoring.

## Prisma Or Database Changes

- Validate the Prisma schema.
- Generate Prisma Client when needed.
- Review migrations.
- Run relevant tests.
- Assess data-loss risk.

## GitHub API Changes

- Test parsing.
- Verify rate-limit handling.
- Verify pagination.
- Verify retry/backoff.
- Verify deduplication.
- Cover missing README.
- Cover archived and forked repositories.

## OpenAI Changes

- Verify cache behavior.
- Verify cost limits.
- Verify input truncation.
- Confirm no secret transmission.
- Confirm `store: false` where required by current implementation.
- Verify failure behavior without an API key.

## Security-Sensitive Changes

- Run `npm run security:check` when available.
- Inspect the actual diff.
- Review environment and secret handling.
- Use the security reviewer.
- Do not commit or push without explicit user request.
