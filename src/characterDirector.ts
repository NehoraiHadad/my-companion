import type { CharacterKind, ThemeId } from "./gameEngine";

export type CharacterVisual = "master" | ThemeId;

const subjectIdentity: Record<Exclude<CharacterKind, "">, string> = {
  person: "the same human person",
  baby: "the same human baby",
  pet: "the same pet",
};

const subjectGuardrail: Record<Exclude<CharacterKind, "">, string> = {
  person: "Preserve the exact apparent age and human anatomy. Never add animal ears, fur, a tail, or mascot anatomy.",
  baby: "Preserve the exact baby age, face, proportions, and human anatomy. Keep every pose gentle and age-appropriate; never add animal features.",
  pet: "Preserve the exact species, breed cues, fur pattern, markings, face, and natural animal anatomy. Never humanize the pet or change species.",
};

const themeDirection: Record<ThemeId, string> = {
  sunrise: "Match the warm sunrise room: soft peach-and-coral key light, gentle golden rim light, bright playful 2.5D game rendering.",
  midnight: "Match the midnight room: soft navy-and-violet ambience, cool moonlit rim light, subtle warm face light, premium cinematic 2.5D game rendering.",
  classic: "Match the classic LCD room: readable monochrome olive pixel-art rendering, crisp chunky silhouette, limited four-tone palette, no photographic texture.",
};

export function buildCharacterPrompt(kind: CharacterKind, name: string, visual: CharacterVisual) {
  const safeKind = kind || "person";
  const identity = subjectIdentity[safeKind];
  const common = [
    `Create a production-ready full-body virtual-companion character of ${identity}, named ${name || "the companion"}, from the first reference image.`,
    "Identity is the highest priority: preserve face, age, hair or fur, skin tone, clothing, colors, markings, body proportions, and distinctive features.",
    subjectGuardrail[safeKind],
    "One subject only, relaxed front three-quarter pose, entire body visible, centered, expressive eyes, clean readable silhouette, family-friendly and lightly playful.",
    "Output only the isolated character with a natural soft floor-contact shadow. Transparent background. No room, scenery, furniture, text, logo, UI, border, frame, extra limbs, duplicate subject, or cropped body.",
  ];
  if (visual === "master") {
    common.splice(3, 0, "Polished modern 2.5D mobile-game style with soft materials and balanced neutral studio lighting. This is the canonical master design for every later image and animation.");
  } else {
    common.splice(3, 0, `${themeDirection[visual]} The first reference is the canonical character and must not be redesigned. If a second reference is present, use it only for lighting, palette, and rendering style; do not copy its room or objects.`);
  }
  return common.join(" ");
}

export function buildOpenRouterCharacterRequest(input: {
  model: string;
  references: string[];
  kind: CharacterKind;
  name: string;
  visual: CharacterVisual;
}) {
  return {
    model: input.model,
    prompt: buildCharacterPrompt(input.kind, input.name, input.visual),
    input_references: input.references.map((url) => ({ type: "image_url", image_url: { url } })),
    n: 1,
    aspect_ratio: "1:1",
    quality: "medium",
    output_format: "webp",
    background: "transparent",
  };
}

export const characterStorageKey = (visualRevision: number, visual: CharacterVisual) => `v${visualRevision}:character:${visual}`;

export const characterVisuals: CharacterVisual[] = ["master", "sunrise", "midnight", "classic"];
