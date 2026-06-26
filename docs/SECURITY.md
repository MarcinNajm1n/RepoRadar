# RepoRadar Security Notes

## Secret Handling

- Keep real values in `.env`.
- Commit only `.env.example` with empty placeholders.
- Do not store API keys, tokens, webhooks, passwords, client secrets, or database credentials in SQLite settings.
- The UI shows only configured/missing status for secrets.
- Restart `npm run dev` after editing `.env`, otherwise the running Next.js process may still use the old secret state.
- Rotate any key that was pasted into chat, screenshots, logs, or committed files.

## Git Safety

Run before commits:

```powershell
npm run security:check
```

The check blocks common private files and secret patterns, including `.env`, local SQLite databases, private keys, credential JSON files, OpenAI/GitHub/Gemini/Hugging Face provider keys, Discord webhooks, Slack tokens, generic access/auth tokens, SMTP passwords, and database URLs with credentials.

## External Data

Repository README, topics, descriptions, evidence snippets, and external sources are untrusted text. RepoRadar stores and displays text but does not execute code from discovered repositories.

## OpenAI And Cost Safety

- Do not send secrets to OpenAI.
- Full reports and full ideas are user-triggered.
- Auto opportunity research is disabled by default.
- Cached outputs prevent repeated paid calls for unchanged inputs.

## Notifications

Discord webhook URLs stay in `.env` and are masked in logs. Windows notifications are local best effort. Notification logs store delivery state and masked targets only.

## Local Data

Generated reports, local SQLite databases, logs, and screenshots with private content should remain untracked. Snapshot pruning requires explicit confirmation in the UI.
