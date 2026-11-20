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
| Serve `dist/` locally with the production headers | `npx --prefix edge wrangler pages dev dist` |
| Android APK (EAS cloud build) | `npm run build:android` |
| Score screenshot extraction | `npx tsx scripts/score-extraction.ts spikes/screenshots` |

## One-time setup for the device checks

1. **Google Cloud project** (console.cloud.google.com):
   - Enable the Drive API, Google Calendar API, Google Picker API and the Gemini API (Generative Language API).
   - OAuth consent screen: External, in Testing mode, with both of your Google accounts added as test users. Scopes: `openid`, `email`, `drive.file`, `calendar.app.created`.
   - Create an OAuth client of type **Web application**. Add the redirect URIs listed in [.env.example](.env.example).
   - Create a browser API key restricted to the Picker API and your Pages URL.
   - Create a Gemini API key (AI Studio). Free tier is fine for the spike, but use only your own test screenshots until the paid tier is on.
2. **Cloudflare** (free account): `npx --prefix edge wrangler login`.
   - Worker: `cd edge`, then `npx wrangler secret put GOOGLE_CLIENT_ID`, the same for `GOOGLE_CLIENT_SECRET` and `GEMINI_API_KEY`, then `npx wrangler deploy`. Check `GEMINI_MODEL` and `ALLOWED_ORIGINS` in `edge/wrangler.toml` first.
   - Web app: `npm run build:web`, then `npx --prefix edge wrangler pages deploy dist --project-name household-money`.
3. **App config**: copy `.env.example` to `.env.local` and fill it in, then rebuild the web app. For the APK, set the same `EXPO_PUBLIC_*` values as EAS environment variables (`npx eas-cli env:create --environment preview`), because `.env.local` isn't uploaded to the cloud build.
4. **APK**: `npm run build:android` (needs a free Expo account), then download the APK from the link on the Samsung and install it.

Then work through each PENDING row in [src/spike-results.md](src/spike-results.md). Run every iPhone check from the home-screen icon, not from a Safari tab.
