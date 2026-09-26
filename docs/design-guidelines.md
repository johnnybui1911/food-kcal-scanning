# Design guidelines

## Tokens

Colors, spacing scale, and corner radius are defined once in
[`src/lib/theme.ts`](../src/lib/theme.ts). Use them instead of literal values.
The palette is a warm off-white background with a deep green accent; the PWA
`theme_color` and `background_color` in [`public/manifest.json`](../public/manifest.json)
match the accent and background tokens, so change them together.

## Copy rules

- Every result is labelled as an estimate. Keep the disclaimer on the result
  screen.
- Say plainly that history is saved only on this device. Users need this to
  understand why history disappears across browsers or after Add to Home Screen.
- Every user-visible string exists in both Vietnamese and English in
  [`src/lib/strings.ts`](../src/lib/strings.ts). Never hard-code text in a
  component.
- Error messages are specific and offer a retry: offline, burst-limited ("too
  many taps"), out of daily scans, not food, too large, and AI failure are
  separate cases. The mapping from HTTP status to case is in
  [`src/lib/api-client.ts`](../src/lib/api-client.ts).

## Interaction principles

- **Copy is the core action.** Tapping a nutrient copies only the number, so it
  pastes cleanly into another tracker; "Copy all" produces multi-line text.
  Confirm every copy with a toast (and a haptic on native).
- **Show uncertainty.** Display the kcal range and confidence next to the main
  number rather than a single falsely precise value.
- **Fix, don't restart.** A wrong result is corrected by one sentence ("Fix
  result") or the portion multiplier, not by a new photo.
- **Feedback is optional and non-blocking.** Thumbs up/down, reason chips and a
  comment; the UI never waits on the feedback request.
- **Onboarding appears once**, then the app opens on the scan screen.
- **Mobile first.** Layouts target phone widths; the app is portrait-only.

## PWA

The app installs to the home screen through the manifest and Apple meta tags in
[`public/`](../public/). The A2HS banner on iOS Safari encourages installation
because installed apps keep their storage past Safari's 7-day eviction.
