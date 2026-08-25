# My Companion v5.3.0 — verification report

Date: 2026-08-25

## Result

- TypeScript production type-check: passed.
- Game and provider unit tests: 32/32 passed.
- Sites/static-host tests: 4/4 passed.
- Protected mobile runtime integrity: 28 files passed.
- Production web build: passed (516 modules).
- Android packaging and Nitron output verification: passed.
- APK ZIP integrity: passed with no compressed-data errors.
- Output: `deliverables/My-Companion-v5.3.0.apk` (4,631,690 bytes).
- SHA-256: `dc69aa4d17e356d8611d67a9933a852751a26843c030d2c1e30a05fbbcc96083`.

## Provider architecture covered

Language, voice, image, and video are independent routes. Every route can choose OpenAI, OpenRouter, KIE, or fal.ai and stores its own model ID. A single provider key can be reused across any number of routes.

- OpenAI: Responses, Speech, GPT Image edits, and the current Sora video job API. Sora is visibly marked Legacy with the documented 2026-09-24 shutdown warning and is not the default video route.
- OpenRouter: chat, TTS, unified image API, and asynchronous video jobs with first-frame discovery.
- KIE: GPT 5.6 Luna Responses, ElevenLabs multilingual speech, GPT Image 2 image-to-image, Seedance 2 Mini image-to-video, unified task polling, and temporary-file upload.
- fal.ai: OpenRouter-backed Any LLM, ElevenLabs multilingual speech, Nano Banana 2 Edit, Wan 2.2 5B image-to-video, and the common asynchronous queue lifecycle.

Generated images and videos are downloaded immediately into local IndexedDB. Provider keys are session-only and no developer key is embedded in the APK.

## Test boundary

No paid live generation was triggered because no user provider keys were available. Request builders, response parsers, queue state handling, migration, and UI mock flows are covered without spending credits. The first real fal.ai call performs the server-side key validation; the UI says so instead of claiming a live validation.

The container did not include a Playwright browser binary, so a fresh screenshot-based browser pass could not run in this build environment. The production DOM/CSS passed type/build checks and the existing protected mobile runtime suite remains intact.
