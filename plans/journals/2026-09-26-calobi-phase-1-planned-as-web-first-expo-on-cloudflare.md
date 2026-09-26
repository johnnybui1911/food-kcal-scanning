---
title: Calobi phase 1 planned as web-first Expo on Cloudflare
date: 2026-09-26
summary: Chose Expo web export on one Cloudflare Worker with a Claude proxy to ship Calobi tonight; plan has 5 handover-ready phases.
---

# Calobi phase 1 planned as web-first Expo on Cloudflare

## What happened
- Brainstormed Calobi, a food photo to kcal/macro scanner that is explicitly not a tracker (no login, local history, copy per number).
- The user needed real users within 1-2 days, so native store review (TestFlight external review ~24-48h) and install friction ruled out a native-first launch.
- Wrote the plan at `plans/260926-0510-calobi-phase1-web/` (5 phases, handover format with a Failure Protocol in each phase).

## Decisions
- Phase 1 ships as an Expo (expo-router, `web.output: "single"`) web export. Native comes later from the same code via EAS. A Next.js PWA was rejected because the UI would have to be rebuilt for native.
- One Cloudflare Worker serves the static assets and `/api/*` (`run_worker_first`) on the free workers.dev domain.
- Claude `claude-sonnet-5` with `output_config.format` json_schema, effort low. The fallback `claude-haiku-4-5` must omit `effort`.
- The rate-limit binding only allows 10s/60s windows, so daily caps (device/IP/global) use a SQLite Durable Object, which is available on the free plan.
- The burst limit is keyed by device ID, not IP, because Vietnamese carriers use CGNAT.
- iOS home-screen web apps keep storage separate from Safari, so history does not carry over after Add to Home Screen. This is expected and written into the QA checklist.

## Gotchas found
- The project hook `.claude/hooks/scout-block.cjs` blocks any Bash command containing `dist`. Phase 1 adds `!dist` to `.claude/.ckignore`.
- The Kongming review caught: duplicate Worker types (`@cloudflare/workers-types` plus `wrangler types`), string routes under typedRoutes, the raw phone photo exceeding the 413 cap in the smoke test, curl racing the dev server, and a too-new `compatibility_date`.

## Next steps
- The user provides the Anthropic key with a spend limit, `wrangler login`, and `scripts/fixtures/food.jpg` before Phase 1.
- Deploy right after Phase 2 to surface account issues early, then run Phases 3-5.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
