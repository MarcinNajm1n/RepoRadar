# RepoRadar

RepoRadar is a local-first portfolio application for discovering, tracking, scoring, and analyzing fast-growing GitHub repositories related to AI agents, LLM apps, MCP, hooks, skills, developer automation, RAG, prompt engineering tools, and local AI tooling.

It runs locally, stores history in SQLite, calculates growth from local snapshots, and generates Polish summaries, reports, and MVP ideas with OpenAI only when needed.

## Problem

GitHub is full of useful AI/devtools repositories, but it is hard to track which ones are genuinely growing, which ones are just old and famous, and which ones are worth reading or turning into a project idea. RepoRadar focuses on growth over raw stars and keeps a local memory of ignored, saved, read, and analyzed repositories.

## Features

- Local Next.js web app with SQLite.
- Daily GitHub scan via `npm run scan`.
- Repository metric snapshots for 24h and 7d growth.
- Deterministic `trend_score` from growth, age, stars, forks, activity, topics, README quality, and AI/LLM relevance.
- Polish UI labels and Polish OpenAI-generated summaries/reports.
- `Radar dzisiaj` first screen for daily decisions.
- Action queue for read, demo, clone later, market validation, report, MVP planning, and custom tasks.
- On-demand full repo report on double click.
- On-demand evidence-backed market research for full reports and ideas.
- Separate "Pomysły" tab for repo-based side hustle/MVP ideas.
- Optional Windows and Discord scan notifications for high-value repositories.
- Deterministic daily briefing, daily markdown reports, and weekly markdown reports in `reports/`.
- CSV export for ideas and print-friendly report views.
- Required tabs include Radar dzisiaj, Biblioteka, Nowo znalezione, Zapisane, Przeczytane, Ignorowane, Zadania, Pomysły, Raporty tygodniowe, Stare repo, Ustawienia.
- Ignored repositories stay in storage so they are not rediscovered as new.
- Demo seed data for portfolio screenshots.

## Stack

- Next.js App Router
- TypeScript
- SQLite
- Prisma
- Tailwind CSS
- shadcn-inspired local UI primitives
- Vitest
- Playwright
- GitHub REST API
- OpenAI Responses API
- OpenAI web search / remote MCP for on-demand market research

## Screenshots

Place portfolio screenshots in `docs/screenshots/` after running the app with seed data.

Suggested shots:

- Library list with filters.
- Radar dzisiaj decision view.
- Action queue.
- Expanded repository row.
- Full Polish report modal.
- Pomysły tab.
- Weekly report tab.

## Documentation

- Product spec: `docs/PRODUCT_SPEC.md`
- Stage 4 implementation plan: `docs/STAGE_4_IMPLEMENTATION_PLAN.md`
- User guide: `docs/USER_GUIDE.md`
- Architecture: `docs/ARCHITECTURE.md`
- Security: `docs/SECURITY.md`
- Roadmap: `docs/ROADMAP.md`

## Local Setup

Install Node.js 24 first.

CI uses Node 24. Local Node 20 is no longer the recommended runtime.

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Environment

`.env.example` contains all supported keys:

- `GITHUB_TOKEN` - fine-grained GitHub personal access token.
- `OPENAI_API_KEY` - only needed for summaries, full reports, and ideas.
- `OPENAI_MODEL` - model used for report generation.
- `DATABASE_URL` - defaults to local SQLite.
- scan thresholds: `MIN_STARS`, `NEW_REPO_MAX_AGE_MONTHS`, `OLD_REPO_AGE_MONTHS`, `MIN_WEEKLY_STAR_GROWTH_ABSOLUTE`, `MIN_WEEKLY_STAR_GROWTH_PERCENT`.
- notifications: `ENABLE_NOTIFICATIONS`, `ENABLE_WINDOWS_NOTIFICATIONS`, `DISCORD_WEBHOOK_URL`, `NOTIFICATION_MIN_TREND_SCORE`, `NOTIFICATION_MIN_WEEKLY_GROWTH`.
- market research: `MARKET_RESEARCH_ENABLED`, `MARKET_RESEARCH_PROVIDER`, `MARKET_RESEARCH_DAILY_LIMIT`, `MARKET_RESEARCH_MAX_SOURCES`, `MCP_WEB_RESEARCH_SERVER_URL`.
- optional Reddit source: `ENABLE_REDDIT_SOURCE`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT`.

### GitHub Token

Create a fine-grained personal access token in GitHub Settings -> Developer settings -> Personal access tokens. RepoRadar only needs read-only access to public repository metadata and content. Do not grant write, workflow, secrets, admin, or organization permissions.

## Daily Scan

Run manually:

```bash
npm run scan
```

The scan:

1. Builds GitHub Search API queries for AI/LLM/MCP/devtools topics.
2. Deduplicates repositories by GitHub id and full name.
3. Skips forks by default if `EXCLUDE_FORKS=true`.
4. Preserves ignored repositories in SQLite.
5. Stores a snapshot for each repository.
6. Calculates 24h/7d growth from local snapshots only.
7. Calculates deterministic trend score.
8. Generates short summaries only for high-value candidates when OpenAI is configured.
9. Writes `reports/daily/YYYY-MM-DD.md`.

Register a Windows daily task:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/register-windows-task.ps1 -Time 09:00
```

