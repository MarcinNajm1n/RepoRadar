# RepoRadar Product Spec

## Objective

RepoRadar is a local-first decision tool for finding GitHub repositories that can lead to useful learning, portfolio material, and monetizable B2B/devtools/SaaS ideas. The product should favor fewer, higher-quality candidates over broad repository volume.

## Primary User

The primary user is a solo builder who wants a daily workflow for discovering AI, LLM, MCP, agent, automation, RAG, local AI, and developer tooling repositories worth reading, saving, researching, or turning into an MVP idea.

## Stage 4 Workflow

1. Open `Radar dzisiaj` as the first screen.
2. Review the strongest repositories, new gems, high initial momentum repositories, business candidates, ideas, action queue, scan changes, and system alerts.
3. Use quick actions to save, read, ignore, create a task, check a demo, clone later, validate a market, or expand an idea.
4. Generate full reports and full research manually only.
5. Use daily briefings and weekly reports to decide what to read, reject, or develop next.

## Success Criteria

- `Radar dzisiaj` helps decide the next 3-5 actions without opening every tab.
- Business candidates are ranked by deterministic opportunity and evidence signals, not raw hype.
- Full OpenAI usage is explicit, cached, and never automatic for every repository.
- The app is portfolio-ready: clear docs, local setup, CI, safe defaults, and no fake screenshots.
- Ignored and deleted-from-view repositories remain remembered locally.

## Side Hustle Criteria

RepoRadar should prioritize repositories and ideas that show:

- real developer or business pain,
- time or cost savings,
- B2B/devtools/IT workflow fit,
- credible evidence from independent sources,
- feasible MVP scope,
- clear risk or competition notes,
- practical first implementation steps.

## Cost And Secret Rules

- Secrets live only in `.env` and are never stored in SQLite settings.
- Settings UI may show whether secrets are configured and masked targets, but not raw values.
- Auto `light` research is disabled by default.
- Full research, full reports, and AI briefings run only after explicit user action.
- The exposed OpenAI key must be rotated before any further API use.

## Non-Goals

- No public SaaS, auth, billing, team accounts, or Supabase requirement.
- No mass cloning repositories.
- No fake data or fake screenshots without explicit approval.
- No automatic email sending as core behavior.
- No X/Twitter or LinkedIn direct integration in Stage 4.

