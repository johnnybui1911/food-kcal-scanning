---
title: "Calobi Phase 1 — food photo to kcal, shipped as a web app"
description: "Build the Calobi Expo app, export it to web, and deploy it with a Cloudflare Worker AI proxy on a free workers.dev URL tonight."
status: pending
priority: P1
effort: 9h
branch: feat/calobi-phase1-web
tags: [feature, frontend, backend, api]
blockedBy: []
blocks: []
created: 2026-09-26
---

# Calobi Phase 1 — food photo to kcal, shipped as a web app

## Overview

Calobi is a food scanner, not a calorie tracker. A user takes or picks a food photo, can add a short note, and gets an AI estimate of kcal and nutrients. Each number can be copied into another tracker app. There is no login and no database. History stays on the device.

This plan targets the user's goal of real users on a production link **tonight (2026-09-26)**. The app is built once with Expo (React Native + expo-router). Phase 1 ships only the web export. Native iOS/Android builds come later from the same code via EAS and are out of scope here.

Sources of the accepted contract:
- `plans/reports/brainstorm-260926-1250-food-kcal-scanner-phase1.md` (including its "Update" section)
- `plans/reports/brainstorm.html` (comparison, diagram, annotated mockups)

## Architecture (one deploy)

```
Phone browser ──► https://calobi.<account>.workers.dev
                    ├── static assets: Expo web export (dist/, SPA)
                    └── Worker (run_worker_first: /api/*)
                          ├── POST /api/scan      ──► Claude API (vision + JSON schema)
                          ├── POST /api/refine    ──► Claude API (text only)
                          ├── POST /api/feedback  ──► Analytics Engine + Workers Logs
                          ├── GET  /api/health
                          └── quota: rate-limit binding (burst) + Durable Object (daily caps)
Device storage (AsyncStorage → localStorage on web): onboarding flag, locale, deviceId, history (≤50)
```

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Project Setup and Shared Core](./phase-01-start.md) | Pending |
| 2 | [Worker AI Proxy](./phase-02-worker-ai-proxy.md) | Pending |
| 3 | [Onboarding and Scan Screen](./phase-03-onboarding-and-scan.md) | Pending |
| 4 | [Result Screen and History](./phase-04-result-and-history.md) | Pending |
| 5 | [PWA, Deploy and Device QA](./phase-05-pwa-deploy-and-device-qa.md) | Pending |

Phases run in order. Phase 2 depends on the schema from Phase 1. Phases 3 and 4 depend on Phases 1 and 2. Phase 5 depends on everything.

## Acceptance criteria (whole plan)

- [ ] The production URL loads on a real iPhone (Safari) and a real Android phone (Chrome).
- [ ] Onboarding shows only on first launch, and "Get Started" / "Bắt đầu" leads to the scan screen.
- [ ] Camera capture and gallery pick both work, and an optional note is sent with the photo.
- [ ] The result shows kcal with range and confidence, protein, carbs, fat, fiber, sugar, sodium, ingredients, and quality score with reasons, labelled as an estimate.
- [ ] Tapping any number copies that number, and "Copy all" copies formatted text.
- [ ] The portion multiplier (×0.5 / ×1 / ×1.5 / ×2) recalculates locally, and "Fix result" re-estimates from one sentence.
- [ ] Thumbs up/down with reason chips and a comment are sent to `/api/feedback` (204).
- [ ] History survives a page reload, can be opened, and can be deleted.
- [ ] Both VI and EN work, and a non-food photo, offline, over-quota and AI failure each show a clear message with retry.
- [ ] The API key string is absent from `dist/`, and requests over the limit get HTTP 429.

## Key decisions

- **Model:** `claude-sonnet-5` with `output_config.effort: "low"` for speed. Fallback is `claude-haiku-4-5` (no `effort` field, since Haiku 4.5 rejects it). Both come from Worker vars.
- **Structured output:** `output_config.format = { type: "json_schema", schema }`, then zod validation in the Worker.
- **Daily quota:** the rate-limit binding only supports 10s/60s windows, so daily caps use a SQLite-backed Durable Object, which is available on the Workers Free plan.
- **Storage:** AsyncStorage on every platform (localStorage on web). There is one code path and no IndexedDB.
- **Domain:** free `workers.dev` tonight. Moving to a custom domain later resets iOS home-screen storage, and that trade-off is accepted.

## Execution order (to hit tonight)

1. **Before Phase 1**, collect all manual inputs below. Do not start coding until items 1–3 are ready.
2. Run Phase 1, then Phase 2.
3. **Right after Phase 2**, run Phase 5 Tasks 5.4–5.6 once against the placeholder `dist/`. This surfaces account problems (workers.dev subdomain, free-plan Durable Objects, secrets, CPU limit) by hour 3 instead of hour 8.
4. Run Phases 3 and 4, then all of Phase 5 (redeploy with the real build).

## Manual steps the user must do (executor cannot)

1. Create an Anthropic API key and set a monthly spend limit in the Claude Console.
2. Run `! npx wrangler login` (interactive browser login) and make sure the account has a workers.dev subdomain.
3. Provide one real food photo at `scripts/fixtures/food.jpg` for smoke tests.
4. Test on their own iPhone and Android phone (Phase 5).

## Unresolved

- Final app name. "Calobi" is a working name kept in `src/lib/config.ts` (`APP_NAME`) and `app.json`.
