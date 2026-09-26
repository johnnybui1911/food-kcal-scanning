#!/usr/bin/env bash
# One-shot release for Calobi: preflight, checks, build, local AI smoke, deploy, secret, production smoke.
# Usage: scripts/release.sh
set -uo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n==> %s\n' "$1"; }
die() { printf '\nRELEASE FAIL: %s\n' "$1"; exit 1; }

step "Preflight"
missing=0
key="$(grep -E '^ANTHROPIC_API_KEY=' .dev.vars 2>/dev/null | cut -d= -f2- | tr -d '[:space:]')"
if [ -z "$key" ]; then echo "  - Missing: ANTHROPIC_API_KEY in .dev.vars (line: ANTHROPIC_API_KEY=...)"; missing=1; fi
if [ ! -f scripts/fixtures/food.jpg ]; then echo "  - Missing: a real food photo at scripts/fixtures/food.jpg"; missing=1; fi
if ! npx wrangler whoami 2>/dev/null | grep -q "You are logged in"; then echo "  - Missing: Cloudflare login (run: npx wrangler login)"; missing=1; fi
[ "$missing" = "0" ] || die "prerequisites missing (see above)"
echo "  all prerequisites present"

step "Tests and typecheck"
npm test >/dev/null 2>&1 || die "unit tests"
npx tsc --noEmit || die "app typecheck"
npx tsc -p worker/tsconfig.json || die "worker typecheck"

step "Build web"
rm -rf dist && npx expo export -p web >/dev/null 2>&1 || die "expo export"
[ -f dist/manifest.json ] || die "manifest missing from build"
if grep -rq "sk-ant\|ANTHROPIC_API_KEY" dist/; then die "secret-looking string found in dist/"; fi

step "Local smoke with real Claude"
npx wrangler dev --port 8787 >/tmp/calobi-wrangler-dev.log 2>&1 &
DEV_PID=$!
trap 'kill $DEV_PID 2>/dev/null' EXIT
for _ in $(seq 1 45); do curl -sf -o /dev/null http://localhost:8787/api/health && break; sleep 2; done
./scripts/smoke-api.sh http://localhost:8787 || die "local smoke"
kill $DEV_PID 2>/dev/null; trap - EXIT

step "Deploy to Cloudflare"
npx wrangler deploy 2>&1 | tee /tmp/calobi-deploy.log || die "wrangler deploy"
PROD_URL="$(grep -oE 'https://[a-z0-9.-]+\.workers\.dev' /tmp/calobi-deploy.log | head -1)"
[ -n "$PROD_URL" ] || die "could not find the workers.dev URL in deploy output"

step "Set ANTHROPIC_API_KEY secret"
printf '%s' "$key" | npx wrangler secret put ANTHROPIC_API_KEY >/dev/null 2>&1 || die "secret put"
unset key

step "Production smoke ($PROD_URL)"
for _ in $(seq 1 20); do curl -sf -o /dev/null "$PROD_URL/api/health" && break; sleep 3; done
./scripts/smoke-api.sh "$PROD_URL" || die "production smoke"

printf '\nRELEASE PASS\nProduction URL: %s\n' "$PROD_URL"
