---
title: "Scan 502 from Vietnam: Anthropic blocks Hong Kong egress"
date: 2026-09-26
summary: Pinned Worker placement to US so /api/scan stops failing with Anthropic 403 for users routed via HKG
---

# Scan 502 from Vietnam: Anthropic blocks Hong Kong egress

## What happened
Users in Vietnam (VNPT, Hanoi) got `502 {"error":"ai_failed"}` from `POST /api/scan`. The invocation log only showed the status; the cause was in the separate `evt: "ai_failed"` console line with the same requestId:
`403 {"error":{"type":"forbidden","message":"Request not allowed"}}`.
Both failing requests had `colo: HKG`. Workers run at the ingress colo by default, so the outbound call to Anthropic came from a Hong Kong IP, a region Anthropic does not serve. A production smoke test from Singapore (SIN) passed, which hid the problem. The 403 is not retryable in `worker/claude.ts`, so there was no Haiku fallback and the failure was fast (150 ms to 1 s).

## Changes
- `1095194`: synced the `observability` block in `wrangler.jsonc` with the dashboard settings and enabled traces; deployment guide explains where the failure cause lives in logs.
- `c41868c`: added `"placement": { "region": "aws:us-east-1" }` to `wrangler.jsonc`; documented the pin and the `cf-placement` check in `docs/deployment-guide.md`.
- Deployed version `f3913090-dad0-47db-8637-504068c55527`. `/api/health` returns `cf-placement: remote-IAD` with `cf-ray ...-SIN`; production scan returned 200 from IAD.

## Decision
Explicit `region` hint over `hostname: api.anthropic.com` (a Cloudflare-fronted host could probe to HKG) and over Smart Placement (needs traffic analysis, no guarantee). Kept US as agreed with the user; Singapore (`aws:ap-southeast-1`) is a viable lower-latency alternative. Did not add 403 to the retryable set: the fallback model would be blocked the same way.

## Known non-issue
`release.sh` production smoke still fails only at the burst-limit 429 step. The Rate Limiting binding is eventually consistent per machine within a location, so placement does not change this.

## Next steps
- Confirm with an iPhone rescan from Vietnam and no new 403 `ai_failed` entries.
- Log `request.cf.colo` and the Anthropic status on `ai_failed` so region failures show up in one query.
- Optionally switch placement to `aws:ap-southeast-1`.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
