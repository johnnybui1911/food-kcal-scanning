---
phase: 2
title: "Phase 2: Worker AI Proxy"
status: todo
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 2: Worker AI Proxy

## Goal
Build one Cloudflare Worker that serves the Expo web export as static assets and handles `/api/*`. It calls Claude with the secret API key, validates structured JSON, enforces burst and daily quotas, and logs feedback without a database.

## Context
- The shared schema from Phase 1 is `src/lib/nutrition-schema.ts` (`NutritionResultSchema`, `NUTRITION_JSON_SCHEMA`, `sanitizeResult`).
- Claude API facts (verified 2026-09-26):
  - Model IDs are `claude-sonnet-5` (primary) and `claude-haiku-4-5` (fallback). Never add date suffixes.
  - Structured output uses `output_config: { format: { type: "json_schema", schema } }` on `client.messages.create`.
  - `output_config.effort` is valid on Sonnet 5 but **errors on Haiku 4.5**, so omit `effort` for Haiku.
  - Images use `{ type: "image", source: { type: "base64", media_type, data } }` placed before the text block.
  - Check `stop_reason`. `"refusal"` or `"max_tokens"` means the output may not match the schema, so treat it as `ai_failed`.
- Cloudflare facts (verified 2026-09-26):
  - The rate-limit binding `period` must be 10 or 60 seconds. It is per-location and eventually consistent, so use it only for bursts.
  - SQLite-backed Durable Objects are available on the Workers Free plan (100k requests/day).
  - Static assets use `assets.directory`, `not_found_handling: "single-page-application"`, and `run_worker_first: ["/api/*"]`.

## API contract (the client in Phases 3–4 depends on this exactly)
All requests and responses are JSON. The header `x-device-id: <uuid>` is required on POSTs.

| Endpoint | Body | Success | Errors |
|---|---|---|---|
| `POST /api/scan` | `{ image_base64: string (no data: prefix), media_type: "image/jpeg"\|"image/png"\|"image/webp", note?: string (≤200), locale: "vi"\|"en" }` | `200 { result: NutritionResult, model: string, prompt_version: string }` | `400 {error:"bad_request"}`, `413 {error:"image_too_large"}` (base64 length > 1_500_000), `422 {error:"not_food", result}`, `429 {error:"rate_limited", scope}`, `502 {error:"ai_failed"}` |
| `POST /api/refine` | `{ previous: NutritionResult, correction: string (1..300), locale }` | same as scan | same, minus 413 |
| `POST /api/feedback` | `{ rating: "up"\|"down", reasons: string[], comment?: string (≤500), dish_name: string, calories_kcal: number, quality_score: number, model: string, prompt_version: string, locale }` | `204` | `400`, `429` |
| `GET /api/health` | none | `200 { ok: true }` | none |

`scope` in a 429 is one of `"burst"`, `"device"`, `"ip"` or `"global"`.

## Files to Create / Modify
- Create: `wrangler.jsonc`, `worker/tsconfig.json`, `worker/index.ts`, `worker/claude.ts`, `worker/prompt.ts`, `worker/quota.ts`, `worker/validate.ts`, `worker/http.ts`
- Create tests: `worker/__tests__/validate.test.ts`
- Create: `.dev.vars` (local only, gitignored), `scripts/smoke-api.sh`
- Modify: root `tsconfig.json` (add `"worker"` to `exclude`)

## Tasks

