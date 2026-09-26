# System architecture

## Boundaries

```
Phone browser ──► Cloudflare Worker (one deploy, workers.dev)
                    ├── static assets: Expo web export (dist/, SPA fallback)
                    └── /api/* (worker runs first)
                          ├── scan, refine ──► Claude API (vision + JSON schema)
                          ├── feedback     ──► Analytics Engine + Workers Logs
                          ├── health
                          └── quotas: rate-limit binding (burst) + Durable Object (daily)
Device storage (AsyncStorage → localStorage on web): onboarding flag, locale,
device ID, history (capped), A2HS dismissal
```

- **Client** — Expo Router app under [`src/`](../src/). The same code is meant to
  build for iOS and Android later; today only the web export ships.
- **Worker** — [`worker/index.ts`](../worker/index.ts) routes `/api/*` and hands
  everything else to the static assets binding. Bindings, vars, and limits are
  declared in [`wrangler.jsonc`](../wrangler.jsonc).
- **Shared contract** — [`src/lib/nutrition-schema.ts`](../src/lib/nutrition-schema.ts)
  is imported by both the app and the Worker. It holds the zod schema, the JSON
  schema sent to Claude, and the sanitizer applied to every result.

## Request path

Checks run cheapest first, so abusive or malformed traffic is rejected before it
costs CPU or tokens: device ID shape → burst limit → content-length cap → JSON
parse and validation → daily quotas → Claude. The HTTP status of each failure is
mapped to a user-facing error kind in [`src/lib/api-client.ts`](../src/lib/api-client.ts).

## Abuse and cost control

| Layer | Why it exists |
|---|---|
| Burst limit, keyed by device ID | Stops tap-spamming. Keyed by device rather than IP because Vietnamese mobile carriers put many users behind one IP (CGNAT). |
| Daily caps per device, per IP, and global | The device ID is forgeable on the web, so IP and a global ceiling bound the worst case. |
| Anthropic monthly spend limit | Final backstop outside the code. |
| Client-side downscale to 1024 px JPEG | Keeps tokens and upload size small; the Worker rejects oversized bodies with 413. |

Limit values are Worker vars in [`wrangler.jsonc`](../wrangler.jsonc); change them
there, not in code.

## Decision ledger

| Decision | Rationale | Rejected alternatives |
|---|---|---|
| Expo (React Native) for the client | One codebase for web now and native later. | Flutter; separate native apps. |
| Ship phase 1 as a web export (PWA) | Real users within a day, no store review or install friction. | Native + TestFlight (external beta review takes 24–48 h and requires an install); Next.js PWA (UI would be rebuilt for native); Capacitor wrap (App Store guideline 4.2 risk). |
| Thin Worker proxy instead of calling Claude from the client | Mobile and web bundles are extractable; the key must stay server-side. | Direct API calls. |
| One Worker serves both assets and API | Single deploy, same origin, no CORS in production. | Separate Pages site plus Worker. |
| Primary model `claude-sonnet-5` at low effort, fallback `claude-haiku-4-5` | Speed with good vision quality; the fallback covers 5xx, connection errors and 429 (rate limits are per model). Haiku 4.5 rejects the `effort` field, so it gets only the output format. See [`worker/claude.ts`](../worker/claude.ts). | Single model with no fallback. |
| Structured output via `output_config.format` JSON schema, then zod validation | The model is constrained to the schema, and the Worker still refuses anything that does not parse. | Free-text parsing. |
| Daily quotas in a SQLite-backed Durable Object | The rate-limit binding only supports 10 s / 60 s windows; SQLite Durable Objects are available on the Workers Free plan and give atomic read-then-write. | KV (eventually consistent); a database. |
| AsyncStorage on every platform | One storage code path; it maps to localStorage on web. An in-memory mirror keeps the session usable when browser storage is blocked, so onboarding cannot loop. | IndexedDB; expo-sqlite. |
| Feedback to Analytics Engine and logs | Collects quality signal with no database to own. | A feedback table. |
| Free `workers.dev` domain | Fastest path to production. Moving to a custom domain later resets iOS home-screen storage; that cost is accepted. | Custom domain at launch. |

## Known platform behavior

- iOS keeps home-screen web app storage separate from Safari. After Add to Home
  Screen, onboarding shows again and history starts empty. This is expected.
- iOS Safari deletes script storage after 7 days without interaction unless the
  site is on the Home Screen. The A2HS banner and "saved on this device" copy
  exist because of this.
