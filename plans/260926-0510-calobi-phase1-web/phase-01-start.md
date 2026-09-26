---
phase: 1
title: "Phase 1: Project Setup and Shared Core"
status: completed
priority: P1
effort: "1.5h"
dependencies: []
---

# Phase 1: Project Setup and Shared Core

## Goal
Create an Expo + expo-router TypeScript project at the repository root. Add the shared pure-TypeScript core (nutrition schema, portion math, copy text, i18n, storage, config) with passing unit tests.

## Context
- Repo root: `/Users/johnny.bui/orca/projects/food-kcal-scanning` (contains `.claude/`, `.agentkit/`, `plans/`; keep them).
- Accepted contract: `plans/reports/brainstorm-260926-1250-food-kcal-scanner-phase1.md`.
- Only web-compatible Expo modules may be used. Every screen must also work later on native.

## Files to Create / Modify
- Create (from template): `package.json`, `app.json`, `tsconfig.json`, `src/app/_layout.tsx`, `src/app/index.tsx`
- Create: `src/lib/config.ts`, `src/lib/nutrition-schema.ts`, `src/lib/portion.ts`, `src/lib/format.ts`, `src/lib/i18n.ts`, `src/lib/storage.ts`
- Create tests: `src/lib/__tests__/nutrition-schema.test.ts`, `src/lib/__tests__/portion.test.ts`, `src/lib/__tests__/format.test.ts`
- Create: `vitest.config.ts`
- Modify: `.gitignore`

## Tasks

### Task 1.1 — Create a feature branch
- Goal: work happens on `feat/calobi-phase1-web`, not `main`.
- Steps:
  1. `cd /Users/johnny.bui/orca/projects/food-kcal-scanning && git checkout -b feat/calobi-phase1-web`
- Success criteria: the current branch is `feat/calobi-phase1-web`.
- Verify: `git branch --show-current` prints exactly `feat/calobi-phase1-web`.

### Task 1.2 — Scaffold Expo into the repo root
- Goal: an Expo Router TypeScript app exists at the repo root, with routes under `src/app/`.
- Steps:
  1. `cd /Users/johnny.bui/orca/projects/food-kcal-scanning`
  2. `npx create-expo-app@latest calobi-tmp --yes --no-install` (default template; includes expo-router and TypeScript).
  3. `rsync -a --exclude .git --exclude node_modules calobi-tmp/ ./` then `rm -rf calobi-tmp`
  4. `npm install`
  5. `npm run reset-project` and answer `n` if it asks whether to keep the example files (it moves examples out and leaves a blank app). If the script does not exist, skip this step.
  6. If routes are in `app/` at the root instead of `src/app/`, run `mkdir -p src && git mv app src/app 2>/dev/null || mv app src/app`.
  7. Delete leftover example folders if present: `rm -rf app-example`.
- Success criteria: `src/app/_layout.tsx` and `src/app/index.tsx` exist, and `package.json` lists `expo-router`.
- Verify: `test -f src/app/_layout.tsx && test -f src/app/index.tsx && grep -q '"expo-router"' package.json && echo OK` prints `OK`.

### Task 1.3 — Install modules used by later phases
- Goal: every runtime dependency is installed at an SDK-compatible version.
- Steps:
  1. `npx expo install expo-image-picker expo-image-manipulator expo-clipboard expo-haptics expo-localization @react-native-async-storage/async-storage react-dom react-native-web @expo/metro-runtime`
  2. `npm install zod`
  3. `npm install -D vitest wrangler` (do NOT install `@cloudflare/workers-types`; Worker types come from `npx wrangler types`)
  4. `npm install @anthropic-ai/sdk`
- Success criteria: all packages appear in `package.json`.
- Verify: `node -e "const p=require('./package.json');const all={...p.dependencies,...p.devDependencies};const need=['expo-image-picker','expo-image-manipulator','expo-clipboard','expo-haptics','expo-localization','@react-native-async-storage/async-storage','react-native-web','zod','vitest','wrangler','@anthropic-ai/sdk'];const miss=need.filter(n=>!all[n]);console.log(miss.length?'MISSING '+miss:'OK')"` prints `OK`.

