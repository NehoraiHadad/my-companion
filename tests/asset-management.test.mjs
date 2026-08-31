import assert from "node:assert/strict";
import test from "node:test";
import { clearAiAssetState, removeAnimationAssetState, removeSceneAssetState } from "../src/assetManagement.ts";
import { createDefaultState } from "../src/gameEngine.ts";

function stateWithAssets() {
  return {
    ...createDefaultState(1_000),
    name: "פיץ",
    sourcePhoto: "data:image/webp;base64,source",
    photo: "data:image/webp;base64,source",
    xp: 140,
    aiCharacter: true,
    aiRooms: { sunrise: "rug" },
    aiScenes: { sunrise: "rug", midnight: "base" },
    aiSceneApprovals: { sunrise: true, midnight: true },
    aiStateScenes: { sunrise: { sleep: "rug" } },
    sceneAnimationSlots: { sunrise: { idle: true, sleep: true }, midnight: { idle: true } },
    animationAssets: { sunrise: { idle: { provider: "kie", model: "h3", status: "ready" }, sleep: { provider: "kie", model: "h3", status: "ready" } } },
    animationSample: { theme: "sunrise", motion: "idle", approved: false },
    aiUsage: { imageCredits: 18, videoCredits: 48 },
  };
}

test("deleting one video keeps its room and sibling videos", () => {
  const next = removeAnimationAssetState(stateWithAssets(), "sunrise", "idle");
  assert.equal(next.sceneAnimationSlots.sunrise.idle, undefined);
  assert.equal(next.sceneAnimationSlots.sunrise.sleep, true);
  assert.equal(next.aiScenes.sunrise, "rug");
  assert.equal(next.animationSample, undefined);
});

test("deleting a room scene removes only its dependent state and videos", () => {
  const next = removeSceneAssetState(stateWithAssets(), "sunrise");
  assert.equal(next.aiScenes.sunrise, undefined);
  assert.equal(next.sceneAnimationSlots.sunrise, undefined);
  assert.equal(next.aiStateScenes.sunrise, undefined);
  assert.equal(next.aiScenes.midnight, "base");
  assert.equal(next.sceneAnimationSlots.midnight.idle, true);
});

test("clearing AI assets preserves the game, source photo, keys-independent usage and progress", () => {
  const state = stateWithAssets();
  const next = clearAiAssetState(state);
  assert.equal(next.aiCharacter, false);
  assert.deepEqual(next.aiScenes, {});
  assert.deepEqual(next.sceneAnimationSlots, {});
  assert.equal(next.sourcePhoto, state.sourcePhoto);
  assert.equal(next.photo, state.photo);
  assert.equal(next.xp, 140);
  assert.deepEqual(next.aiUsage, { imageCredits: 18, videoCredits: 48 });
});
