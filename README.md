# LearnY!

LearnY! is a modern, offline-first **PWA** for turning vocabulary lists into
interactive study sessions. Import an Excel/CSV file or a photo of a textbook
page, review the detected words, fix mistakes, and start studying — no accounts,
no databases to manage.

This is a rewrite of two earlier projects:

- **deutsch** — web-based German vocabulary study app (flashcards, quiz, typing, grammar quiz)
- **image-to-excel** — Python tool that turns photos of handwritten vocabulary into structured Excel via OCR

Both are combined here into one seamless experience with a clean, modular
architecture.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Platform | Web / PWA (Vite) — installable, offline-capable |
| Frontend | React 19 + TypeScript |
| Styling | TailwindCSS v4 + shadcn/ui design tokens |
| State | Zustand |
| Database | SQLite in-browser via **sql.js** (WASM), persisted to OPFS |
| Schema / migration | Drizzle ORM (source of truth) |
| Cloud sync (optional) | Dropbox via PKCE OAuth, no server |
| Animations | Framer Motion |
| Testing | Vitest |

## Requirements

- Node.js 20+ and npm

## Development

```bash
npm install
npm run dev              # http://localhost:1420 (Vite)
```

## Sync (optional)

Connect your own Dropbox account to back up the SQLite database. No server or
app-level account is involved — the app talks to Dropbox directly with OAuth
PKCE and stores your data in a dedicated Dropbox app folder.

To enable sync:

1. Create a Dropbox app at https://www.dropbox.com/developers/apps with
   **App folder** access.
2. Copy `.env.example` to `.env.local` and set `VITE_DROPBOX_CLIENT_KEY` to
   your app's key.
3. Relaunch `npm run dev`, then use the **Connect Dropbox** button in the
   sidebar.

Sync is fully optional — the app works completely offline without it.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Run the app in dev mode |
| `npm run build` | Build the production PWA |
| `npm run preview` | Preview the production build |
| `npm test` | Run the unit test suite |
| `npm run test:e2e` | Run the browser (Playwright) end-to-end tests |
| `npm run db:generate` | Generate a Drizzle migration from the schema |
| `npm run db:studio` | Open the Drizzle schema browser |

## Project Structure

```
src/                   React frontend
├── components/        ui, layout, dictionary, study, import, stats, system
├── pages/             Home, Dictionary, Study, Statistics, Settings, Search
├── stores/            Zustand state (uiStore, syncStore, ...)
├── services/          business logic + data layer
│   ├── database.ts    sql.js + OPFS + migrations
│   └── sync/          cloud sync (types, providers, oauth, service)
├── db/                Drizzle schema + generated migrations
└── lib/               shared utilities

tests/                 Vitest unit tests
```

## Architecture

Clean layered architecture:

```
UI (React) → State (Zustand) → Services (logic) → SQLite (sql.js → OPFS)
```

- The **study engine** is UI-independent and exposes an SRS algorithm interface
  (SM-2, FSRS swappable later).
- Every major feature (OCR, importer, study engine, statistics, export, tech,
  settings) is its own module in `src/services/`.
- Cloud sync is behind a `CloudSyncProvider` interface, so Dropbox can be
  swapped for Google Drive or another service without touching the rest of the
  app.

## License

Private project.