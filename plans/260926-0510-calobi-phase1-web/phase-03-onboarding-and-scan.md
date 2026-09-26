---
phase: 3
title: "Phase 3: Onboarding and Scan Screen"
status: completed
priority: P1
effort: "2h"
dependencies: [1, 2]
---

# Phase 3: Onboarding and Scan Screen

## Goal
First launch shows three onboarding slides ending in "Get Started" / "Bắt đầu". The scan screen lets the user take or pick a photo and add a note. The photo is downscaled, sent to `/api/scan`, saved to history on success, and opens the result screen. Every error has a clear message and a retry.

## Context
- API contract: see the table in `phase-02-worker-ai-proxy.md`. Use it exactly.
- Mockups: `plans/reports/brainstorm.html` ("Mockup giao diện" section). The layout is a single column with max width 480 px, centered on wide screens.
- Style tokens: accent `#2F6F4F`, ink `#1D1B18`, muted `#6B665D`, surface `#FFFFFF`, background `#F7F5F0`, line `#E3DED3`, error `#9B2C2C`. Radius 12 and spacing on a 4 px scale. Every pressable is at least 44 px tall.
- Use only React Native core components (`View`, `Text`, `Pressable`, `TextInput`, `Image`, `ScrollView`, `ActivityIndicator`) and the Expo modules installed in Phase 1. Do not add carousel or animation libraries.

## Files to Create / Modify
- Create: `src/lib/theme.ts`, `src/lib/image.ts`, `src/lib/api-client.ts`, `src/lib/clipboard.ts`
- Create: `src/components/toast.tsx`, `src/components/primary-button.tsx`, `src/components/language-toggle.tsx`, `src/components/a2hs-banner.tsx`
- Create: `src/app/onboarding.tsx`
- Modify: `src/app/_layout.tsx`, `src/app/index.tsx`

## Tasks

### Task 3.1 — `src/lib/theme.ts` and `src/components/primary-button.tsx`
- Steps:
  1. `theme.ts` exports `colors` (the tokens above), `space = (n: number) => n * 4`, and `radius = 12`.
  2. `primary-button.tsx` exports `PrimaryButton({ label, onPress, variant = "solid" | "ghost", disabled, loading })`. The solid variant has the accent background and white text. The ghost variant has an accent border and accent text. The disabled state uses opacity 0.5 and ignores presses. Loading shows an `ActivityIndicator`. It has `accessibilityRole="button"` and a minimum height of 48.
- Verify: no verification needed (covered by Task 3.9).

### Task 3.2 — `src/lib/image.ts`
- Goal: pick a photo and produce the upload payload and a small thumbnail.
- Steps:
  1. Export `type PreparedImage = { base64: string; mediaType: "image/jpeg"; thumbnail: string }`. `thumbnail` is a `data:image/jpeg;base64,...` URI.
  2. Export `async function pickImage(source: "camera" | "library"): Promise<ImagePicker.ImagePickerAsset | null>`:
     - On native only (`Platform.OS !== "web"`), request `ImagePicker.requestCameraPermissionsAsync()` for camera or `requestMediaLibraryPermissionsAsync()` for library. If denied, throw `new Error("permission_denied")`.
     - Call `ImagePicker.launchCameraAsync` or `ImagePicker.launchImageLibraryAsync` with `{ mediaTypes: ["images"], quality: 1, allowsEditing: false }`.
     - Return `result.canceled ? null : result.assets[0]`.
  - **Web rule:** browsers only open the file/camera picker inside a user gesture. In the button `onPress`, `pickImage` must be the first awaited call, with no other `await` before it. Browsers may never resolve the promise if the user cancels, so never set any "analyzing" or disabled state before `pickImage` resolves.
  3. Export `async function prepareImage(asset): Promise<PreparedImage>`:
     - Compute the resize so the longest side is at most `IMAGE_MAX_SIDE`. Use `{ width: min(IMAGE_MAX_SIDE, asset.width) }` if `asset.width >= asset.height`, else `{ height: min(IMAGE_MAX_SIDE, asset.height) }`. If `width`/`height` are 0 or undefined, use `{ width: IMAGE_MAX_SIDE }`.
     - Use expo-image-manipulator. Prefer the contextual API: `const ctx = ImageManipulator.manipulate(asset.uri); ctx.resize(size); const img = await ctx.renderAsync(); const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: IMAGE_JPEG_QUALITY, base64: true });`. If `ImageManipulator.manipulate` does not exist in the installed version (tsc error), use `manipulateAsync(asset.uri, [{ resize: size }], { compress: IMAGE_JPEG_QUALITY, format: SaveFormat.JPEG, base64: true })`.
     - Make the thumbnail the same way with a longest side of `THUMB_SIDE` and compress 0.5.
     - Strip any `data:...;base64,` prefix from `base64` before returning it.
