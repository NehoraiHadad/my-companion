import assert from "node:assert/strict";
import test from "node:test";
import { buildCharacterPrompt, buildOpenRouterCharacterRequest, characterStorageKey, characterVisuals } from "../src/characterDirector.ts";

test("master prompt creates one transparent canonical game character", () => {
  const prompt = buildCharacterPrompt("baby", "נועה", "master");
  assert.match(prompt, /canonical master design/);
  assert.match(prompt, /same human baby/);
  assert.match(prompt, /Transparent background/);
  assert.match(prompt, /One subject only/);
  assert.match(prompt, /never add animal features/);
});

test("room variants preserve identity and use the room only as art direction", () => {
  const prompt = buildCharacterPrompt("pet", "פיץ", "midnight");
  assert.match(prompt, /canonical character and must not be redesigned/);
  assert.match(prompt, /use it only for lighting, palette, and rendering style/);
  assert.match(prompt, /navy-and-violet/);
  assert.match(prompt, /Never humanize the pet/);
});

test("classic variant explicitly requests readable limited-palette pixel art", () => {
  const prompt = buildCharacterPrompt("person", "דנה", "classic");
  assert.match(prompt, /monochrome olive pixel-art/);
  assert.match(prompt, /limited four-tone palette/);
  assert.match(prompt, /Never add animal ears/);
});

test("OpenRouter image request includes all ordered references and transparent output", () => {
  const request = buildOpenRouterCharacterRequest({
    model: "openai/gpt-image-2",
    references: ["data:image/webp;base64,master", "data:image/webp;base64,room"],
    kind: "person",
    name: "דנה",
    visual: "sunrise",
  });
  assert.equal(request.input_references.length, 2);
  assert.equal(request.input_references[0].image_url.url, "data:image/webp;base64,master");
  assert.equal(request.background, "transparent");
  assert.equal(request.aspect_ratio, "1:1");
});

test("character kit has one master and exactly three room variants", () => {
  assert.deepEqual(characterVisuals, ["master", "sunrise", "midnight", "classic"]);
  assert.equal(characterStorageKey(12, "midnight"), "v12:character:midnight");
});
