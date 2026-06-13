# RepoRadar Architecture

RepoRadar is intentionally local-first.

## Main Layers

- `src/app` - Next.js pages, layout, server actions.
- `src/components` - UI components and the main repository dashboard.
- `src/lib/db` - Prisma client and database access helpers.
- `src/lib/github` - GitHub REST client, queries, deduplication, scanner.
- `src/lib/scoring` - deterministic growth and trend score logic.
- `src/lib/openai` - prompt builders, Responses API client, report/idea generation.
- `src/lib/reports` - daily, weekly, and repo markdown writers.
- `src/lib/scheduler` - local scheduler helpers.
- `src/lib/notifications` - high-value threshold logic for MVP badges/reports.

## Data Flow

1. GitHub scan finds repository candidates.
2. Candidates are deduplicated and upserted.
3. RepoRadar writes a new snapshot.
4. Growth is calculated from older local snapshots.
5. Trend score is calculated deterministically.
6. Optional OpenAI summaries are generated only for high-value candidates.
7. Daily/weekly markdown reports are written locally.

## Safety

- `.env` is ignored by git.
- Generated reports are ignored by git.
- GitHub tokens and OpenAI keys are never logged.
- README text is treated as untrusted input and is only passed as text context.
- Full reports and ideas are on-demand.
