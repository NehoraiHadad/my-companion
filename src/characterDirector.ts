import type { CharacterKind, DecorKey, StageId, ThemeId } from "./gameEngine";

export type CharacterVisual = "master" | ThemeId;
export type ScenePose = "sitting" | "resting" | "standing";

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

export const stageFlair: Record<StageId, string> = {
  baby: "Stage presentation only, never changing age, species, or identity: give them wide-eyed, brand-new-to-the-world energy.",
  kid: "Stage presentation only, never changing age, species, or identity: give them bright, playful, curious energy.",
  teen: "Stage presentation only, never changing age, species, or identity: give them confident, blooming energy with a light touch of personal flair.",
  grown: "Stage presentation only, never changing age, species, or identity: give them a calm, proud, seasoned-friend presence.",
  mentor: "Stage presentation only, never changing age, species, or identity: give them a warm, wise presence with one tiny cozy scarf as the only added accessory.",
  legend: "Stage presentation only, never changing age, species, or identity: give them a subtle golden champion aura with a few soft sparkles, tasteful and gentle.",
};

export function buildCharacterPrompt(kind: CharacterKind, name: string, visual: CharacterVisual, stage?: StageId) {
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
  if (stage) {
    common.splice(common.length - 1, 0, stageFlair[stage]);
  }
  return common.join(" ");
}

export function buildOpenRouterCharacterRequest(input: {
  model: string;
  references: string[];
  kind: CharacterKind;
  name: string;
  visual: CharacterVisual;
  stage?: StageId;
}) {
  return {
    model: input.model,
    prompt: buildCharacterPrompt(input.kind, input.name, input.visual, input.stage),
    input_references: input.references.map((url) => ({ type: "image_url", image_url: { url } })),
    n: 1,
    aspect_ratio: "1:1",
    quality: "medium",
    output_format: "webp",
    background: "transparent",
  };
}

export const characterStorageKey = (visualRevision: number, visual: CharacterVisual) => `v${visualRevision}:character:${visual}`;

export const characterVisuals: CharacterVisual[] = ["master"];

export const scenePose: Record<ThemeId, Record<Exclude<CharacterKind, "">, ScenePose>> = {
  sunrise: { person: "sitting", baby: "sitting", pet: "sitting" },
  midnight: { person: "resting", baby: "resting", pet: "resting" },
  classic: { person: "standing", baby: "sitting", pet: "sitting" },
};

const poseDirection: Record<ScenePose, Record<Exclude<CharacterKind, "">, string>> = {
  sitting: {
    person: "sitting naturally and comfortably on the main rug, with the body fully supported by it",
    baby: "sitting safely in an age-appropriate pose on the main rug, with the body fully supported by it",
    pet: "sitting naturally on the main rug with all paws and body weight visibly grounded",
  },
  resting: {
    person: "resting naturally on the soft central floor area in a comfortable, anatomically correct pose",
    baby: "lying safely on their back on the soft central rug or cushion in an age-appropriate resting pose",
    pet: "lying naturally on the soft central rug or cushion with the body visibly supported",
  },
  standing: {
    person: "standing naturally on the central floor with both feet visibly grounded",
    baby: "sitting safely on the central floor mat in an age-appropriate pose",
    pet: "standing naturally on the central floor with all paws visibly grounded",
  },
};

export function buildSceneCompositePrompt(kind: CharacterKind, name: string, theme: ThemeId, stage?: StageId) {
  const safeKind = kind || "person";
  const pose = scenePose[theme][safeKind];
  return [
    "Use the first image as the immutable base room and the second image as the canonical companion identity reference.",
    "Return the full portrait room. Keep the exact camera, framing, furniture, architecture, decorations, proportions, palette, and composition of the first image.",
    themeDirection[theme],
    `Place exactly one ${subjectIdentity[safeKind]}, named ${name || "the companion"}, ${poseDirection[pose][safeKind]}.`,
    "Identity is the highest priority: preserve the exact face, apparent age, hair or fur, skin tone, clothing, colors, markings, body proportions, and distinctive features from the second image.",
    subjectGuardrail[safeKind],
    stage ? stageFlair[stage] : "",
    "Match the room's scale, floor perspective, light direction, color spill, depth, and occlusion. Add a subtle physically believable contact shadow directly under the body so the companion never floats.",
    "Do not redesign the room or companion. No extra people, animals, duplicate subject, extra limbs, text, logo, UI, border, frame, or watermark.",
  ].filter(Boolean).join(" ");
}

