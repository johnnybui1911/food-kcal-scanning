# Project roadmap

> Intent, not shipped behavior. For what exists today, read the source and
> [system-architecture.md](./system-architecture.md).

## Shipped

- Web app (PWA) on Cloudflare: onboarding, scan with optional note, result with
  copy-out, portion multiplier, "Fix result", feedback, and on-device history in
  Vietnamese and English.

## Intended next

- **Native iOS and Android builds** from the same Expo codebase via EAS. The
  code already avoids web-only assumptions for this reason.
- **Final name and native branding.** "Calobi" is still a working name. The web
  icons use the Bobi mascot, but the Android adaptive icon, iOS icon and splash
  screen are still Expo template assets.
- **Custom domain**, if and when it is worth resetting iOS home-screen storage
  for existing installs.
- **Prompt tuning from feedback.** Use the Analytics Engine feedback, grouped by
  `prompt_version` and model, to improve accuracy on mixed dishes, soups, and
  hidden oil.

## Considered, not committed

- Uploading feedback photos to improve prompts. Deliberately excluded for now to
  avoid image storage and privacy scope.

## Out of scope

The non-goals in [project-overview-pdr.md](./project-overview-pdr.md#non-goals)
stay out unless the product positioning changes.
