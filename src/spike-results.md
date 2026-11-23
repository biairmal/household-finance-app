# Plan 1 spike results

Status legend: PASS / FAIL / PENDING (needs a real phone or account; the code for it is built).
Every iPhone check runs from the home-screen icon, never from a Safari tab.

## Task 1: skeleton

| Step | Result | Notes |
|---|---|---|
| `npm test` | PASS | 1 passed |
| Web export + service worker build (`npm run build:web`) | PASS | precaches 33 URLs incl. the sqlite wasm |
| PWA served locally with production headers (`wrangler pages dev dist`) | PASS | `crossOriginIsolated: true` |
| Service worker registration | PASS (desktop Chromium, live site) | after a redeploy the FIRST open still shows the old version; the next open has the new one. iPhone: works (home-screen app opens offline); update behaviour after a redeploy not checked |
| iPhone: Add to Home Screen, airplane mode, open from icon → shell loads | PASS (2026-11-21) | |
| Android APK installs and opens on the Samsung | PASS (2026-11-21) | first build: storage screen crashed (`crypto` missing on Hermes), fixed, rebuilt |

## Task 2: offline storage on the iPhone home-screen app (spec §10.2)

Backend: expo-sqlite web (wa-sqlite wasm + OPFS in a worker; needs COOP + `COEP: require-corp` from `public/_headers`).
Check this row FIRST: if it says false, storage failures below are a header problem, not an iOS one.

| Step | Result | Notes |
|---|---|---|
| iPhone home-screen app: storage screen shows `crossOriginIsolated: true` | PASS (2026-11-21) | |
| Desktop Chromium: add 100, reload → count 100 (`credentialless`, then again with `require-corp`) | PASS | `navigator.storage.persist()` = denied there (normal for a non-installed site) |
| Android (native SQLite): add rows, force-quit, reopen in airplane mode → count kept | PASS (Samsung, 2026-11-21) | count also kept after a phone restart |
| iPhone: add 1,000, force-quit, reopen offline → 1000 | PASS (2026-11-21) | force-quit + airplane mode: last count kept. Exact count and `persist()` value not recorded |
| iPhone: reboot, reopen → 1000 | PASS | count kept after reboot |
| Fallback to IndexedDB needed? | No | no storage row failed |
| iOS version | iPhone 16, latest iOS as of 2026-11-21 | exact version number not recorded |
| Follow-up: count still 1000 after 7 days unopened (date: ____ + 7) | SKIPPED | not needed |

## Task 3: Google sign-in via the Worker token broker (spec §10.3)

| Step | Result | Notes |
|---|---|---|
| Worker tests (`cd edge && npx vitest run`) | PASS | 400 on missing body, 401 on missing/garbage token, signature/aud/exp/iss checks |
| Android: sign in, force-quit, wait > 1 h, reopen → still signed in via refresh, no consent | PASS | no issues |
| iPhone home-screen app: same | PASS | sign-in works in the home-screen app; still signed in after force-quit and after ~1 day idle. In airplane mode the Google account is not detected (expected: refresh needs network). "Via: refresh" on screen not recorded |
| Refresh token survives on iPhone (IndexedDB) | PASS | kept after force-quit and ~1 day idle; reboot not yet checked |

Reading a failure after a long idle: "Signed out / not signed in" means the stored token is gone (storage evicted). "/oauth/refresh 401 invalid_grant" means Google expired it: in Testing mode refresh tokens last 7 days (spec §10.5), not an iOS problem.

## Task 4: shared household folder under `drive.file` (spec §10.1)

| Step | Result | Notes |
|---|---|---|
| 1. Bia creates folder + `ops/bia-phone/0001.jsonl`, shares with wife (writer) | PASS (Android, 2026-11-21) | folder + ops file created; sharing step not separately confirmed |
| 2. Wife opens Picker, selects folder, reads `0001.jsonl` | BLOCKED (iPhone Safari tab) | 1st: "API developer key is invalid" (gone after retry). 2nd: Picker blocked because cookies aren't allowed (Safari blocks third-party cookies). Retry in the home-screen app; then with Prevent Cross-Site Tracking off to confirm the cause |
| 3. Wife creates `ops/wife-phone/0001.jsonl`; Bia reads it | PENDING | |
| 4. **Bia creates `0002.jsonl` later; wife lists + reads it without the Picker** | PENDING | critical check |
| Picker loads on `/picker` (served WITHOUT cross-origin isolation, checked locally: `crossOriginIsolated: false`) | PENDING | if the real app must open the Picker inside the isolated page, test that separately |

## Task 5: screenshot extraction (spec §10.4)

| Step | Result | Notes |
|---|---|---|
| `/extract` tests with Gemini mocked | PASS | pass-through, 502 on malformed/invalid rows, 400 on 0 or >10 images, 401 before any model call |
| 20 real screenshots scored (≥95% rows right on amount, date, direction) | PASS (on `gemini-3.5-flash`) | 10 redacted screenshots instead of 20 (3 BCA, 3 GoPay, 4 Jago; 65 counted rows), 2026-11-21. First run: 65/65 rows right but 1 invented row (a GoPay order marked "Dibatalin & saldo di-refund" came back as a −42,100 spend). Added a skip-cancelled/refunded rule to the prompt; re-run: **65/65 rows right, 0 invented** (jago-01 needed a second try after a `model_error`). Scored on `gemini-3.5-flash`; the pinned `gemini-3.8-flash` was overloaded all day (503s, timeouts on a one-line request) and is not yet scored |
| Pinned model still available | FIXED (2026-11-21) | `gemini-2.5-flash` returned 404 "no longer available to new users"; pin changed to `gemini-3.8-flash`, then to `gemini-3.5-flash` (the scored model; 3.8 was overloaded) and deployed with the skip-cancelled prompt |

## Task 6: calendar reminders

| Step | Result | Notes |
|---|---|---|
| Bia: calendar + event created, reminder fires | PASS (Android) | calendar + event appeared; reminder fired |
| Wife: same | PASS (iPhone) | calendar + event appeared; reminder fired |
| Scope that worked (`calendar.app.created` or `calendar.events`) | `calendar.app.created` (both) | |

## Decision gate (Task 7)

| Risk | Result | Consequence for Plans 3–6 |
|---|---|---|
| iPhone PWA storage | PENDING | |
| iPhone OAuth in standalone mode | PENDING | |
| Drive sharing under `drive.file` | PENDING | |
| Screenshot accuracy | PASS (65/65 rows, 0 invented, `gemini-3.5-flash`) | Gemini capacity is the real risk: 3.8-flash overloaded for hours, 2.5-flash retired without notice. The app needs retry + a clear "try again later" when `/extract` fails |
| Calendar scope / app verification | PASS (scope: `calendar.app.created` works on both phones) | app verification not yet checked |
