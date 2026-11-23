# Plan 1 spike results

Status legend: PASS / FAIL / PENDING (needs a real phone or account; the code for it is built).
Every iPhone check runs from the home-screen icon, never from a Safari tab.

## Task 1: skeleton

| Step | Result | Notes |
|---|---|---|
| `npm test` | PASS | 1 passed |
| Web export + service worker build (`npm run build:web`) | PASS | precaches 33 URLs incl. the sqlite wasm |
| PWA served locally with production headers (`wrangler pages dev dist`) | PASS | `crossOriginIsolated: true` |
| Service worker registration | PENDING | can't run in the agent's embedded browser (even a trivial SW is refused); check on the iPhone |
| iPhone: Add to Home Screen, airplane mode, open from icon → shell loads | PENDING | |
| Android APK installs and opens on the Samsung | PENDING | |

## Task 2: offline storage on the iPhone home-screen app (spec §10.2)

Backend: expo-sqlite web (wa-sqlite wasm + OPFS in a worker; needs COOP + `COEP: require-corp` from `public/_headers`).
Check this row FIRST: if it says false, storage failures below are a header problem, not an iOS one.

| Step | Result | Notes |
|---|---|---|
| iPhone home-screen app: storage screen shows `crossOriginIsolated: true` | PENDING | |
| Desktop Chromium: add 100, reload → count 100 (`credentialless`, then again with `require-corp`) | PASS | `navigator.storage.persist()` = denied there (normal for a non-installed site) |
| iPhone: add 1,000, force-quit, reopen offline → 1000 | PENDING | also note the `persist()` value shown on screen |
| iPhone: reboot, reopen → 1000 | PENDING | |
| Fallback to IndexedDB needed? | PENDING | only if a row above fails |
| iOS version | PENDING | |
| Follow-up: count still 1000 after 7 days unopened (date: ____ + 7) | PENDING | |

## Task 3: Google sign-in via the Worker token broker (spec §10.3)

| Step | Result | Notes |
|---|---|---|
| Worker tests (`cd edge && npx vitest run`) | PASS | 400 on missing body, 401 on missing/garbage token, signature/aud/exp/iss checks |
| Android: sign in, force-quit, wait > 1 h, reopen → still signed in via refresh, no consent | PENDING | screen shows "Via: refresh" |
| iPhone home-screen app: same | PENDING | watch whether the redirect returns into the standalone app or opens Safari |
| Refresh token survives on iPhone (IndexedDB) | PENDING | |

Reading a failure after a long idle: "Signed out / not signed in" means the stored token is gone (storage evicted). "/oauth/refresh 401 invalid_grant" means Google expired it: in Testing mode refresh tokens last 7 days (spec §10.5), not an iOS problem.

## Task 4: shared household folder under `drive.file` (spec §10.1)

| Step | Result | Notes |
|---|---|---|
| 1. Bia creates folder + `ops/bia-phone/0001.jsonl`, shares with wife (writer) | PENDING | |
| 2. Wife opens Picker, selects folder, reads `0001.jsonl` | PENDING | |
| 3. Wife creates `ops/wife-phone/0001.jsonl`; Bia reads it | PENDING | |
| 4. **Bia creates `0002.jsonl` later; wife lists + reads it without the Picker** | PENDING | critical check |
| Picker loads on `/picker` (served WITHOUT cross-origin isolation, checked locally: `crossOriginIsolated: false`) | PENDING | if the real app must open the Picker inside the isolated page, test that separately |

## Task 5: screenshot extraction (spec §10.4)

| Step | Result | Notes |
|---|---|---|
| `/extract` tests with Gemini mocked | PASS | pass-through, 502 on malformed/invalid rows, 400 on 0 or >10 images, 401 before any model call |
| 20 real screenshots scored (≥95% rows right on amount, date, direction) | PENDING | |

## Task 6: calendar reminders

| Step | Result | Notes |
|---|---|---|
| Bia: calendar + event created, reminder fires | PENDING | |
| Wife: same | PENDING | |
| Scope that worked (`calendar.app.created` or `calendar.events`) | PENDING | |

## Decision gate (Task 7)

| Risk | Result | Consequence for Plans 3–6 |
|---|---|---|
| iPhone PWA storage | PENDING | |
| iPhone OAuth in standalone mode | PENDING | |
| Drive sharing under `drive.file` | PENDING | |
| Screenshot accuracy | PENDING | |
| Calendar scope / app verification | PENDING | |
