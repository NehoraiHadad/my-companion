import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFalImageTask, buildFalVideoTask, buildKieImageTask, buildKieVideoTask,
  defaultCapabilityModels, parseFalAudioUrl, parseFalMediaUrl, parseFalSubmission,
  parseFalText, parseKieTask, parseKieTaskId,
  estimateVideoCredits, isRetryableStatus, providerConcurrency, retryAfterMilliseconds,
  retryDelayMilliseconds, runTaskPool,
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

test("published KIE estimates are explicit and unknown provider prices stay unknown", () => {
  assert.equal(estimateVideoCredits("kie", "bytedance/seedance-2-mini", 5), 12);
  assert.equal(estimateVideoCredits("kie", "minimax-h3/image-to-video", 5), 156);
  assert.equal(estimateVideoCredits("fal", "fal-ai/wan/v2.2-5b/image-to-video", 5), null);
});

test("provider-aware concurrency is conservative and capability specific", () => {
  assert.deepEqual(providerConcurrency.kie, { image: 3, video: 5 });
  assert.deepEqual(providerConcurrency.fal, { image: 2, video: 2 });
  assert.equal(providerConcurrency.openrouter.video, 3);
  assert.equal(providerConcurrency.openai.video, 2);
});

test("retry helpers honor Retry-After and avoid retrying unsafe server errors", () => {
  assert.equal(isRetryableStatus(429, "POST"), true);
  assert.equal(isRetryableStatus(503, "GET"), true);
  assert.equal(isRetryableStatus(503, "POST"), false);
  assert.equal(retryAfterMilliseconds("4"), 4_000);
  assert.equal(retryAfterMilliseconds("Thu, 01 Jan 2026 00:00:05 GMT", Date.parse("Thu, 01 Jan 2026 00:00:00 GMT")), 5_000);
  assert.equal(retryDelayMilliseconds(2, "7"), 7_000);
});

test("task pool respects its limit and keeps successful work after a failure", async () => {
  let active = 0;
  let peak = 0;
  const progress = [];
  const results = await runTaskPool([0, 1, 2, 3, 4], 2, async (item) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    if (item === 2) throw new Error("expected failure");
    return item * 2;
  }, { onProgress: (value) => progress.push(value) });
  assert.equal(peak, 2);
  assert.equal(results.filter((result) => result?.status === "fulfilled").length, 4);
  assert.equal(results[2].status, "rejected");
  assert.deepEqual(progress.at(-1), { completed: 5, total: 5, active: 0, failed: 1 });
});
