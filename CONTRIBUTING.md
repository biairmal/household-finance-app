# Contributing

How a change gets from a plan to `main`, for humans and AI agents alike. How the code itself is written is in
[AGENTS.md](AGENTS.md).

## Work from a plan

1. Find the plan for the work in [docs/plans/](docs/plans/); the [roadmap](docs/plans/2026-11-20-roadmap.md) says
   which one is next and what it depends on. Plans 3–6 are written only after Plan 1's results are in.
2. Read the spec sections the plan cites. When the spec and a plan disagree, the spec wins. When both are silent,
   pick the simplest option that fits and add a row to [docs/DECISIONS.md](docs/DECISIONS.md).
3. Work task by task, ticking the plan's checkboxes as each task lands.
4. **Gate:** if Plan 1's iPhone storage or iPhone sign-in spike fails, stop and decide with Bia before Plan 3
   (spec §10).

Some steps only Bia can do: Google Cloud, Cloudflare and Expo accounts, API keys, real screenshots, and every check on
a real phone. Build the code for those, mark the row PENDING in the results file, and list the steps for Bia.

## Git conventions

- **Branch:** one per plan, `plan-<n>-<slug>` (e.g. `plan-2-domain-core`), cut from `main`.
- **Commit:** `<type>(<scope>)?: <what it does, lower case>`. Types in use: `feat fix spike docs chore`; scope is the
  area (`feat(domain): budget usage`). One commit per plan task. The body says why, not how.
- **Merge:** a plan's branch merges to `main` once its tasks are done and the gate below passes.

## Definition of Done

- [ ] `npx tsc --noEmit` and `npm test` pass; `cd edge && npx vitest run` passes when `edge/` changed. Quote the real
      output, and say which checks were skipped.
- [ ] New logic has tests, written first for `src/domain/`.
- [ ] Device checks are recorded as PASS / FAIL / PENDING with the date, never claimed from a desktop run.
- [ ] No real financial data, tokens or keys in the diff.
- [ ] The README, `.env.example`, the plan's checkboxes and [docs/DECISIONS.md](docs/DECISIONS.md) match the change
      when it touches setup, config, commands or a choice the spec left open.
