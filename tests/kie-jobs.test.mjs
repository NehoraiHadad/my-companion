import assert from "node:assert/strict";
import test from "node:test";
import { completePendingKieJob, findPendingKieJob, savePendingKieJob, updatePendingKieResult } from "../src/kieJobs.ts";

test("KIE task ids survive a reload key and are cleared only after media is saved", () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  const job = { resumeKey: "video:v1:idle", taskId: "task-123", model: "minimax-h3/image-to-video", createdAt: 10_000 };
  savePendingKieJob(job);
  assert.equal(findPendingKieJob(job.resumeKey, 11_000)?.taskId, "task-123");
  updatePendingKieResult(job.resumeKey, "https://cdn.test/result.mp4");
  assert.equal(findPendingKieJob(job.resumeKey, 11_000)?.resultUrl, "https://cdn.test/result.mp4");
  completePendingKieJob(job.resumeKey);
  assert.equal(findPendingKieJob(job.resumeKey, 11_000), undefined);
});
