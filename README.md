# JotiGames Frontend (React)

This frontend is fully browser-side and talks directly to FastAPI.

## Documentation Note

Cross-system architecture, WS contracts, game flow/page documentation, and coding decisions are centralized in `docs/` at repository root.

Start at: `docs/README.md`

## Stack

- React + React Router
- Vite
- Existing JotiGames static assets (`public/assets`, `public/image`)

## Run

```bash
cd frontend
npm install
npm run dev
```

## Environment options

- `VITE_BACKEND_TARGET` (Vite dev proxy target, default `http://localhost:8000`)
- `VITE_WS_TARGET` (Vite WS proxy target, default `ws://localhost:8081`)
- `VITE_API_BASE_URL` (optional direct API base URL; leave empty to use same-origin/proxy)
- `VITE_LOCALE` (default `nl`)

## Internationalisation headers

- Selected locale is managed client-side with a language picker in the top navigation.
- Default locale is `nl`.
- Every API request sends:
	- `X-LANGUAGE: <locale>`
	- `X-Locale: <locale>`
	- `Accept-Language: <locale>`
- Frontend page text is translated client-side with separate locale files:
	- `src/i18n/locales/nl.json`
	- `src/i18n/locales/en.json`
- Locale files are loaded lazily at runtime via dynamic imports, so only the currently selected UI locale bundle is fetched.

## Migration approach

- Keep all UI logic in browser-side React components.
- Use `src/lib/api.js` as a single FastAPI integration point.
- Port each legacy Symfony/Twig page into a React route and call FastAPI endpoints directly.
- Existing style and script assets are available in `public/assets` for incremental migration.

## Current routes

- `/` landing page (public)
- `/about` about page (public)
- `/faq` FAQ page (public)
- `/register` account creation page (public)
- `/team-login` team login page (public)
- `/info/games/:slug` game information pages (public)
- `/login` user/team login
- `/games` user game list
- `/games/:gameId` game details (teams, members, chat)
- `/games/:gameId/overview` admin module overview (generic for most modules)
- `/games/:gameId/teams/:teamId/play` team module play page (generic)
- `/team` team-only entry page
- `/team/games/:gameId/play` team self play page

## Design parity

- The React app uses the same CSS class names and static assets from the legacy site so public and authenticated pages keep the old JotiGames visual style.

## Current module support

- Generic overview + bootstrap + submit action support for:
	- geohunter
	- blindhike
	- resource_run
	- territory_control
	- market_crash
	- crazy_88
	- courier_rush
	- echo_hunt
	- checkpoint_heist
	- pandemic_response
	- birds_of_prey
	- code_conspiracy
- Exploding Kittens support:
	- load team state
	- scan
	- resolve pending state
	- resolve specific action
	- play specific card
