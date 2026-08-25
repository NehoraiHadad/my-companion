import assert from "node:assert/strict";
import test from "node:test";
import { animationStorageKey, buildAnimationPrompt, buildAnimationRequest } from "../src/animationDirector.ts";

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

test("H3 request uses the local reference as a first frame without audio", () => {
  const request = buildAnimationRequest({ model: "minimax/hailuo-3", photoDataUrl: "data:image/webp;base64,abc", kind: "pet", name: "פיץ", motion: "idle" });
  assert.equal(request.model, "minimax/hailuo-3");
  assert.equal(request.aspect_ratio, "1:1");
  assert.equal(request.resolution, "2K");
  assert.equal(request.generate_audio, false);
  assert.equal(request.frame_images[0].frame_type, "first_frame");
  assert.equal(request.frame_images[0].image_url.url, "data:image/webp;base64,abc");
});

test("animation storage keys isolate visual revisions", () => {
  assert.equal(animationStorageKey(3, "sleep"), "v3:sleep");
  assert.notEqual(animationStorageKey(3, "sleep"), animationStorageKey(4, "sleep"));
});
