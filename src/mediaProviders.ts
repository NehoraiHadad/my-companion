export type MediaProvider = "openai" | "openrouter" | "kie" | "fal";

export const mediaProviderMeta: Record<MediaProvider, { title: string; short: string; note: string }> = {
  openai: { title: "OpenAI", short: "AI", note: "תמונה באיכות גבוהה" },
  openrouter: { title: "OpenRouter", short: "OR", note: "תמונה ווידאו ממספר ספקים" },
  kie: { title: "KIE", short: "KIE", note: "קטלוג תמונה ווידאו רחב" },
  fal: { title: "fal.ai", short: "fal", note: "מדיה מהירה ומודלים רבים" },
};

export const defaultMediaModels: Record<MediaProvider, { image: string; video: string }> = {
  openai: { image: "gpt-image-2", video: "" },
  openrouter: { image: "openai/gpt-image-2", video: "minimax/hailuo-3" },
  kie: { image: "gpt-image-2-image-to-image", video: "bytedance/seedance-2-mini" },
  fal: { image: "fal-ai/nano-banana-2/edit", video: "fal-ai/wan/v2.2-5b/image-to-video" },
};

export const defaultCapabilityModels: Record<MediaProvider, { text: string; voice: string; image: string; video: string }> = {
  openai: { text: "gpt-5.6-luna", voice: "gpt-4o-mini-tts", image: "gpt-image-2", video: "sora-2" },
  openrouter: { text: "openai/gpt-5.6-luna", voice: "openai/gpt-4o-mini-tts-2025-12-15", image: "openai/gpt-image-2", video: "minimax/hailuo-3" },
  kie: { text: "gpt-5-6-luna", voice: "elevenlabs/text-to-speech-multilingual-v2", image: "gpt-image-2-image-to-image", video: "bytedance/seedance-2-mini" },
  fal: { text: "google/gemini-2.5-flash", voice: "fal-ai/elevenlabs/tts/multilingual-v2", image: "fal-ai/nano-banana-2/edit", video: "fal-ai/wan/v2.2-5b/image-to-video" },
};

export function buildKieImageTask(model: string, prompt: string, inputUrls: string[]) {
  return { model, input: { prompt, input_urls: inputUrls, aspect_ratio: "1:1" } };
}

export function buildKieVideoTask(model: string, prompt: string, firstFrameUrl: string, duration = 5) {
  return {
    model,
    input: {
      prompt,
      first_frame_url: firstFrameUrl,
      return_last_frame: false,
      generate_audio: false,
      resolution: "720p",
      aspect_ratio: "1:1",
      duration,
      web_search: false,
    },
  };
}

export function buildFalImageTask(prompt: string, imageUrls: string[]) {
  return {
    prompt,
    image_urls: imageUrls,
    num_images: 1,
    aspect_ratio: "1:1",
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
    aspect_ratio: "1:1",
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