### Task 1.4 — Configure app.json for web SPA
- Goal: the web export is a single-page app named Calobi.
- Target: `app.json` → `expo.name`, `expo.slug`, `expo.web`.
- Steps:
  1. Set `expo.name` to `"Calobi"` and `expo.slug` to `"calobi"`.
  2. Set `expo.web` to `{ "output": "single", "bundler": "metro", "favicon": <keep existing favicon path> }`.
  3. Keep all other template fields unchanged, including `experiments.typedRoutes` if present. Because typed routes are on, **every navigation to a dynamic route must use the object form**: `router.push({ pathname: "/result/[id]", params: { id } })`. Never write `router.push("/result/" + id)`.
- Success criteria: `app.json` has `"output": "single"`.
- Verify: `node -e "const a=require('./app.json');console.log(a.expo.web.output==='single'&&a.expo.name==='Calobi'?'OK':'BAD')"` prints `OK`.

### Task 1.5a — Allow the build folder through the project scout hook
- Goal: Bash commands that mention the build output folder are not blocked by `.claude/hooks/scout-block.cjs` (it blocks the pattern `dist` by default).
- Steps: create or append to `.claude/.ckignore` the single line `!dist`.
- Verify: `grep -qxF '!dist' .claude/.ckignore && echo OK` prints `OK`.

### Task 1.5 — Update .gitignore
- Goal: secrets and build output are never committed.
- Steps: append these lines to `.gitignore` if missing: `.dev.vars`, `dist/`, `.wrangler/`, `worker-configuration.d.ts`.
- Success criteria: all four lines are present.
- Verify: `for l in .dev.vars dist/ .wrangler/ worker-configuration.d.ts; do grep -qxF "$l" .gitignore || echo "MISSING $l"; done; echo DONE` prints only `DONE`.

### Task 1.6 — `src/lib/config.ts`
- Goal: one place for app constants.
- Steps: create the file with exactly these exports:
  ```ts
  export const APP_NAME = "Calobi";
  // Empty string = same origin (production). In dev set EXPO_PUBLIC_API_BASE=http://localhost:8787
  export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? "";
  export const HISTORY_LIMIT = 50;
  export const PORTION_OPTIONS = [0.5, 1, 1.5, 2] as const;
  export const NOTE_MAX = 200;
  export const CORRECTION_MAX = 300;
  export const COMMENT_MAX = 500;
  export const IMAGE_MAX_SIDE = 1024;
  export const IMAGE_JPEG_QUALITY = 0.6;
  export const THUMB_SIDE = 160;
  export const FEEDBACK_REASONS = ["wrong_dish", "portion_off", "missing_ingredient", "nutrients_off", "other"] as const;
  ```
- Success criteria: the file exists with these exports.
- Verify: no verification needed (covered by Task 1.11 typecheck).

### Task 1.7 — `src/lib/nutrition-schema.ts` (shared by app and Worker)
- Goal: one result type with a zod validator and a matching JSON schema for Claude structured output.
- Steps: create the file containing:
  1. `ConfidenceSchema = z.enum(["low","medium","high"])`
  2. `IngredientSchema = z.object({ name: z.string(), weight_g: z.number(), calories_kcal: z.number(), protein_g: z.number(), carbs_g: z.number(), fat_g: z.number() })`
  3. `NutritionResultSchema = z.object({ is_food: z.boolean(), dish_name: z.string(), serving_description: z.string(), total_weight_g: z.number(), calories_kcal: z.number(), calories_min_kcal: z.number(), calories_max_kcal: z.number(), confidence: ConfidenceSchema, protein_g: z.number(), carbs_g: z.number(), fat_g: z.number(), fiber_g: z.number(), sugar_g: z.number(), sodium_mg: z.number(), ingredients: z.array(IngredientSchema), quality_score: z.number(), quality_reasons: z.array(z.string()), notes: z.string() })`
  4. `export type NutritionResult = z.infer<typeof NutritionResultSchema>` and `export type Ingredient = z.infer<typeof IngredientSchema>`
  5. `export const NUTRITION_JSON_SCHEMA` is a plain object JSON Schema with the same keys. Every object has `"additionalProperties": false` and `required` listing **all** its properties. Use `"type": "number"` for numbers, `"type": "boolean"`, `"type": "string"`, `"enum": ["low","medium","high"]` for confidence, and `"type": "array"` with `items` for arrays. **Do not** use `minimum`, `maximum`, `minLength` or `maxLength` (the API rejects numeric/string constraints).
  6. `export function sanitizeResult(r: NutritionResult): NutritionResult` rounds `calories_*` to integers, grams to 1 decimal, and `sodium_mg` to an integer. It clamps `quality_score` to an integer in 0..100, and ensures `calories_min_kcal <= calories_kcal <= calories_max_kcal` (swap or widen if needed). It clamps negative numbers to 0 and applies the same rounding to each ingredient.
