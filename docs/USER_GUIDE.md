# RepoRadar User Guide

## Daily Workflow

1. Start the app with `npm run dev`.
2. Open `Radar dzisiaj`.
3. Review alerts, top repositories, business candidates, and active tasks.
4. Add tasks for repositories that need reading, demo checks, cloning later, or market validation.
5. Generate a full report only for repositories worth deeper research.
6. Promote only strong candidates into full ideas.
7. Generate a daily briefing or weekly report when you want a markdown summary.

## Tabs

- `Radar dzisiaj` - first decision screen.
- `Biblioteka` - full repository list with filters.
- `Nowo znalezione` - repositories first seen as new.
- `Zapisane` - saved repositories.
- `Przeczytane` - read repositories.
- `Ignorowane` - ignored/deleted-from-view repositories.
- `Zadania` - action queue.
- `Pomysly` - full ideas.
- `Kandydaci` - light business opportunity candidates.
- `Raporty tygodniowe` - weekly markdown reports.
- `Stare repo` - older repositories unless they became hot again.
- `Ustawienia` - diagnostics, safe toggles, maintenance, exports, and notifications.

## Repository Actions

- Save, read, ignore.
- Open GitHub link.
- Generate or regenerate a full Polish report.
- Create an idea from a repository.
- Run light opportunity research.
- Add action queue items: README, check demo, clone later, validate market.

## Action Queue

Tasks can be open, in progress, done, snoozed, or dismissed. Snoozed tasks reappear when the snooze date passes. Auto-created tasks use dedupe keys so repeated clicks do not create duplicates for the same repository/action pair.

## Reports And Exports

- Daily briefing: deterministic and local, no OpenAI.
- Weekly report: deterministic markdown summary.
- Full repository report: on demand, OpenAI-backed when configured.
- Ideas CSV: downloadable from the UI.
- Print/PDF: use the browser print dialog from report-friendly views.

## Cost Controls

- Auto light research is off by default.
- Full research and full reports are manual.
- OpenAI outputs are cached by input hash and model.
- External research is cached.
- Daily limits are visible in settings.
