# Household Money

Household finance app for two phones: an Android APK (Bia) and a home-screen web app on iPhone. Planning docs are in [docs/](docs/README.md).

Current state: **Plan 1 spikes**. The spike screens live under `src/app/spikes/`, the edge Worker under `edge/`, and results go in [src/spike-results.md](src/spike-results.md).

## Commands

| What | Command |
|---|---|
| App tests | `npm test` |
| Worker tests | `cd edge && npx vitest run` |
| Typecheck | `npx tsc --noEmit` |
| Dev server (web) | `npm run web` |
| Web build + service worker → `dist/` | `npm run build:web` |
| Serve the built web app locally with the production headers | `npm run preview` |
| Publish the web app | `npm run deploy` |
| Publish the edge Worker | `cd edge && npx wrangler deploy` |
| Android APK (EAS cloud build) | `npm run build:android` |
| Score screenshot extraction | `npx tsx scripts/score-extraction.ts spikes/screenshots` |

## One-time setup for the device checks

1. **Google Cloud project** (console.cloud.google.com):
   - Enable the Drive API, Google Calendar API and Google Picker API. Skip Gemini/Vertex AI here: in the Cloud console they ask for billing.
   - OAuth consent screen: External, in Testing mode, with both of your Google accounts added as test users. Scopes: `openid`, `email`, `drive.file`, `calendar.app.created`.
   - Create an OAuth client of type **Web application**. Add the redirect URIs listed in [.env.example](.env.example).
   - Create a browser API key restricted to the Picker API and the web app URL.
   - Get the Gemini key from Google AI Studio (aistudio.google.com → Get API key), not the Cloud console. The free tier needs no billing. It may sit in its own project; the Worker only needs the key.
   - Free-tier prompts may be used by Google to improve its products (spec §7.4). Real bank screenshots are real household data, so either turn on billing for that AI Studio project before scoring them (20 screenshots cost a few cents at most), or score only screenshots with names, account numbers and balances blacked out.
2. **Cloudflare** (free account): `npx wrangler login`. Live URLs: web app https://household-money.household-money-edge.workers.dev, edge Worker https://household-money-edge.household-money-edge.workers.dev.
   - Edge Worker: `cd edge`, then `npx wrangler secret put GOOGLE_CLIENT_SECRET` and the same for `GEMINI_API_KEY`, then `npx wrangler deploy`. Run these from `edge/` so they use `edge/wrangler.jsonc`, not the web app's root `wrangler.jsonc`. `GOOGLE_CLIENT_ID`, `GEMINI_MODEL` and `ALLOWED_ORIGINS` live in `edge/wrangler.jsonc`.
   - Web app: `npm run deploy` from the repo root. It's a Worker serving static files (Cloudflare now creates Pages projects this way); config in `/wrangler.jsonc`.
3. **App config**: copy `.env.example` to `.env.local` and fill it in, then rebuild the web app. For the APK, set the same `EXPO_PUBLIC_*` values as EAS environment variables (`npx eas-cli env:create --environment preview`), because `.env.local` isn't uploaded to the cloud build.
4. **APK**: `npm run build:android` (needs a free Expo account), then download the APK from the link on the Samsung and install it.

Then work through each PENDING row in [src/spike-results.md](src/spike-results.md). Run every iPhone check from the home-screen icon, not from a Safari tab.
