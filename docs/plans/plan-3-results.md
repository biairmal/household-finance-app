# Plan 3 results: local store and screens

Branch `claude/plan-3-local-store-screens-973e24`. Fill in the device columns after running the steps below.

## Done on the computer (2026-11-21)

| Check | Result |
|---|---|
| `npx jest` | Pass, 105 tests |
| `npx tsc --noEmit` | Clean |
| `npx expo lint` | Clean |
| `npm run build:web` (local export, not deployed) | Pass. `dist/` has `picker.html`, `oauth-callback.html` and `sw.js`; `/spikes/*` are client routes in the single-page export |
| Every screen in the browser at 390 px and desktop width | Checked per task (see the commit messages) |

Not done here: no deploy and no EAS build. Both need your go-ahead, because the live PWA is the one the Drive spike test on the iPhone uses.

## Build and deploy commands (run them yourself, or tell me to)

APK for the Samsung (EAS cloud build, `preview` profile in `eas.json`):

```powershell
npx eas-cli@latest build -p android --profile preview
```

PWA: `npm run deploy` is not on this branch. It lives in your uncommitted Plan 1 changes in the main checkout (wrangler.jsonc and the deploy script). Once this branch is merged into main alongside those changes:

```powershell
npm run deploy
```

After deploying, check that `/spikes/drive`, `/spikes/auth` and `/picker.html` still load. Then open the home-screen app on the iPhone twice so the service worker picks up the new version (see Plan 1).

## Device checklist

Write Pass or Fail plus a note in each cell.

| # | Step | Samsung (APK) | iPhone (PWA) |
|---|---|---|---|
| 1 | Onboard with your name, then Start empty | | |
| 2 | Add two accounts, one pocket and five transactions, including one transfer and one paid from the pocket | | |
| 3 | Force-quit, turn on airplane mode, reopen: every number is the same | | |
| 4 | Settings → Back up now: the file saves (share sheet on Android, download on iPhone) and opens | | |
| 5 | Slow spots: cold start over 3 s? Daily list stutters? | | |
| 6 | Large text (Android: largest font size and display size): nothing clipped on Home, a transaction row or the amount pad (moved here from Task 13) | | n/a |
| 7 | Settings → Recently deleted: delete a transaction, restore it, totals come back | | |
| 8 | Drive spike still works (`/spikes/drive`, picker) | n/a | |

Date tested: ____

## Known issues to decide

- White text on the accent green `#0A9F5A` has a contrast ratio of 3.4:1. WCAG AA needs 4.5:1 for text under 18.7 px bold, and primary buttons use 15 px. The colour comes from the v5 mockups. Darkening it to `#0A8A4E` (4.4:1) or using bigger text would fix it. The brand colour is your call.
- The Plan 1 spike results table (spike-results.md) still needs filling in; it is not on this branch.
