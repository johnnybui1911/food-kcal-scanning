---
phase: 4
title: "Phase 4: Result Screen and History"
status: completed
priority: P1
effort: "2h"
dependencies: [1, 2, 3]
---

# Phase 4: Result Screen and History

## Goal
The result screen shows the full estimate. The user can tap any number to copy it or use Copy all, change the portion multiplier locally, fix the result with one sentence, and send thumbs feedback with reasons. A history screen lists saved scans and can open or delete each one.

## Context
- Data comes from `getHistoryItem(id)` in `src/lib/storage.ts` (`HistoryItem`, see Phase 1 Task 1.9).
- Helpers: `scaleResult` (`src/lib/portion.ts`), `formatNumber` and `buildCopyAllText` (`src/lib/format.ts`), `copyText` (`src/lib/clipboard.ts`), `useToast`, `refineResult` and `sendFeedback` (`src/lib/api-client.ts`).
- Mockup: `plans/reports/brainstorm.html`, third phone ("Kết quả"), callouts 5–8.
- **Clipboard rule:** call `copyText(...)` as the first statement of an `onPress` handler, and never `await` anything before it.

## Files to Create / Modify
- Create: `src/components/nutrient-row.tsx`, `src/components/quality-badge.tsx`, `src/components/feedback-panel.tsx`
- Create: `src/app/result/[id].tsx`, `src/app/history.tsx`

## Tasks

### Task 4.1 — `src/components/nutrient-row.tsx`
- Steps: export `NutrientRow({ label, value, unit })`. It renders one full-width `Pressable` row (min height 48) with the label on the left and `formatNumber(value) + " " + unit` plus a small "Copy" chip on the right. `onPress = () => { copyText(formatNumber(value)); toast.show(t.copied + ": " + formatNumber(value)); }`. The copied text is **the number only**, without the unit. It uses `accessibilityRole="button"` and `accessibilityLabel={`${label} ${formatNumber(value)} ${unit}, ${t.copy}`}`.
- Verify: no verification needed (covered by Task 4.7).

### Task 4.2 — `src/components/quality-badge.tsx`
- Steps: export `QualityBadge({ score, reasons })`. It shows the score out of 100 in a colored pill: score ≥ 70 uses accent green, 40–69 uses `#A2561B`, and under 40 uses the error color. The label is `t.qualityScore`. Below it is a bullet list of `reasons`.
- Verify: no verification needed.

### Task 4.3 — `src/components/feedback-panel.tsx`
- Steps: export `FeedbackPanel({ item, onSaved })`.
  1. Show two buttons, 👍 and 👎. Selecting one sets `rating`.
  2. After a rating is chosen, show reason chips for every `FEEDBACK_REASONS` value (multi-select, labels from `t`), a `TextInput` comment (`maxLength={COMMENT_MAX}`, placeholder `t.comment`), and a `Send` button.
  3. Send calls `sendFeedback({ rating, reasons, comment, dish_name: item.result.dish_name, calories_kcal: item.result.calories_kcal, quality_score: item.result.quality_score, model: item.model, prompt_version: item.promptVersion, locale })` and does not block the UI on failure. It then saves `feedback` into the history item (`saveHistoryItem({ ...item, feedback })`), calls `onSaved`, and replaces the panel with `t.thanks`.
  4. If `item.feedback` already exists, show `t.thanks` instead of the form.
- Verify: no verification needed (covered by Task 4.7).

