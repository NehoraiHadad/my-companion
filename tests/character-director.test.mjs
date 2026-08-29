import assert from "node:assert/strict";
import test from "node:test";
import { buildCharacterPrompt, buildOpenRouterCharacterRequest, buildRoomUpgradePrompt, characterStorageKey, characterVisuals, decorPrompt, decorSetKey, roomStorageKey, stageFlair } from "../src/characterDirector.ts";

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

test("decor set key is stable regardless of purchase order", () => {
  assert.equal(decorSetKey({ trophy: true, lamp: true, rug: true }), "lamp,rug,trophy");
  assert.equal(decorSetKey({ lamp: true, rug: true, trophy: true }), "lamp,rug,trophy");
  assert.equal(decorSetKey({ lamp: false, poster: undefined }), "");
  assert.equal(decorSetKey({}), "");
});

test("room images are cached per theme and decor set", () => {
  assert.equal(roomStorageKey("midnight", "lamp,trophy"), "room:midnight:lamp,trophy");
  assert.equal(roomStorageKey("sunrise", ""), "room:sunrise:");
});

test("room upgrade prompt edits the same room and adds only the owned decorations", () => {
  const prompt = buildRoomUpgradePrompt("midnight", ["lamp", "trophy"]);
  assert.match(prompt, /star-patterned shade/);
  assert.match(prompt, /shiny golden trophy/);
  assert.match(prompt, /navy-and-violet/);
  assert.match(prompt, /same room, camera angle/);
  assert.match(prompt, /clear floor space at the center/);
  assert.match(prompt, /no text/);
  assert.doesNotMatch(prompt, /cloud-shaped rug/);
  assert.doesNotMatch(prompt, /potted plant/);
});

test("decor prompts cover every decoration the shop can sell", () => {
  const expected = ["lamp", "poster", "rug", "plant", "radio", "trophy", "bookshelf", "aquarium", "telescope", "fireplace", "projector", "icecream"];
  assert.deepEqual(Object.keys(decorPrompt).sort(), [...expected].sort());
  for (const key of expected) {
    assert.equal(typeof decorPrompt[key], "string", `${key} must have a prompt phrase`);
    assert.ok(decorPrompt[key].trim().length > 8, `${key} phrase must be descriptive`);
  }
});

test("new decorations read as believable room objects", () => {
  assert.match(decorPrompt.bookshelf, /bookshelf/);
  assert.match(decorPrompt.aquarium, /fish/);
  assert.match(decorPrompt.telescope, /telescope/);
  assert.match(decorPrompt.fireplace, /safely enclosed/);
  assert.match(decorPrompt.projector, /star patterns/);
  assert.match(decorPrompt.icecream, /ice-cream machine/);
});

test("character prompt without a stage carries no stage flair", () => {
  const prompt = buildCharacterPrompt("person", "דנה", "master");
  assert.doesNotMatch(prompt, /Stage presentation only/);
  for (const flair of Object.values(stageFlair)) {
    assert.doesNotMatch(prompt, new RegExp(flair.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(prompt, /Identity is the highest priority/);
  assert.match(prompt, /canonical master design/);
  assert.match(prompt, /Transparent background/);
});

test("stage flair is appended without loosening identity preservation", () => {
  const prompt = buildCharacterPrompt("pet", "פיץ", "midnight", "legend");
  assert.ok(prompt.includes(stageFlair.legend), "legend flair sentence must be present");
  assert.match(prompt, /golden champion aura/);
  assert.match(prompt, /Identity is the highest priority: preserve face, age/);
  assert.match(prompt, /Preserve the exact species, breed cues/);
  assert.match(prompt, /never changing age, species, or identity/);
  assert.match(prompt, /Transparent background/);
});

test("every stage has flair that keeps age and species locked", () => {
  const stages = ["baby", "kid", "teen", "grown", "mentor", "legend"];
  assert.deepEqual(Object.keys(stageFlair).sort(), [...stages].sort());
  for (const stage of stages) {
    assert.match(stageFlair[stage], /never changing age, species, or identity/, `${stage} flair must keep identity locked`);
    const prompt = buildCharacterPrompt("baby", "נועה", "sunrise", stage);
    assert.ok(prompt.includes(stageFlair[stage]));
    assert.match(prompt, /Preserve the exact baby age/);
  }
});

test("OpenRouter request forwards the optional stage into the prompt", () => {
  const withStage = buildOpenRouterCharacterRequest({
    model: "openai/gpt-image-2",
    references: ["data:image/webp;base64,master"],
    kind: "person",
    name: "דנה",
    visual: "sunrise",
    stage: "mentor",
  });
  assert.ok(withStage.prompt.includes(stageFlair.mentor));
  const withoutStage = buildOpenRouterCharacterRequest({
    model: "openai/gpt-image-2",
    references: ["data:image/webp;base64,master"],
    kind: "person",
    name: "דנה",
    visual: "sunrise",
  });
  assert.doesNotMatch(withoutStage.prompt, /Stage presentation only/);
});

test("room upgrade prompt embeds phrases for the new decorations too", () => {
  const prompt = buildRoomUpgradePrompt("sunrise", ["fireplace", "aquarium", "icecream"]);
  assert.ok(prompt.includes(decorPrompt.fireplace));
  assert.ok(prompt.includes(decorPrompt.aquarium));
  assert.ok(prompt.includes(decorPrompt.icecream));
  assert.match(prompt, /gentle glowing fire, safely enclosed/);
  assert.match(prompt, /peach-and-coral key light/);
  assert.doesNotMatch(prompt, /galaxy projector/);
  assert.doesNotMatch(prompt, /wooden tripod/);
});
