# החבר שלי — My Companion

A local-first Android companion game inspired by the care loop of classic Tamagotchi toys, with a premium modern visual direction and a light humorous voice.

## Included in v5.3.0

- Four continuously time-based needs: fullness, energy, hygiene, and joy, including correct in-session decay and resume processing.
- Feed, sleep, clean, and play actions with cross-effects and XP progression.
- Offline persistence with elapsed-time decay; the companion never dies and can always recover.
- Three switchable themes: Midnight 3D, colorful Sunrise, and classic monochrome LCD.
- Required creation flow with an explicit person, baby, or pet choice, name, photo, and room; no default companion is forced on first launch.
- Day and visit-streak progression, daily reset/bonus, return summaries, age-gated evolution, and bounded recovery after long absence.
- A room-first home screen: the companion is the visual focus, detailed statistics expand only when requested, and character creation/AI controls live in settings instead of floating over play.
- A continuous full-height game surface and a bottom navigation rail anchored to the screen edge, with clearer destinations: home, games, goals, and bag.
- The detailed status popover closes on a second tap, an outside tap, or automatically after 4.8 seconds.
- A concise four-part loop — care, games, progress, and items — with a first-run guide that explains what every destination contributes.
- Care score and needs now decline continuously with elapsed time. Short and long absences produce different, warm return scenes without death or guilt.
- Opt-in care reminders where the Android WebView exposes system notifications, with an always-available in-game return recap as the fallback.
- Capability-based BYOK routing across OpenAI API, OpenRouter, KIE, and fal.ai: language, voice, image, and video can each use a different provider and model.
- Offline situational humor tailored to the chosen subject type, plus clearer action labels and guidance.
- Optional provider-neutral character-animation studio. Compatible first-frame video models are discovered on OpenRouter or use documented KIE/fal.ai/OpenAI adapters; every generated motion is downloaded to IndexedDB and reused in the room.
- AI character kit with one canonical transparent master and three room-specific variants. The matching local variant is selected automatically while preserving the same identity for image and video generation.
- Optional asynchronous video dreams through the selected video route.
- A reorganized AI studio with independent provider and model choices for text, speech, image editing, and image-to-video. OpenAI Sora 2 is marked Legacy with its announced shutdown date; OpenRouter is the default video route.
- ChatGPT Subscription is explicitly explained as separate from OpenAI API access.

## Privacy

The game has no developer account or backend. Game state and imported photos stay in the app's local WebView storage. Provider keys are kept in session storage only and requests go directly from the device to the selected provider. Imported photos are uploaded only after explicit consent; generated media is downloaded immediately into local IndexedDB.

## Development

```bash
npm ci
npm run build
```

The Android host source, including the local HTTPS asset loader and native image chooser bridge, is under `android-native/`. The Android build also patches Nitron's generated manifest to use a no-action-bar theme, keeping the native app-name bar out of the game surface. The signed installable APK is supplied separately.

## Android package

- Package: `app.pocketcompanion.local`
- Version: `5.3.0`
- Minimum Android: API 21
- Target Android: API 34
