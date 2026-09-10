# Lexi!

A modern, offline-first **PWA** for turning vocabulary lists into interactive
study sessions. Build dictionaries as language pairs, practice with flashcards
and quizzes, and keep everything in your browser — no account needed.

## Features

- **Dictionaries** — create lists for any language pair (source → target), favorite, archive, and search them
- **Add words** — each word has a source term and a translation, plus optional grammar, example, group, and notes
- **Study sessions** — flashcards, multiple choice, grammar, and typing modes, in either direction, on a spaced-repetition schedule
- **Track progress** — sessions record your answers; summaries show words reviewed and accuracy, and weak words get scheduled again sooner
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

## Dictionary store

The **Store** button on the Dictionaries tab lets users browse prebuilt
dictionaries published in [`store/dictionaries.txt`](./store/dictionaries.txt).
The app fetches that file from GitHub at runtime, so adding a line publishes a
new entry — no app release needed.

Each line has exactly six comma-separated fields:

```
"name of dictionary", language 1, language 2, link, link type, author
```

- **name** — the dictionary title. Wrap it in double quotes when it contains a
  comma (`"German basics, A1"`); quotes are optional otherwise. Inside a quoted
  name, `""` means a literal `"` character.
- **language 1 / language 2** — ISO 639-1 codes, case-insensitive (`EN`, `bg`,
  …). Supported codes: `en bg de es fr it pt ja zh ru nl pl tr sv ar`.
  They must be valid codes and different from each other.
- **link** — a public Google Sheets share link (type `sheet`, shared as
  “Anyone with the link can view”) or a direct TSV file link (type `tsv`).
- **link type** — exactly `sheet` or `tsv`.
- **author** — who published the list.

Lines starting with `#` and empty lines are ignored; lines with the wrong
field count, unknown language codes, or an unknown link type are skipped.

Example:

```
"German basics, A1", DE, BG, https://docs.google.com/spreadsheets/d/REPLACE_WITH_ID/edit, sheet, Jane Doe
```

## Security

See [SECURITY.md](./SECURITY.md). In short: no account, data stays in your
browser, cloud sync uses your own Dropbox, and all third-party API secrets live
in Vercel environment variables — never in this repository.

## Tech Stack

React 19 · TypeScript · Vite · TailwindCSS v4 · Zustand · sql.js (SQLite) ·
Drizzle ORM · zod · exceljs · papaparse · React Router · Vitest · Playwright

## License

[MIT](./LICENSE)