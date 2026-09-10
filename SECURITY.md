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
- The only third-party integration is **optional cloud sync** to your own
  Dropbox (see above). Google Sheets / TSV imports are fetched directly from
  the browser to the public source — nothing passes through our servers.
- The Dropbox client key is a **public** PKCE client key by design (OAuth
  public clients are not secrets).

## Reporting a vulnerability

Please open a GitHub issue in this repository describing the problem. Do not
include secrets or live access tokens in the report.