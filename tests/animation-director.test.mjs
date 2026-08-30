import assert from "node:assert/strict";
import test from "node:test";
import { animationStorageKey, buildAnimationPrompt, buildAnimationRequest, sceneAnimationStorageKey } from "../src/animationDirector.ts";

test("animation prompt preserves the selected subject kind and creates a loop", () => {
  const prompt = buildAnimationPrompt("baby", "נועה", "play");
  assert.match(prompt, /same stylized baby/);
  assert.match(prompt, /return to the exact starting pose/);
  assert.match(prompt, /No camera movement/);
  assert.match(prompt, /no generated audio/);
});

test("animation prompts keep people, babies, and pets visually distinct", () => {
  const person = buildAnimationPrompt("person", "דנה", "celebrate");
  const baby = buildAnimationPrompt("baby", "נועם", "eat");
  const pet = buildAnimationPrompt("pet", "פיץ", "sleep");

  assert.match(person, /same stylized person/);
  assert.match(baby, /same stylized baby/);
  assert.match(pet, /same stylized pet/);
  assert.match(person, /Keep human anatomy and age exactly/);
  assert.match(baby, /human baby anatomy and age exactly/);
  assert.match(pet, /exact animal species and natural anatomy/);
});

test("video requests prefer an efficient supported resolution and close loops when possible", () => {
  const request = buildAnimationRequest({ model: "minimax/hailuo-3", photoDataUrl: "data:image/webp;base64,abc", kind: "pet", name: "פיץ", motion: "idle", supportedResolutions: ["2K", "768p"], supportedFrameImages: ["first_frame", "last_frame"] });
  assert.equal(request.model, "minimax/hailuo-3");
  assert.equal(request.aspect_ratio, "9:16");
  assert.equal(request.resolution, "768p");
  assert.equal(request.generate_audio, false);
  assert.equal(request.frame_images[0].frame_type, "first_frame");
  assert.equal(request.frame_images[0].image_url.url, "data:image/webp;base64,abc");
  assert.equal(request.frame_images[1].frame_type, "last_frame");
  assert.equal(request.frame_images[1].image_url.url, "data:image/webp;base64,abc");
});

test("animation storage keys isolate visual revisions", () => {
  assert.equal(animationStorageKey(3, "sleep"), "v3:sleep");
  assert.notEqual(animationStorageKey(3, "sleep"), animationStorageKey(4, "sleep"));
  assert.equal(sceneAnimationStorageKey(3, "midnight", "sleep"), "v3:scene:midnight:sleep");
  assert.notEqual(sceneAnimationStorageKey(3, "midnight", "sleep"), sceneAnimationStorageKey(3, "sunrise", "sleep"));
});