- Verify: no verification needed (covered by Tasks 3.9 and 3.10).

### Task 3.3 — `src/lib/api-client.ts`
- Goal: typed calls that map every HTTP outcome to a small error kind.
- Steps:
  1. Export `type ApiErrorKind = "offline" | "rate_limited" | "not_food" | "ai_failed" | "too_large" | "bad_request" | "generic"`.
  2. Export `type ApiResult<T> = { ok: true; data: T } | { ok: false; kind: ApiErrorKind; result?: NutritionResult }`.
  3. Export `type ScanResponse = { result: NutritionResult; model: string; prompt_version: string }`.
  4. Write an internal `post(path, body, signal)` that calls `fetch(API_BASE + path, { method: "POST", headers: { "content-type": "application/json", "x-device-id": await getDeviceId() }, body: JSON.stringify(body), signal })`.
     - A thrown `TypeError` (network) maps to `offline`. An `AbortError` re-throws so the caller can ignore it.
     - Status 200 maps to `ok: true` with the JSON body, and 204 maps to `ok: true` with `data: null`.
     - 413 maps to `too_large`, 422 to `not_food` (include `result` from the body), 429 to `rate_limited`, 400 to `bad_request`, 502 to `ai_failed`, and anything else to `generic`.
  5. Export `scanFood(input: { image_base64; media_type; note; locale }, signal?)`, `refineResult(input: { previous; correction; locale }, signal?)` and `sendFeedback(input)`. They are thin wrappers over `post` using `/api/scan`, `/api/refine` and `/api/feedback`.
- Verify: no verification needed (covered by Task 3.9).

### Task 3.4 — `src/lib/clipboard.ts` and `src/components/toast.tsx`
- Goal: copy works on iOS Safari. The clipboard write must start synchronously inside the tap handler.
- Steps:
  1. `clipboard.ts`: `export function copyText(text: string): Promise<boolean>`. The **first statement** is `const p = Clipboard.setStringAsync(text);` with no `await` before it. Then, if `Platform.OS !== "web"`, call `Haptics.selectionAsync().catch(() => {})`. Return `p.then(() => true).catch(() => false)`.
  2. `toast.tsx`: export `ToastProvider` and `useToast()` returning `show(message: string)`. It renders one bottom-centered pill for 1600 ms with `accessibilityLiveRegion="polite"` and `role="status"`.
- Rule for callers (repeat this in code comments): call `copyText` directly in `onPress`, and never `await` anything before it in the same handler.
- Verify: no verification needed.

### Task 3.5 — `src/components/language-toggle.tsx` and `src/components/a2hs-banner.tsx`
- Steps:
  1. `language-toggle.tsx` renders a two-segment control `VI | EN` using `useI18n()`. The active segment has the accent background, and pressing it calls `setLocale`.
  2. `a2hs-banner.tsx` renders only when all of these hold: `Platform.OS === "web"`; `/iphone|ipad|ipod/i.test(navigator.userAgent)`; `!(window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true)`; and `getA2hsDismissed()` is false. It shows `t.a2hsTitle` and `t.a2hsBody` (VI: "Nhấn nút Chia sẻ rồi chọn “Thêm vào MH chính” để giữ lịch sử lâu dài." EN: "Tap Share, then “Add to Home Screen” to keep your history."). Its dismiss button calls `setA2hsDismissed()`.
- Verify: no verification needed.

### Task 3.6 — `src/app/_layout.tsx`
- Steps: wrap the app in `I18nProvider` and then `ToastProvider`, and render `<Stack screenOptions={{ headerShown: false }} />`. The `I18nProvider` initial locale is `getLocale()` from storage, else `detectLocale()`. Render nothing until the locale is loaded, so strings don't flash.
- Verify: no verification needed.

