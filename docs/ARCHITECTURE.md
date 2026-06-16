# RepoRadar Architecture

RepoRadar is intentionally local-first. The MVP is a local Next.js app backed by SQLite and Prisma. It does not require auth, billing, Supabase, cloud hosting, or mass cloning.

## Main Layers

- `src/app` - Next.js App Router page and server actions.
- `src/components` - portfolio UI, including `Radar dzisiaj`, repository library, ideas, action queue, reports, and settings.
- `src/lib/db` - Prisma client, repository mapping, settings, action items, and dashboard data assembly.
- `src/lib/github` - GitHub REST client, queries, deduplication, and scanner.
- `src/lib/scoring` - deterministic growth and trend score logic.
- `src/lib/openai` - cached, on-demand Polish summaries, reports, ideas, and market research prompts.
- `src/lib/market-research` - evidence sources, provider selection, cache, opportunity scoring, and source quality.
- `src/lib/reports` - daily reports, weekly reports, repo reports, and deterministic daily briefings.
- `src/lib/notifications` - Windows/Discord/noop delivery, high-value thresholds, and notification logging.
- `src/lib/exports` and `src/lib/maintenance` - CSV export and local cleanup actions.

## Data Flow

1. GitHub scan finds repository candidates.
2. Candidates are deduplicated and upserted.
3. RepoRadar writes a new snapshot.
4. Growth is calculated from older local snapshots.
5. Trend score is calculated deterministically.
6. Short summaries run only for selected high-value repositories when OpenAI is configured.
7. Full reports, full research, full ideas, and AI-assisted work run only after explicit user action.
8. `Radar dzisiaj` combines local repository, idea, action queue, settings, scan, and notification state into a five-item decision dashboard.

## Database

Core tables:

- `Repository`
- `RepoSnapshot`
- `Report`
- `Idea`
- `IgnoredRepository`
- `Setting`
- `ActionItem`
- `OpenAiCache`
- `MarketResearchRun`
- `MarketResearchSource`
- `ExternalResearchCache`
- `NotificationLog`

Ignored repositories and deleted-from-view repositories are preserved so future scans remember the user's decisions.

## Safety

- `.env` is ignored by git.
- Generated reports and local SQLite databases are ignored by git.
- Secret-like setting keys are blocked from SQLite settings.
- GitHub tokens, OpenAI keys, Discord webhooks, and OAuth credentials are never shown raw in the UI.
- README and external source text are treated as untrusted text.
- RepoRadar does not clone or execute discovered repositories.
