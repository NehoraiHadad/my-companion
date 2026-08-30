# My Companion v5.5.0 — verification report

Date: 2026-08-30

## Result

- TypeScript production type-check: passed.
- Game and provider tests: 68/68 passed.
- Android HTML preparation regression tests: 4/4 passed.
- Sites/static-host tests: 4/4 passed.
- Protected mobile runtime integrity: 28 files passed.
- Production web build: passed (519 modules).
- Android packaging and signing: passed.
- APK ZIP integrity: passed with no compressed-data errors.
- APK zipalign: passed.
- APK signatures: v1, v2, and v3 verified.
- Output: `deliverables/My-Companion-v5.5.0.apk` (4,664,542 bytes).
- SHA-256: `e9ac219f5492df046bbd3de4f1fe110166de30a9ebdd64eba50e49458d920b12`.

## AI scene pipeline

- The photo is converted once into a canonical transparent identity master.
- Each room scene uses the room as the first, immutable reference and the master as the second identity reference.
- The scene prompt specifies a deterministic pose per subject type and room, physical contact with the rug/cushion/floor, matching scale and perspective, room light spill, occlusion, and a contact shadow.
- The game displays the full generated scene instead of layering a separate floating character above the background.
- Motion generation starts from the approved full scene, keeps the room and camera locked, and stores clips separately for every room and motion.
- A room edit or regenerated scene invalidates the previous room clips so an old background cannot reappear during an action.
- OpenRouter prefers 1K, 768p, or 720p over 2K when the selected model advertises those resolutions. KIE and fal.ai adapters use their documented lower-cost resolution controls where available.
- The same reference is sent as the first and last frame when a provider/model exposes last-frame control, improving loop closure.

## Live KIE smoke test

A paid smoke test used only the built-in default puppy and sunrise-room assets; no personal photo was uploaded.

- Authentication and account-credit lookup: passed.
- GPT Image 2 image-to-image scene: passed in about 82 seconds and consumed 6 credits.
- MiniMax H3 image-to-video loop: passed in about 306 seconds and consumed 78 credits.
- Scene result: the puppy was placed naturally on the rug with matching scale, perspective, lighting, and contact shadow while retaining a close identity match.
- H3 result: 1440×2560 H.264 video, about 6.58 seconds, 1.18 MB.
- First/last-frame SSIM: 0.982169, confirming a visually close loop boundary.
- KIE's current H3 task schema did not expose a resolution selector and returned 2K output. H3 also returned an AAC audio track despite the no-audio prompt; game playback remains muted. The cheaper KIE Seedance Mini route remains the default and explicitly requests 720p with generated audio disabled.
- The key was supplied only at runtime through `KIE_API_KEY`; it is not present in source, APK, report, or Git history.

## Mobile fixes retained

- Android packaging applies `native-apk` to the current Hebrew HTML document, hiding the browser-only device picker, bezel, simulated camera, and white simulator canvas inside the APK.
- Full-page and in-app scroll surfaces reserve the real bottom-navigation inset so the last controls are reachable.
- Visual viewport and keyboard state restore the page height after the keyboard closes instead of leaving a blank white keyboard-sized area.

## Provider architecture

Language, voice, image, and video remain independent routes. Each route can choose OpenAI, OpenRouter, KIE, or fal.ai and stores its own model ID. The product pipeline is provider-neutral; small adapters translate the common intent into each provider's request schema.

Generated images and videos are downloaded immediately into local IndexedDB. Provider keys are session-only and no developer key is embedded in the APK.

## Test boundary

The live paid test covered KIE GPT Image 2 and MiniMax H3 only. Other provider paths were verified through their request builders, response parsers, polling state handling, migration, and mock flows; they were not charged live in this release.

The container's Playwright package is installed but its Chromium binary is not, so a new automated visual screenshot pass could not run. Native-mode behavior is covered by the Android preparation tests and inspection of the packaged HTML. The generic Vite warning for a JavaScript chunk larger than 500 kB remains and does not block packaging.
