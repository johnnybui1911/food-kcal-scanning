# Project overview

## Intent

Calobi is a food **scanner**, not a calorie tracker. A user takes or picks a
photo of a meal, optionally adds a short note, and receives an estimate of total
kcal (with a range and a confidence level), macros, fiber, sugar, sodium, a
per-ingredient breakdown, and a 0–100 food quality score with reasons. Every
number copies on tap so it can be pasted into whatever tracker the user already
uses.

## Positioning

Competing apps (Cal AI, SnapCalorie, Foodvisor, and Vietnamese apps such as
Calz, CalPix and Chompr) are full trackers behind accounts and paywalls. Calobi
differs on three points:

- **No account.** Nothing to sign up for; history stays on the device.
- **Fast copy-out.** One tap per number, or "Copy all" as formatted text.
- **Vietnamese dishes first.** The prompt accounts for the hidden oil, broth fat,
  condensed milk and sauce sugar that competitors underestimate. See
  `buildScanSystem` in [`worker/prompt.ts`](../worker/prompt.ts).

## Business constraints

- The Anthropic API key never reaches the client bundle. All AI calls go through
  the Worker proxy.
- There is no user database and no cloud sync. Photos are never stored on a
  server; only a small thumbnail is kept locally with each history item.
- Every result is labelled as an estimate.
- Anonymous use has a real cost, so the Worker enforces burst and daily quotas,
  and the Anthropic account carries a monthly spend limit set in the Claude
  Console. See [system-architecture.md](./system-architecture.md#abuse-and-cost-control).
- Feedback is collected without a database: rating, reason chips, comment, and
  the result summary go to Workers Analytics Engine and Workers Logs. No photo is
  ever sent with feedback.

## Non-goals

Daily logs, goals and progress tracking; barcode or nutrition-label scanning;
accounts and sync; payments; on-device ML; server-side photo storage.

## Terminology

| Term | Meaning |
|---|---|
| Scan | One photo (plus optional note) sent to `/api/scan` and the estimate it returns |
| Refine / "Fix result" | Re-estimation from the previous result plus one correction sentence, without a new photo |
| Portion multiplier | ×0.5 / ×1 / ×1.5 / ×2 applied on the device; no AI call |
| Quality score | 0–100 nutritional quality rating with 2–4 short reasons |
| Device ID | Random anonymous ID generated per browser storage; used only for quotas and feedback grouping |
| A2HS | "Add to Home Screen" on iOS, which installs the PWA and keeps its storage alive |

## Supported languages

Vietnamese and English, auto-detected from the device and switchable in the app.
The UI strings live in [`src/lib/strings.ts`](../src/lib/strings.ts); the AI
answers in the selected locale.

## Open product questions

- "Calobi" is a working name. The final name and branding are undecided.
