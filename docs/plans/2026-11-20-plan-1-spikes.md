# Plan 1: Spikes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Expo app skeleton on Bia's Android and his wife's iPhone and get a recorded pass/fail on each risk in spec §10, before any feature work.

**Architecture:** One Expo (TypeScript, expo-router) repo that builds an Android APK and a web PWA. One Cloudflare Worker (`edge/`) for the OAuth token broker and screenshot extraction. Spike code lives under `spikes/` routes and is deleted or rewritten in Plan 3. Only the skeleton and the Worker survive.

**Tech Stack:** Expo SDK (current), expo-router, expo-sqlite, TypeScript, Jest (jest-expo); Cloudflare Workers + Wrangler; Google Identity (OAuth code flow), Drive API v3 (`drive.file`), Google Picker, Calendar API (`calendar.app.created`); Gemini API (Flash, pinned version).

**Spec:** `/mnt/project-files/design/2026-11-20-household-finance-app-design.md`

## Global Constraints

- Language: TypeScript, strict mode.
- Android ships as an APK installed directly (no Play Store). iPhone uses the web build installed to the home screen (no App Store).
- Drive scope: `drive.file` only. Calendar scope: `calendar.app.created` (fallback `calendar.events`).
- The edge service stores nothing: no screenshots, transactions, bill dates or refresh tokens. It holds only the OAuth client secret and the Gemini key as Worker secrets.
- Refresh tokens are stored only on the device.
- Gemini: free tier for development only; the paid tier before real household data. Pin a specific Flash model version in config.
- Timezone Asia/Jakarta; currency IDR.

## Review Focus

