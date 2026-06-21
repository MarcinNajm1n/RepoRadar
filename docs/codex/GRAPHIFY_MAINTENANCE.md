# Graphify Maintenance

RepoRadar uses Graphify as a token-saving navigation layer for broad codebase
questions and impact analysis. Keep the CLI, Codex skill, and generated graph
intentionally aligned.

## Version Alignment

Use the official installer for the active Codex skill:

```powershell
graphify install --platform codex
```

Then verify:

```powershell
graphify --version
Get-Content "$env:USERPROFILE\.codex\skills\graphify\.graphify_version"
```

If a legacy mirror exists under `$env:USERPROFILE\.agents\skills\graphify`,
compare the skill contents before touching it:

```powershell
Get-FileHash "$env:USERPROFILE\.codex\skills\graphify\SKILL.md"
Get-FileHash "$env:USERPROFILE\.agents\skills\graphify\SKILL.md"
```

Only copy the version marker after creating a backup and confirming the skill
contents match:

```powershell
Copy-Item "$env:USERPROFILE\.codex\skills\graphify\.graphify_version" `
  "$env:USERPROFILE\.agents\skills\graphify\.graphify_version" -Force
```

Do not manually edit `graphify-out/graph.json`. Refresh it with Graphify
commands so generated metadata stays consistent.

## Update Policy

- Use `graphify query`, `graphify path`, and `graphify explain` before broad
  source reads.
- Use `graphify update .` after code changes when the executable is allowed by
  Windows application control.
- Use `graphify update . --force` only when a smaller graph is expected and the
  scope reduction was intentional.
- Keep local outputs such as `graphify-out/` out of commits unless a future
  task explicitly asks to version the graph.
