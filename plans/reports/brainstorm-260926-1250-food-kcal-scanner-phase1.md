# Brainstorm — Food Kcal Scanner, Phase 1

Date: 2026-09-26 · Status: accepted, ready for planning

## Outcome
A cross-platform mobile app (iOS + Android) with no login. On first launch it shows onboarding slides that end in "Get Started". The user takes or picks a food photo, can add a short note, and the AI returns an estimate: total kcal (with a range and confidence), protein, carb, fat, fiber, sugar, sodium, a per-ingredient breakdown and a 0–100 food quality score with its reasons. Every value can be copied individually, or all at once as formatted text, for pasting into another tracker. Scans are saved on the device and can be viewed again or deleted.

## Positioning
This is a scanner, not a tracker. Most competitors (Cal AI, SnapCalorie, Foodvisor, and the VN apps Calz, CalPix and Chompr) are full trackers with paywalls. This app differs in three ways: no account, fast copy-out, and prompts tuned for Vietnamese dishes, whose hidden oil and fat is the known weak spot of competing apps.

## Decisions (user-confirmed)
- Stack: React Native + Expo.
- AI access: a thin serverless proxy (Cloudflare Worker or Vercel Function) that holds the API key, rate-limits per anonymous device ID, and enforces a structured JSON schema. No database.
- AI model: Claude Sonnet 5 (vision + structured output), with Haiku 4.5 as the cheaper fallback. The model can be swapped behind the proxy.
- Languages: Vietnamese and English, with the prompt tuned for Vietnamese dishes.
- Phase 1 features:
  1. Optional note before scanning ("phở bò tô lớn").
  2. "Fix result" with one sentence: the AI re-estimates from the previous result plus the user's correction, without a new photo.
  3. Portion multiplier (×0.5 / ×1 / ×1.5 / ×2), recomputed on the device.
  4. Food quality score (0–100) with reasons.
  5. Output-quality feedback, covered in the next section.
- Local persistence: a compressed thumbnail plus the result JSON on the device (expo-sqlite or AsyncStorage + FileSystem).

## Feedback without a database
- Each result has thumbs up/down, optional reason chips ("wrong dish", "portion off", "missing ingredient") and an optional comment. The feedback is stored locally with the scan.
- Feedback is also sent without blocking the UI (fire-and-forget) to a `/feedback` proxy endpoint, which writes structured events to managed analytics/logs (for example Cloudflare Workers Analytics Engine or Workers Logs). There is no database to own.
- Phase 1 sends no photo, only the rating, reasons, the AI result JSON, the model and prompt version, and the locale. This avoids image storage and privacy scope.
- If even that is unwanted, keep feedback local-only and add upload later. The UI does not change.

## Constraints
- No auth, no user database, no cloud sync.
- The API key never ships in the app binary.
- Results are labelled as estimates.

## Non-goals (Phase 1)
Daily logs, goals and progress; barcode or nutrition-label scanning; accounts and sync; payments; on-device ML; storing user photos on a server.

## Acceptance criteria
- Onboarding appears only on the first launch. "Get Started" leads to the scan screen.
- Camera and gallery both work, and permission denial is handled with guidance.
- On a normal connection, the time from photo to result is roughly ≤10 s.
- Every nutrient value copies on tap with a toast and haptic, and "Copy all" produces clean text.
- The portion multiplier and "Fix result" update the numbers correctly.
- History survives an app restart, and an item can be deleted.
- Offline, AI failures and non-food photos each show a clear message with a retry.
- The proxy rejects requests over the rate limit, and the key is not present in the app bundle.
- The UI works fully in both VI and EN.

## Trade-offs
- Expo vs Flutter vs native: Expo depends on a JS/TS-capable team and first-party Expo modules. It would first hit limits with deep camera control or on-device ML, and neither is in Phase 1.
- Proxy vs direct API call: the proxy adds one small deployable. A direct call first fails when the key is extracted from the bundle and abused.

## Better approaches
Add a thin proxy even though Phase 1 has "no backend". The evidence is that mobile bundles are extractable. The operational delta is one serverless function (~50–100 LOC), and the cost of the switch is near zero.

## Risks
- Accuracy on mixed or soup dishes and hidden oil. This is mitigated by the note, "Fix result", the range display and the feedback loop.
- Unbounded AI cost from anonymous use. This is mitigated by per-device rate limits and image downscaling before upload (~1024px JPEG).

## References
- Cal AI: https://www.calai.app/ — UI breakdown: https://screensdesign.com/showcase/cal-ai-calorie-tracker
- SnapCalorie: https://play.google.com/store/apps/details?id=com.snapcalorie.alpha002
- Accuracy overview: https://openhealth.blog/en/blog/ai-photo-calorie-tracking
- VN dish weakness: https://genk.vn/ung-dung-do-calo-bang-ai-nay-thu-ve-toi-hon-12-trieu-usd-mot-nam-toi-tai-ve-dung-thu-xem-co-thuc-su-hieu-qua-2025032415400845.chn

## Open questions
- Proxy host: Cloudflare Workers or Vercel? The default is Cloudflare, for its built-in rate limiting and Analytics Engine.
- App name and branding for onboarding and store listing.
- Daily scan cap per device (suggested 20/day).

## Update 2026-09-26 13:0x: Phase 1 ships as web first
- The goal changed: real users should be able to try it within 1–2 days, and store review and install friction are to be avoided.
- The recommendation keeps Expo (the user's decision) but ships Phase 1 as a web export (PWA) to static hosting (for example Cloudflare Pages). The Cloudflare Worker proxy is unchanged. Native builds come later via EAS from the same codebase.
- Next.js PWA was considered and rejected because the UI would have to be rebuilt for native, and a Capacitor wrap risks Apple guideline 4.2. Native plus TestFlight was rejected because the first external build needs Beta App Review (~24h, up to 48h) and users must install the app.
- New risks:
  - iOS Safari deletes script storage after 7 days without interaction unless the site is added to the Home Screen. Mitigate with a manifest, an A2HS hint, and "saved on this device" copy.
  - Clipboard writes must run synchronously inside the tap handler.
  - Device ID can be forged on the web, so rate-limit per IP as well and set a spend cap on the API account.
  - The production domain must be frozen before sharing, because iOS ties PWA storage to the domain.
- Code rule: only web-compatible Expo modules, with `Platform.OS` branches for haptics and thumbnail storage. No carousel or animation libraries without web support.
- HTML brief: `brainstorm.html`.
