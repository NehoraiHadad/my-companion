export type MediaProvider = "openai" | "openrouter" | "kie" | "fal";

export type PoolProgress = { completed: number; total: number; active: number; failed: number };

export const providerConcurrency: Record<MediaProvider, { image: number; video: number }> = {
  openai: { image: 3, video: 2 },
  openrouter: { image: 3, video: 3 },
  kie: { image: 3, video: 5 },
  fal: { image: 2, video: 2 },
};

export function isRetryableStatus(status: number, method = "GET") {
  if (status === 429) return true;
  return method.toUpperCase() === "GET" && [500, 502, 503, 504].includes(status);
}

export function retryAfterMilliseconds(value: string | null, now = Date.now()) {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : 0;
}

export function retryDelayMilliseconds(attempt: number, retryAfter: string | null = null) {
  return Math.min(30_000, Math.max(1_000 * 2 ** Math.max(0, attempt), retryAfterMilliseconds(retryAfter)));
}

export async function runTaskPool<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  options: { onProgress?: (progress: PoolProgress) => void; shouldStop?: () => boolean } = {},
) {
  const results: Array<PromiseSettledResult<R>> = new Array(items.length);
  const limit = Math.max(1, Math.min(Math.floor(concurrency) || 1, items.length || 1));
  let cursor = 0;
  let completed = 0;
  let active = 0;
  let failed = 0;
  const report = () => options.onProgress?.({ completed, total: items.length, active, failed });
  report();
  const runner = async () => {
    while (!options.shouldStop?.()) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      active += 1;
      report();
      try {
        const value = await worker(items[index], index);
        results[index] = { status: "fulfilled", value };
      } catch (reason) {
        failed += 1;
        results[index] = { status: "rejected", reason };
      } finally {
        active -= 1;
        completed += 1;
        report();
      }
    }
  };
  await Promise.all(Array.from({ length: limit }, runner));
  return results;
}

export const mediaProviderMeta: Record<MediaProvider, { title: string; short: string; note: string }> = {
  openai: { title: "OpenAI", short: "AI", note: "תמונה באיכות גבוהה" },
  openrouter: { title: "OpenRouter", short: "OR", note: "תמונה ווידאו ממספר ספקים" },
  kie: { title: "KIE", short: "KIE", note: "קטלוג תמונה ווידאו רחב" },
  fal: { title: "fal.ai", short: "fal", note: "מדיה מהירה ומודלים רבים" },
};

export const defaultMediaModels: Record<MediaProvider, { image: string; video: string }> = {
  openai: { image: "gpt-image-2", video: "" },
  openrouter: { image: "openai/gpt-image-2", video: "minimax/hailuo-3" },
  kie: { image: "gpt-image-2-image-to-image", video: "minimax-h3/image-to-video" },
  fal: { image: "fal-ai/nano-banana-2/edit", video: "fal-ai/wan/v2.2-5b/image-to-video" },
};

export const defaultCapabilityModels: Record<MediaProvider, { text: string; voice: string; image: string; video: string }> = {
  openai: { text: "gpt-5.6-luna", voice: "gpt-4o-mini-tts", image: "gpt-image-2", video: "sora-2" },
  openrouter: { text: "openai/gpt-5.6-luna", voice: "openai/gpt-4o-mini-tts-2025-12-15", image: "openai/gpt-image-2", video: "minimax/hailuo-3" },
  kie: { text: "gpt-5-6-luna", voice: "elevenlabs/text-to-dialogue-v3", image: "gpt-image-2-image-to-image", video: "minimax-h3/image-to-video" },
  fal: { text: "google/gemini-2.5-flash", voice: "fal-ai/elevenlabs/tts/multilingual-v2", image: "fal-ai/nano-banana-2/edit", video: "fal-ai/wan/v2.2-5b/image-to-video" },
};

export function buildKieImageTask(model: string, prompt: string, inputUrls: string[], aspectRatio = "1:1") {
  return { model, input: { prompt, input_urls: inputUrls, aspect_ratio: aspectRatio } };
}

