# Lexi!

A modern, offline-first **PWA** for turning vocabulary lists into interactive
study sessions. Build dictionaries as language pairs, practice with flashcards
and quizzes, and keep everything in your browser — no account needed.

## Features

- **Dictionaries** — create lists for any language pair (source → target), favorite, archive, and search them
- **Add words** — each word has a source term and a translation, plus optional grammar, example, group, and notes
- **Study sessions** — flashcards, multiple choice, grammar, and typing modes, in either direction, on a spaced-repetition schedule
- **Track progress** — sessions record your answers; summaries show words reviewed and accuracy, and weak words get scheduled again sooner
- **Import & export** — add words from a `.csv`/`.xlsx` file, a public Google Sheet, a TSV link, or generate a draft list with **AI**, and export any dictionary to CSV
- **AI word generation** — describe a topic and the AI drafts a list with translations and example sentences (written in the target language); review, edit, and deselect rows before importing
- **Cloud sync (optional)** — back the database up to your own Dropbox via OAuth PKCE, no server involved
- **Offline-first** — everything runs locally in the browser (SQLite via sql.js), works fully offline, installable as a PWA
- **15 languages** — the whole UI translates; switch anytime from the top bar

## Development

```bash
npm install
npm run dev        # http://localhost:1420
npm run build      # production PWA build
npm run test       # unit tests
npm run test:e2e   # Playwright end-to-end tests
```

## Cloud sync setup (optional)

1. Create a Dropbox app at https://www.dropbox.com/developers/apps with **App folder** access.
2. Copy `.env.example` to `.env.local` and set `VITE_DROPBOX_CLIENT_KEY` (and `VITE_DROPBOX_APP_FOLDER` if you changed the folder).
3. Restart `npm run dev` and click **Connect Dropbox** in the sidebar.

Sync is entirely optional — the app works without it.

## AI word generation

The **Generate with AI** option in the Import dialog drafts a vocabulary list
for you, which you review, edit, and deselect before importing. Generation runs
through a Vercel serverless function (`api/generate-words.ts`) that calls
OpenRouter server-side, so your API key never reaches the browser. Example
sentences are generated in the **target language** of the dictionary.

1. Add `OPENROUTER_API_KEY` in **Vercel → Project → Settings → Environment Variables** (required).
2. Optional:
   - `AI_MODEL` — comma-separated model chain, tried in order until one returns a parseable list (defaults to free models).
   - `AI_DAILY_LIMIT` — free daily generations per device (default 3).
   - `AI_SUPPORTER_TOKEN` + `AI_SUPPORTER_DAILY_LIMIT` — a shared-secret higher tier.
   - Bind a **Vercel KV** store to make the daily per-device cap durable across instances (without it, an in-process counter is used).
   - `APP_URL` — the site URL, sent as the OpenRouter referer.
3. Deploy — Vercel auto-detects the `api/` directory.

Locally, `npm run dev` stubs the endpoint with deterministic sample words so the
UI can be developed and tested without a key.

## Security

See [SECURITY.md](./SECURITY.md). In short: no account, data stays in your
browser, cloud sync uses your own Dropbox, and all third-party API secrets live
in Vercel environment variables — never in this repository.

## Tech Stack

React 19 · TypeScript · Vite · TailwindCSS v4 · Zustand · sql.js (SQLite) ·
Drizzle ORM · zod · exceljs · papaparse · React Router · Vitest · Playwright

## License

[MIT](./LICENSE)