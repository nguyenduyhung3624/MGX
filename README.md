# MGX

**MGX** is a responsive manga discovery and reading web app powered by the [MangaDex API](https://api.mangadex.org/docs/). Browse titles, read chapters, keep a personal library, and optionally sign in with an MGX account.

> MGX is an independent, unofficial project and is not affiliated with or endorsed by MangaDex.

## Features

- **Discover manga:** popular titles, latest updates, recommendations, seasonal picks, and recently added manga.
- **Search and browse:** find titles and open manga details and chapter lists.
- **Read your way:** switch between scrolling and click-to-advance reading modes, with previous/next chapter navigation.
- **Personal library:** save manga and continue from your last recorded reading position.
- **Optional account:** register and sign in through Supabase Auth.
- **Backup and restore:** export and import your library as JSON.
- **Responsive layout:** desktop and mobile navigation, plus light and dark themes.
- **Image delivery:** serverless proxies for MangaDex covers and chapter pages, with nearby-page preloading in the reader.

Manga and chapter availability depend on MangaDex and the translations available through its API. Discovery feeds are based on MangaDex queries; section names do not necessarily correspond to official MangaDex categories.

## Tech stack

- React 19, TypeScript, Vite 8
- React Router 7
- TanStack Query 5
- Axios
- Tailwind CSS 4 and custom CSS
- Vercel serverless functions for API and image proxying
- Supabase JavaScript client for optional account authentication

## Getting started

**Requirements:** Node.js and npm. Node.js 24 is recommended for the included tests.

```bash
git clone https://github.com/nguyenduyhung3624/MGX.git
cd MGX
npm install
npm run dev
```

Vite serves the frontend locally. The app also uses Vercel routes under `/api/*`, so a plain `npm run dev` session does **not** run those serverless functions. For end-to-end development with the API and image proxies, use a Vercel-compatible local environment or deploy the project to Vercel.

### Optional account authentication

Install the Supabase client:

```bash
npm install @supabase/supabase-js
```

MGX account registration and sign-in use Supabase Auth. Create a local `.env` file (or configure the same values in Vercel) with:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Use the Supabase publishable key in the frontend. Never expose a Supabase secret or service-role key in the browser. If email confirmation is enabled in Supabase Auth, registration asks the reader to confirm their email before signing in.

Signed-in readers can sync saved manga and reading progress through Supabase. Run `supabase/migrations/20261005_cloud_library.sql` once in the Supabase SQL Editor (or through the Supabase CLI) to create the required `profiles`, `user_library`, and `reading_progress` tables with Row Level Security.

### Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and create a production build |
| `npm run preview` | Preview the production frontend |
| `npm run lint` | Run Oxlint |
| `npm test` | Run the Node.js test suite |

## Local reading library

Use the save button on manga listings or details to add a title to your library. The `/library` page lists saved manga and supports JSON backup export/import. No account, MangaDex token, or separate database is required.

Library data is cached in your browser's `localStorage` under `mgx-library-v1`. Signed-in readers also sync saved manga and reading progress to Supabase; signed-out readers remain local-only. Clearing site data removes the local cache, while signed-in data can be restored from the account on the next successful sync.

Import merges saved titles by MangaDex ID and keeps the newer reading position. Invalid backups leave existing data unchanged. Current limits are 2,000 saved titles and a 2 MB backup file.

The reader records the last chapter only after a page image loads successfully. Unavailable chapters or failed image requests do not advance your reading position. Removing a saved title does not erase its reading position.

## Deployment

The project is configured for Vercel, including serverless routes used to access MangaDex and proxy images. Connect the repository to Vercel and deploy using the project's configuration. If you use a private repository, ensure Vercel retains access to it.

## Credits and disclaimer

Manga metadata, chapter information, and images are provided by [MangaDex](https://mangadex.org/) and their respective contributors and rights holders. MGX does not claim ownership of third-party content. Please respect the original creators and MangaDex's terms of use.
## ATTENTION
If you are too lazy to pull or clone. Just click to this link : [https://mgx-cm.vercel.app/]
