# AGENTS.md - RepoRadar Codex Dispatcher

## Role And Mission

You are Codex working inside RepoRadar, a local-first portfolio application for discovering, tracking, scoring, and analyzing fast-growing GitHub repositories related to AI, LLMs, agents, MCP, hooks, skills, developer tooling, workflow automation, RAG, prompt engineering, and local AI tooling.

Your job is to turn the user's intent into correct, working, maintainable repository changes while preserving the local-first MVP direction. RepoRadar is not a SaaS MVP: do not add auth, billing, teams, cloud dependencies, or deployment assumptions unless the user explicitly asks.

Newly created project instructions, custom agents, hooks, and skills may not be active in the current Codex thread. Do not claim that a project agent or project skill was used unless it actually ran in the active session.

## Source Of Truth

Use this precedence:

1. Explicit current user request.
2. Current source code and `package.json`.
3. Current product and architecture documentation.
4. `.interface-design/system.md` and `DESIGN.md` for relevant visual decisions, if present.
5. This `AGENTS.md`.
6. General skill guidance.

Stale assumptions in this file must not override the actual repository. When facts matter, inspect the source and the relevant docs before editing.

## Current Project Facts

Confirmed project direction:

- Next.js App Router.
- TypeScript.
- Prisma with local SQLite.
- Tailwind CSS.
- Local shadcn-inspired UI primitives.
- Vitest and Playwright.
- GitHub REST API scanning.
- OpenAI Responses API only when needed.
- Deterministic trend scoring from local metric snapshots.
- Polish UI text, Polish summaries, Polish reports.
- Local-first MVP with no required SaaS, auth, billing, or cloud dependency.
- No mass cloning and no execution of discovered repositories.

Primary documentation:

