# Stage 4 Implementation Plan

## Scope

Implement `Radar dzisiaj`, an action queue, deterministic briefings, maintenance/export actions, safer settings, portfolio documentation, and CI. Work in small phases with verification, security review, commit, and push after each completed phase.

## Phase 0 - Documentation Gate

- Add this implementation plan and the product spec.
- Confirm safe defaults: secrets only in `.env`, auto research disabled by default, no fake data.
- Verify docs are staged alone before committing.

## Phase 1 - Data Model And Backend Data

- Add an additive Prisma `ActionItem` model linked optionally to `Repository`, `Idea`, and `Report`.
- Add typed action item constants for type and status.
- Extend dashboard types with `radarToday`, `actionItems`, `settingsSummary`, and `notificationSummary`.
- Reuse existing `NotificationLog` and `ExternalResearchCache`.
- Add typed settings helpers for string, number, boolean, and JSON values.
- Add backend selection logic for five-item `Radar dzisiaj` sections.

## Phase 2 - Server Actions And Workflows

- Add action queue server actions: create, update, complete, snooze, dismiss.
- Add deterministic daily briefing generation and store it as report type `daily_briefing`.
- Add maintenance actions for expired external cache and old notification logs.
- Add CSV export for ideas.
- Add test notification action using existing notification channels.
- Keep full research and AI briefings manual.

## Phase 3 - Frontend UX

- Make `Radar dzisiaj` the first view.
- Add `Zadania` as a workflow area.
- Add quick actions for task creation and repository/idea workflows.
- Expand `Ustawienia` into operational sections without exposing raw secrets.
- Add dark mode polish using existing styling patterns.
- Preserve the existing list-first repository UI.

## Phase 4 - Portfolio Docs And CI

- Update README and add user guide, security guide, roadmap, and architecture notes.
- Add `.github/workflows/verify.yml` for Windows verification.
- Ensure CI uses placeholders and does not require real secrets.

## Verification

- Run focused tests for touched behavior.
- Run `npm run db:generate` when Prisma changes.
- Run `npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`, and `npm run security:check` before release-level commits when practical.
- Before every commit inspect `git status`, `git diff`, staged files, and staged diff for secrets.
- Push only after the phase passes verification and security checks.

## Files Not To Stage

- `.env`
- `AGENTS.md`
- `.githooks/`
- `.obsidian/`
- `graphify-out/`
- `.graphifyignore`

