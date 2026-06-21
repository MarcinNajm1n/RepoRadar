# RepoRadar Frontend Workflow

Use this source-of-truth priority:

1. Explicit current user instruction.
2. Current application behavior and source code.
3. `.interface-design/system.md`.
4. Root `DESIGN.md`, if present.
5. RepoRadar product documentation.
6. Root `AGENTS.md`.
7. General advice from skills.

## Skills

Small UI tweaks normally use no frontend skill. Use `interface-design` for a small tweak only when the user explicitly requests it.

`interface-design` is the primary product UI skill for substantial frontend work involving hierarchy, dashboard structure, filters, repository rows/cards, navigation, responsive layout, component patterns, and design-system decisions. Respect `.interface-design/system.md` and do not silently replace an established design direction.

`impeccable` is the secondary refinement skill. Use it after the main implementation for critique, polish, hardening, responsive adaptation, typography, accessibility, and shipping readiness. It must not override the established system without explicit approval.

StyleSeed is targeted support:

- `ss-feedback` for loading, empty, error, and success states.
- `ss-copy` for microcopy, labels, messages, tooltips, and empty-state text.
- `ss-a11y` for targeted accessibility review.
- `ss-review` for an additional compliance review.
- `ss-score` only for milestone-level assessment and prioritization.

Use StyleSeed only for targeted states, copy, accessibility, review, or milestone scoring. Use no more than one or two StyleSeed skills for a single stage. StyleSeed must not install skins, replace tokens, add a new theme, copy unrelated components, or imitate another company's brand.

`web-design-reviewer` is final browser-based visual QA for larger UI changes. Use it only when a working local or remote URL is available. Check the viewports relevant to the task and product scope. Check overflow, long names, descriptions, tags, filters, keyboard access, focus, touch targets, responsive behavior, and major states.

`brandmd` is case-specific only. Use it only when the user explicitly provides an external URL as a visual reference. Save extracted references under `docs/design-references/<reference-name>.md`. Never overwrite root `DESIGN.md` without explicit permission. Use external sites as inspiration, not as a brand to copy.

## Frontend Workflow By Size

Small UI tweak:

- Use no skill by default.
- Use only `interface-design` if explicitly requested.
- Run the narrowest useful check.

Medium frontend task:

- Use at most one primary skill, normally `interface-design`.
- Add a targeted StyleSeed skill only when the task is specifically about states, copy, or accessibility.
- Do not run Impeccable, StyleSeed, and `web-design-reviewer` as a bundle.

Large frontend task:

1. `interface-design`
2. implementation
3. project tests
4. `impeccable`
5. one targeted StyleSeed helper when justified
6. `web-design-reviewer` when a running URL exists

The final frontend report must list skills only when they were actually used.

## RepoRadar UI Principles

RepoRadar is a data-heavy developer tool. Optimize for scanning and comparison. Use clear hierarchy and controlled density. Preserve Polish UI text and English code identifiers. Avoid decorative SaaS cliches. Handle long GitHub data safely. Provide loading, empty, error, and success states. Preserve backend and API behavior unless the task requires changes.
