export type AiProvider = "openai" | "openrouter";
export type AiGameEvent = {
  dialogue: string;
  emotion: "happy" | "curious" | "sleepy" | "worried";
  animation: "bounce" | "spin" | "glow" | "nap";
  memory: string;
  bonus: number;
};

export function parseAiEvent(raw: string): AiGameEvent {
  const match = raw.match(/\{[\s\S]*\}/);
  let parsed: Partial<AiGameEvent> = {};
  try { parsed = JSON.parse(match?.[0] ?? raw); } catch { parsed = { dialogue: raw }; }
  const emotions: AiGameEvent["emotion"][] = ["happy", "curious", "sleepy", "worried"];
  const animations: AiGameEvent["animation"][] = ["bounce", "spin", "glow", "nap"];
  return {
    dialogue: String(parsed.dialogue || "חשבתי על משהו מצחיק ושכחתי בדיוק מה.").slice(0, 120),
    emotion: emotions.includes(parsed.emotion as AiGameEvent["emotion"]) ? parsed.emotion as AiGameEvent["emotion"] : "curious",
    animation: animations.includes(parsed.animation as AiGameEvent["animation"]) ? parsed.animation as AiGameEvent["animation"] : "bounce",
    memory: String(parsed.memory || parsed.dialogue || "רגע קטן ביחד").slice(0, 80),
    bonus: Math.max(0, Math.min(5, Number(parsed.bonus) || 0)),
  };
}

export function extractAiResponseText(provider: AiProvider, data: any): string {
  if (provider === "openrouter") return String(data?.choices?.[0]?.message?.content || "");
  if (data?.output_text) return String(data.output_text);
  return String(data?.output?.flatMap((entry: any) => entry.content ?? []).map((entry: any) => entry.text ?? "").join("") || "");
}

export function extractKieResponseText(raw: string): string {
  const parsePayload = (value: string) => {
    try { return JSON.parse(value); } catch { return null; }
  };
  const direct = parsePayload(raw);
  if (direct) return extractAiResponseText("openai", direct);

  const deltas: string[] = [];
  let completed = "";
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const value = line.slice(5).trim();
    if (!value || value === "[DONE]") continue;
    const payload = parsePayload(value);
    if (!payload) continue;
    if (typeof payload.delta === "string" && String(payload.type || "").includes("output_text")) deltas.push(payload.delta);
    const full = extractAiResponseText("openai", payload.response ?? payload);
    if (full) completed = full;
  }
  return completed || deltas.join("");
}
