# RepoRadar Design Direction

RepoRadar is a local-first GitHub intelligence desk for a developer who scans fast-moving AI, LLM, agent, MCP, workflow automation, RAG, prompt, and local tooling repositories. The interface should feel like a quiet research console: dense enough for comparison, calm enough for repeated daily review, and explicit about local data, scoring, and next actions.

## Product Intent

- Human: a technical builder reviewing GitHub momentum, candidate ideas, and follow-up tasks between coding sessions.
- Primary job: decide what deserves attention now, what should be saved, what should become a business idea, and what can be ignored.
- Feel: graphite workbench, radar signal, local ledger. Precise, restrained, and scan-first.

## Design Signature

The signature pattern is the signal ledger: repository, idea, and task surfaces should read as entries in a live radar log. Numbers are tabular, metadata stays compact, and status badges explain why an item is visible without forcing a modal.

## Visual Direction

- Canvas: cool graphite-neutral application surface.
- Panels: subtle elevation by surface color and low-contrast borders, not heavy card stacks.
- Accent: signal green for primary action and live radar emphasis.
- Semantics: amber for caution, red for destructive, blue for informational system state, green for strong positive signals.
- Density: compact controls, predictable navigation, long-name safe layouts, no marketing hero sections.

## Navigation

`src/components/repo-radar/navigation.ts` is the canonical tab source.

- Repo section: `radar`, `library`, `new`, `saved`, `read`, `ignored`, `tasks`, `weekly`, `old`, `settings`.
- Ideas section: `candidates`, `ideas`, `savedIdeas`, `dismissedIdeas`.

Other shell components should consume this source instead of recreating tab arrays.

## Token Files

- Global CSS tokens live in `src/app/globals.css`.
- Tailwind token names live in `tailwind.config.ts`.
- Detailed component rules live in `.interface-design/system.md`.

## Reference Notes

The files in `docs/design-references/` are inspiration notes, not brand-copy instructions:

- `linear.md`: dense issue/workflow clarity.
- `vercel.md`: quiet deployment-console hierarchy.
- `stackshare.md`: comparison and stack metadata patterns.