### Task 2.1 — `wrangler.jsonc`
- Goal: one Worker named `calobi` with assets, rate limiting, Durable Object, Analytics Engine, vars and logs.
- Steps: create `wrangler.jsonc` at the repo root with exactly this content (keep the comments):
  ```jsonc
  {
    "name": "calobi",
    "main": "./worker/index.ts",
    "compatibility_date": "2026-09-01",
    "compatibility_flags": ["nodejs_compat"],
    "assets": {
      "directory": "./dist/",
      "not_found_handling": "single-page-application",
      "binding": "ASSETS",
      "run_worker_first": ["/api/*"]
    },
    "observability": { "enabled": true },
    "ratelimits": [
      { "name": "BURST_LIMITER", "namespace_id": "1001", "simple": { "limit": 6, "period": 60 } }
    ],
    "durable_objects": {
      "bindings": [{ "name": "QUOTA", "class_name": "QuotaCounter" }]
    },
    "migrations": [{ "tag": "v1", "new_sqlite_classes": ["QuotaCounter"] }],
    "analytics_engine_datasets": [{ "binding": "FEEDBACK", "dataset": "calobi_feedback" }],
    "vars": {
      "MODEL": "claude-sonnet-5",
      "FALLBACK_MODEL": "claude-haiku-4-5",
      "AI_EFFORT": "low",
      "DEVICE_DAILY_LIMIT": "20",
      "IP_DAILY_LIMIT": "300",
      "GLOBAL_DAILY_LIMIT": "400"
    }
    // Secret ANTHROPIC_API_KEY is set with `npx wrangler secret put ANTHROPIC_API_KEY` (never here).
    // Local dev only: ALLOWED_DEV_ORIGIN in .dev.vars enables CORS for the Expo dev server.
  }
  ```
- Success criteria: the file parses and wrangler accepts it.
- Verify: `npx wrangler types` exits 0 and creates `worker-configuration.d.ts` containing `BURST_LIMITER` and `QUOTA`. Check with `grep -c "BURST_LIMITER\|QUOTA" worker-configuration.d.ts`, which prints a number ≥ 2.

### Task 2.2 — `worker/tsconfig.json` and root exclude
- Steps:
  1. Create `worker/tsconfig.json`: `{ "compilerOptions": { "target": "es2022", "module": "es2022", "moduleResolution": "bundler", "strict": true, "lib": ["es2022"], "types": ["../worker-configuration.d.ts"], "noEmit": true, "skipLibCheck": true }, "include": ["./**/*.ts", "../src/lib/nutrition-schema.ts"] }`. Do not add `@cloudflare/workers-types` (it duplicates the generated runtime types).
  2. In root `tsconfig.json`, add `"worker"` and `"worker-configuration.d.ts"` to `exclude` (create the `exclude` array if missing, and keep existing entries).
- Verify: no verification needed (covered by Task 2.8).

### Task 2.3 — `worker/http.ts` and `worker/validate.ts`
- Goal: small helpers and strict request validation, testable without Cloudflare.
- Steps:
  1. `http.ts`: `json(data, status = 200, extraHeaders = {})` returns a Response with `content-type: application/json` and `cache-control: no-store`. Also `corsHeaders(request, env)`: if `env.ALLOWED_DEV_ORIGIN` is set and the request `Origin` equals it, return `access-control-allow-origin`, `access-control-allow-headers: content-type, x-device-id` and `access-control-allow-methods: GET, POST, OPTIONS`; otherwise return `{}`.
  2. `validate.ts` (pure, no Cloudflare types) exports `parseScanBody(x: unknown)`, `parseRefineBody(x: unknown)` and `parseFeedbackBody(x: unknown)`. Each returns `{ ok: true, value } | { ok: false, error: "bad_request" | "image_too_large" }`. Rules follow the API contract table exactly: trim strings, reject unknown `media_type`, reject `locale` not in `vi|en`, reject a note over 200 chars or a correction over 300 or empty, reject `image_base64` longer than 1_500_000 (`image_too_large`) or shorter than 100 (`bad_request`), use `NutritionResultSchema.safeParse` for `previous`, and truncate `comment` to 500. `reasons` keeps only the known values `wrong_dish`, `portion_off`, `missing_ingredient`, `nutrients_off` and `other`.
  3. Export `isDeviceId(s: string | null): boolean`, which requires 16–64 chars of `[A-Za-z0-9-]`.
- Success criteria: the Task 2.4 tests pass.
- Verify: covered by Task 2.4.