### Task 3.7 — `src/app/onboarding.tsx`
- Goal: three button-driven slides, with Get Started on the last one.
- Steps:
  1. State `step` is 0..2. The slide content comes from `t` keys: (0) take a photo of your meal; (1) AI estimates kcal and nutrients, which are estimates you can fix; (2) tap any number to copy it into your tracker app. Each slide shows a large emoji illustration (📸 / 🤖 / 📋), a title and a body.
  2. Show dots for the 3 steps, with the active dot wider and accent colored.
  3. Show buttons: `Skip` (ghost, steps 0–1), `Back` (ghost, steps 1–2), and `Next` (solid, steps 0–1) or `t.getStarted` (solid, step 2).
  4. Get Started and Skip both call `await setOnboarded()` and then `router.replace("/")`.
  5. Put `LanguageToggle` at the top right.
- Verify: no verification needed (covered by Task 3.10).

### Task 3.8 — `src/app/index.tsx` (scan screen)
- Goal: the main screen described in the mockup.
- Steps:
  1. On mount, read `getOnboarded()`. If false, call `router.replace("/onboarding")` and render nothing. If true, render the screen.
  2. The header has `APP_NAME` on the left, and `LanguageToggle` plus a "History" link (`router.push("/history")`) on the right. Below it is `A2hsBanner`.
  3. The body has the photo preview (thumbnail, or a placeholder box with 🍜), then `TextInput` for the note (`maxLength={NOTE_MAX}`, placeholder `t.notePlaceholder`), then `PrimaryButton` "📷 " + `t.takePhoto` (solid) and "🖼 " + `t.pickPhoto` (ghost).
  4. The flow for either button:
     - `pickImage(source)`. If it returns null, do nothing. If it throws `permission_denied`, show `t.errors.generic`.
     - `prepareImage`, and keep the result in state as `lastImage` for retry.
     - Set `status = "analyzing"`, show a spinner with `t.analyzing` and a Cancel button that aborts an `AbortController`.
     - `scanFood({ image_base64, media_type: "image/jpeg", note: note.trim(), locale }, controller.signal)`.
     - On `ok`: build a `HistoryItem` (`id` = `Date.now().toString(36) + Math.random().toString(36).slice(2, 8)`, `createdAt`, `note`, `thumbnail`, `result`, `model`, `promptVersion` = `prompt_version`, `multiplier: 1`), then `await saveHistoryItem(item)` and `router.push({ pathname: "/result/[id]", params: { id: item.id } })`.
     - On an error kind, set `status = "error"` and show the matching message from `t.errors` (map `offline`, `rate_limited`, `not_food`, `ai_failed`, `too_large`, and anything else to `generic`). Show a Retry button that re-sends `lastImage` without picking again (hide Retry for `rate_limited`).
     - On abort, return to idle silently.
  5. Disable both pick buttons while analyzing.
- Verify: covered by Tasks 3.9 and 3.10.

### Task 3.9 — Typecheck and web export
- Verify:
  1. `npx tsc --noEmit` exits 0.
  2. `npx expo export -p web` exits 0 and `test -f dist/index.html && echo OK` prints `OK`.
  3. `grep -rl "Get Started" dist/ | head -1` prints a file path (the i18n strings are bundled).

### Task 3.10 — Local end-to-end check
- Goal: onboarding and a real scan work in a browser against local wrangler.
- Steps:
  1. Start `npx wrangler dev --port 8787` in the background (it serves `dist/` and `/api/*` on the same origin, so no dev CORS is needed). Record the PID.
  2. `for i in $(seq 1 45); do curl -sf -o /dev/null http://localhost:8787/onboarding && break; sleep 2; done; curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/onboarding` must print `200` (SPA fallback).
  3. If a browser automation capability is available (for example the `ak-agent-browser` or Claude-in-Chrome skill), open `http://localhost:8787`, confirm the onboarding appears, click through to "Get Started", upload `scripts/fixtures/food-1024.jpg` with "Pick photo", and confirm the URL changes to `/result/...`. If no browser automation is available, write `Browser check deferred to Phase 5 device QA` in the phase report and continue.
  4. Stop the wrangler process you started.
- Verify: step 2 prints `200`. If step 3 ran, the final URL contains `/result/`.

### Task 3.11 — Commit
- Steps: `git add -A && git commit -m "feat: add onboarding and scan flow"`
- Verify: `git log -1 --pretty=%s` prints `feat: add onboarding and scan flow`.

## Risks
- **iOS Safari clipboard:** see Task 3.4. It is also exercised in Phase 4.
- **The camera on web opens the system camera through a file input,** not a live viewfinder. This is accepted for Phase 1.
- **Large photos:** downscaling happens before upload. If the Worker returns 413, lower `IMAGE_MAX_SIDE`.

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
