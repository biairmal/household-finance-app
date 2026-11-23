# AGENTS.md

**Before any change, read [CONTRIBUTING.md](CONTRIBUTING.md)** for the plan workflow, git conventions and Definition
of Done. This file holds the code rules, for humans and AI agents alike. The product and technical spec is
[docs/design/2026-11-20-household-finance-app-design.md](docs/design/2026-11-20-household-finance-app-design.md)
("the spec"); the build order is [docs/plans/2026-11-20-roadmap.md](docs/plans/2026-11-20-roadmap.md); the reasons
behind choices the spec left open are in [docs/DECISIONS.md](docs/DECISIONS.md).

## Orientation

Household Money is a finance app for one household on two phones: an Android APK (Expo, native SQLite) and an iPhone
home-screen web app (Expo web, SQLite in OPFS). The household's data lives in its own Google Drive as an op log; a
stateless Cloudflare Worker only brokers Google tokens and runs screenshot extraction with Gemini.

| Path | Role |
|---|---|
| `src/app/` | Expo Router routes only: every file is a screen, `_layout.tsx` files are navigators. `(tabs)` holds the v5 tab screens |
| `src/app/spikes/`, `src/spike/` | Plan 1 spike screens and their helpers (Google auth, Drive, prefs, token store). Frozen until Plan 5 replaces them; feature code does not import them |
| `src/domain/` | Pure TypeScript money logic and the op-log merge (Plan 2): plain functions over plain data, no React, no I/O |
| `src/store/` | The local op-log store over SQLite (Plan 3), selectors that feed screens from `src/domain/`, backup |
| `src/ui/` | Shared components and the theme used by the screens |
| `src/spike-results.md` | Plan 1 pass/fail record, one row per device check |
| `edge/` | The Worker (`/oauth/*`, `/extract`), its own `package.json`, vitest tests and `edge/wrangler.jsonc` |
| `wrangler.jsonc`, `public/_headers`, `workbox-config.js` | The web app's static-files Worker, COOP/COEP headers, service worker |
| `scripts/` | Extraction scorer (`score-extraction.ts`) and its test |
| `spikes/screenshots/` | Real bank screenshots for scoring, git-ignored except its README |
| `docs/` | Spec, plans, decisions ([docs/README.md](docs/README.md) is the index) |

Commands are in the [README](README.md#commands). The gate before calling anything done:

```bash
npx tsc --noEmit
npm run lint
npm test
cd edge && npx vitest run   # when edge/ changed
```

## Money and data rules

These come from the spec (§7.2, §8) and Plan 2's global constraints; the spec wins if they ever disagree.

- Balances, pocket amounts and totals are computed from records every time. Store movements (transactions,
  allocations, bill payments, balance checks), never a running number.
- Amounts are integer rupiah. `amount` is always positive; direction comes from `type`.
- Dates are Asia/Jakarta calendar strings `YYYY-MM-DD`. Do period maths on the strings, keeping them out of UTC
  `Date` objects.
- Records with `deletedAt` set are left out of every calculation.
- Transfers and credit-card payments are neither spending nor income.
- Display money as `Rp 2.700.000`; negatives use U+2212: `−Rp 2.340.000`.
- Each device writes only its own files (`ops/<deviceId>/<seq>.jsonl`). Merging ops in any order gives the same state.
- Duplicates merge automatically only on a matching bank reference or running balance; everything else is offered
  to the user as "Possible duplicate".

## Privacy and secrets

- The household owns its data: financial records go to its Drive, and the Worker stays stateless (no storage, no
  logging of request bodies, tokens or images).
- Real bank screenshots and their `got.json` stay in `spikes/screenshots/` (git-ignored). Test fixtures use
  invented data.
- Secrets go in `edge/.dev.vars` locally and `wrangler secret put` in production. Only `EXPO_PUBLIC_*` values,
  which ship to the client, go in `.env.local` and EAS environment variables.

## Expo and React Native

Expo ships breaking changes every SDK release; this repo is on SDK 58 (`expo` in `package.json`). Before writing
code that touches an Expo, EAS or React Native API, fetch https://docs.expo.dev/versions/v58.0.0/ or the index at
https://docs.expo.dev/llms.txt and follow it to the page you need.

- Add packages with `npx expo install <package>` (resolves SDK-compatible versions); in `edge/`, plain `npm install`.
- Navigation is Expo Router: import `Link`, `router`, `useLocalSearchParams` from `expo-router`. Non-route code lives
  outside `src/app/`.
- `ios/` and `android/` are generated (Continuous Native Generation). Configure native behaviour in `app.json` and
  config plugins.
- A library with native code needs a new development or EAS build; Expo Go only has its bundled modules.
- Platform-specific files use the `.web.ts` suffix (see `src/spike/token-store.web.ts`). Every feature works on both
  the Android APK and the iPhone home-screen app.
- Prefer Expo modules over third-party libraries. Run EAS as `npx eas-cli@latest <command>`.

## Code

- TypeScript strict. Tests sit next to the code in `__tests__/` or as `*.test.ts`, Jest for the app, vitest in `edge/`.
- New domain logic starts with a failing test, then the code.
- Comments describe the code, never its history (no task or plan IDs).
- When the spec is unclear, pick the simplest option consistent with it and add a row to `docs/DECISIONS.md`.
