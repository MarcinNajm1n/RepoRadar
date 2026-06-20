# RepoRadar Interface System

Status: milestone 1 foundation.

## Intent

RepoRadar is used by a developer or technical founder who wants to scan GitHub movement, compare repositories, convert signals into ideas, and keep local follow-up tasks under control. The system should feel like a local research console: precise, compact, calm, and optimized for repeated scanning.

## Domain Exploration

- Radar sweep: fresh discoveries, alerts, and recency.
- Repository ledger: saved/read/ignored memory and historical snapshots.
- Signal strength: trend score, hot state, stars, forks, freshness, topic match.
- Evidence trail: README, metadata, reports, sources, and market notes.
- Local workbench: no SaaS account, no team workspace, no cloud dependency.
- Idea funnel: candidates, full ideas, saved ideas, dismissed ideas.

## Color World

- Graphite shell: GitHub-like code surface and local terminal backdrop.
- Paper-white panels: readable reports and long descriptions.
- Signal green: scan action, positive momentum, primary focus.
- Amber caution: missing history, stale data, uncertain evidence.
- Blue system state: informational metadata and neutral machine output.
- Red destructive state: ignored, dismissed, prune, and delete actions.

## Signature

Use a signal ledger pattern: compact rows/cards with tabular numbers, concise evidence/status badges, and a stable left navigation that reads like a radar log. The product should be identifiable from repo names, score chips, local status memory, and action counts even without the RepoRadar logo.

## Replacing Defaults

- Generic SaaS sidebar -> local radar ledger with repo and ideas sections from one canonical tab source.
- Decorative cards -> low-contrast surface layers with clear metadata density.
- Colorful dashboard metrics -> restrained tabular signal indicators and semantic badges.
- Marketing copy -> Polish task/action labels focused on scanning and decisions.

## Tokens

Use semantic tokens rather than raw colors in component code.

Surfaces:
- `surface.canvas`: full app background.
- `surface.panel`: primary cards, top bar, sidebar panel.
- `surface.raised`: selected segmented controls and shallow lifted areas.
- `surface.inset`: metrics, empty states, messages, and input interiors.
- `surface.overlay`: dialogs and popovers.

Text:
- `foreground`: primary reading text.
- `foreground-secondary`: supporting copy.
- `foreground-tertiary` / `muted-foreground`: metadata and quiet labels.
- `foreground-muted`: disabled or low-priority hints.

Borders:
- `border-subtle`: normal separation.
- `border`: legacy/default separation.
- `border-strong`: emphasized separation.
- `focus` / `ring`: keyboard focus and active control outline.

Controls:
- `control`: input/select background.
- `control-border`: input/select border.

Semantic colors:
- `primary`: signal green and primary actions.
- `success`, `warning`, `info`, `destructive`: status and risk language.

Motion:
- `duration-fast`: hover/focus micro-interactions.
- `duration-base`: menu and panel changes.
- `duration-slow`: larger state transitions.
- `ease-interface`: decelerated product UI easing.

## Layout

- `AppShell` owns the page background, max width, responsive padding, sidebar, and mobile section switcher.
- `Sidebar` uses the same product token system and reads `navigation.ts`; do not duplicate tab lists.
- `TopBar` is a working header, not a hero. It carries current tab label, scan status, actions, and compact metrics.
- Cards and panels should use 8px radius or less unless an existing primitive already defines otherwise.

## Navigation Source

`navigation.ts` preserves all active tabs:

- Repo: `radar`, `library`, `new`, `saved`, `read`, `ignored`, `tasks`, `weekly`, `old`, `settings`.
- Ideas: `candidates`, `ideas`, `savedIdeas`, `dismissedIdeas`.

Use `tabs`, `getTabsForSection`, `getTabLabel`, and `defaultTabForSection` instead of local tab arrays.

## Component Rules

- Keep controls compact and text safe for long GitHub names.
- Use tabular numbers for counts, scores, stars, forks, and deltas.
- Use icons only where they help identify actions or navigation.
- Use semantic badges for status and score meaning.
- Empty/loading/error/success states should be explicit and local-first.
- Treat external repository text as untrusted display content.

## Accessibility

- Every interactive element needs visible focus via the `focus` token.
- Do not remove native keyboard behavior from buttons, links, inputs, or selects.
- Keep touch targets at least 36px high in dense areas.
- Preserve readable contrast in both light and dark color schemes.

## Polish Copy

User-facing UI labels are Polish. Code identifiers stay English. Prefer concise action labels tied to the user's decision: scan, save, read, ignore, promote, export, report.
