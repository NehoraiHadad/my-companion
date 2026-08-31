import assert from "node:assert/strict";
import test from "node:test";
import { animationPackMotions, animationStorageKey, buildAnimationPrompt, buildAnimationRequest, sceneAnimationStorageKey } from "../src/animationDirector.ts";

test("animation prompt preserves the selected subject kind and creates a loop", () => {
  const prompt = buildAnimationPrompt("baby", "נועה", "play");
  assert.match(prompt, /exact same baby/);
  assert.match(prompt, /staying planted in the exact same position/);
  assert.match(prompt, /camera movement/);
  assert.match(prompt, /no generated audio/);
  assert.match(prompt, /Do not restyle, beautify, redraw, re-render, reinterpret/);
  assert.match(prompt, /face drift, costume change, color shift/);
  assert.match(prompt, /Never turn a hand or paw into a lamp/);
  assert.match(prompt, /No new object may appear/);
  assert.doesNotMatch(prompt, /spin once|floating light|burst of warm stars/);
});

test("animation prompts keep people, babies, and pets visually distinct", () => {
  const person = buildAnimationPrompt("person", "דנה", "celebrate");
  const baby = buildAnimationPrompt("baby", "נועם", "eat");
  const pet = buildAnimationPrompt("pet", "פיץ", "sleep");

  assert.match(person, /exact same person/);
  assert.match(baby, /exact same baby/);
  assert.match(pet, /exact same pet/);
  assert.match(person, /Keep human anatomy and age exactly/);
  assert.match(baby, /human baby anatomy and age exactly/);
  assert.match(pet, /exact animal species and natural anatomy/);
});

test("video requests prefer an efficient supported resolution without forcing an identical last frame", () => {
  const request = buildAnimationRequest({ model: "minimax/hailuo-3", photoDataUrl: "data:image/webp;base64,abc", kind: "pet", name: "פיץ", motion: "idle", theme: "midnight", supportedResolutions: ["2K", "768p"], supportedFrameImages: ["first_frame", "last_frame"] });
  assert.equal(request.model, "minimax/hailuo-3");
  assert.equal(request.aspect_ratio, "9:16");
  assert.equal(request.resolution, "768p");
  assert.equal(request.generate_audio, false);
  assert.equal(request.frame_images[0].frame_type, "first_frame");
  assert.equal(request.frame_images[0].image_url.url, "data:image/webp;base64,abc");
  assert.equal(request.frame_images.length, 1);
  assert.match(request.prompt, /final approved design/);
});

test("classic-room video preserves the approved pixel rendering without redesigning the character", () => {
  const prompt = buildAnimationPrompt("person", "דנה", "idle", "classic");
  assert.match(prompt, /monochrome green pixel rendering is intentional/);
  assert.match(prompt, /exact pixel-art palette, shapes, detail level, lighting, and character design/);
  assert.match(prompt, /do not make it realistic, smoother, more detailed, or visually different/);
  assert.doesNotMatch(prompt, /cinematic, cartoon, 3D, anime/);
});

test("animation storage keys isolate visual revisions", () => {
  assert.equal(animationStorageKey(3, "sleep"), "v3:sleep");
  assert.notEqual(animationStorageKey(3, "sleep"), animationStorageKey(4, "sleep"));
  assert.equal(sceneAnimationStorageKey(3, "midnight", "sleep"), "v3:scene:midnight:sleep");
  assert.notEqual(sceneAnimationStorageKey(3, "midnight", "sleep"), sceneAnimationStorageKey(3, "sunrise", "sleep"));
});

test("the room pack contains every gameplay motion and sleep is a stable persistent loop", () => {
  assert.deepEqual(animationPackMotions, ["idle", "eat", "play", "sleep", "celebrate"]);
  const sleep = buildAnimationPrompt("baby", "נועה", "sleep");
  assert.match(sleep, /already asleep in the reference scene/);
  assert.match(sleep, /return exactly to the starting sleeping pose/);
  assert.match(sleep, /Animate only the minimum required part of the companion/);
});
