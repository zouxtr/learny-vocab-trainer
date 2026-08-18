# Security

## Model

- **No account, no server of its own.** The app runs entirely in your browser:
  dictionaries are stored locally in SQLite (sql.js) inside your device's
  storage. Nothing is sent anywhere unless you choose to.
- **Optional cloud sync** connects to your *own* Dropbox account via OAuth
  PKCE (public client). The app talks to Dropbox directly from the browser —
  there is no intermediate server, and Lexi! cannot read your account.

## Secrets

- No secrets are committed to this repository. Real values live only in
  developer-local `.env.local` files (gitignored) or in Vercel environment
  variables.
- The only feature that calls out to a third-party API is **AI word
  generation**, which runs through the `api/generate-words.ts` Vercel
  serverless function. The OpenRouter API key is read server-side from Vercel
  environment variables (`OPENROUTER_API_KEY`) and is never sent to the
  browser.
- The Dropbox client key is a **public** PKCE client key by design (OAuth
  public clients are not secrets).

## Reporting a vulnerability

Please open a GitHub issue in this repository describing the problem. Do not
include secrets or live access tokens in the report.