export function buildKieVideoTask(model: string, prompt: string, firstFrameUrl: string, duration = 5) {
  if (model.includes("minimax-h3")) {
    return {
      model: model.includes("/") ? model : "minimax-h3/image-to-video",
      input: {
        prompt,
        first_frame_url: firstFrameUrl,
        duration: Math.max(5, Math.min(15, duration === 5 ? 6 : duration)),
        resolution: "768P",
      },
    };
  }
  return {
    model,
    input: {
      prompt,
      first_frame_url: firstFrameUrl,
      return_last_frame: false,
      generate_audio: false,
      resolution: "720p",
      aspect_ratio: "9:16",
      duration,
      web_search: false,
    },
  };
}

export function buildKieVoiceTask(model: string, text: string) {
  if (model.includes("text-to-dialogue-v3")) {
    return { model, input: { dialogue: [{ text, voice: "EkK5I93UQWFDigLMpZcX" }], stability: .5 } };
  }
  return { model, input: { text, voice: "Rachel", stability: .5, similarity_boost: .75, style: .15, speed: 1, timestamps: false } };
}

export function kieVoiceSupportsHebrew(model: string) {
  return model.includes("text-to-dialogue-v3") || !model.includes("multilingual-v2");
}

export function estimateVideoCredits(provider: MediaProvider, model: string, duration = 5): number | null {
  if (provider !== "kie") return null;
  const normalized = model.toLowerCase();
  if (normalized.includes("minimax-h3")) return 8 * Math.max(6, duration);
  if (normalized.includes("seedance-2-mini")) return 2.4 * duration;
  return null;
}

export function buildFalImageTask(prompt: string, imageUrls: string[], aspectRatio = "1:1") {
  return {
    prompt,
    image_urls: imageUrls,
    num_images: 1,
    aspect_ratio: aspectRatio,
    output_format: "webp",
    resolution: "1K",
    limit_generations: true,
  };
}

export function buildFalVideoTask(prompt: string, imageUrl: string) {
  return {
    image_url: imageUrl,
    prompt,
    num_frames: 81,
    frames_per_second: 24,
    resolution: "720p",
    aspect_ratio: "9:16",
    enable_safety_checker: true,
    enable_output_safety_checker: true,
    enable_prompt_expansion: false,
    video_quality: "high",
    video_write_mode: "balanced",
  };
}

export function parseKieTaskId(payload: any): string {
  const taskId = payload?.data?.taskId;
  if (!taskId) throw new Error(payload?.msg || "KIE לא החזיר מזהה משימה");
  return String(taskId);
}

export function parseKieTask(payload: any): { state: string; url?: string; error?: string } {
  const data = payload?.data ?? {};
  let result: any = {};
  try { result = typeof data.resultJson === "string" ? JSON.parse(data.resultJson) : data.resultJson ?? {}; } catch { /* invalid result handled below */ }
  const url = result.resultUrls?.[0] || result.urls?.[0] || result.videoUrl || result.imageUrl;
  return { state: String(data.state || "waiting"), url: url ? String(url) : undefined, error: data.failMsg || payload?.msg };
}

export function parseFalSubmission(payload: any): { statusUrl: string; responseUrl: string } {
  if (!payload?.status_url || !payload?.response_url) throw new Error(payload?.detail || "fal.ai לא החזיר כתובות מעקב");
  return { statusUrl: String(payload.status_url), responseUrl: String(payload.response_url) };
}

export function parseFalMediaUrl(payload: any): string {
  const data = payload?.data ?? payload;
  const url = data?.images?.[0]?.url || data?.image?.url || data?.video?.url || data?.video_url;
  if (!url) throw new Error(data?.detail || data?.error || "fal.ai לא החזיר קובץ מדיה");
  return String(url);
}

export function parseFalText(payload: any): string {
  const data = payload?.data ?? payload;
  const output = data?.output || data?.text || data?.choices?.[0]?.message?.content;
  if (!output) throw new Error(data?.error || "fal.ai לא החזיר טקסט");
  return String(output);
}

export function parseFalAudioUrl(payload: any): string {
  const data = payload?.data ?? payload;
  const url = data?.audio?.url || data?.audio_url || data?.file?.url;
  if (!url) throw new Error(data?.error || "fal.ai לא החזיר קובץ קול");
  return String(url);
}
