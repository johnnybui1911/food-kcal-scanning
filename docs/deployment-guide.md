# Deployment guide

## Environments

| Environment | What runs | Secrets from |
|---|---|---|
| Local | `npx wrangler dev` on port 8787 (Worker + built `dist/`), optionally the Expo dev server for hot reload | `.dev.vars` (gitignored) |
| Production | One Cloudflare Worker on the account's `workers.dev` subdomain, serving assets and `/api/*` | Wrangler secret `ANTHROPIC_API_KEY` |

There is no staging environment.

## Prerequisites

- An Anthropic API key with a monthly spend limit set in the Claude Console.
- A Cloudflare account with a `workers.dev` subdomain, logged in via
  `npx wrangler login` (interactive).
- `npm install` uses the public registry through the project [`.npmrc`](../.npmrc).

## Local development

1. Put `ANTHROPIC_API_KEY=...` in `.dev.vars`. Never commit this file.
2. Run `npx wrangler types` once to generate the Worker `Env` types.
3. Choose one loop:
   - **Production-like:** `npx expo export -p web`, then `npx wrangler dev --port 8787`
     and open `http://localhost:8787`. App and API share one origin, as in production.
   - **Hot reload:** run `npx wrangler dev --port 8787`, add
     `ALLOWED_DEV_ORIGIN=http://localhost:8081` to `.dev.vars` so the Worker sends
     CORS headers, and start the app with
     `EXPO_PUBLIC_API_BASE=http://localhost:8787 npx expo start --web --port 8081`.
4. Stop the dev servers you started when done; the release script refuses to run
   while port 8787 is busy.

## Release

[`scripts/release.sh`](../scripts/release.sh) owns the whole release: preflight
(key, food photo fixture, Cloudflare login, free port), tests and typechecks, web
export with a secret-string scan, local smoke against real Claude, `wrangler
deploy`, setting the `ANTHROPIC_API_KEY` secret from `.dev.vars`, and a
production smoke test. It prints the production URL on success. Read the script
rather than running its steps by hand.

The smoke test needs a real food photo at `scripts/fixtures/food.jpg`
(gitignored). The script resizes it with macOS `sips`, so releases currently run
from macOS.

After a release, run the device QA checklist (Task 5.8 in the
[phase 5 plan](../plans/260926-0510-calobi-phase1-web/phase-05-pwa-deploy-and-device-qa.md))
on a real iPhone and Android phone.

## Configuration changes

Models, AI effort, and quota limits are Worker vars in
[`wrangler.jsonc`](../wrangler.jsonc). Changing them needs a redeploy, not a code
change.

## Operational routes

### API key

- **When to use:** rotating the key or setting it after a new deploy.
- **Source of truth:** the Anthropic Claude Console (key and spend limit); the
  deployed copy is the Wrangler secret `ANTHROPIC_API_KEY` on the `calobi` Worker.
- **How:** `npx wrangler secret put ANTHROPIC_API_KEY` reads the value from stdin;
  `release.sh` does this from `.dev.vars`. Never paste the key into chat, docs,
  or `wrangler.jsonc`.
- **Verify:** `curl <prod>/api/health` returns `{"ok":true}`, then
  `scripts/smoke-api.sh <prod-url>` passes.

### Logs

- **When to use:** AI failures, fallbacks, latency, or feedback events.
- **Source of truth:** Workers Logs (observability is enabled in `wrangler.jsonc`)
  for the `calobi` Worker, in the Cloudflare dashboard, or live with
  `npx wrangler tail calobi`.
- **Shape:** one JSON line per event with an `evt` field; event names are in
  [`worker/index.ts`](../worker/index.ts) and [`worker/claude.ts`](../worker/claude.ts).
- **Limits:** feedback logs include free-text comments from users; treat them as
  user data. Stop a live tail when done. An empty result can mean a wrong filter
  or retention, not the absence of failures.

### Feedback analytics

- **Source of truth:** Workers Analytics Engine dataset `calobi_feedback`
  (binding `FEEDBACK`). The field order is the `writeDataPoint` call in
  [`worker/index.ts`](../worker/index.ts).
- **How to look up:** not yet verified. Querying needs the Analytics Engine SQL
  API with a Cloudflare API token that has Account Analytics read access. Record
  the verified query route here once it has been used.

### Rollback

- `npx wrangler rollback` reverts the Worker to its previous version. Confirm
  with `/api/health` and the smoke test afterwards.
- `npx wrangler delete` removes the Worker entirely; only do this on an explicit
  owner decision.

## Domain

Production uses the free `workers.dev` URL. Freeze the domain before sharing the
link widely: iOS ties home-screen app storage to the domain, so moving to a
custom domain later resets installed users' history.
