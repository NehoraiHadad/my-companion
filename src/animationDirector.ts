import type { CharacterKind, CompanionMotion, ThemeId } from "./gameEngine";

export const motionMeta: Record<CompanionMotion, { title: string; note: string; duration: number }> = {
  idle: { title: "חי בחדר", note: "מצמוץ, מבט סביב ותנועה טבעית", duration: 5 },
  eat: { title: "אוכל", note: "תנועת אכילה קטנה, בלי להמציא חפצים", duration: 5 },
  play: { title: "משחק", note: "תנועת גוף עדינה ויציבה במקום", duration: 5 },
  sleep: { title: "שינה", note: "נרדם בנחת עם תנועה עדינה", duration: 5 },
  celebrate: { title: "חגיגה", note: "רגע ניצחון לשלב או משימה", duration: 5 },
};

export const animationPackMotions: CompanionMotion[] = ["idle", "eat", "play", "sleep", "celebrate"];

const kindDescription: Record<Exclude<CharacterKind, "">, string> = {
  person: "the exact same person",
  baby: "the exact same baby",
  pet: "the exact same pet",
};

const kindGuardrail: Record<Exclude<CharacterKind, "">, string> = {
  person: "Keep human anatomy and age exactly; never add animal ears, a tail, fur, or pet-like movement.",
  baby: "Keep human baby anatomy and age exactly; use only gentle, age-appropriate movement and never add animal features.",
  pet: "Keep the exact animal species and natural anatomy; never turn the pet into a human or another species.",
};

const motionDirection: Record<CompanionMotion, string> = {
  idle: "They make only a subtle breathing motion, one natural blink, and one very small head movement, then settle. Nothing new appears.",
  eat: "They make one small, contained chewing motion and a pleased expression. If food is already visible, they may touch only that existing food once; otherwise no food or prop appears.",
  play: "They make one small, contained body sway and one gentle wave using an existing limb, while staying planted in the exact same position. No jump, spin, or prop.",
  sleep: "They are already asleep in the reference scene. Keep the same sleeping pose, breathe softly, make one tiny natural sleepy movement, and return exactly to the starting sleeping pose.",
  celebrate: "They smile and make one small, contained celebratory nod or existing-limb movement, then settle. No stars, particles, props, or new objects appear.",
};

const sourceStyleGuardrail = (theme?: ThemeId) => theme === "classic"
  ? "The reference frame's monochrome green pixel rendering is intentional. Preserve its exact pixel-art palette, shapes, detail level, lighting, and character design; do not make it realistic, smoother, more detailed, or visually different."
  : "The reference frame is the final approved design. Do not restyle, beautify, redraw, re-render, reinterpret, or add a cinematic, cartoon, 3D, anime, realistic, or other visual treatment. Preserve its exact rendering, palette, texture, lighting, and character design frame to frame.";

export function buildAnimationPrompt(kind: CharacterKind, name: string, motion: CompanionMotion, theme?: ThemeId) {
  const safeKind = kind || "person";
  return [
    "Single-shot seamless full-scene motion loop made strictly from the approved reference frame.",
    `${kindDescription[safeKind]} in the reference scene is ${name || "the companion"}. Treat every visible character feature as locked source material: preserve identity, age, face, expression design, hair or fur, outfit, colors, markings, body proportions, silhouette, exact room position, contact surface, and lighting. Change only the movement required below.`,
    kindGuardrail[safeKind],
    sourceStyleGuardrail(theme),
    motionDirection[motion],
    "Keep the camera and every room object completely locked. Animate only the minimum required part of the companion. The body stays physically grounded on the same rug, cushion, bed, or floor surface for the whole motion.",
    "Anatomy lock: the number, shape, attachment points, and visibility of arms, hands, fingers, legs, paws, ears, and tail stay exactly as in the reference. Never grow, duplicate, erase, fuse, stretch, detach, or transform a limb into an object. Never turn a hand or paw into a lamp, food, toy, furniture, glow, or any other prop.",
    "No new object may appear and no existing object may disappear. No hand-object fusion, camera movement, cuts, zoom, sliding, floating, morphing, face drift, costume change, color shift, extra limbs, duplicate subject, text, logo, UI, or watermark.",
    "Use low-amplitude, physically plausible motion. Preserve every approved source detail; a stable subtle result is more important than a dramatic action. No dialogue and no generated audio.",
  ].join(" ");
}

export function buildAnimationRequest(input: {
  model: string;
  photoDataUrl: string;
  kind: CharacterKind;
  name: string;
  motion: CompanionMotion;
  theme?: ThemeId;
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
  return {
    model: input.model,
    prompt: buildAnimationPrompt(input.kind, input.name, input.motion, input.theme),
    duration: motionMeta[input.motion].duration,
    aspect_ratio: "9:16",
    resolution: efficientResolution,
    generate_audio: false,
    frame_images: frameImages,
  };
}

export const animationStorageKey = (visualRevision: number, motion: CompanionMotion) => `v${visualRevision}:${motion}`;
export const sceneAnimationStorageKey = (visualRevision: number, theme: string, motion: CompanionMotion) => `v${visualRevision}:scene:${theme}:${motion}`;