### Task 2.4 — Validation tests
- Steps: create `worker/__tests__/validate.test.ts` covering, for each parser, one valid body and at least these invalid bodies: missing `locale`; `media_type: "image/gif"`; a 1_500_001-char image (expect `image_too_large`); an empty correction; a `previous` missing `calories_kcal`; `reasons` with an unknown value filtered out. Also cover `isDeviceId("abc")` returning false and a UUID returning true.
- Verify: `npm test` exits 0 and the output contains `passed` with no `failed`.

### Task 2.5 — `worker/prompt.ts`
- Goal: a versioned prompt tuned for Vietnamese dishes.
- Steps: export `PROMPT_VERSION = "2026-09-26.1"`, `buildScanSystem(locale)`, `buildScanUserText(note, locale)`, `buildRefineSystem(locale)` and `buildRefineUserText(previousJson, correction, locale)`. The system text must say:
  1. You are a nutrition estimator. Identify the dish and every visible component, estimate portion weight from visual cues (bowl/plate size, utensils, typical Vietnamese serving sizes), and estimate nutrients.
  2. Account for hidden calories: cooking oil in stir-fries and fried dishes, fat in broths (phở, bún bò), coconut milk, sweetened condensed milk (cà phê sữa), sugar in sauces and drinks, mỡ hành, and fried shallots.
  3. Give `calories_min_kcal`/`calories_max_kcal` as an honest range and pick `confidence` from `low`/`medium`/`high`.
  4. `quality_score` is 0–100 for overall nutritional quality (protein adequacy, fiber, vegetables, added sugar, sodium, fried fat), with 2–4 short `quality_reasons`.
  5. If the image does not show food or drink, set `is_food: false`, set all numbers to 0, leave `ingredients` empty, and explain in `notes`.
  6. Write `dish_name`, `serving_description`, ingredient names, `quality_reasons` and `notes` in Vietnamese when locale is `vi` and English when `en`.
  7. The user's note is a hint about the dish or portion. Trust it over visual guesses when they conflict.
  - The refine system says: "You receive a previous estimate as JSON and a one-sentence correction from the user. Return a full corrected estimate in the same schema. Change only what the correction implies, and recompute totals so ingredients sum to the totals."
- Verify: no verification needed (exercised by Task 2.9).

### Task 2.6 — `worker/claude.ts`
- Goal: one function that calls Claude and returns a validated, sanitized result.
- Steps:
  1. `import Anthropic from "@anthropic-ai/sdk";` Create the client per request: `new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 45_000 })`.
  2. Export `async function estimate(env, input: { system: string; content: Anthropic.MessageParam["content"] }): Promise<{ result: NutritionResult; model: string }>`.
  3. Write a helper `outputConfig(model)`. It returns `{ format: { type: "json_schema", schema: NUTRITION_JSON_SCHEMA } }` when `model.startsWith("claude-haiku")`. Otherwise it returns `{ effort: env.AI_EFFORT, format: { type: "json_schema", schema: NUTRITION_JSON_SCHEMA } }`. Try `env.MODEL` first with `{ model, max_tokens: 4000, system, messages: [{ role: "user", content }], output_config: outputConfig(model) }`.
  4. If the call throws an `Anthropic.APIError` with `status` ≥ 500 (including 529), or an `Anthropic.APIConnectionError`, retry **once** with `env.FALLBACK_MODEL` and `outputConfig(env.FALLBACK_MODEL)`. Do not retry 4xx.
  5. After a response: if `stop_reason` is not `"end_turn"`, throw `new Error("ai_failed")`. Otherwise take the first block with `type === "text"`, `JSON.parse` its text, run `NutritionResultSchema.parse`, then `sanitizeResult`. Any error throws `new Error("ai_failed")`.
  6. Log `console.log(JSON.stringify({ evt: "ai_call", model, ms, stop_reason, input_tokens, output_tokens }))`. Never log the API key or the image.
- Verify: no verification needed (exercised by Task 2.9).

