# Lexi!

A modern, offline-first **PWA** for turning vocabulary lists into interactive
study sessions. Build dictionaries as language pairs, practice with
flashcards and quizzes, and keep everything in your browser — no account needed.

## Features

- **Dictionaries** — create lists for any language pair (source → target), favorite, archive, and search them
- **Study sessions** — flashcards, multiple choice, grammar, and typing modes, in either direction
- **Spaced repetition** — each word is scheduled for review; sessions show your accuracy and weak spots
- **Import & export** — add words from a `.csv`/`.xlsx` file, a public Google Sheet, or a TSV link, and export any dictionary to CSV
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

## Tech Stack

React 19 · TypeScript · Vite · TailwindCSS v4 · Zustand · sql.js (SQLite) ·
Drizzle ORM · React Router · Playwright

## License

Private project.