- **iPhone standalone mode differs from Safari tabs** (storage partition, OAuth popups). Every iPhone check runs from the home-screen icon, never from a Safari tab.
- **Storage after a week idle:** iOS can evict web storage. Check data is still there after the app sits unopened for 7+ days (Task 2 records a follow-up check).
- **Second member's Drive access to files created later by the owner.** This is the case most likely to break `drive.file` (Task 4 tests it explicitly).
- **Gemini on long, scrolled or cropped screenshots:** rows cut at the image edge must be dropped or flagged, not invented (Task 5's sample set includes them).
- **Worker abuse:** calls without a valid Google ID token must be rejected (Task 3 tests a 401).

---

### Task 1: App skeleton on both phones

**Files:**
- Create: Expo app at repo root (`app/_layout.tsx`, `app/index.tsx`, `app.json`, `package.json`, `tsconfig.json`), `public/manifest.json`, service worker config, `jest.config.js`, `src/smoke.test.ts`

**Interfaces:**
- Produces: repo with `npm test` (Jest) and `npm run web`, an Android APK build command, and a PWA deployed to Cloudflare Pages at a stable URL.

- [ ] **Step 1:** Create the Expo TypeScript app with expo-router. Add the `jest-expo` preset and `src/smoke.test.ts` asserting `1 + 1 === 2`.
- [ ] **Step 2:** Run `npm test`. Expected: 1 passed.
- [ ] **Step 3:** Configure the web build as a PWA: `display: standalone`, app name "Household Money", theme color `#0A9F5A`, and a service worker that precaches the app shell.
- [ ] **Step 4:** Deploy the web build to Cloudflare Pages. On the iPhone, open it in Safari, then Share → Add to Home Screen. Turn on airplane mode, open from the icon. Expected: the app shell loads.
- [ ] **Step 5:** Build an Android APK (`eas build -p android --profile preview --local`, or `npx expo run:android --variant release`) and install it on the Samsung. Expected: it opens.
- [ ] **Step 6:** Commit: `chore: expo skeleton with PWA and android build`.

### Task 2: Spike: offline storage on the iPhone home-screen app

**Files:**
- Create: `spikes/storage.tsx` (route `/spikes/storage`), `src/spike-results.md`

- [ ] **Step 1:** Build a screen that writes N rows (`id`, `text`, `createdAt`) to expo-sqlite (web uses its wasm/OPFS backend) and lists them, with buttons "Add 100", "Count".
- [ ] **Step 2:** On the iPhone home-screen app: add 1,000 rows, force-quit, reopen offline. Expected: count = 1000.
- [ ] **Step 3:** Reboot the phone, reopen. Expected: count = 1000.
- [ ] **Step 4:** If any step fails, swap to an IndexedDB-backed store behind the same screen and repeat Steps 2–3.
- [ ] **Step 5:** Record in `src/spike-results.md`: backend used, pass/fail per step, iOS version. Add a dated follow-up line: re-check the count after 7 days unopened.
- [ ] **Step 6:** Commit: `spike: ios pwa storage`.

### Task 3: Spike: Google sign-in on both phones via the Worker token broker

**Files:**
- Create: `edge/src/index.ts`, `edge/wrangler.toml`, `edge/test/auth.test.ts`, `spikes/auth.tsx`

**Interfaces:**
- Produces: `POST /oauth/exchange {code, redirectUri} → {accessToken, refreshToken, expiresIn, idToken}`, `POST /oauth/refresh {refreshToken} → {accessToken, expiresIn}`, and `verifyGoogleIdToken(token: string): Promise<{sub: string, email: string} | null>` in `edge/src/auth.ts`, reused by `/extract` in Task 5.

- [ ] **Step 1:** Write `edge/test/auth.test.ts` (Vitest + Miniflare): `/oauth/refresh` with no body → 400; `/extract` with no `Authorization` header → 401; `verifyGoogleIdToken('garbage')` → `null`.
- [ ] **Step 2:** Run `npx vitest run` in `edge/`. Expected: FAIL (routes missing).
- [ ] **Step 3:** Implement both routes. The client secret comes from the Worker secret `GOOGLE_CLIENT_SECRET`. Nothing is logged except status codes.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** In `spikes/auth.tsx`, do the authorization-code flow (scopes: `openid email drive.file calendar.app.created`, `access_type=offline`, `prompt=consent`) using a redirect, not a popup. Store the refresh token in SecureStore on Android and IndexedDB on web.
- [ ] **Step 6:** Sign in from the Android app and from the iPhone home-screen app. Force-quit, wait more than 1 hour, reopen. Expected: still signed in via refresh, with no consent screen.
- [ ] **Step 7:** Record the results in `src/spike-results.md`. Commit: `spike: google auth + worker token broker`.

### Task 4: Spike: shared household folder under `drive.file`

**Files:**
- Create: `spikes/drive.tsx`

- [ ] **Step 1:** As Bia: create folder `Household Money (spike)`, create `ops/bia-phone/0001.jsonl`, and share the folder with his wife's Google email (writer).
- [ ] **Step 2:** As the wife on the iPhone: open the Google Picker and select that folder. List and read `0001.jsonl`. Expected: readable.
- [ ] **Step 3:** As the wife: create `ops/wife-phone/0001.jsonl` inside the folder. Expected: succeeds, and Bia's app can read it.
- [ ] **Step 4:** As Bia, after Step 2: create a new file `ops/bia-phone/0002.jsonl`. As the wife, without opening the Picker again: list and read it. Expected: readable. **This is the critical check.**
- [ ] **Step 5:** Record pass/fail per step. If Step 4 fails, record it and propose the fallback layout (each member's device writes only to its own shared folder, and each member opens the other's folder once via the Picker).
- [ ] **Step 6:** Commit: `spike: drive.file household sharing`.

### Task 5: Spike: screenshot extraction accuracy with Gemini

**Files:**
- Create: `edge/src/extract.ts`, `edge/src/extract-schema.ts`, `edge/test/extract.test.ts`, `spikes/screenshots/README.md` (the images stay local and are git-ignored), `scripts/score-extraction.ts`

**Interfaces:**
- Produces: `POST /extract` (auth: `Authorization: Bearer <Google ID token>`) with body `{images: string[] /* base64 JPEG ≤ 1600px long edge */, accountHint?: string}` → `{rows: ExtractedRow[]}`, where `ExtractedRow = {date: string /* YYYY-MM-DD */, time: string | null, amount: number /* integer rupiah, positive */, direction: 'in' | 'out', description: string, counterpartyName: string | null, counterpartyAccount: string | null, reference: string | null, runningBalance: number | null, cutOff: boolean}`. Plan 4 builds on this.

- [ ] **Step 1:** Write `edge/test/extract.test.ts` with Gemini mocked: a response `{"rows":[{"date":"2026-11-18","amount":86500,"direction":"out",...}]}` passes through unchanged; a malformed model response → 502 with `{error:"bad_model_output"}`; more than 10 images → 400.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement `/extract`. Call Gemini with a strict JSON response schema matching `ExtractedRow`, read the model id from the env var `GEMINI_MODEL` (a pinned Flash version), and validate the output before returning it. The prompt asks for amounts as integer rupiah, years inferred from context, and `cutOff: true` for rows clipped at the image edge.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Bia collects 20 real screenshots (BCA, Jago, GoPay; include 2 scrolled, overlapping pairs and 2 with rows cut off) and hand-writes the expected rows as `expected.json` beside them.
- [ ] **Step 6:** Run `npx tsx scripts/score-extraction.ts spikes/screenshots`. It prints per-field accuracy (date, amount, direction) and the overall row accuracy. Pass bar (spec §10.4): ≥95% of rows correct on amount, date and direction.
- [ ] **Step 7:** Record the score in `src/spike-results.md`. Commit: `spike: gemini extraction + scorer`.

### Task 6: Spike: calendar reminders

**Files:**
- Create: `spikes/calendar.tsx`

- [ ] **Step 1:** With the `calendar.app.created` token: create a calendar "Household bills (spike)", then an event "Vehicle tax due" on tomorrow's date with popup reminders at 1440 and 60 minutes.
- [ ] **Step 2:** Do this on both phones' accounts. Expected: the calendar appears in each person's Google Calendar app, and the reminder fires.
- [ ] **Step 3:** If the scope is rejected, retry with `calendar.events` writing to the primary calendar, and record which one worked.
- [ ] **Step 4:** Record the results. Commit: `spike: calendar reminders`.

### Task 7: Decision gate

- [ ] **Step 1:** Complete `src/spike-results.md` with a table: risk → result → consequence for Plans 3–6.
- [ ] **Step 2:** Share it with Bia. If Task 2 or Task 3 failed on the iPhone, stop and decide together (spec §10).
