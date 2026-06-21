# RepoRadar Subagent Workflow

The parent Codex thread is always responsible for understanding the user request, selecting the operating mode, determining scope, spawning subagents, preventing overlapping writes, integrating results, and final delivery.

Subagents are not a default for every request. Use the smallest workflow that safely fits the task.

Small tasks must not spawn subagents. A task is small when it is localized and low risk, such as a documentation correction, simple label change, clear one-file styling fix, narrow test update, or configuration typo.

Medium tasks may spawn one focused subagent when it materially reduces risk or resolves ownership. Use `reporadar_explorer` only when scope is unclear after targeted parent exploration, `reporadar_tester` for independent verification, or `reporadar_reviewer` when behavior changed.

Large approved plans may spawn multiple required subagents. Do not merely emulate their roles in the parent thread. Wait for all spawned agents before final delivery.

## Graphify Coordination

For broad, multi-module, unfamiliar-flow, call-path, dependency, or impact-analysis work, the parent should query Graphify once at the beginning and then use targeted source reads.

Do not spawn `reporadar_explorer` if Graphify already answered the scope in the parent thread. If an explorer is still useful, pass the parent Graphify result into the assignment and do not let the parent and explorer duplicate the same Graphify queries.

Source code remains the final source of truth after Graphify narrows the scope.

## Plan Quality Contract

Broad or multi-stage plans must be repository-grounded and cover:

- objective,
- assumptions,
- affected files or modules,
- ordered steps,
- database impact,
- frontend impact,
- GitHub API or external integration impact,
- OpenAI cost and cache impact,
- report generation impact,
- notification impact,
- security considerations,
- verification commands,
- acceptance criteria,
- risks and edge cases,
- explicit non-goals,
- proposed commit boundaries only when commits are requested.

Irrelevant categories may be omitted or marked N/A. Small tasks need short plans, not boilerplate. An accepted user plan must not be replaced with a new architecture; the planner may repair only blocking technical gaps while preserving the accepted scope.

## Large Accepted-Plan Workflow

1. Parent defines scope and file ownership.
2. Use Graphify first when the plan is broad, multi-module, or unfamiliar.
3. Spawn `reporadar_explorer` and/or `reporadar_planner` only for unresolved scope or planning questions.
4. Wait for their results.
5. Spawn `reporadar_implementer` with an explicit bounded scope.
6. Wait for implementation.
7. Spawn `reporadar_tester` and `reporadar_reviewer`.
8. Add `reporadar_security_reviewer` when security, external data, integrations, database migrations, dependencies, Git, secrets, or webhooks are involved.
9. Add `reporadar_ui_reviewer` when frontend behavior or appearance changed.
10. Wait for all review and verification results.
11. Parent integrates the findings and performs only the smallest necessary follow-up.

Do not spawn every agent for every task. Use no more than four concurrently open agent threads. Do not recursively spawn subagents. Never allow multiple agents to edit the same file or overlapping scope concurrently.

Validators and reviewers are read-only. A tester may create normal build or test artifacts but must not silently rewrite implementation.

## Retry Budget

After two unsuccessful attempts based on the same hypothesis, stop, gather new evidence, reduce scope or revise the hypothesis, and report the blocker if no safe next step exists.

## Missing Agents

If a requested custom agent is unavailable, do not pretend it ran. Use a suitable built-in agent only when appropriate, explicitly report the fallback, or continue in the parent thread and state the limitation.

## Final Reporting

Final responses must include:

Subagents actually spawned:
- agent name - responsibility - result

If none were spawned:

Subagents actually spawned:
- none - task was classified as small or parent-only

Do not count roles considered as agents actually spawned.
