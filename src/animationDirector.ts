import type { CharacterKind, CompanionMotion } from "./gameEngine";

export const motionMeta: Record<CompanionMotion, { title: string; note: string; duration: number }> = {
  idle: { title: "חי בחדר", note: "מצמוץ, מבט סביב ותנועה טבעית", duration: 5 },
  eat: { title: "אוכל", note: "תגובה קצרה ומשעשעת לארוחה", duration: 5 },
  play: { title: "משחק", note: "קפיצה, סיבוב ורגע של שטות", duration: 5 },
  sleep: { title: "שינה", note: "נרדם בנחת עם תנועה עדינה", duration: 5 },
  celebrate: { title: "חגיגה", note: "רגע ניצחון לשלב או משימה", duration: 5 },
};

const kindDescription: Record<Exclude<CharacterKind, "">, string> = {
  person: "the same stylized person",
  baby: "the same stylized baby",
  pet: "the same stylized pet",
};

const kindGuardrail: Record<Exclude<CharacterKind, "">, string> = {
  person: "Keep human anatomy and age exactly; never add animal ears, a tail, fur, or pet-like movement.",
  baby: "Keep human baby anatomy and age exactly; use only gentle, age-appropriate movement and never add animal features.",
  pet: "Keep the exact animal species and natural anatomy; never turn the pet into a human or another species.",
};

const motionDirection: Record<CompanionMotion, string> = {
  idle: "They blink, breathe, look around curiously, notice a tiny floating light, and return to the exact starting pose.",
  eat: "They happily eat a tiny snack, make one playful surprised expression, brush away a crumb, and return to the exact starting pose.",
  play: "They make a small joyful hop, playfully spin once, almost lose balance, recover proudly, and return to the exact starting pose.",
  sleep: "They yawn, settle into a cozy sleeping pose, breathe softly for a moment, and remain resting at the end.",
  celebrate: "They notice a small burst of warm stars, celebrate with one charming victory move, then return to the exact starting pose.",
};

export function buildAnimationPrompt(kind: CharacterKind, name: string, motion: CompanionMotion) {
  const safeKind = kind || "person";
  return [
    "Single-shot premium 2.5D virtual-companion game animation.",
    `${kindDescription[safeKind]} from the reference image is ${name || "the companion"}. Preserve identity, age, face, hair or fur, outfit, colors, body proportions, and art style exactly.`,
    kindGuardrail[safeKind],
    motionDirection[motion],
    "Locked front-facing camera. Full body always visible and centered. No camera movement, cuts, zoom, morphing, extra limbs, duplicate subject, text, logo, UI, or watermark.",
    "Use a simple dark navy studio background with a soft floor shadow. Family-friendly, warm, lightly comedic, smooth readable motion, seamless game-loop timing. No dialogue and no generated audio.",
  ].join(" ");
}

export function buildAnimationRequest(input: {
  model: string;
  photoDataUrl: string;
  kind: CharacterKind;
  name: string;
  motion: CompanionMotion;
  resolution?: string;
}) {
  return {
    model: input.model,
    prompt: buildAnimationPrompt(input.kind, input.name, input.motion),
    duration: motionMeta[input.motion].duration,
    aspect_ratio: "1:1",
    resolution: input.resolution || (input.model === "minimax/hailuo-3" ? "2K" : "720p"),
    generate_audio: false,
    frame_images: [{
      type: "image_url",
      image_url: { url: input.photoDataUrl },
      frame_type: "first_frame",
    }],
  };
}

export const animationStorageKey = (visualRevision: number, motion: CompanionMotion) => `v${visualRevision}:${motion}`;