- Success criteria: types compile and the Task 1.10 tests pass.
- Verify: covered by Task 1.10.

### Task 1.8 — `src/lib/portion.ts` and `src/lib/format.ts`
- Goal: local portion scaling and copy-all text.
- Steps:
  1. `portion.ts`: `export function scaleResult(r: NutritionResult, m: number): NutritionResult` multiplies `total_weight_g`, all `calories_*`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`, `sugar_g`, `sodium_mg` and each ingredient's numeric fields by `m`, then returns `sanitizeResult(...)`. It does not change `quality_score`, `confidence`, or strings.
  2. `format.ts`: `export function formatNumber(n: number): string` returns an integer string if `n` is an integer, otherwise 1 decimal (`"12.5"`). Use `.` as decimal separator in both locales because tracker apps parse `.`. Also `export function buildCopyAllText(r: NutritionResult, labels: CopyLabels): string` where `CopyLabels = { calories: string; protein: string; carbs: string; fat: string; fiber: string; sugar: string; sodium: string }`. The output is lines of the form:
     ```
     <dish_name> (<serving_description>)
     <calories>: <kcal> kcal
     <protein>: <p> g
     <carbs>: <c> g
     <fat>: <f> g
     <fiber>: <fi> g
     <sugar>: <s> g
     <sodium>: <na> mg
     ```
- Success criteria: the functions are exported and tested in Task 1.10.
- Verify: covered by Task 1.10.

### Task 1.9 — `src/lib/i18n.ts` and `src/lib/storage.ts`
- Goal: VI/EN strings and all device persistence in one module each.
- Steps:
  1. `i18n.ts`: export `type Locale = "vi" | "en"` and `const strings = { vi: {...}, en: {...} }` with identical keys. Include keys for every UI string used in Phases 3–5 (onboarding titles and bodies ×3, next, back, getStarted, skip, takePhoto, pickPhoto, notePlaceholder, analyzing, cancel, retry, errors: offline / rateLimited / notFood / aiFailed / tooLarge / generic, result labels: calories, protein, carbs, fat, fiber, sugar, sodium, ingredients, range, confidence low/medium/high, qualityScore, estimateDisclaimer, copy, copied, copyAll, portion, fixResult, fixPlaceholder, send, feedbackTitle, thanks, comment, reason labels for each `FEEDBACK_REASONS` value, history, historyEmpty, delete, a2hsTitle, a2hsBody, dismiss). Export `detectLocale(): Locale`, which uses `getLocales()[0]?.languageCode === "vi" ? "vi" : "en"` from `expo-localization`. Also export a React context `I18nProvider` + hook `useI18n()` that returns `{ locale, setLocale, t }`, where `t` is `strings[locale]`. `setLocale` persists via `storage.setLocale`.
  2. `storage.ts` uses `@react-native-async-storage/async-storage`. Keys: `calobi.onboarded.v1`, `calobi.locale.v1`, `calobi.deviceId.v1`, `calobi.history.v1`, `calobi.a2hsDismissed.v1`. Export:
     - `getOnboarded(): Promise<boolean>`, `setOnboarded(): Promise<void>`
     - `getLocale(): Promise<Locale | null>`, `setLocale(l: Locale): Promise<void>`
     - `getDeviceId(): Promise<string>`: create once with `crypto.randomUUID()` if available, else a random hex string of 32 chars, then persist.
     - `type HistoryItem = { id: string; createdAt: number; note: string; thumbnail: string; result: NutritionResult; model: string; promptVersion: string; multiplier: number; feedback?: { rating: "up" | "down"; reasons: string[]; comment: string } }`
     - `listHistory(): Promise<HistoryItem[]>` (newest first), `getHistoryItem(id)`, `saveHistoryItem(item)` (upsert by id, keep newest `HISTORY_LIMIT`), `deleteHistoryItem(id)`
     - `getA2hsDismissed()`, `setA2hsDismissed()`
     - Wrap every read/write in try/catch. On a write error, drop the oldest 10 history items and retry once. Corrupt JSON reads return the empty default.
- Success criteria: both modules compile.
- Verify: covered by Task 1.11.

### Task 1.10 — Unit tests for the pure core
- Goal: the schema, sanitize, scaling and copy text are proven by tests.
- Steps:
  1. Create `vitest.config.ts`: `import { defineConfig } from "vitest/config"; export default defineConfig({ test: { include: ["src/lib/__tests__/**/*.test.ts", "worker/__tests__/**/*.test.ts"], environment: "node" } });`
  2. Add script `"test": "vitest run"` to `package.json`.
  3. `nutrition-schema.test.ts`:
     - a valid sample object passes `NutritionResultSchema.parse`
     - the key set of `NUTRITION_JSON_SCHEMA.properties` equals the key set of `NutritionResultSchema.shape`
     - `required` equals the full key list
     - `sanitizeResult` clamps `quality_score: 140` to 100 and fixes `min > kcal` ordering
  4. `portion.test.ts`: `scaleResult(sample, 2).calories_kcal === sample.calories_kcal * 2`, and ingredients are scaled.
  5. `format.test.ts`: `formatNumber(12)` equals `"12"`, `formatNumber(12.345)` equals `"12.3"`, and `buildCopyAllText` contains `"kcal"` and the dish name.
  6. Tests must import only from `src/lib/nutrition-schema.ts`, `portion.ts` and `format.ts` (no React Native imports).
- Success criteria: all tests pass.
- Verify: `npm test` exits 0 and the output contains `passed` with no `failed`.

### Task 1.11 — Typecheck and web boot
- Goal: the app compiles and the blank web app starts.
- Steps:
  1. `npx tsc --noEmit` (if `worker/` exists later, it has its own tsconfig; exclude `worker` in root `tsconfig.json` `exclude`).
  2. Start the web dev server in the background: `CI=1 npx expo start --web --port 8081`. Record its PID.
  3. Wait for it, then read the status: `for i in $(seq 1 45); do curl -sf -o /dev/null http://localhost:8081 && break; sleep 2; done; curl -s -o /dev/null -w "%{http_code}" http://localhost:8081`
  4. Stop the dev server you started (`kill <PID>`).
- Success criteria: typecheck is clean and the dev server answers 200.
- Verify: `npx tsc --noEmit` exits 0, and the final curl in step 3 prints `200`.

### Task 1.12 — Commit
- Steps: `git add -A && git commit -m "feat: scaffold Expo app with shared nutrition core"` (conventional commit, no AI references in the subject).
- Verify: `git log -1 --pretty=%s` prints `feat: scaffold Expo app with shared nutrition core`.

## Risks
- The template layout may differ between SDK versions. Task 1.2 step 6 normalizes it to `src/app/`.
- A zod major version may differ. Use only `z.object`, `z.enum`, `z.array`, `z.number`, `z.string`, `z.boolean`, `z.infer`, `.parse`, `.safeParse` and `.shape`, which exist in zod v3 and v4.

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
