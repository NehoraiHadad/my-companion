# My Companion v5.4.1 — verification report

Date: 2026-08-30

## Result

- TypeScript production type-check: passed.
- Game and provider tests: 67/67 passed.
- Android HTML preparation regression tests: 4/4 passed.
- Sites/static-host tests: 4/4 passed.
- Protected mobile runtime integrity: 28 files passed.
- Production web build: passed (519 modules).
- Live mobile browser pass: passed for fresh onboarding, the home room, and the decoration shelves.
- Android packaging, signing, and Nitron verification: passed.
- APK ZIP integrity: passed with no compressed-data errors.
- Output: `deliverables/My-Companion-v5.4.1.apk` (4,664,542 bytes).
- SHA-256: `ca61b18b57360c438c3354c9d584617929f2de43bbfdc74daef0f7eea4a46767`.

## Fixes covered

- A fresh-state factory now regenerates every timestamp during a reset instead of reusing timestamps captured when the module loaded.
- Onboarding no longer offers a path that bypasses the required companion name. A photo remains optional and can be added later.
- The room character remains horizontally centered while Framer Motion controls its movement, preventing the CSS transform collision that clipped it.
- Decoration shelves unlock by evolution stage, so their availability agrees with the XP-and-time progression rules shown elsewhere in the product.
- Care actions award XP, quest progress, weekly progress, and personality changes only when they actually help the companion. Repeated taps at full needs and interrupting sleep can no longer farm rewards.
- Reports and automatic AI events are triggered only by rewarded care actions.
- Decoration artwork is loaded as a separate lazy chunk. The main production JavaScript chunk is 599,207 bytes and the decoration chunk is 37,147 bytes.
- Android packaging applies `native-apk` to the current Hebrew HTML document instead of matching only the obsolete English tag. The build now fails explicitly if native mode cannot be applied.
- Product version, README, durable project decisions, and test documentation now agree on version 5.4.1.

## Browser evidence

- A new user could not continue from the naming step until a name was entered.
- The same user could continue without uploading a photo.
- The companion bounding box remained fully inside the room scene after onboarding.
- The first decoration shelf was open while later shelves displayed the expected evolution-stage locks.
- No application-origin browser console errors were observed during this pass.
- The packaged HTML was previewed in native mode: the device picker, bezel, and simulated camera were hidden while the game remained visible on the full surface.

## Provider architecture retained

Language, voice, image, and video remain independent routes. Every route can choose OpenAI, OpenRouter, KIE, or fal.ai and stores its own model ID. A provider key can be reused across routes.

Generated images and videos are downloaded immediately into local IndexedDB. Provider keys are session-only and no developer key is embedded in the APK.

## Test boundary

No paid live generation was triggered because no user provider keys were available. Request builders, response parsers, queue state handling, migration, and UI mock flows are covered without spending credits.

The generic Vite warning for a JavaScript chunk larger than 500 kB remains. The decoration catalog was split out safely in this release; further reduction requires a broader decomposition of the main application component. The container's Playwright runtime test could not use its own missing Chromium binary, so visual verification was performed through the live browser preview instead.
