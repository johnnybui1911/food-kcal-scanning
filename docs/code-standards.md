# Code standards

## Platform rules

The web export is the only shipping target today, but the code must stay
buildable for native later.

- Use only Expo modules that support web. Branch with `Platform.OS` where web and
  native differ (haptics, picker permissions).
- Do not add carousel or animation libraries without web support.
- **Clipboard:** iOS Safari only allows clipboard writes that start synchronously
  inside the tap handler. `copyText` must be the first statement in `onPress`,
  with no `await` before it. See [`src/lib/clipboard.ts`](../src/lib/clipboard.ts).
- **Image picker:** browsers only open the picker inside a user gesture, and may
  never resolve on cancel. Call `pickImage` as the first `await` in `onPress` and
  set no busy state before it. See [`src/lib/image.ts`](../src/lib/image.ts).
- **Image decode:** decode a full-resolution photo once and derive the thumbnail
  from the downscaled image. Decoding a 24 MP iPhone photo twice in parallel can
  crash the Safari tab.
- **Storage:** go through [`src/lib/storage.ts`](../src/lib/storage.ts), which
  tolerates blocked or full storage. Storage keys carry a version suffix; bump it
  rather than reinterpreting old data.

## Shared contract

- The result schema in [`src/lib/nutrition-schema.ts`](../src/lib/nutrition-schema.ts)
  is imported by both the app and the Worker. The JSON schema sent to Claude must
  mirror the zod schema key for key; a unit test enforces this.
- Changing prompt wording changes results: bump `PROMPT_VERSION` in
  [`worker/prompt.ts`](../worker/prompt.ts) so feedback can be attributed to the
  prompt that produced it.

## Worker rules

- Reject cheaply before doing expensive work: validate the device ID, check the
  burst limit and `content-length` before parsing JSON, since parsing megabytes
  can exceed the Workers CPU limit.
- Keep secrets out of `wrangler.jsonc`; they are Wrangler secrets (production) or
  `.dev.vars` (local).
- Worker types come from `npx wrangler types`. Do not add
  `@cloudflare/workers-types`; the two sets conflict.
- Log structured JSON lines with an `evt` field so Workers Logs stay queryable.
  Never log the API key, image data, or anything beyond what feedback already
  carries.

## Testing policy

- Unit-test pure logic: schema parity and sanitizing, portion math, formatting,
  and Worker body validation. Tests run with `npm test` (vitest, node
  environment).
- The app and the Worker are typechecked separately; the Worker has its own
  [`worker/tsconfig.json`](../worker/tsconfig.json).
- Behavior against real Claude is covered by [`scripts/smoke-api.sh`](../scripts/smoke-api.sh),
  not by mocked unit tests. Run it with `SMOKE_SKIP_AI=1` when no key or food
  photo is available.
- [`scripts/release.sh`](../scripts/release.sh) is the full gate: tests, both
  typechecks, web export, a secret-string scan of `dist/`, and smoke tests.
- Device behavior (camera, clipboard, A2HS) is verified by hand on a real iPhone
  and Android phone; the checklist is Task 5.8 in the
  [phase 5 plan](../plans/260926-0510-calobi-phase1-web/phase-05-pwa-deploy-and-device-qa.md).

## Conventions

- File names are kebab-case; routes follow Expo Router file conventions.
- Import app code through the `@/` alias.
- Commits use conventional commit format.
