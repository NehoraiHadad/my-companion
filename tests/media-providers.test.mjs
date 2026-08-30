import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFalImageTask, buildFalVideoTask, buildKieImageTask, buildKieVideoTask,
  defaultCapabilityModels, parseFalAudioUrl, parseFalMediaUrl, parseFalSubmission,
  parseFalText, parseKieTask, parseKieTaskId,
} from "../src/mediaProviders.ts";

test("every provider has defaults for all four capability routes", () => {
  for (const provider of ["openai", "openrouter", "kie", "fal"]) {
    assert.ok(defaultCapabilityModels[provider].text);
    assert.ok(defaultCapabilityModels[provider].voice);
    assert.ok(defaultCapabilityModels[provider].image);
    assert.ok(defaultCapabilityModels[provider].video);
  }
});

test("KIE builders follow unified job API schemas", () => {
  const image = buildKieImageTask("gpt-image-2-image-to-image", "same character", ["https://a.test/one.webp"]);
  assert.equal(image.input.input_urls.length, 1);
  assert.equal(image.input.aspect_ratio, "1:1");
  const video = buildKieVideoTask("bytedance/seedance-2-mini", "gentle loop", "https://a.test/frame.webp", 5);
  assert.equal(video.input.first_frame_url, "https://a.test/frame.webp");
  assert.equal(video.input.generate_audio, false);
  assert.equal(video.input.resolution, "720p");
  assert.equal(video.input.aspect_ratio, "9:16");
  const h3 = buildKieVideoTask("minimax-h3/image-to-video", "gentle loop", "https://a.test/frame.webp", 5);
  assert.equal(h3.input.first_frame_url, "https://a.test/frame.webp");
  assert.equal(h3.input.last_frame_url, "https://a.test/frame.webp");
  assert.equal(h3.input.duration, 6);
  assert.equal(parseKieTaskId({ data: { taskId: "task-1" } }), "task-1");
  assert.deepEqual(parseKieTask({ data: { state: "success", resultJson: '{"resultUrls":["https://a.test/out.mp4"]}' } }), { state: "success", url: "https://a.test/out.mp4", error: undefined });
});

test("fal builders and queue parsers support image, video, text and voice", () => {
  assert.equal(buildFalImageTask("same character", ["data:image/webp;base64,abc"]).limit_generations, true);
  assert.equal(buildFalVideoTask("gentle loop", "data:image/webp;base64,abc").num_frames, 81);
  assert.equal(buildFalVideoTask("gentle loop", "data:image/webp;base64,abc").aspect_ratio, "9:16");
  assert.deepEqual(parseFalSubmission({ status_url: "status", response_url: "response" }), { statusUrl: "status", responseUrl: "response" });
  assert.equal(parseFalMediaUrl({ video: { url: "video.mp4" } }), "video.mp4");
  assert.equal(parseFalText({ output: "hello" }), "hello");
  assert.equal(parseFalAudioUrl({ audio: { url: "voice.mp3" } }), "voice.mp3");
});