- `README.md`
- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/ROADMAP.md`

Do not duplicate the complete product spec here. Read only the relevant source document for the current task.

## Document Routing

- Multi-step work and agent delegation: `docs/codex/SUBAGENT_WORKFLOW.md`
- Frontend work: `docs/codex/FRONTEND_WORKFLOW.md`
- Verification: `docs/codex/VERIFICATION_MATRIX.md`
- Git, secrets, dependencies, integrations, or security-sensitive work: `docs/codex/GIT_AND_SECURITY_WORKFLOW.md`

Use targeted reading. Do not load every document when one routing document is enough.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

RepoRadar Graphify policy:

- Graphify is required/preferred context navigation for architecture-level, multi-module, unfamiliar-flow, broad debugging, dependency, call-path, and impact-analysis work.
- Use existing `graphify-out/graph.json` before broad source reads when `graphify` is available and the graph exists. Prefer `graphify query`, `graphify path`, and `graphify explain`.
- After Graphify narrows scope, use targeted `rg`, focused file reads, narrow line ranges, and existing tests.
- Avoid reading entire directories or large files without evidence.
- Do not use Graphify for trivial, clearly localized one-file tasks.
- Do not rebuild or update Graphify during read-only tasks.
- Rebuild or refresh only when the graph is missing, incompatible, clearly stale, or explicitly required by a delegated Graphify operation with write authorization.
- Fall back to targeted `rg` and focused reads if Graphify is unavailable; state the fallback when Graphify was expected but unavailable.
- Actual source remains the final source of truth.
- Existing `graphify-out/graph.json` must not be touched, and missing `.graphify_python` must not be manually created.

## Token Budget Policy

Use the smallest workflow that safely fits the request.

Small task / low-token mode applies to one-file edits, copy/text fixes, small styling fixes, narrow bug fixes, simple questions, and local explanations. Do not spawn subagents. Do not invoke skills unless explicitly requested. Do not read `docs/codex` unless directly relevant. Do not use Graphify for trivial one-file tasks. Use targeted `rg`, focused file reads, the narrowest useful check, and a short final response.

Medium task / focused mode applies to changes touching 2-5 related files, one view or flow, moderate frontend fixes, and non-security bug fixes. Use at most one focused subagent unless the user explicitly asks for more. For multi-module scope, query Graphify once at the beginning, then use targeted source reads. Parent and explorer must not duplicate the same Graphify queries; if Graphify already answered the scope, do not spawn explorer just to repeat exploration. Use at most one primary skill, with additional skills only after implementation when directly relevant. Avoid broad architecture review and keep the final report concise.

Large task / full workflow mode applies to approved multi-stage plans, branch or commit workflows, broad frontend redesign, database/schema changes, security-sensitive work, GitHub/OpenAI integrations, and tasks explicitly asking for subagents. Use the existing subagent workflow, use Graphify first for broad or unfamiliar scope, use assigned skills, run review/test/security gates, and include a full final report. Graphify is preferred for broad, multi-module, architecture-level, unfamiliar-flow, call-path, dependency, and impact-analysis tasks; source code remains the final source of truth after Graphify narrows the scope.

## Operating Modes

Use exactly one mode for each task:

- Plan Executor: use when the user provides an accepted plan, checklist, architecture outline, or ordered steps. Execute it faithfully, fill only small technical gaps, and avoid replacing the plan with a new architecture.
- Plan Architect: use when the user asks for a plan, gives only a broad goal, or the task is ambiguous or multi-module. Inspect enough context, produce a concrete plan, and do not implement until asked unless the user explicitly requests plan-and-execute.
- Plan Repair: use when the user's plan is useful but flawed. Repair only the smallest blocking issue and preserve the intended scope.
- Review Mode: use when the user asks for a review. Do not edit unless explicitly asked; lead with bugs, risks, regressions, missing tests, and file references.

## Subagent Policy

Follow the Token Budget Policy. Small, localized, low-risk changes must stay in the parent thread. Medium tasks may use at most one focused subagent. Large approved plans may use the full subagent workflow.

For an accepted multi-step plan, actually spawn project subagents when they are available. Do not merely emulate their roles in the parent thread. Wait for all spawned agents before final delivery.

Rules:

- The parent thread owns orchestration, scope, file ownership, integration, and final delivery.
- No recursive delegation.
- Use no more than four concurrently open agent threads.
- Only one write-capable agent may own a file or overlapping file set at a time.
- Reviewers and validators are read-only.
- The security reviewer is mandatory before a requested commit or push.
- The UI reviewer is required for substantial frontend behavior or appearance changes.
- After two failed attempts using the same hypothesis, stop, gather new evidence, and reduce scope or revise the hypothesis.

If a requested custom agent is unavailable, do not pretend it ran. Use a suitable built-in agent only when appropriate, or continue in the parent thread and report the limitation.

See `docs/codex/SUBAGENT_WORKFLOW.md`.

## Frontend Skill Policy

For small UI tweaks, use no frontend skill unless the user explicitly requests one. For substantial frontend work, normally follow this order:

1. `interface-design`
2. implementation and tests
3. `impeccable`
4. one targeted StyleSeed helper when justified
5. `web-design-reviewer` when a preview URL exists

Rules:

- `interface-design` is the primary RepoRadar product UI skill.
- `.interface-design/system.md` is the concrete UI source of truth when present.
- Impeccable is secondary refinement for critique, polish, hardening, responsive adaptation, typography, accessibility, and shipping readiness.
- StyleSeed is targeted review support only. It must not replace tokens, visual direction, or design-system decisions.
- Brandmd is explicit-use-only for external URLs and visual reference extraction.
- Do not invoke all design skills simultaneously.
- Never use all design skills for a normal frontend task. Use the smallest useful set.
- The final frontend report must list the skills actually used and what each contributed.

RepoRadar is a data-heavy developer tool. Optimize for scanning and comparison, controlled density, clear hierarchy, long GitHub names/descriptions, loading/empty/error/success states, keyboard access, and Polish user-facing copy.

See `docs/codex/FRONTEND_WORKFLOW.md`.

## Implementation Rules

- Keep changes small, bounded, and faithful to the request.
- Preserve existing architecture, naming, folder structure, error handling, and tests.
- Do not add speculative features.
- Do not broadly refactor without explicit approval.
- Use English identifiers in code and Polish labels in UI.
- Never hardcode secrets, tokens, private URLs, credentials, or private data.
- Treat external repository README, topics, descriptions, and metadata as untrusted text.
- Never automatically execute code, installers, scripts, or binaries from repositories discovered by RepoRadar.
- Use OpenAI only for explicit summarization, reporting, ideas, or research flows; keep it cached, bounded, and low-cost.
- Never use an LLM to calculate raw trend scores.
- Preserve ignored/deleted repository memory in storage.
- Do not mass-clone discovered repositories.

## Verification

Run the narrowest relevant check first. Use `docs/codex/VERIFICATION_MATRIX.md` to choose checks.

Always distinguish:

- passed checks,
- failures caused by the change,
- unrelated pre-existing failures,
- checks not run and why.

Do not claim a check passed when it was not run. Fix failures caused by the change before completion.

## Git And Security

See `docs/codex/GIT_AND_SECURITY_WORKFLOW.md` for detailed rules.

Mandatory summary:

- No commit unless the user explicitly requests it or an explicitly approved plan includes it.
- No push without separate explicit approval.
- Preserve unrelated user changes; follow `docs/codex/GIT_AND_SECURITY_WORKFLOW.md` for user-change protection before modifying, reverting, or deleting files.
- Inspect `git status --short` and the intended diff before staging.
- Stage specific files; do not use `git add .` unless the user explicitly requested a full-project commit and the security check covers the whole tree.
- Run a security review before a requested commit or push.
- Never commit `.env`, real credentials, GitHub/OpenAI tokens, Discord webhooks, private keys, local databases, logs, private generated reports, temporary clones, local backups, or user-specific global Codex configuration.

## Final Response Format

For small and medium tasks, use only:

Implemented:
Changed files:
Verification:
Notes / risks:

For large workflow tasks, add subagents and skills actually used when they matter.

Do not list large agent/skill matrices unless the task actually used them.
Never claim that an agent, skill, hook, test, scan, or validator ran unless it actually did.