export function buildOpenRouterSceneRequest(input: {
  model: string;
  roomReference: string;
  identityReference: string;
  kind: CharacterKind;
  name: string;
  theme: ThemeId;
  stage?: StageId;
}) {
  return {
    model: input.model,
    prompt: buildSceneCompositePrompt(input.kind, input.name, input.theme, input.stage),
    input_references: [input.roomReference, input.identityReference].map((url) => ({ type: "image_url", image_url: { url } })),
    n: 1,
    aspect_ratio: "9:16",
    quality: "medium",
    output_format: "webp",
    background: "opaque",
  };
}

export const sceneStorageKey = (visualRevision: number, theme: ThemeId, roomSet = "base") => `v${visualRevision}:scene:${theme}:${roomSet || "base"}`;

export function buildSleepScenePrompt(kind: CharacterKind, name: string, theme: ThemeId) {
  const safeKind = kind || "person";
  const sleepPose: Record<Exclude<CharacterKind, "">, string> = {
    person: "sleeping naturally and comfortably on the same rug, cushion, or bed surface, with a safe anatomically correct resting pose",
    baby: "sleeping safely on their back on the same soft rug, cushion, or bed surface in an age-appropriate pose",
    pet: "curled up or lying naturally asleep on the same rug, cushion, or bed surface with the whole body visibly supported",
  };
  return [
    "Use the first image as the immutable approved full room scene and the second image only as the canonical companion identity reference.",
    "Return the complete portrait room. Keep the exact camera, framing, architecture, furniture, decorations, palette, lighting, floor perspective, and composition.",
    themeDirection[theme],
    `Change only ${name || "the companion"} into a persistent sleeping state: ${sleepPose[safeKind]}.`,
    "Preserve the exact identity, apparent age, face, hair or fur, clothing, colors, markings, body proportions, scale, and room position.",
    subjectGuardrail[safeKind],
    "Keep the body physically grounded. Preserve believable occlusion and add only the subtle contact shadow required by the sleeping pose.",
    "Do not change, move, redraw, or animate any room object. No blanket unless one already exists in the room. No extra subject, limbs, text, logo, UI, frame, or watermark.",
  ].join(" ");
}

export function buildOpenRouterSleepSceneRequest(input: {
  model: string;
  sceneReference: string;
  identityReference: string;
  kind: CharacterKind;
  name: string;
  theme: ThemeId;
}) {
  return {
    model: input.model,
    prompt: buildSleepScenePrompt(input.kind, input.name, input.theme),
    input_references: [input.sceneReference, input.identityReference].map((url) => ({ type: "image_url", image_url: { url } })),
    n: 1,
    aspect_ratio: "9:16",
    quality: "medium",
    output_format: "webp",
    background: "opaque",
  };
}

export const stateSceneStorageKey = (visualRevision: number, theme: ThemeId, state: "sleep", roomSet = "base") => `v${visualRevision}:scene:${theme}:${roomSet || "base"}:state:${state}`;

export const decorPrompt: Record<DecorKey, string> = {
  lamp: "a small cozy bedside lamp with a star-patterned shade, glowing softly",
  poster: "a cheerful framed adventure poster hanging on the wall",
  rug: "a soft cloud-shaped rug lying naturally on the floor",
  plant: "a happy small potted plant with rounded leaves",
  radio: "a little retro radio sitting on a surface",
  trophy: "a shiny golden trophy proudly on display",
  bookshelf: "a small cozy bookshelf with colorful books, one leaning slightly",
  aquarium: "a tiny round fish tank with clear water, one small orange fish and a little green plant",
  telescope: "a friendly little telescope on a wooden tripod, pointed up toward the window",
  fireplace: "a small warm fireplace with a gentle glowing fire, safely enclosed",
  projector: "a tiny galaxy projector casting soft star patterns onto the ceiling",
  icecream: "a playful mini ice-cream machine with a soft pastel swirl cone",
};

export const decorSetKey = (decorations: Partial<Record<DecorKey, boolean>>) => (Object.keys(decorPrompt) as DecorKey[]).filter((key) => decorations[key]).join(",");

export const roomStorageKey = (theme: ThemeId, decorSet: string) => `room:${theme}:${decorSet}`;

export function buildRoomUpgradePrompt(theme: ThemeId, decorKeys: DecorKey[]) {
  return [
    "Edit the reference room photo and return the same room with new decorations added. There is no character in it.",
    "Keep the exact same room, camera angle, framing, composition, proportions, art style, palette, and lighting; change nothing that already exists.",
    themeDirection[theme],
    `Naturally integrate these decorations: ${decorKeys.map((key) => decorPrompt[key]).join(", ")}.`,
    "Place every item at a believable position: wall items flat on the walls, floor items resting on the floor, small objects standing on existing surfaces, each matched to the room's perspective, scale, shadows, and light direction.",
    "Leave generous clear floor space at the center of the room for the companion character to stand later.",
    "Strictly no people, no animals, no characters, no text, no logos, no UI, and no watermarks. Output the full room image.",
  ].join(" ");
}
