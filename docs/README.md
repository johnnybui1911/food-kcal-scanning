# Calobi documentation

Calobi turns one food photo into an AI estimate of kcal and nutrients that the
user can copy into any tracker. It is an Expo app shipped as a web export, served
by one Cloudflare Worker that also proxies Claude.

These docs hold the why and the where. Source, tests, and scripts hold the what
and the how, so each page links to its executable owner instead of restating it.

| Document | Read it for |
|---|---|
| [project-overview-pdr.md](./project-overview-pdr.md) | Product intent, positioning, non-goals, terminology, business constraints |
| [system-architecture.md](./system-architecture.md) | Runtime boundaries and the decision ledger |
| [codebase-summary.md](./codebase-summary.md) | Where each concern lives in the repository |
| [code-standards.md](./code-standards.md) | Engineering rules, platform constraints, testing policy |
| [design-guidelines.md](./design-guidelines.md) | Visual tokens, copy rules, and interaction constraints |
| [deployment-guide.md](./deployment-guide.md) | Local development, release, secrets, logs, rollback |
| [project-roadmap.md](./project-roadmap.md) | Intended direction (intent, not shipped behavior) |

Stateful records live outside this authority path: the delivery plan and phase
files in [`plans/260926-0510-calobi-phase1-web/`](../plans/260926-0510-calobi-phase1-web/plan.md),
the accepted brainstorm in [`plans/reports/`](../plans/reports/brainstorm-260926-1250-food-kcal-scanner-phase1.md),
and session journals in [`plans/journals/`](../plans/journals/).