### Task 4.4 — `src/app/result/[id].tsx`
- Goal: the screen in mockup 3.
- Steps:
  1. Read `id` with `useLocalSearchParams()` and load `getHistoryItem(id)`. If it is not found, show `t.errors.generic` and a button back to `/`.
  2. `const shown = scaleResult(item.result, item.multiplier)`.
  3. Render these sections top to bottom:
     - A top bar with a back button (`router.canGoBack() ? router.back() : router.replace("/")`) and `LanguageToggle`.
     - The thumbnail (height 180, cover), `shown.dish_name` (title) and `shown.serving_description` (muted).
     - Big kcal: `formatNumber(shown.calories_kcal)` + " kcal", pressable to copy the number. Below it, muted: `t.range` + `${min}–${max} kcal` and the confidence label from `t`.
     - `t.estimateDisclaimer` in small muted text (VI: "Kết quả là ước tính từ ảnh, có thể sai lệch." EN: "This is an estimate from a photo and may be inaccurate.").
     - Portion chips for each value in `PORTION_OPTIONS` (label `×0.5`, `×1`, `×1.5`, `×2`). The active chip is filled. Pressing one updates `item.multiplier` in state and persists with `saveHistoryItem`. Only local recalculation happens here, with no network call.
     - `NutrientRow`s for protein (g), carbs (g), fat (g), fiber (g), sugar (g) and sodium (mg).
     - A `PrimaryButton` with `t.copyAll`: `onPress = () => { copyText(buildCopyAllText(shown, labels)); toast.show(t.copied); }`, where the labels come from `t`.
     - `QualityBadge` with `shown.quality_score` and `shown.quality_reasons`.
     - An ingredients list (`t.ingredients`): each row shows name, weight g and kcal, scaled.
     - Fix result: a `TextInput` (`maxLength={CORRECTION_MAX}`, placeholder `t.fixPlaceholder`, e.g. "ít bánh hơn, thêm 1 muỗng dầu") and a Send button. It calls `refineResult({ previous: item.result, correction, locale })` with a loading state. On `ok`, it updates the item with `{ result: data.result, model: data.model, promptVersion: data.prompt_version, multiplier: 1, feedback: undefined }`, persists it, clears the input and shows a toast. On error it shows the `t.errors` message inline.
     - `FeedbackPanel`.
     - `shown.notes` in muted text if it is not empty.
  4. Wrap the content in a `ScrollView`, and apply `maxWidth: 480`, `width: "100%"`, `alignSelf: "center"`.
- Verify: covered by Tasks 4.6 and 4.7.

### Task 4.5 — `src/app/history.tsx`
- Steps:
  1. Load `listHistory()` on focus (use `useFocusEffect` from expo-router with `useCallback`).
  2. If it is empty, show `t.historyEmpty` and a button to `/`.
  3. Each row has the thumbnail (48×48), `dish_name`, the date (`new Date(createdAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")`) and `formatNumber(scaleResult(result, multiplier).calories_kcal) + " kcal"`. Pressing a row calls `router.push({ pathname: "/result/[id]", params: { id } })`. Never use string concatenation, because typed routes reject it.
  4. Each row also has a delete button (`t.delete`, icon 🗑) that calls `deleteHistoryItem(id)` and reloads. Do not use `Alert` or `window.confirm`, since they block browser automation. Delete immediately and show a toast.
  5. Show a small muted footer with the note that history is saved only on this device (VI: "Lịch sử chỉ lưu trên thiết bị này.").
- Verify: covered by Task 4.6.

### Task 4.6 — Typecheck, tests, web export
- Verify:
  1. `npx tsc --noEmit` exits 0.
  2. `npm test` exits 0 and the output contains no `failed`.
  3. `npx expo export -p web` exits 0.

### Task 4.7 — Local end-to-end check
- Steps:
  1. Start `npx wrangler dev --port 8787` in the background and record the PID.
  2. `for i in $(seq 1 45); do curl -sf -o /dev/null http://localhost:8787/history && break; sleep 2; done; curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/history` prints `200`.
  3. If browser automation is available: complete a scan with `scripts/fixtures/food-1024.jpg`. On the result page, check that the kcal text and at least 6 nutrient rows are visible. Click `×2` and confirm the kcal number doubles (±1). Submit "ít bánh hơn" in Fix result and confirm the page still shows a kcal value with no error. Click 👍, choose a reason and Send, then confirm the thanks text appears. Go to `/history`, confirm one row appears, then delete it and confirm the empty state. Reload `/history` after a new scan and confirm the row persists. If no browser automation is available, write `Browser check deferred to Phase 5 device QA`.
  4. Stop the wrangler process you started.
- Verify: step 2 prints `200`. If step 3 ran, every listed check holds.

### Task 4.8 — Commit
- Steps: `git add -A && git commit -m "feat: add result screen, copy, portion, refine, feedback and history"`
- Verify: `git log -1 --pretty=%s` prints that message.

## Risks
- **Clipboard on iOS:** if copy fails silently on iPhone in Phase 5, check that no `await` happens before `copyText` in the handler.
- **localStorage size:** thumbnails are about 10–20 KB each and history is capped at 50, so the total is about 1 MB, under the 5 MB limit. `saveHistoryItem` drops the oldest items on a write error.

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