### Task 2.7 — `worker/quota.ts` and `worker/index.ts`
- Goal: quotas and routing.
- Steps:
  1. `quota.ts`:
     ```ts
     import { DurableObject } from "cloudflare:workers";
     export class QuotaCounter extends DurableObject {
       async hit(limit: number): Promise<{ allowed: boolean; count: number }> {
         const n = (await this.ctx.storage.get<number>("n")) ?? 0;
         if (n >= limit) return { allowed: false, count: n };
         await this.ctx.storage.put("n", n + 1);
         return { allowed: true, count: n + 1 };
       }
     }
     export async function checkDailyQuota(env: Env, deviceId: string, ip: string): Promise<null | "device" | "ip" | "global"> {
       const day = new Date().toISOString().slice(0, 10);
       const checks: Array<["device" | "ip" | "global", string, number]> = [
         ["device", `d:${deviceId}:${day}`, Number(env.DEVICE_DAILY_LIMIT)],
         ["ip", `i:${ip}:${day}`, Number(env.IP_DAILY_LIMIT)],
         ["global", `g:${day}`, Number(env.GLOBAL_DAILY_LIMIT)],
       ];
       for (const [scope, key, limit] of checks) {
         const stub = env.QUOTA.get(env.QUOTA.idFromName(key));
         const { allowed } = await stub.hit(limit);
         if (!allowed) return scope;
       }
       return null;
     }
     ```
  2. `index.ts`: `export { QuotaCounter } from "./quota";` and a default `fetch(request, env, ctx)` handler:
     - `OPTIONS` returns 204 with `corsHeaders`.
     - `GET /api/health` returns `json({ ok: true })`.
     - For `POST /api/scan|refine|feedback`: read `ip = request.headers.get("cf-connecting-ip") ?? "unknown"` and `deviceId = request.headers.get("x-device-id")`. If `!isDeviceId(deviceId)`, return 400. Then run `env.BURST_LIMITER.limit({ key: "d:" + deviceId })`, keyed by device and **not** IP, because Vietnamese mobile carriers share IPs (CGNAT). If it fails, return `429 {error:"rate_limited", scope:"burst"}`. Parse JSON inside try/catch (400 on error) and run the matching `parse*Body`.
     - Scan and refine: `checkDailyQuota`, returning `429 {error:"rate_limited", scope}` if it is not null. Build the content: for scan it is `[{ type: "image", source: { type: "base64", media_type, data: image_base64 } }, { type: "text", text: buildScanUserText(note, locale) }]`; for refine it is `[{ type: "text", text: buildRefineUserText(JSON.stringify(previous), correction, locale) }]`. Call `estimate`. If `result.is_food === false`, return `422 {error:"not_food", result}`. Otherwise return `200 { result, model, prompt_version: PROMPT_VERSION }`. If `estimate` throws, return `502 {error:"ai_failed"}`.
     - Feedback: `env.FEEDBACK?.writeDataPoint({ indexes: [deviceId], blobs: [rating, reasons.join(","), comment, dish_name, model, prompt_version, locale], doubles: [calories_kcal, quality_score] })` inside try/catch. Also `console.log(JSON.stringify({ evt: "feedback", ...body, deviceId }))`, then return 204.
     - Any other `/api/*` path returns 404 `json({error:"not_found"})`. Non-API paths return `env.ASSETS.fetch(request)`.
     - Add `corsHeaders(request, env)` to every API response.
- Verify: no verification needed (covered by Tasks 2.8 and 2.9).

### Task 2.8 — Typecheck the Worker
- Verify: `npx tsc -p worker/tsconfig.json` exits 0 with no output.

