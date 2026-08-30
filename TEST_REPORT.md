# My Companion v5.6.0 — verification report

Date: 2026-08-30

## Result

- TypeScript production type-check: passed.
- Game and provider tests: 71/71 passed.
- Android HTML preparation regression tests: 4/4 passed.
- Sites/static-host tests: 4/4 passed.
- Protected mobile runtime integrity: 28 files passed.
- Production web build: passed (519 modules).
- Android packaging and signing: passed.
- APK ZIP integrity: passed with no compressed-data errors.
- APK packaging verification: passed in Nitron's final verification stage.
- Output: `deliverables/My-Companion-v5.6.0.apk` (4,668,638 bytes).
- SHA-256: `ccc5a1ef6ef85401ba88d07805a4b037e4bb13d8e8ccc2684c6ff19dd2b4c27f`.

## AI scene pipeline

- The photo is converted once into a canonical transparent identity master.
- Each room scene uses the room as the first, immutable reference and the master as the second identity reference.
- The scene prompt specifies a deterministic pose per subject type and room, physical contact with the rug/cushion/floor, matching scale and perspective, room light spill, occlusion, and a contact shadow.
- The game displays the full generated scene instead of layering a separate floating character above the background.
- Motion generation starts from the approved full scene, keeps the room and camera locked, and stores clips separately for every room and motion.
- All three room scenes now require explicit review before video generation. A single sample clip must then be created and approved before the remaining pack can run.
- The complete local pack is five motions across three rooms (15 clips). Batch generation skips ready assets, records failures per clip, can be cancelled, and resumes only missing assets.
- Sleep is a persistent state: the image provider first creates a room-specific sleeping still, and video generation turns that still into a stable breathing loop. Other actions return to their room's approved idle frame.
- The production path uses complete room-scene MP4 clips. It does not remove the background or composite a transparent character over the room.
- A room edit or regenerated scene invalidates the previous room clips so an old background cannot reappear during an action.
- OpenRouter prefers 1K, 768p, or 720p over 2K when the selected model advertises those resolutions. KIE and fal.ai adapters use their documented lower-cost resolution controls where available.
- The same reference is sent as the first and last frame when a provider/model exposes last-frame control, improving loop closure.
- KIE image and video jobs measure account credits before and after a successful task and store the actual deductions locally. Known KIE video models also show a preflight estimate; providers without a stable credit rate remain explicitly unknown.

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

Generated images and videos are downloaded immediately into local IndexedDB. Provider keys are session-only and no developer key is embedded in the APK.

## Test boundary

The earlier live paid test covered KIE GPT Image 2 and MiniMax H3 only. No additional paid requests were made for v5.6.0; the new approval, sample, pack, sleep-state, accounting, resume, migration, and UI paths were verified through unit tests, type-checking, mock flows, and browser QA. Other provider paths were verified through their request builders, response parsers, and polling state handling.

Native-mode behavior is covered by Android preparation tests and inspection of the packaged HTML, which contains the `native-apk` marker and therefore hides simulator chrome. The generic Vite warning for a JavaScript chunk larger than 500 kB remains and does not block packaging.