Preview the task action without registering it:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/register-windows-task.ps1 -Time 09:00 -DryRun
```

Check or start the registered task manually:

```powershell
schtasks /Query /TN "RepoRadar Daily Scan" /V /FO LIST
schtasks /Run /TN "RepoRadar Daily Scan"
```

If the computer is off, the local scan cannot run. The Windows task is configured with `StartWhenAvailable`.
Scheduled scan logs are written to `logs/scans/*.log`.

## Scoring

`trend_score` is 0-100 and is calculated in code, never by an LLM:

```txt
35 absolute weekly growth
20 percentage weekly growth with small-repo guard
10 repository age
8 total stars
5 forks
8 recent push activity
7 topic relevance
4 README quality
3 AI/LLM keyword relevance
```

First-day repositories are baseline-only. RepoRadar may score "high initial traction", but it does not pretend to know historical weekly growth before tracking began.

## OpenAI Reports

OpenAI is used only for:

- short Polish summaries for selected high-score repositories,
- full Polish repo reports on double click or manual regeneration,
- ideas created by clicking "Utwórz pomysł z repo".
- on-demand market research for reports and ideas when `MARKET_RESEARCH_ENABLED=true`.

Cost controls:

- cache by input hash and model,
- daily analysis limit,
- separate daily market research limit,
- market research cache by provider/query hash,
- README/context truncation,
- `store: false` in Responses API calls,
- no secrets are sent to OpenAI.

Market research provider order:

1. Remote MCP web research if `MARKET_RESEARCH_PROVIDER=mcp|hybrid` and `MCP_WEB_RESEARCH_SERVER_URL` is configured.
2. OpenAI Responses `web_search` fallback for `hybrid` or direct `openai` mode.
3. Optional Reddit API only when explicitly enabled and OAuth credentials exist.

Direct X/Twitter and LinkedIn APIs are not implemented. Public X/LinkedIn results may appear only through web research sources.

## Notifications

After a scan, RepoRadar sends notifications only for failures or high-value repositories:

- `trendScore >= NOTIFICATION_MIN_TREND_SCORE`,
- or `growth7d >= NOTIFICATION_MIN_WEEKLY_GROWTH`,
- or a strong deterministic relevance/trend match.

Windows notifications are local best-effort toasts. Discord uses `DISCORD_WEBHOOK_URL` from `.env`; the webhook URL is masked in logs and never committed.

## Reports

Generated markdown paths:

- `reports/daily/YYYY-MM-DD.md`
- `reports/weekly/YYYY-WW.md`
- `reports/repos/{owner}__{repo}.md`

Generated reports are local artifacts and are ignored by git by default.

## Demo Workflow

```bash
npm run db:seed
npm run dev
```

Then:

1. Open Radar dzisiaj.
2. Review top repo, business candidates, alerts, and active tasks.
3. Expand a repo in Biblioteka and add quick tasks such as Clone later or Sprawdź demo.
4. Generate a full report only if `OPENAI_API_KEY` is configured.
5. Create or promote an idea from a repo.
6. Generate a daily briefing and weekly report.

## Tests

```bash
npm run typecheck
npm run test
npm run test:ui
```

`npm run test:ui` requires Playwright browsers. If they are missing locally, run `npx playwright install chromium`.

## Large Dataset Benchmark

Run the local large dataset benchmark without GitHub, OpenAI, or network calls:

```bash
npm run benchmark:large
```

By default it creates an isolated SQLite database with 5000 synthetic repositories under `test-results/benchmarks/`, measures `getRepositoryPage`, `getDashboardData`, and `RepoListView` server rendering, then writes JSON and Markdown results in the same ignored directory. Custom output paths must stay under `test-results/`.

For a quick smoke run:

```bash
npm run benchmark:large -- --size=200 --output=test-results/benchmarks/smoke.json
```

## CI

GitHub Actions runs on `windows-latest` without real secrets. The workflow installs dependencies, generates Prisma Client, migrates a local SQLite database, then runs typecheck, lint, Vitest, build, and the sensitive-file check.

## Commit Safety

RepoRadar includes a local secret check so the project can be committed without manually resetting private files before every commit.

Install the git hook once:

```powershell
npm run hooks:install
```

Run the same check manually:

```powershell
npm run security:check
```

The check blocks common private files and secrets, including `.env`, private key files, local SQLite databases, credential JSON files, GitHub tokens, OpenAI keys, Discord webhooks, SMTP passwords, and private key blocks.

Commit `.env.example` with empty placeholders. Keep real values only in `.env` or another ignored local file. `package-lock.json` is safe and should be committed.

## Limitations

- GitHub does not provide perfect historical stars through search, so growth starts only after RepoRadar begins tracking.
- GitHub Search API has separate rate limits and may return incomplete results.
- Optional sources like Reddit, HN, Product Hunt, and X are disabled by default. Direct X/LinkedIn API integrations are intentionally not part of this MVP.
- No cloud sync, auth, billing, or Supabase dependency in MVP.
- RepoRadar does not mass-clone repositories and never executes code from discovered repositories.

## Roadmap

- More source adapters: HN Algolia, Reddit, Product Hunt.
- Optional Tauri wrapper.
- Better report search.
- Richer notification delivery controls.
- PostgreSQL/Supabase migration path.
- More Playwright coverage for report and idea flows.
