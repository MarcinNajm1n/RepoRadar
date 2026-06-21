# RepoRadar Frontend Visual QA Checklist

Use this checklist for desktop visual QA before shipping frontend changes.

## Scope

- Desktop widths: 1280 px, 1440 px, 1920 px.
- Themes: light and dark.
- Primary tabs: Radar dzisiaj, Biblioteka, Nowo znalezione, Zapisane, Przeczytane, Ignorowane, Zadania, Pomysly, Raporty tygodniowe, Stare repo, Ustawienia.
- Browser console: no new errors or hydration warnings caused by the change.

## Repository Edge Cases

- Very long owner/name pair stays inside the row and details panel.
- Very long Polish summary clamps without horizontal overflow.
- Missing summary falls back to clear empty copy.
- Many topics wrap without shifting row metrics.
- Missing language shows `brak`.
- Archived and ignored repositories keep visible status badges.
- No 24h/7d growth shows neutral/missing copy rather than fake growth.
- High trend score remains readable in both themes.

## Interaction Checks

- Sidebar navigation works at all desktop widths.
- Repository row expands and collapses without layout jump.
- Full report, quick brief, GitHub link, status actions, idea creation and task actions remain reachable.
- Undo feedback appears after save/read/ignore status actions and can restore the previous status.
- Command Palette opens with `Ctrl+K` or `Cmd+K`.
- Repository search focuses with `/` on repository-list tabs.
- Keyboard focus rings are visible in both themes.

## States

- Repository list skeleton appears while filters or pagination load.
- Report skeleton appears while report or quick brief is generated.
- Empty list states provide a next action.
- Scan failure panel shows cause and recovery actions.
- Reduced motion does not leave critical UI hidden.

## Screenshot Set

Capture or inspect:

- 1280 light: Radar dzisiaj, Biblioteka, Nowo znalezione.
- 1280 dark: Biblioteka with expanded row and details panel.
- 1440 light: Command Palette and report loading state.
- 1440 dark: Zadania and Ustawienia.
- 1920 light: Radar dzisiaj full dashboard.
- 1920 dark: repository comparison panel with 2-3 selected repos.