### Task 2.9 — Local smoke test against real Claude
- Goal: prove the full proxy works locally before any UI.
- Preconditions (user-provided): `ANTHROPIC_API_KEY` is available and `scripts/fixtures/food.jpg` exists. If either is missing, STOP and ask the user. Do not fabricate a key or image.
- Steps:
  1. Create `.dev.vars` with two lines: `ANTHROPIC_API_KEY=<the key the user provides>` and `ALLOWED_DEV_ORIGIN=http://localhost:8081`. Never print the key.
  2. `mkdir -p dist && [ -f dist/index.html ] || echo '<!doctype html><title>placeholder</title>' > dist/index.html` (assets dir must exist for wrangler dev).
  3. Start `npx wrangler dev --port 8787` in the background and record its PID. Wait until it answers: `for i in $(seq 1 45); do curl -sf -o /dev/null http://localhost:8787/api/health && break; sleep 2; done; curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/api/health` must print `200`.
  4. Create a downscaled fixture so the body stays under the 413 cap: `sips -Z 1024 scripts/fixtures/food.jpg --out scripts/fixtures/food-1024.jpg`.
  5. Create `scripts/smoke-api.sh` (make it executable). It takes the base URL as `$1` (default `http://localhost:8787`), generates a device id with `uuidgen`, and then:
     - `GET /api/health` and expects `"ok":true`
     - scans `scripts/fixtures/food-1024.jpg` (create it with `sips -Z 1024` if missing), base64-encoded with `base64 -i scripts/fixtures/food-1024.jpg | tr -d '\n'`. Build every JSON body into a temp file (with `node -e` or `python3`) and send it with `curl --data-binary @<file>`, never as a shell argument (the arguments would be too long). Use `media_type image/jpeg`, `locale vi`. It expects HTTP 200, `"calories_kcal"` in the body, and prints the time taken.
     - scans `assets/images/icon.png` (`media_type image/png`) and expects HTTP 422 with `not_food`. If that file does not exist, use any PNG under `assets/`.
     - refines the first result with correction `"ít bánh phở hơn"` and expects HTTP 200.
     - sends feedback `{rating:"up",reasons:["other"],comment:"smoke",dish_name:"x",calories_kcal:1,quality_score:1,model:"m",prompt_version:"p",locale:"vi"}` and expects HTTP 204.
     - sends 7 rapid `POST /api/feedback` with the **same** device id and expects at least one 429 (burst limit 6/60s per device).
     - It prints `SMOKE PASS` only if every expectation holds, otherwise `SMOKE FAIL: <step>` and exits 1.
  6. Run `./scripts/smoke-api.sh http://localhost:8787`.
  7. Stop the wrangler dev process you started (`kill <PID>`).
- Success criteria: the smoke script passes and the food scan finishes in under 15s locally.
- Verify: the output of step 6 contains `SMOKE PASS` and the exit code is 0.

### Task 2.10 — Commit
- Steps: `git add -A && git commit -m "feat: add Cloudflare Worker AI proxy with quotas and feedback"`. Make sure `.dev.vars` is NOT staged (`git status --porcelain | grep -c dev.vars` prints `0`).
- Verify: `git log -1 --pretty=%s` prints the message above, and `git ls-files | grep -c '^.dev.vars$'` prints `0`.

## Security
- The API key exists only as a Wrangler secret (production) or in `.dev.vars` (local, gitignored).
- Photos are forwarded to Claude and never stored or logged by the Worker.
- Device IDs can be forged on the web. The IP daily cap, global daily cap and Anthropic spend limit bound the worst case.

## Risks
- **Workers Free CPU limit (10 ms/request):** parsing a ~300 KB JSON body is usually a few ms. If production shows error 1102 / "exceeded CPU", lower `IMAGE_MAX_SIDE` to 896 or switch the account to Workers Paid. This is a config-only change.
- **Latency:** if p50 is over 10s with Sonnet 5 at `low`, set `MODEL` to `claude-haiku-4-5` in `wrangler.jsonc` vars. `outputConfig` already drops `effort` for Haiku.

## Failure Protocol
If any Verify step does not meet its stated pass condition, STOP this phase.
Do not improvise a fix, retry blindly, or reason around the failure.
Spawn the `kongming` subagent for next-step counsel and pass:
- the phase and task id,
- what you attempted (the steps you ran),
- the exact command and its full output,
- the pass condition it failed to meet.
Apply kongming's guidance, then re-run the Verify step.
If `kongming` cannot be spawned in this environment, STOP and report the same
failure evidence to the user. Never continue by self-reasoning.
