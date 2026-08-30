# My Companion v5.7.0 — verification report

Date: 2026-08-30

## Result

- TypeScript production type-check: passed.
- Game and provider tests: 74/74 passed.
- Android packaging and encrypted-storage regression tests: 5/5 passed.
- Sites/static-host tests: 4/4 passed.
- Protected mobile runtime integrity: 28 files passed.
- Production web build: passed (520 modules).
- Android packaging and signing: passed.
- APK ZIP integrity: passed with no compressed-data errors.
- APK packaging verification: passed in Nitron's final verification stage.
- Output: `deliverables/My-Companion-v5.7.0.apk` (4,668,638 bytes).
- SHA-256: `946b837e93002891f65c9d945f4b818ec73b2e8b8504d7bb4d291e6d52e1acb8`.

## Bounded parallel generation

- The canonical identity master remains a hard prerequisite. Once it exists, the three room scenes run through a bounded pool: three concurrent workers for OpenAI, OpenRouter, and KIE, or two for fal.ai.
- Animation packs prepare missing room-specific sleep stills in a separate image phase, then run video generation with provider-aware limits: KIE 5, OpenRouter 3, OpenAI 2, and fal.ai 2.
- The queue records every successful image or clip immediately. A rejected item is marked failed without aborting sibling work, and a later animation-pack run selects only slots that are still missing.
- Retryable `429` responses honor the provider's `Retry-After` value with exponential backoff and jitter. Read-only polling and downloads also retry transient `5xx` responses; unsafe generation POST requests are not duplicated after a `5xx` response.
- Concurrent KIE work disables per-task balance deltas. The app reads the account balance once before and once after each non-overlapping image or video phase, then stores only the aggregate deduction, preventing overlapping jobs from double-counting credits. If the player cancels while remote tasks are already running, later provider-side charges cannot be included in that immediate local measurement.
- Unit tests verify pool limits, partial-success preservation, provider concurrency values, `Retry-After` parsing, and safe retry classification.

## Encrypted API-key persistence

- Provider keys now survive a normal app close and restart.
- The persisted settings are encrypted with AES-256-GCM before being written to the app's private IndexedDB.
- The AES key is generated through Web Crypto as non-extractable and is stored separately from the ciphertext.
- Mutations are serialized so rapid typing cannot let an older encrypted save overwrite a newer value.
- The AI screen exposes an explicit confirmed action that removes all stored OpenAI, OpenRouter, KIE, and fal.ai keys.
- If Web Crypto or IndexedDB is unavailable, the app keeps the previous session-only behavior and says so in the UI.
- APK inspection confirmed that the packaged production JavaScript contains the encrypted database, AES-GCM, key, and settings paths; no provider key is embedded in the APK.

## AI scene pipeline

- The photo is converted once into a canonical transparent identity master.
- Each room scene uses the room as the first, immutable reference and the master as the second identity reference.
- The scene prompt specifies a deterministic pose per subject type and room, physical contact with the rug/cushion/floor, matching scale and perspective, room light spill, occlusion, and a contact shadow.
- The game displays the full generated scene instead of layering a separate floating character above the background.
- Motion generation starts from the approved full scene, keeps the room and camera locked, and stores clips separately for every room and motion.
- All three room scenes now require explicit review before video generation. A single sample clip must then be created and approved before the remaining pack can run.
- The complete local pack is five motions across three rooms (15 clips). Batch generation skips ready assets, records failures per clip, can be cancelled, and resumes only missing assets. Already-running provider jobs may finish after a local cancellation, while no new queue items are started.
- Sleep is a persistent state: the image provider first creates a room-specific sleeping still, and video generation turns that still into a stable breathing loop. Other actions return to their room's approved idle frame.
- The production path uses complete room-scene MP4 clips. It does not remove the background or composite a transparent character over the room.
- A room edit or regenerated scene invalidates the previous room clips so an old background cannot reappear during an action.
- OpenRouter prefers 1K, 768p, or 720p over 2K when the selected model advertises those resolutions. KIE and fal.ai adapters use their documented lower-cost resolution controls where available.
- The same reference is sent as the first and last frame when a provider/model exposes last-frame control, improving loop closure.
- Single KIE image and video jobs measure account credits before and after a successful task. Concurrent batches instead measure one aggregate deduction per non-overlapping image or video phase. Known KIE video models also show a preflight estimate; providers without a stable credit rate remain explicitly unknown.

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
- Live cloud-browser QA passed on both calibrated iPhone and Pixel 10 views. The AI panel reached its final control with 24px or more bottom clearance, and keyboard dismissal restored the full viewport without a blank region.

## Provider architecture

Language, voice, image, and video remain independent routes. Each route can choose OpenAI, OpenRouter, KIE, or fal.ai and stores its own model ID. The product pipeline is provider-neutral; small adapters translate the common intent into each provider's request schema.

Generated images and videos are downloaded immediately into local IndexedDB. User-entered provider keys are encrypted locally and persist between launches; no developer key is embedded in the APK.

## Test boundary

The earlier live paid test covered KIE GPT Image 2 and MiniMax H3 only. No additional paid requests were made for v5.7.0; bounded concurrency, retry behavior, aggregate accounting, and encrypted-key persistence were verified through type-checking, unit tests, storage-contract tests, production packaging inspection, and the secure HTTPS origin used by the Android WebView. The approval, sample, pack, sleep-state, resume, migration, and UI paths remain covered by unit tests and mock flows. Other provider paths were verified through their request builders, response parsers, polling state handling, and documented queue limits.

Native-mode behavior is covered by Android preparation tests and inspection of the packaged HTML, which contains the `native-apk` marker and therefore hides simulator chrome. The generic Vite warning for a JavaScript chunk larger than 500 kB remains and does not block packaging.
