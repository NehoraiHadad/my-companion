import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";

const API_BASE = "https://api.kie.ai";
const UPLOAD_URL = "https://kieai.redpandaai.co/api/file-base64-upload";
const key = process.env.KIE_API_KEY;
if (!key) throw new Error("KIE_API_KEY is required");

const root = resolve(import.meta.dirname, "..");
const outputDir = resolve(root, "artifacts/live-ai-smoke");
const roomPath = resolve(root, "public/assets/companion/room-sunrise-v5.webp");
const subjectPath = resolve(root, "public/assets/companion/default-puppy.webp");

const headers = (json = true) => ({
  Authorization: `Bearer ${key}`,
  ...(json ? { "Content-Type": "application/json" } : {}),
});

async function request(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { raw: text.slice(0, 500) }; }
  if (!response.ok || (typeof payload.code === "number" && payload.code !== 200)) {
    throw new Error(`${response.status} ${payload.msg || payload.message || payload.raw || "request failed"}`);
  }
  return payload;
}

async function credits() {
  const payload = await request(`${API_BASE}/api/v1/chat/credit`, { headers: headers(false) });
  return Number(payload.data);
}

async function upload(filePath, index) {
  const data = await readFile(filePath);
  const extension = extname(filePath).slice(1) || "webp";
  const payload = await request(UPLOAD_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      base64Data: `data:image/${extension};base64,${data.toString("base64")}`,
      uploadPath: "images/companion-smoke",
      fileName: `${Date.now()}-${index}-${basename(filePath)}`,
    }),
  });
  const url = payload?.data?.downloadUrl || payload?.data?.fileUrl;
  if (!url) throw new Error(`Upload returned no URL: ${JSON.stringify(payload).slice(0, 400)}`);
  return String(url);
}

async function createTask(body) {
  const payload = await request(`${API_BASE}/api/v1/jobs/createTask`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const taskId = payload?.data?.taskId;
  if (!taskId) throw new Error(`Create task returned no taskId: ${JSON.stringify(payload).slice(0, 400)}`);
  return String(taskId);
}

function resultUrl(payload) {
  const data = payload?.data ?? {};
  let result = data.resultJson ?? data.result ?? {};
  if (typeof result === "string") {
    try { result = JSON.parse(result); } catch { result = {}; }
  }
  return result.resultUrls?.[0] || result.urls?.[0] || result.videoUrl || result.imageUrl || data.resultUrl;
}

async function poll(taskId, label) {
  const startedAt = Date.now();
  for (let attempt = 0; attempt < 150; attempt += 1) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt < 3 ? 3_000 : 6_000));
    const payload = await request(`${API_BASE}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      headers: headers(false),
    });
    const state = String(payload?.data?.state || payload?.data?.status || "waiting").toLowerCase();
    process.stdout.write(`\r${label}: ${state} · ${Math.round((Date.now() - startedAt) / 1000)}s   `);
    if (["success", "completed", "succeeded"].includes(state)) {
      process.stdout.write("\n");
      const url = resultUrl(payload);
      if (!url) throw new Error(`${label} completed without an output URL`);
      return { url: String(url), seconds: Math.round((Date.now() - startedAt) / 100) / 10, payload };
    }
    if (["fail", "failed", "error"].includes(state)) {
      process.stdout.write("\n");
      throw new Error(`${label} failed: ${payload?.data?.failMsg || payload?.msg || state}`);
    }
  }
  throw new Error(`${label} timed out`);
}

async function download(url, fileName) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const target = resolve(outputDir, fileName);
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
  return target;
}

await mkdir(outputDir, { recursive: true });
const before = await credits();
console.log(`Credits before: ${before}`);

const [roomUrl, subjectUrl] = await Promise.all([upload(roomPath, 0), upload(subjectPath, 1)]);
console.log("Test references uploaded");

const scenePrompt = [
  "Use the first image as the immutable base room and the second image as the exact companion identity reference.",
  "Return the full portrait room with the same camera, framing, furniture, colors, lighting, and composition.",
  "Place exactly one matching small puppy naturally sitting on the cloud-shaped rug in the lower center of the room.",
  "The puppy must physically contact the rug with correct scale, floor perspective, warm room lighting, a soft contact shadow, and believable occlusion.",
  "Preserve the puppy's exact face, fur pattern, colors, proportions, collar, and 2.5D game style.",
  "Do not redesign the room or puppy. No floating, extra animals, duplicate limbs, text, UI, logo, frame, or watermark.",
].join(" ");

const sceneTaskId = await createTask({
  model: "gpt-image-2-image-to-image",
  input: { prompt: scenePrompt, input_urls: [roomUrl, subjectUrl], aspect_ratio: "auto" },
});
const scene = await poll(sceneTaskId, "scene");
const scenePath = await download(scene.url, "kie-scene.webp");
const afterScene = await credits();
console.log(`Scene saved: ${scenePath}`);
console.log(`Scene credits: ${(before - afterScene).toFixed(2)}`);

const videoPrompt = [
  "Single-shot seamless idle loop for a cozy virtual companion game.",
  "Keep the camera and every room object completely locked.",
  "Preserve the exact puppy identity, size, position, fur, collar, lighting, and art style.",
  "The puppy remains seated on the rug, breathes gently, blinks twice, looks briefly toward a tiny warm light, softly wags its tail once, and returns exactly to the starting pose.",
  "Feet and body remain in physical contact with the rug. No walking, jumping, sliding, floating, camera motion, cuts, zoom, morphing, extra limbs, duplicate subject, text, logo, or generated audio.",
].join(" ");

const videoTaskId = await createTask({
  model: "minimax-h3/image-to-video",
  input: { prompt: videoPrompt, first_frame_url: scene.url, last_frame_url: scene.url, duration: 6 },
});
const video = await poll(videoTaskId, "video");
const videoPath = await download(video.url, "kie-idle-loop.mp4");
const afterVideo = await credits();
console.log(`Video saved: ${videoPath}`);
console.log(`Video credits: ${(afterScene - afterVideo).toFixed(2)}`);

const report = {
  generatedAt: new Date().toISOString(),
  credits: { before, afterScene, afterVideo, sceneUsed: before - afterScene, videoUsed: afterScene - afterVideo },
  scene: { taskId: sceneTaskId, seconds: scene.seconds, file: scenePath },
  video: { taskId: videoTaskId, seconds: video.seconds, file: videoPath },
};
await writeFile(resolve(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Credits after: ${afterVideo}`);
