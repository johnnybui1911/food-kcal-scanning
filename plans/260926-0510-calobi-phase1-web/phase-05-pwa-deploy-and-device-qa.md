---
phase: 5
title: "Phase 5: PWA, Deploy and Device QA"
status: in-progress
priority: P1
effort: "1.5h"
dependencies: [1, 2, 3, 4]
---

# Phase 5: PWA, Deploy and Device QA

## Goal
The app can be installed to the home screen (PWA manifest and Apple meta tags). It is deployed to `https://calobi.<account-subdomain>.workers.dev` with the API key stored as a secret, passes the production smoke test, and is checked by the user on a real iPhone and Android phone.

## Context
- The Worker name in `wrangler.jsonc` (`"name": "calobi"`) becomes part of the public URL. **Changing it after sharing the link changes the origin, and iOS users lose their saved history.** Confirm the final name with the user before Task 5.5.
- Expo single-output HTML template: `npx expo customize public/index.html` (verified in Expo docs 2026-09-26).

## Files to Create / Modify
- Create: `public/index.html` (via `expo customize`), `public/manifest.json`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/apple-touch-icon.png`
- Modify: none outside `public/` unless a Verify step fails

## Tasks

### Task 5.1 — HTML template with PWA tags
- Steps:
  1. `npx expo customize public/index.html` (accept defaults).
  2. In `public/index.html`, set `<html lang="vi">`. Inside `<head>` add:
     ```html
     <link rel="manifest" href="/manifest.json" />
     <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
     <meta name="apple-mobile-web-app-capable" content="yes" />
     <meta name="mobile-web-app-capable" content="yes" />
     <meta name="apple-mobile-web-app-title" content="Calobi" />
     <meta name="apple-mobile-web-app-status-bar-style" content="default" />
     <meta name="theme-color" content="#2F6F4F" />
     ```
     Also make sure the viewport meta contains `width=device-width, initial-scale=1, viewport-fit=cover`.
- Verify: `grep -c 'rel="manifest"\|apple-touch-icon\|apple-mobile-web-app-capable' public/index.html` prints `3`.

### Task 5.2 — Manifest and icons
- Steps:
  1. `mkdir -p public/icons`
  2. `sips -Z 192 assets/images/icon.png --out public/icons/icon-192.png`, `sips -Z 512 assets/images/icon.png --out public/icons/icon-512.png`, `sips -Z 180 assets/images/icon.png --out public/apple-touch-icon.png` (macOS `sips`; if `assets/images/icon.png` is missing, use the icon path from `app.json` `expo.icon`).
  3. Create `public/manifest.json`:
     ```json
     {
       "name": "Calobi",
       "short_name": "Calobi",
       "start_url": "/",
       "scope": "/",
       "display": "standalone",
       "background_color": "#F7F5F0",
       "theme_color": "#2F6F4F",
       "icons": [
         { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
         { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
       ]
     }
     ```
- Verify: `node -e "JSON.parse(require('fs').readFileSync('public/manifest.json','utf8'));console.log('OK')"` prints `OK`, and `ls public/icons/icon-192.png public/icons/icon-512.png public/apple-touch-icon.png` exits 0.

### Task 5.3 — Production build and secret scan
- Steps:
  1. `rm -rf dist && npx expo export -p web`
  2. Check that the build includes the PWA files and no secrets.
- Verify (all must hold):
  - `test -f dist/manifest.json && test -f dist/apple-touch-icon.png && echo OK` prints `OK`
  - `grep -rc "sk-ant" dist/ | grep -v ':0$' | wc -l` prints `0`
  - `grep -rc "ANTHROPIC_API_KEY" dist/ | grep -v ':0$' | wc -l` prints `0`

### Task 5.4 — Cloudflare login check (user action)
- Steps:
  1. Run `npx wrangler whoami`.
  2. If it says you are not logged in, STOP and ask the user to run `! npx wrangler login` in the prompt. Also ask them to open the Cloudflare dashboard → Workers & Pages once, so a workers.dev subdomain exists.
- Verify: `npx wrangler whoami` output contains `You are logged in`.

### Task 5.5 — Deploy and set the secret
- Precondition: the user confirmed the final Worker name (default `calobi`).
- Steps:
  1. `npx wrangler deploy`. Save the printed `https://calobi.<subdomain>.workers.dev` URL as `PROD_URL`.
  2. Set the secret from `.dev.vars` without printing it: `grep '^ANTHROPIC_API_KEY=' .dev.vars | cut -d= -f2- | tr -d '\n' | npx wrangler secret put ANTHROPIC_API_KEY`
  3. `npx wrangler secret list` shows `ANTHROPIC_API_KEY` (names only).
- Verify: `curl -s "$PROD_URL/api/health"` prints `{"ok":true}`, and `curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/"` prints `200`.

### Task 5.6 — Production smoke test
- Steps: `./scripts/smoke-api.sh "$PROD_URL"` (created in Phase 2, Task 2.9).
- Success criteria: all API paths work in production, and the scan takes under 10 s.
- Verify: the output contains `SMOKE PASS`, the exit code is 0, and the reported scan time is under 10 s. If the time is 10 s or more but everything else passes, record the time and continue. Latency is a tuning item (see the Phase 2 risks), not a blocker.
- If the output shows HTTP 500/503 or the Worker logs (`npx wrangler tail` during a re-run) mention `exceeded CPU`, STOP and follow the Failure Protocol.

### Task 5.7 — Commit and report
- Steps:
  1. `git add -A && git commit -m "feat: add PWA manifest and production deploy config"`
  2. Write `plans/260926-0510-calobi-phase1-web/reports/deploy-report.md` with `PROD_URL`, the deploy time, the smoke output (no secrets), the three scan latencies, and any deferred browser checks.
- Verify: `test -f plans/260926-0510-calobi-phase1-web/reports/deploy-report.md && echo OK` prints `OK`.

### Task 5.8 — Device QA (user performs; executor presents this checklist and waits)
Present this checklist to the user with `PROD_URL`. The phase is done only when the user confirms each item or reports failures.
- [ ] iPhone Safari: onboarding shows, and Get Started opens the scan screen.
- [ ] iPhone Safari: "Chụp ảnh" opens the camera, and a real meal returns a result in ~10 s.
- [ ] iPhone Safari: tapping protein copies only the number, which pastes correctly into Notes or a tracker app.
- [ ] iPhone Safari: Copy all pastes the multi-line text.
- [ ] iPhone Safari: the A2HS banner shows. After adding to the home screen and opening from the icon, the app runs full-screen. **Expected:** onboarding shows again and history starts empty, because iOS keeps home-screen app storage separate from Safari. That is not a failure. Scan once from the home-screen app, close it, reopen it, and the history must still be there.
- [ ] Android Chrome: camera, gallery pick, copy, ×2, Fix result, and 👍 feedback all work.
- [ ] Both: switching VI ↔ EN changes all text, and a non-food photo shows the "not food" message.
- [ ] Both: airplane mode, then scan, shows the offline message with Retry.
- If any item fails: STOP and follow the Failure Protocol with the device, browser, the exact step, and what the user saw.

### Task 5.9 — Clean up processes
- Steps: list any `wrangler dev` or `expo start` processes started in this plan (`ps aux | grep -E "wrangler dev|expo start" | grep -v grep`) and stop only those you started.
- Verify: the command prints nothing for processes you started.

## Security
- The key is only a Wrangler secret. `.dev.vars` stays local and gitignored.
- The user sets a monthly spend limit in the Claude Console before sharing the link.

## Rollback
- `npx wrangler rollback` reverts to the previous Worker version. `npx wrangler delete` removes it entirely (only if the user asks).

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
