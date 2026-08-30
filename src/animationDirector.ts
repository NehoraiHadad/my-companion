import type { CharacterKind, CompanionMotion } from "./gameEngine";

export const motionMeta: Record<CompanionMotion, { title: string; note: string; duration: number }> = {
  idle: { title: "חי בחדר", note: "מצמוץ, מבט סביב ותנועה טבעית", duration: 5 },
  eat: { title: "אוכל", note: "תגובה קצרה ומשעשעת לארוחה", duration: 5 },
  play: { title: "משחק", note: "קפיצה, סיבוב ורגע של שטות", duration: 5 },
  sleep: { title: "שינה", note: "נרדם בנחת עם תנועה עדינה", duration: 5 },
  celebrate: { title: "חגיגה", note: "רגע ניצחון לשלב או משימה", duration: 5 },
};

export const animationPackMotions: CompanionMotion[] = ["idle", "eat", "play", "sleep", "celebrate"];

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
  sleep: "They are already asleep in the reference scene. Keep the same sleeping pose, breathe softly, make one tiny natural sleepy movement, and return exactly to the starting sleeping pose.",
  celebrate: "They notice a small burst of warm stars, celebrate with one charming victory move, then return to the exact starting pose.",
};

export function buildAnimationPrompt(kind: CharacterKind, name: string, motion: CompanionMotion) {
  const safeKind = kind || "person";
  return [
    "Single-shot seamless full-scene virtual-companion game loop from the approved reference frame.",
    `${kindDescription[safeKind]} in the reference scene is ${name || "the companion"}. Preserve identity, age, face, hair or fur, outfit, colors, body proportions, exact room position, contact surface, lighting, and art style.`,
    kindGuardrail[safeKind],
    motionDirection[motion],
    "Keep the camera and every room object completely locked. Animate only the companion and an action prop when the requested motion requires one. The body stays physically grounded on the same rug, cushion, bed, or floor surface for the whole motion.",
    "No camera movement, cuts, zoom, sliding, floating, morphing, extra limbs, duplicate subject, text, logo, UI, or watermark.",
    "Family-friendly, warm, lightly comedic, smooth readable motion, seamless game-loop timing. No dialogue and no generated audio.",
  ].join(" ");
}

export function buildAnimationRequest(input: {
  model: string;
  photoDataUrl: string;
  kind: CharacterKind;
  name: string;
  motion: CompanionMotion;
  resolution?: string;
  supportedResolutions?: string[];
  supportedFrameImages?: string[];
}) {
  const efficientResolution = input.resolution || ["1K", "768p", "720p", "1080p", "2K", "4K"].find((resolution) => input.supportedResolutions?.includes(resolution)) || "720p";
  const frameImages: Array<{ type: "image_url"; image_url: { url: string }; frame_type: "first_frame" | "last_frame" }> = [{
    type: "image_url",
    image_url: { url: input.photoDataUrl },
    frame_type: "first_frame",
  }];
  if (input.supportedFrameImages?.includes("last_frame")) frameImages.push({
    type: "image_url",
    image_url: { url: input.photoDataUrl },
    frame_type: "last_frame",
  });
  return {
    model: input.model,
    prompt: buildAnimationPrompt(input.kind, input.name, input.motion),
    duration: motionMeta[input.motion].duration,
    aspect_ratio: "9:16",
    resolution: efficientResolution,
    generate_audio: false,
    frame_images: frameImages,
  };
}

export const animationStorageKey = (visualRevision: number, motion: CompanionMotion) => `v${visualRevision}:${motion}`;
export const sceneAnimationStorageKey = (visualRevision: number, theme: string, motion: CompanionMotion) => `v${visualRevision}:scene:${theme}:${motion}`;
