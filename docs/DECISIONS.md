# Decisions

Choices made where the spec was silent or unclear. One row each: date · plan/task · decision · reason. Decisions the
spec or a plan already records ("Bia's decision", "Claude's call", "Plan's call") stay where they are.

| Date | Task | Decision | Reason |
|---|---|---|---|
| 2026-11-21 | Plan 1, T2 | Web storage is expo-sqlite (wa-sqlite in OPFS), served with COOP and `COEP: require-corp` from `public/_headers`; no IndexedDB fallback | Passed on the iPhone home-screen app through force-quit, airplane mode and reboot |
| 2026-11-21 | Plan 1, T5 | `/extract` is pinned to `gemini-3.5-flash`, and the prompt skips cancelled or refunded rows | Scored 65/65 rows with 0 invented; `gemini-2.5-flash` was retired and `gemini-3.8-flash` was overloaded |
| 2026-11-21 | Plan 1, T6 | Calendar uses the `calendar.app.created` scope | Worked on both phones; narrower than `calendar.events` |
