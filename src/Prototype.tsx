import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentType, type ReactNode } from "react";
import {
  AvatarIcon, BackpackIcon, BellIcon, CameraIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, CircleIcon,
  ClockIcon, CookieIcon, ExclamationTriangleIcon, FaceIcon, GearIcon,
  HeartFilledIcon, HomeIcon, LightningBoltIcon, LockClosedIcon, MagicWandIcon,
  InfoCircledIcon, MoonIcon, PaperPlaneIcon, PersonIcon, PlayIcon, PlusCircledIcon, ReloadIcon, RocketIcon, SewingPinIcon, SpeakerLoudIcon, StackIcon, StarFilledIcon,
  SunIcon, TokensIcon, TrashIcon,
} from "@radix-ui/react-icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { extractAiResponseText, extractKieResponseText, parseAiEvent, type AiProvider } from "./aiGame";
import { addAiAssetHistoryItem, clearAiAssetState, removeAiAssetHistoryItem, removeAnimationAssetState, removeSceneAssetState } from "./assetManagement";
import { animationPackMotions, animationStorageKey, buildAnimationRequest, motionMeta, sceneAnimationStorageKey } from "./animationDirector";
import { buildCharacterPrompt, buildOpenRouterCharacterRequest, buildOpenRouterSceneRequest, buildOpenRouterSleepSceneRequest, buildRoomUpgradePrompt, buildSceneCompositePrompt, buildSleepScenePrompt, characterStorageKey, characterVisuals, decorSetKey, roomStorageKey, sceneStorageKey, stateSceneStorageKey, type CharacterVisual } from "./characterDirector";
import { defaultCompanionArt } from "./defaultCompanions";
import {
  buildFalImageTask, buildFalVideoTask, buildKieImageTask, buildKieVideoTask, buildKieVoiceTask,
  defaultCapabilityModels, estimateVideoCredits, mediaProviderMeta, parseFalAudioUrl, parseFalMediaUrl, parseFalSubmission, parseFalText,
  parseKieTask, parseKieTaskId, isRetryableStatus, kieVoiceSupportsHebrew, providerConcurrency, retryDelayMilliseconds, runTaskPool, type MediaProvider,
} from "./mediaProviders";
import { clearPendingKieJobs, completePendingKieJob, findPendingKieJob, savePendingKieJob, updatePendingKieResult } from "./kieJobs";
import { loadClip, loadMedia, removeClips, removeMedia, saveClip, saveMedia } from "./mediaStore";
import { Carousel, KeyboardInput, MobileScroll, useKeyboard } from "./mobile";
import { clearEncryptedAiSettings, hasEncryptedAiStorage, readEncryptedAiSettings, saveEncryptedAiSettings } from "./secureAiStorage";
import {
  HOUR, absenceMessage, ageDay, applyElapsed, arcadePayoutScale, arcadeRewardBonus, buyDecoration, chooseBuild, claimDailyQuest, claimStreakMilestone, claimWeekly, clamp, createDefaultState, currentStage,
  decorMeta, isDecorUnlocked, localDayKey, localWeekKey, nextStage, performCareAction, personaBuildMeta, questPool, recordArcadeRun, recordPurchase, stageMeta, stageOrder, stageUnlocks,
  streakMilestones, useInventoryItem, weeklyQuest, whole,
  type ActionKey, type AiAssetHistoryItem, type AnimationAssetRecord, type CharacterKind, type CompanionMotion, type DecorKey, type GameState, type ItemKey, type NeedKey, type PersonalityId, type QuestId, type StageId, type ThemeId,
} from "./gameEngine";
import "./prototype.css";

type ScreenId = "home" | "arcade" | "journey" | "bag";
type OverlayId = "settings" | "ai" | "guide" | "event" | "build";
type EffectKind = "food" | "heart" | "bubble" | "moon" | "coin" | "medicine";
type EventVariant = "event" | "notice";
type AiScope = "text" | "voice" | "image" | "video" | "character" | "room" | "motion" | "dream" | "general";
type AiIssue = { scope: AiScope; message: string };
type GeneratedVideo = { blob: Blob; credits?: number };

type AiSettings = {
  provider: AiProvider | MediaProvider;
  voiceProvider: MediaProvider;
  imageProvider: MediaProvider;
  videoProvider: MediaProvider;
  openRouterKey: string;
  openAiKey: string;
  kieKey: string;
  falKey: string;
  textModel: string;
  imageModel: string;
  voiceModel: string;
  videoModel: string;
  imageConsent: boolean;
  autoEvents: boolean;
  autoVoice: boolean;
  videoPresetVersion: number;
  voicePresetVersion: number;
};
type ImageModel = { id: string; name: string; architecture?: { input_modalities?: string[]; output_modalities?: string[] } };
type VoiceModel = { id: string; name?: string; architecture?: { output_modalities?: string[] } };
type VideoModel = { id: string; name?: string; generate_audio?: boolean; supported_frame_images?: string[]; supported_aspect_ratios?: string[]; supported_resolutions?: string[]; supported_durations?: number[] };

const STORAGE_KEY = "little-friend-state-v5";
const V4_STORAGE_KEY = "little-friend-state-v4";
const V3_STORAGE_KEY = "little-friend-state-v3";
const V2_STORAGE_KEY = "little-friend-state-v2";
const OLD_STORAGE_KEY = "pocket-companion-state-v1";
const AI_KEY = "little-friend-ai-v6";
const DecorVisual = lazy(() => import("./decorArt"));
const resetScroll = (selector: string) => {
  const reset = () => { const scroll = document.querySelector<HTMLElement>(selector); if (scroll) scroll.scrollTop = 0; };
  reset(); window.requestAnimationFrame(reset); window.setTimeout(reset, 180);
};


const defaultAi: AiSettings = {
  provider: "openai",
  voiceProvider: "openai",
  imageProvider: "openai",
  videoProvider: "openrouter",
  openRouterKey: "",
  openAiKey: "",
  kieKey: "",
  falKey: "",
  textModel: "gpt-5.6-luna",
  imageModel: "gpt-image-2",
  voiceModel: "gpt-4o-mini-tts",
  videoModel: "minimax/hailuo-3",
  imageConsent: false,
  autoEvents: true,
  autoVoice: false,
  videoPresetVersion: 1,
  voicePresetVersion: 1,
};

const themes: Array<{ id: ThemeId; title: string; note: string; image: string }> = [
  { id: "midnight", title: "לילה חלומי", note: "תלת־ממד קולנועי", image: "/assets/companion/room-midnight.webp" },
  { id: "sunrise", title: "בוקר שמח", note: "חם, נקי ומודרני", image: "/assets/companion/room-sunrise-v5.webp" },
  { id: "classic", title: "קלאסי", note: "LCD נוסטלגי", image: "/assets/companion/room-classic.webp" },
];

function StinkIcon() {
  return <svg viewBox="0 0 15 15" width="15" height="15" fill="none" aria-hidden="true">
    <path d="M4.4 12.4h6.2a2.4 2.4 0 0 0 .5-4.7 2.6 2.6 0 0 0-2.3-3.4A2.5 2.5 0 0 0 4.2 5a2.3 2.3 0 0 0-1.6 3.2 2.4 2.4 0 0 0 1.8 4.2Z" fill="currentColor" opacity=".9" />
    <path d="M6.6 2.6c.7-.5.7-1.2.2-1.8M9.4 2.9c.6-.4.7-1 .3-1.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>;
}

function PawIcon() {
  return <svg viewBox="0 0 15 15" width="15" height="15" fill="currentColor" aria-hidden="true">
    <ellipse cx="4.1" cy="4.5" rx="1.5" ry="2" /><ellipse cx="7.5" cy="3.4" rx="1.5" ry="2.1" /><ellipse cx="10.9" cy="4.5" rx="1.5" ry="2" />
    <path d="M7.5 7c2 0 3.7 1.6 3.7 3.5 0 1.6-1.2 2.6-2.6 2.6-.5 0-.8-.1-1.1-.1s-.6.1-1.1.1c-1.4 0-2.6-1-2.6-2.6C3.8 8.6 5.5 7 7.5 7Z" />
  </svg>;
}

const needsMeta: Record<NeedKey, { label: string; icon: typeof SunIcon }> = {
  fullness: { label: "שובע", icon: CookieIcon }, energy: { label: "אנרגיה", icon: LightningBoltIcon },
  hygiene: { label: "ניקיון", icon: SunIcon }, mood: { label: "שמחה", icon: HeartFilledIcon },
};

const actionsMeta: Record<ActionKey, { label: string; need: NeedKey; icon: typeof SunIcon; effect: EffectKind }> = {
  feed: { label: "להאכיל", need: "fullness", icon: CookieIcon, effect: "food" },
  sleep: { label: "לישון", need: "energy", icon: MoonIcon, effect: "moon" },
  clean: { label: "לנקות", need: "hygiene", icon: SunIcon, effect: "bubble" },
  play: { label: "לשחק", need: "mood", icon: RocketIcon, effect: "heart" },
};

const items: Record<ItemKey, { title: string; note: string; price: number; icon: typeof SunIcon }> = {
  apple: { title: "תפוח", note: "+18 שובע", price: 8, icon: CookieIcon },
  meal: { title: "ארוחה מושקעת", note: "+35 שובע · +5 שמחה", price: 22, icon: StackIcon },
  soap: { title: "סבון עננים", note: "ניקיון מלא", price: 14, icon: SunIcon },
  medicine: { title: "תרופה", note: "מרפאת מחלה", price: 26, icon: PlusCircledIcon },
  ball: { title: "כדור קופצני", note: "+28 שמחה", price: 18, icon: CircleIcon },
};

const decorLines: Record<DecorKey, string> = {
  lamp: "המנורה נדלקה והחדר מיד התחיל להתנהג יפה.",
  poster: "תליתי פוסטר. עכשיו יש למי להסביר את הרעיונות שלי.",
  rug: "שטיח. סוף־סוף לרצפה יש דעה נעימה.",
  plant: "עציץ חדש. הבטחתי לו שלא ננהל שיחות ארוכות מדי.",
  radio: "רדיו! מהיום לכל צעד בחדר יש פסקול.",
  trophy: "גביע. לא זכיתי בכלום, אבל הוא נראה משכנע.",
  bookshelf: "ספרייה. עכשיו יש איפה להחזיק דעות מסודרות.",
  aquarium: "אקווריום. הדגים כבר ביקשו שקט בשעות הצהריים.",
  telescope: "טלסקופ. בדקתי — היקום נראה בסדר גמור מכאן.",
  fireplace: "החדר עכשיו חמים גם רגשית.",
  projector: "מקרן. הקיר עבר בהצלחה אודישן למסך.",
  icecream: "עמדת גלידה בבית. זו כבר לא סתם החלטה, זו מדיניות.",
};

const decorShelves: Array<{ unlockStage: StageId; title: string; note: string }> = [
  { unlockStage: "baby", title: "המדף הראשון", note: "פתוח מהשלב הראשון" },
  { unlockStage: "grown", title: "המדף השני", note: "נפתח בשלב חבר ותיק" },
  { unlockStage: "mentor", title: "המדף השלישי", note: "נפתח בשלב מנטור השכונה" },
];
const shelfIndex = (unlockStage: StageId) => unlockStage === "mentor" ? 2 : unlockStage === "grown" ? 1 : 0;
const wagerCost = 15;

const sharedReactions: Record<ActionKey, string[]> = {
  feed: ["זו לא הייתה רעב. זו הייתה מסיבת עיתונאים של הבטן.", "השארתי פירור אחד. הוא אחראי על המשמרת הבאה."],
  sleep: ["אם יש נחירות—זו גרסת הפרימיום של הפסקול.", "רק תנומה קטנה. שלושים דקות או חורף שלם."],
  clean: ["זה מבריק מספיק כדי לסנוור אחריות הורית.", "נקי. החשדות נשארו, אבל נקי."],
  play: ["זה נחשב ספורט. בדקתי עם עצמי.", "שיא אישי חדש בבלגן עם כוונות טובות."],
};

const kindReactions: Record<Exclude<CharacterKind, "">, Record<ActionKey, string[]>> = {
  person: {
    feed: ["מינינו אותך רשמית לשר החטיפים."], sleep: ["הפגישה שלי עם הכרית התחילה מוקדם."],
    clean: ["אמרתי שהמראה הזו טבעית. המים התעקשו."], play: ["הפסדתי בכבוד. כלומר, נדרש כאן משחק חוזר."],
  },
  baby: {
    feed: ["הבקבוק קיבל חמישה כוכבים. השירות קצת איטי."], sleep: ["לא עייפים בכלל. רק עוצמים עיניים ברמה מקצועית."],
    clean: ["החיתול הגיש מכתב התפטרות."], play: ["מצאתי צעצוע. ועכשיו הוא ראש מחלקת רעש."],
  },
  pet: {
    feed: ["בדקתי: הקערה שוב ריקה. תעלומה."], sleep: ["שומרים על הספה מבפנים."],
    clean: ["הריח הזה היה חלק מהאישיות שלי."], play: ["הכדור ברח. רדפתי אחריו מטעמי צדק."],
  },
};

const affectionLines = [
  "ליטוף אחד ומיד היום נראה מוצלח יותר.",
  "עוד ליטוף כזה ונפתח מועדון חברים.",
  "נרשם ביומן: היה כאן רגע נעים.",
  "זה בדיוק המקום הנכון. תודה על התיאום.",
  "נמס כאן קצת. אל תספרו לאף אחד.",
];

const personalityReactions: Record<PersonalityId, Record<ActionKey, string[]>> = {
  curious: {
    feed: ["בדקתי כל ביס מזווית אחרת. זה נקרא מחקר.", "טעם חדש. פתחתי עליו תיק."],
    sleep: ["נרדמים מיד אחרי שנבין מה הרעש הזה.", "עצמתי עיניים ומיד צצה שאלה טובה."],
    clean: ["גיליתי שיש לי צבע מתחת ללכלוך. מרתק.", "חקרתי את הקצף. הוא סירב לשתף פעולה."],
    play: ["המצאתי חוק חדש באמצע. הוא ניצח אותי.", "כל פינה בחדר קיבלה סיור מודרך."],
  },
  cozy: {
    feed: ["אכלתי לאט. יש כבוד לארוחה.", "הבטן שלי ביקשה שמיכה אחרי זה."],
    sleep: ["הכרית ואני חתמנו על הסכם ארוך טווח.", "חממתי בדיוק את הפינה הזאת. עכשיו אסור לזוז."],
    clean: ["הכול נקי, רך וחמים. אין לי בקשות נוספות היום.", "מבריקים בקצב שלנו, בלי לחץ."],
    play: ["שיחקנו יפה ואז נזכרתי שיש כורסה.", "אחרי כיף כזה מגיעה הפסקה רשמית."],
  },
  comic: {
    feed: ["הבטן מחאה כפיים. היא קהל קל.", "ביקשתי תוספת בשקט, כדי לא לפגוע בצלחת."],
    sleep: ["לא ישנים כאן, רק עושים חזרות לחלום.", "תנומה קצרה עם קטע מחיאות כפיים בסוף."],
    clean: ["התרחצתי והופעתי מחדש. קהל, כמובן, לא היה.", "נקיים, מבריקים, ומחפשים במה."],
    play: ["הופעתי, נפלתי, קמתי והשתחוויתי.", "המשחק הזה היה גאוני. אנחנו העדים היחידים."],
  },
};

const actionMotion: Record<ActionKey, CompanionMotion> = { feed: "eat", sleep: "sleep", clean: "celebrate", play: "play" };

const kindLabels: Record<Exclude<CharacterKind, "">, { title: string; note: string; icon: ComponentType; namePlaceholder: string }> = {
  person: { title: "אדם", note: "ילד, נער או מבוגר", icon: PersonIcon, namePlaceholder: "איך קוראים לו או לה?" },
  baby: { title: "תינוק", note: "קטן, מצחיק ודעתן", icon: AvatarIcon, namePlaceholder: "איך קוראים לתינוק?" },
  pet: { title: "חיית מחמד", note: "כלב, חתול וכל השאר", icon: PawIcon, namePlaceholder: "איך קוראים לחיית המחמד?" },
};


const guessTells = [
  { id: "lean", label: "רכינה", reliability: .85, phrase: "אמין מאוד" },
  { id: "ear", label: "זיז אוזן", reliability: .6, phrase: "ככה־ככה" },
  { id: "blink", label: "מצמוץ", reliability: .4, phrase: "חשוד ביותר" },
];

function loadState(): GameState {
  const now = Date.now();
  const initial = createDefaultState(now);
  try {
    const fresh = new URLSearchParams(location.search).get("fresh") === "1";
    if (!fresh) {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as GameState | null;
      if (saved?.version === 5) {
        return applyElapsed({ ...initial, ...saved, memories: saved.memories ?? [], animationSlots: saved.animationSlots ?? {}, aiCharacter: saved.aiCharacter ?? false, characterVariants: saved.characterVariants ?? {}, aiRooms: saved.aiRooms ?? {}, aiScenes: saved.aiScenes ?? {}, aiSceneApprovals: saved.aiSceneApprovals ?? {}, aiStateScenes: saved.aiStateScenes ?? {}, sceneAnimationSlots: saved.sceneAnimationSlots ?? {}, animationAssets: saved.animationAssets ?? {}, animationSample: saved.animationSample, aiAssetHistory: saved.aiAssetHistory ?? [], aiUsage: saved.aiUsage ?? { imageCredits: 0, videoCredits: 0 }, decorations: saved.decorations ?? {}, claimedMilestones: saved.claimedMilestones ?? [], arcadePlays: saved.arcadePlays ?? 0, dailyQuests: saved.dailyQuests ?? [], questProgress: saved.questProgress ?? {}, dailyActionKinds: saved.dailyActionKinds ?? [], weeklyKey: saved.weeklyKey ?? localWeekKey(), weeklyProgress: saved.weeklyProgress ?? 0, weeklyClaimed: saved.weeklyClaimed ?? false, personaBuild: saved.personaBuild ?? "", napBonus: saved.napBonus ?? 0, pendingNapReward: saved.pendingNapReward ?? 0, sourcePhoto: saved.sourcePhoto ?? saved.photo });
      }
      const v4 = JSON.parse(localStorage.getItem(V4_STORAGE_KEY) ?? "null") as Partial<GameState> | null;
      const v3 = JSON.parse(localStorage.getItem(V3_STORAGE_KEY) ?? "null") as Partial<GameState> | null;
      const v2 = JSON.parse(localStorage.getItem(V2_STORAGE_KEY) ?? "null") as Partial<GameState> | null;
      const legacy = v4 ?? v3 ?? v2 ?? JSON.parse(localStorage.getItem(OLD_STORAGE_KEY) ?? "null") as Partial<GameState> | null;
      if (legacy) {
        const legacyName = legacy.name === "לולי" ? "" : legacy.name || "";
        return applyElapsed({
          ...initial,
          onboarded: legacyName ? legacy.onboarded ?? false : false,
          name: legacyName,
          theme: legacy.theme || "sunrise",
          fullness: (legacy as any).hunger ?? legacy.fullness ?? 68,
          energy: legacy.energy ?? 78,
          hygiene: legacy.hygiene ?? 74,
          mood: (legacy as any).joy ?? legacy.mood ?? 72,
          xp: legacy.xp ?? 0,
          coins: legacy.coins ?? 80,
          actions: legacy.actions ?? 0,
          personality: legacy.personality ?? initial.personality,
          inventory: legacy.inventory ?? initial.inventory,
          memories: legacy.memories ?? [],
          photo: legacy.photo,
          birthAt: legacy.birthAt ?? Date.now() - HOUR,
          lastSeen: legacy.lastSeen ?? Date.now(),
          characterKind: legacy.characterKind || "",
          visualRevision: legacy.visualRevision ?? Date.now(),
          animationSlots: legacy.animationSlots ?? {},
          aiCharacter: legacy.aiCharacter ?? false,
          characterVariants: legacy.characterVariants ?? {},
          aiScenes: {},
          sceneAnimationSlots: {},
          sourcePhoto: legacy.sourcePhoto ?? legacy.photo,
          notificationsEnabled: false,
          guideSeen: false,
        });
      }
    }
  } catch { /* fall through */ }
  return { ...initial, visualRevision: now };
}

function normalizeAi(merged: Partial<AiSettings>): AiSettings {
  const migratedProvider: MediaProvider = merged.provider ?? (merged.openRouterKey || merged.textModel?.includes("/") ? "openrouter" : "openai");
  const oldTextModel = !merged.textModel || ["gpt-5-mini", "openai/gpt-5-mini"].includes(merged.textModel);
  const legacyMedia = (merged as AiSettings & { mediaProvider?: MediaProvider }).mediaProvider;
  const videoProvider = merged.videoProvider ?? legacyMedia ?? "openrouter";
  const voiceProvider = merged.voiceProvider ?? migratedProvider;
  const upgradeKieVideoPreset = (merged.videoPresetVersion ?? 0) < 1 && videoProvider === "kie" && (!merged.videoModel || merged.videoModel === "bytedance/seedance-2-mini");
  const upgradeKieVoicePreset = (merged.voicePresetVersion ?? 0) < 1 && voiceProvider === "kie" && (!merged.voiceModel || merged.voiceModel.includes("multilingual-v2"));
  return { ...defaultAi, ...merged, provider: migratedProvider, voiceProvider, imageProvider: merged.imageProvider ?? legacyMedia ?? migratedProvider, videoProvider, voiceModel: upgradeKieVoicePreset ? defaultCapabilityModels.kie.voice : merged.voiceModel ?? defaultCapabilityModels[voiceProvider].voice, voicePresetVersion: 1, videoModel: upgradeKieVideoPreset ? defaultCapabilityModels.kie.video : merged.videoModel ?? defaultCapabilityModels[videoProvider].video, videoPresetVersion: 1, textModel: oldTextModel ? (migratedProvider === "openai" ? "gpt-5.6-luna" : "openai/gpt-5.6-luna") : merged.textModel! };
}

class KieTaskPendingError extends Error {
  constructor() { super("המשימה עדיין רצה ב־KIE ונשמרה במכשיר. חזרו לאפליקציה ולחצו שוב — לא תישלח בקשה חדשה ולא תחויבו שוב."); this.name = "KieTaskPendingError"; }
}

function shortTaskKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(36);
}

function loadAi(): AiSettings {
  try {
    const current = JSON.parse(sessionStorage.getItem(AI_KEY) ?? "{}") as Partial<AiSettings>;
    const v5 = JSON.parse(sessionStorage.getItem("little-friend-ai-v5") ?? "{}") as Partial<AiSettings>;
    const v4 = JSON.parse(sessionStorage.getItem("little-friend-ai-v4") ?? "{}") as Partial<AiSettings>;
    const v3 = JSON.parse(sessionStorage.getItem("little-friend-ai-v3") ?? "{}") as Partial<AiSettings>;
    const previous = JSON.parse(sessionStorage.getItem("little-friend-ai-v2") ?? "{}") as Partial<AiSettings>;
    return normalizeAi({ ...previous, ...v3, ...v4, ...v5, ...current });
  }
  catch { return defaultAi; }
}

async function compressImage(dataUrl: string, max = 900): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/webp", .82));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const blob = await fetch(url).then((response) => {
    if (!response.ok) throw new Error(`טעינת תמונת הייחוס נכשלה (${response.status})`);
    return response.blob();
  });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("קריאת תמונת הייחוס נכשלה"));
    reader.readAsDataURL(blob);
  });
}

function base64ImageBlob(base64: string, mediaType = "image/png") {
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mediaType });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("קריאת התמונה נכשלה"));
    reader.readAsDataURL(blob);
  });
}

export default function Prototype() {
  const mobileKeyboard = useKeyboard();
  const [game, setGame] = useState<GameState>(loadState);
  const [screen, setScreen] = useState<ScreenId>("home");
  const [overlays, setOverlays] = useState<OverlayId[]>([]);
  const overlaysRef = useRef<OverlayId[]>([]);
  const overlay = overlays.length ? overlays[overlays.length - 1] : null;
  const [pendingEvent, setPendingEvent] = useState<{ text: string; variant: EventVariant } | null>(null);
  const [persistFailed, setPersistFailed] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; text: string }>>([]);
  const [reaction, setReaction] = useState("חיכיתי לך. ספרתי עד שבע ואז איבדתי ריכוז.");
  const [reactionId, setReactionId] = useState(0);
  const [effect, setEffect] = useState<{ id: number; kind: EffectKind } | null>(null);
  const [wanderX, setWanderX] = useState(0);
  const [eventText, setEventText] = useState("");
  const [eventVariant, setEventVariant] = useState<EventVariant>("event");
  const [ai, setAi] = useState<AiSettings>(loadAi);
  const encryptedAiStorage = hasEncryptedAiStorage();
  const [encryptedAiLoaded, setEncryptedAiLoaded] = useState(!encryptedAiStorage);
  const [aiStatus, setAiStatus] = useState<"idle" | "testing" | "ready" | "error">("idle");
  const [mediaStatus, setMediaStatus] = useState<"idle" | "testing" | "ready" | "error">("idle");
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "testing" | "ready" | "error">("idle");
  const [videoStatus, setVideoStatus] = useState<"idle" | "testing" | "ready" | "error">("idle");
  const [aiError, setAiError] = useState<AiIssue | null>(null);
  const [imageModels, setImageModels] = useState<ImageModel[]>([]);
  const [voiceModels, setVoiceModels] = useState<VoiceModel[]>([]);
  const [videoModels, setVideoModels] = useState<VideoModel[]>([]);
  const [characterUrls, setCharacterUrls] = useState<Partial<Record<CharacterVisual, string>>>({});
  const [roomUrls, setRoomUrls] = useState<Partial<Record<ThemeId, string>>>({});
  const [sceneUrls, setSceneUrls] = useState<Partial<Record<ThemeId, string>>>({});
  const [stateSceneUrls, setStateSceneUrls] = useState<Partial<Record<ThemeId, string>>>({});
  const [characterProgress, setCharacterProgress] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isStyling, setIsStyling] = useState(false);
  const [isDecorating, setIsDecorating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isDreaming, setIsDreaming] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [jobSeconds, setJobSeconds] = useState(0);
  const [isAnimating, setIsAnimating] = useState<CompanionMotion | null>(null);
  const [packProgress, setPackProgress] = useState<{ completed: number; total: number; active: number; failed: number; label: string } | null>(null);
  const [selectedMotion, setSelectedMotion] = useState<CompanionMotion>("idle");
  const [activeMotion, setActiveMotion] = useState<CompanionMotion>("idle");
  const [clipUrls, setClipUrls] = useState<Partial<Record<CompanionMotion, string>>>({});
  const [historyUrls, setHistoryUrls] = useState<Record<string, string>>({});
  const [chatInput, setChatInput] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [starGame, setStarGame] = useState({ active: false, time: 20, score: 0, lane: 1, target: 1, targetId: 0, spawnAt: 0 });
  const [guessGame, setGuessGame] = useState({ active: false, round: 0, score: 0, wager: false, answer: null as "left" | "right" | null, reveal: "", secret: "left" as "left" | "right", hint: "left" as "left" | "right", tellLabel: guessTells[0].label, tellPhrase: guessTells[0].phrase });
  const [wagerArmed, setWagerArmed] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const motionTimerRef = useRef<number | null>(null);
  const starFinishedRef = useRef(false);
  const starTapRef = useRef(0);
  const revisionRef = useRef(game.visualRevision);
  const audioRef = useRef<{ audio: HTMLAudioElement; release: () => void } | null>(null);
  const jobCancelRef = useRef({ cancelled: false });
  const toastIdRef = useRef(0);
  const screenRef = useRef<ScreenId>(screen);
  const stillRef = useRef(false);
  const historyDepthRef = useRef(0);
  const historySyncRef = useRef(false);
  const aiAutoTestedRef = useRef(false);
  const stagePreviousRef = useRef<StageId | null>(null);
  const buildAskedRef = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    try {
      const { sourcePhoto, ...rest } = game;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...rest, ...(sourcePhoto && sourcePhoto !== game.photo ? { sourcePhoto } : {}), lastSeen: Date.now(), awayMinutes: 0 }));
      setPersistFailed(false);
    }
    catch { setPersistFailed(true); /* the game keeps running from memory even when the device refuses to store */ }
  }, [game]);
  useEffect(() => {
    try {
      sessionStorage.setItem(AI_KEY, JSON.stringify(ai));
      if (encryptedAiLoaded && encryptedAiStorage) void saveEncryptedAiSettings(ai);
    }
    catch { /* a locked-down browser still lets the session run from memory */ }
  }, [ai, encryptedAiLoaded, encryptedAiStorage]);
  useEffect(() => {
    if (!encryptedAiStorage) return;
    let active = true;
    void readEncryptedAiSettings().then((saved) => {
      if (active && Object.keys(saved).length) {
        const migrated = normalizeAi(saved as Partial<AiSettings>);
        setAi((current) => normalizeAi({ ...current, ...migrated }));
      }
    }).finally(() => { if (active) setEncryptedAiLoaded(true); });
    return () => { active = false; };
  }, [encryptedAiStorage]);
  useEffect(() => { revisionRef.current = game.visualRevision; }, [game.visualRevision]);
  useEffect(() => () => { if (motionTimerRef.current) window.clearTimeout(motionTimerRef.current); }, []);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);
  useEffect(() => { resetScroll(".app-screen .mobile-scroll"); }, [screen]);
  useEffect(() => { screenRef.current = screen; }, [screen]);
  useEffect(() => { stillRef.current = game.sleeping || game.sick; }, [game.sleeping, game.sick]);
  useEffect(() => {
    if (!pendingEvent || overlays.length) return;
    setEventText(pendingEvent.text); setEventVariant(pendingEvent.variant); setPendingEvent(null); pushOverlay("event");
  }, [pendingEvent, overlays.length]);
  useEffect(() => {
    const desired = overlays.length + (screen === "home" ? 0 : 1);
    if (desired > historyDepthRef.current) {
      while (historyDepthRef.current < desired) { historyDepthRef.current += 1; window.history.pushState({ companionDepth: historyDepthRef.current }, ""); }
    } else if (desired < historyDepthRef.current) {
      const delta = historyDepthRef.current - desired;
      historyDepthRef.current = desired; historySyncRef.current = true;
      window.history.go(-delta);
    }
  }, [overlays.length, screen]);
  useEffect(() => {
    const onPopState = () => {
      if (historySyncRef.current) { historySyncRef.current = false; return; }
      historyDepthRef.current = Math.max(0, historyDepthRef.current - 1);
      if (overlaysRef.current.length) popOverlay();
      else setScreen("home");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    if (!isAnimating && !isDreaming && !isStyling && !isDecorating) { setJobSeconds(0); return; }
    setJobSeconds(0);
    const timer = window.setInterval(() => setJobSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isAnimating, isDreaming, isStyling, isDecorating]);
  useEffect(() => {
    if (overlay !== "ai") { aiAutoTestedRef.current = false; return; }
    if (aiAutoTestedRef.current) return;
    aiAutoTestedRef.current = true;
    if (providerKey() && aiStatus === "idle") void testAi();
    if (mediaKey() && mediaStatus === "idle") void testMedia();
    if (keyFor(ai.voiceProvider) && voiceStatus === "idle") void testVoice();
    if (keyFor(ai.videoProvider) && videoStatus === "idle") void testVideo();
  }, [overlay]);
  useEffect(() => {
    if (screen === "arcade") return;
    starFinishedRef.current = true;
    setStarGame((current) => current.active || current.time !== 20 ? { active: false, time: 20, score: 0, lane: 1, target: 1, targetId: 0, spawnAt: 0 } : current);
    setGuessGame((current) => current.active || current.round ? { ...current, active: false, round: 0, score: 0, wager: false, answer: null, reveal: "" } : current);
  }, [screen]);
  useEffect(() => {
    const update = () => setGame((current) => applyElapsed(current));
    const timer = window.setInterval(update, 30_000);
    const onVisibility = () => { if (document.visibilityState === "visible") update(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    const restore = async () => {
      const restored: Partial<Record<CompanionMotion, string>> = {};
      const slots = game.sceneAnimationSlots[game.theme] ?? {};
      for (const motion of Object.keys(slots) as CompanionMotion[]) {
        if (!slots[motion]) continue;
        try {
          const clip = await loadClip(sceneAnimationStorageKey(game.visualRevision, game.theme, motion));
          if (clip) {
            const url = URL.createObjectURL(clip);
            if (cancelled) { URL.revokeObjectURL(url); return; }
            objectUrls.push(url); restored[motion] = url;
          }
        } catch { /* the game remains playable with local motion */ }
      }
      if (!cancelled) setClipUrls(restored);
    };
    void restore();
    return () => { cancelled = true; objectUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [game.visualRevision, game.theme, game.sceneAnimationSlots]);
  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    const restore = async () => {
      const restored: Partial<Record<CharacterVisual, string>> = {};
      const available = characterVisuals.filter((visual) => visual === "master" && game.aiCharacter);
      for (const visual of available) {
        try {
          const image = await loadMedia(characterStorageKey(game.visualRevision, visual));
          if (image) {
            const url = URL.createObjectURL(image);
            if (cancelled) { URL.revokeObjectURL(url); return; }
            objectUrls.push(url); restored[visual] = url;
          }
        } catch { /* the original photo remains available as a fallback */ }
      }
      if (!cancelled) setCharacterUrls(restored);
    };
    void restore();
    return () => { cancelled = true; objectUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [game.visualRevision, game.aiCharacter]);
  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    const restore = async () => {
      const restored: Partial<Record<ThemeId, string>> = {};
      for (const theme of Object.keys(game.aiScenes) as ThemeId[]) {
        const roomSet = game.aiScenes[theme];
        if (roomSet === undefined) continue;
        try {
          const image = await loadMedia(sceneStorageKey(game.visualRevision, theme, roomSet));
          if (image) {
            const url = URL.createObjectURL(image);
            if (cancelled) { URL.revokeObjectURL(url); return; }
            objectUrls.push(url); restored[theme] = url;
          }
        } catch { /* the separate room and character remain available as fallback */ }
      }
      if (!cancelled) setSceneUrls(restored);
    };
    void restore();
    return () => { cancelled = true; objectUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [game.visualRevision, game.aiScenes]);
  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    const restore = async () => {
      const restored: Partial<Record<ThemeId, string>> = {};
      for (const theme of Object.keys(game.aiStateScenes) as ThemeId[]) {
        const roomSet = game.aiStateScenes[theme]?.sleep;
        if (!roomSet) continue;
        try {
          const image = await loadMedia(stateSceneStorageKey(game.visualRevision, theme, "sleep", roomSet));
          if (image) {
            const url = URL.createObjectURL(image);
            if (cancelled) { URL.revokeObjectURL(url); return; }
            objectUrls.push(url); restored[theme] = url;
          }
        } catch { /* the approved idle scene remains the fallback */ }
      }
      if (!cancelled) setStateSceneUrls(restored);
    };
    void restore();
    return () => { cancelled = true; objectUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [game.visualRevision, game.aiStateScenes]);
  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    const restore = async () => {
      const restored: Partial<Record<ThemeId, string>> = {};
      for (const theme of Object.keys(game.aiRooms) as ThemeId[]) {
        const set = game.aiRooms[theme];
        if (set === undefined) continue;
        try {
          const image = await loadMedia(roomStorageKey(theme, set));
          if (image) {
            const url = URL.createObjectURL(image);
            if (cancelled) { URL.revokeObjectURL(url); return; }
            objectUrls.push(url); restored[theme] = url;
          }
        } catch { /* the original room art stays in place */ }
      }
      if (!cancelled) setRoomUrls(restored);
    };
    void restore();
    return () => { cancelled = true; objectUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [game.aiRooms]);
  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    const restore = async () => {
      const restored: Record<string, string> = {};
      for (const item of game.aiAssetHistory ?? []) {
        try {
          const media = await loadMedia(item.storageKey);
          if (!media) continue;
          const url = URL.createObjectURL(media);
          if (cancelled) { URL.revokeObjectURL(url); return; }
          objectUrls.push(url); restored[item.id] = url;
        } catch { /* a broken history item stays removable from the gallery */ }
      }
      if (!cancelled) setHistoryUrls(restored);
    };
    void restore();
    return () => { cancelled = true; objectUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [game.aiAssetHistory]);
  useEffect(() => {
    if (!game.onboarded || game.awayMinutes < 15) return;
    const message = absenceMessage(game.name, game.awayMinutes);
    if (game.awayMinutes >= 180) showEvent(message); else say(message);
    setGame((current) => ({ ...current, awayMinutes: 0 }));
  }, [game.awayMinutes, game.onboarded]);
  useEffect(() => {
    if (!game.onboarded || game.guideSeen || pendingEvent || overlaysRef.current.length) return;
    pushOverlay("guide");
  }, [game.onboarded, game.guideSeen, pendingEvent, overlays.length]);
  useEffect(() => {
    if (!game.onboarded || !game.notificationsEnabled || !("Notification" in window) || Notification.permission !== "granted") return;
    let gentle = 0;
    let urgent = 0;
    const notify = (body: string) => {
      if (document.visibilityState === "hidden") new Notification(`בחדר של ${game.name} מחכים לך`, { body, icon: "/assets/companion/app-icon-v4.png", tag: "companion-care" });
    };
    const clear = () => { window.clearTimeout(gentle); window.clearTimeout(urgent); };
    const schedule = () => {
      clear();
      if (document.visibilityState !== "hidden") return;
      gentle = window.setTimeout(() => notify("קפיצה קטנה לחדר תשמור על הרצף."), 2 * HOUR);
      urgent = window.setTimeout(() => notify("נראה שאחד המדדים כבר צריך תשומת לב."), 8 * HOUR);
    };
    document.addEventListener("visibilitychange", schedule);
    schedule();
    return () => { clear(); document.removeEventListener("visibilitychange", schedule); };
  }, [game.onboarded, game.notificationsEnabled, game.name]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (!stillRef.current) setWanderX(Math.round((Math.random() - .5) * 110)); }, 2800);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!starGame.active) return;
    const tick = window.setInterval(() => setStarGame((current) => current.time <= 1 ? { ...current, active: false, time: 0 } : { ...current, time: current.time - 1 }), 1000);
    const drop = window.setInterval(() => setStarGame((current) => current.active ? { ...current, target: Math.floor(Math.random() * 3), targetId: current.targetId + 1, spawnAt: Date.now() } : current), 900);
    return () => { window.clearInterval(tick); window.clearInterval(drop); };
  }, [starGame.active]);
  useEffect(() => {
    if (starGame.active) { starFinishedRef.current = false; return; }
    if (starGame.time !== 0 || starFinishedRef.current) return;
    starFinishedRef.current = true;
    finishStarGame(starGame.score);
  }, [starGame.active, starGame.time, starGame.score]);

  const needs = useMemo(() => ({ fullness: game.fullness, energy: game.energy, hygiene: game.hygiene, mood: game.mood }), [game]);
  const lowestNeed = useMemo(() => (Object.entries(needs) as Array<[NeedKey, number]>).sort((a, b) => a[1] - b[1])[0], [needs]);
  const health = clamp((game.fullness + game.energy + game.hygiene + game.mood) / 4 - (game.sick ? 18 : 0));
  const stage = currentStage(game);
  const evolution = nextStage(game);
  const day = ageDay(game);
  const personality = (Object.entries(game.personality) as Array<[PersonalityId, number]>).sort((a, b) => b[1] - a[1])[0][0];
  const careGrade = game.careScore >= 92 ? "A+" : game.careScore >= 76 ? "A" : game.careScore >= 55 ? "B" : "C";
  const callNeed = game.sick ? "medicine" : game.poop > 0 ? "clean" : lowestNeed[1] < 36 ? (lowestNeed[0] === "fullness" ? "feed" : lowestNeed[0] === "energy" ? "sleep" : lowestNeed[0] === "hygiene" ? "clean" : "play") : null;
  const currentRoom = themes.find((theme) => theme.id === game.theme) ?? themes[0];
  const currentCharacterUrl = characterUrls.master ?? game.photo;
  const currentRoomUrl = roomUrls[game.theme];
  const currentRoomSet = game.aiRooms[game.theme] ?? "base";
  const currentSceneUrl = game.aiScenes[game.theme] === currentRoomSet ? sceneUrls[game.theme] : undefined;
  const currentSleepSceneUrl = game.aiStateScenes[game.theme]?.sleep === currentRoomSet ? stateSceneUrls[game.theme] : undefined;
  const approvedSceneCount = themes.filter((theme) => game.aiSceneApprovals[theme.id]).length;
  const allScenesApproved = approvedSceneCount === themes.length;
  const readyAnimationCount = themes.reduce((total, theme) => total + animationPackMotions.filter((motion) => game.sceneAnimationSlots[theme.id]?.[motion]).length, 0);
  const totalAnimationCount = themes.length * animationPackMotions.length;
  const remainingAnimationCount = totalAnimationCount - readyAnimationCount;
  const estimatedClipCredits = estimateVideoCredits(ai.videoProvider, ai.videoModel, 5);
  const estimatedRemainingCredits = estimatedClipCredits === null ? null : Math.round(estimatedClipCredits * remainingAnimationCount * 10) / 10;
  const decorSet = decorSetKey(game.decorations);
  const ownedDecorCount = decorSet ? decorSet.split(",").length : 0;
  const bakedRoomSet = game.aiRooms[game.theme];
  const bakedDecor = currentRoomUrl ? (bakedRoomSet ?? "").split(",") : [];
  const roomBakeStatus = !decorSet ? "אין עדיין קישוטים" : bakedRoomSet === undefined ? "טרם נוצר" : bakedRoomSet === decorSet ? "מעודכן" : "יש קישוטים חדשים לשילוב";
  const hour = new Date().getHours();
  const isNight = hour < 7 || hour >= 20;
  const dailyQuestIds = game.dailyQuests.filter((id): id is QuestId => Boolean(questPool[id as QuestId]));
  const claimableDaily = dailyQuestIds.filter((id) => (game.questProgress[id] ?? 0) >= questPool[id].target && !game.claimed.includes(id)).length;
  const weeklyReady = game.weeklyProgress >= weeklyQuest.target && !game.weeklyClaimed;
  const pendingClaims = claimableDaily + (weeklyReady ? 1 : 0)
    + streakMilestones.filter((milestone) => game.bestStreak >= milestone.days && !game.claimedMilestones.includes(milestone.days)).length;
  const wagerUnlocked = stageOrder.indexOf(stage) >= stageOrder.indexOf("teen");
  const buildReady = !game.personaBuild && (Object.keys(personaBuildMeta) as PersonalityId[]).some((id) => game.personality[id] >= 25);

  useEffect(() => {
    if (stagePreviousRef.current === null) { stagePreviousRef.current = stage; return; }
    const previous = stagePreviousRef.current;
    if (previous === stage) return;
    stagePreviousRef.current = stage;
    if (stageOrder.indexOf(stage) <= stageOrder.indexOf(previous)) return;
    const refresh = game.aiCharacter && mediaStatus === "ready" ? " בסטודיו אפשר לרענן את הדמות כדי שתישא את האנרגיה החדשה." : "";
    showEvent(`${stageMeta[stage].title}! ${stageUnlocks[stage]}.${refresh}`);
    showEffect("heart");
  }, [stage, game.aiCharacter, mediaStatus]);
  useEffect(() => {
    if (!game.onboarded || !buildReady || buildAskedRef.current) return;
    if (pendingEvent || overlays.length) return;
    buildAskedRef.current = true;
    pushOverlay("build");
  }, [game.onboarded, buildReady, pendingEvent, overlays.length]);
  useEffect(() => {
    if (game.pendingNapReward <= 0) return;
    pushToast(`+${game.pendingNapReward} מטבעות על תנומה מושלמת!`);
    showEffect("coin");
    setGame((current) => ({ ...current, pendingNapReward: 0 }));
  }, [game.pendingNapReward]);

  const applyOverlays = (next: OverlayId[]) => { overlaysRef.current = next; setOverlays(next); };
  const pushOverlay = (id: OverlayId) => applyOverlays([...overlaysRef.current, id]);
  const popOverlay = () => applyOverlays(overlaysRef.current.slice(0, -1));
  const closeAllOverlays = () => applyOverlays([]);
  const showEvent = (text: string, variant: EventVariant = "event") => {
    if (overlaysRef.current.some((id) => id !== "event")) { setPendingEvent({ text, variant }); return; }
    setEventText(text); setEventVariant(variant); pushOverlay("event");
  };

  const pushToast = (text: string) => {
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    setToasts((current) => [...current, { id, text }].slice(-3));
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 2600);
  };
  const say = (text: string) => {
    setReaction(text); setReactionId((id) => id + 1);
    if (screenRef.current !== "home") pushToast(text);
  };
  const showEffect = (kind: EffectKind) => {
    if (screenRef.current !== "home") return;
    setEffect({ id: Date.now(), kind }); window.setTimeout(() => setEffect(null), 1300);
  };
  const clearAiError = () => setAiError(null);
  const raiseAiError = (scope: AiScope, message: string) => {
    if (message === "בוטל") return;
    setAiError({ scope, message });
    if (overlaysRef.current[overlaysRef.current.length - 1] !== "ai") pushToast(message);
  };
  const aiErrorFor = (scope: AiScope, when = true) => aiError && aiError.scope === scope && when
    ? <div className="error-card" role="status"><ExclamationTriangleIcon /><span>{aiError.message}</span><button aria-label="סגירת ההודעה" onClick={clearAiError}>×</button></div>
    : null;
  const cancelJob = () => {
    jobCancelRef.current.cancelled = true; jobCancelRef.current = { cancelled: false };
    setIsAnimating(null); setPackProgress(null); setIsDreaming(false); setIsStyling(false); setIsDecorating(false); setCharacterProgress("");
    pushToast("ביטלנו את היצירה. אפשר לנסות שוב מתי שבא לכם.");
  };
  const jobLabel = packProgress ? `${packProgress.label} · ${packProgress.completed}/${packProgress.total}${packProgress.active ? ` · ${packProgress.active} במקביל` : ""}${packProgress.failed ? ` · ${packProgress.failed} נכשלו` : ""}` : isStyling ? (characterProgress || "יוצרים דמות") : isAnimating ? `יוצרים ${motionMeta[isAnimating].title}` : isDreaming ? "יוצרים חלום" : isDecorating ? "משלבים קישוטים בחדר" : "";
  const progressRow = (active: boolean) => active
    ? <div className="generation-progress" role="status"><ClockIcon /><span>{jobLabel}… {jobSeconds} שניות</span><button onClick={cancelJob}>ביטול</button></div>
    : null;
  const playMotion = (motion: CompanionMotion, duration = 2600, hold = false) => {
    if (motionTimerRef.current) window.clearTimeout(motionTimerRef.current);
    setActiveMotion(motion);
    if (!hold) motionTimerRef.current = window.setTimeout(() => setActiveMotion("idle"), duration);
  };

  const toggleNotifications = async () => {
    if (game.notificationsEnabled) {
      setGame((current) => ({ ...current, notificationsEnabled: false }));
      return;
    }
    if (!("Notification" in window)) {
      showEvent("המכשיר לא פתח ערוץ להתראות מערכת. החזרה למשחק עדיין תציג בדיוק מה קרה בזמן שלא הייתם.", "notice");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setGame((current) => ({ ...current, notificationsEnabled: true }));
      new Notification("ההתראות פעילות", { body: `נזכיר לך רק כשבאמת צריך.`, tag: "companion-ready" });
    } else showEvent("Android לא אישר התראות. אפשר לנסות שוב מהגדרות האפליקציה במכשיר.", "notice");
  };

  const performAction = (action: ActionKey) => {
    const napArmed = game.sleeping && game.napBonus > 0 && game.sleepingUntil > Date.now();
    const next = performCareAction(game, action);
    setGame(next);
    const rewardedAction = next.actions > game.actions;
    if (napArmed && (!next.sleeping || next.napBonus <= 0)) pushToast("התנומה נקטעה — הבונוס התפוגג");
    const foundCoins = next.coins - game.coins >= 12;
    if (foundCoins) window.setTimeout(() => { showEvent(`נמצאו 12 מטבעות מתחת לשטיח של ${game.name}. לא שואלים שאלות.`); showEffect("coin"); }, 400);
    const kind = game.characterKind || "person";
    const lines = [...sharedReactions[action], ...kindReactions[kind][action], ...personalityReactions[personality][action]];
    say(lines[Math.floor(Math.random() * lines.length)]); showEffect(actionsMeta[action].effect);
    const nextMotion = action === "sleep" && game.sleeping ? "idle" : actionMotion[action];
    playMotion(nextMotion, 2600, nextMotion === "sleep");
    if (!foundCoins && rewardedAction && next.actions % 9 === 0) window.setTimeout(() => {
      const reports = [
        `בחדר של ${game.name} נפתחה ועדת חקירה. המסקנה: צריך עוד חטיף.`,
        `דיווח מהחדר: הכול בשליטה, חוץ ממה שלא.`,
        `היה כאן ניסיון רשמי להיות רציניים במשך שבע שניות. כמעט הצליח.`,
      ];
      showEvent(reports[Math.floor(next.actions / 9) % reports.length]);
    }, 520);
    if (rewardedAction && aiStatus === "ready" && ai.autoEvents && next.actions % 4 === 0) window.setTimeout(() => void askAi("ספר על מה שקרה אחרי פעולת הטיפול האחרונה", next), 650);
  };

  const useItem = (key: ItemKey) => {
    if (game.inventory[key] < 1) return;
    setGame((current) => useInventoryItem(current, key));
    const itemLines: Record<ItemKey, string> = { apple: "תפוח. קלאסי, פריך, ללא עלילה מיותרת.", meal: "ארוחה מושקעת. הצלחת מבקשת קרדיט.", soap: "סבון עננים: מאה אחוז ניקיון, אפס אחוז ראיות.", medicine: "התרופה עבדה. הדרמה תישאר למטרות אמנותיות.", ball: "כדור קופצני. גם הקירות משתתפים." };
    say(itemLines[key]); showEffect(key === "medicine" ? "medicine" : key === "soap" ? "bubble" : key === "ball" ? "heart" : "food");
    playMotion(key === "ball" ? "play" : key === "medicine" || key === "soap" ? "celebrate" : "eat");
  };

  const buyItem = (key: ItemKey) => {
    if (game.coins < items[key].price) { say("חסרים לנו מטבעות. המשחקייה קוראת לנו."); return; }
    setGame((current) => current.coins < items[key].price ? current : recordPurchase({ ...current, coins: current.coins - items[key].price, inventory: { ...current.inventory, [key]: current.inventory[key] + 1 } }));
    showEffect("coin"); pushToast(`${items[key].title} נכנס לתיק`);
  };

  const buyDecor = (key: DecorKey) => {
    const now = Date.now();
    if (buyDecoration(game, key, now).coins === game.coins) {
      say(game.decorations[key] ? "כבר יש לנו את זה בבית. בדקתי פעמיים."
        : !isDecorUnlocked(game, key, now) ? `המדף הזה נפתח בשלב ${stageMeta[decorMeta[key].unlockStage].title}. גם הניסיון וגם הזמן צריכים להיות מוכנים.`
        : "חסרים לנו מטבעות. המשחקייה קוראת לנו.");
      return;
    }
    setGame((current) => buyDecoration(current, key, Date.now()));
    showEffect("coin"); setReaction(decorLines[key]); setReactionId((id) => id + 1); pushToast("נקנה! מחכה בחדר");
  };

  const claimMilestone = (days: number) => {
    const reward = claimStreakMilestone(game, days).coins - game.coins;
    if (!reward) return;
    setGame((current) => claimStreakMilestone(current, days));
    showEffect("coin"); say(`${days} ימים ברצף ו־${reward} מטבעות. מתחילים לחשוד שזו אהבה.`);
  };

  const claimQuest = (id: QuestId) => {
    const reward = claimDailyQuest(game, id).coins - game.coins;
    if (reward <= 0) return;
    setGame((current) => claimDailyQuest(current, id));
    showEffect("coin"); say(`משימה הושלמה! קיבלנו ${reward} מטבעות.`);
  };

  const claimWeeklyQuest = () => {
    const reward = claimWeekly(game).coins - game.coins;
    if (reward <= 0) return;
    setGame((current) => claimWeekly(current));
    showEffect("coin"); say(`שבוע שלם של התמדה ו־${reward} מטבעות. זה כבר הרגל, לא מקרה.`);
  };

  const chooseBuildOption = (id: PersonalityId) => {
    const next = chooseBuild(game, id);
    if (next.personaBuild !== id) { pushToast("האישיות הזאת עוד לא בשלה מספיק"); return; }
    setGame((current) => chooseBuild(current, id));
    popOverlay(); showEffect("heart"); pushToast(`${personaBuildMeta[id].title} — האופי נבחר וזה כבר מרגיש בחדר!`);
  };

  const startStarGame = () => { starTapRef.current = 0; setStarGame({ active: true, time: 20, score: 0, lane: 1, target: 1, targetId: Date.now(), spawnAt: Date.now() }); };

  const exitStarGame = () => { starFinishedRef.current = true; setStarGame({ active: false, time: 20, score: 0, lane: 1, target: 1, targetId: 0, spawnAt: 0 }); };
  const exitGuessGame = () => setGuessGame((current) => ({ ...current, active: false, round: 0, score: 0, wager: false, answer: null, reveal: "" }));

  const finishStarGame = (score: number) => {
    const scale = arcadePayoutScale(game.arcadePlays);
    const reward = Math.round(Math.min(75, Math.max(5, score * 3)) * scale * arcadeRewardBonus(game));
    const xpGain = Math.min(50, score * 2);
    setGame((current) => { const mood = clamp(current.mood + 12); return recordArcadeRun({ ...current, coins: current.coins + reward, xp: current.xp + xpGain, mood, personality: { ...current.personality, curious: current.personality.curious + 2 } }, "star", score); });
    showEvent(`תפסנו ${score} כוכבים וקיבלנו ${reward} מטבעות.${scale < 1 ? " (מנוחה מהמשחקייה — פרס מוקטן)" : ""}`); showEffect("coin");
  };

  const catchLane = (lane: number) => {
    if (!starGame.active) return;
    const now = Date.now();
    if (now - starTapRef.current < 220) return;
    starTapRef.current = now;
    const since = now - starGame.spawnAt;
    const hit = lane === starGame.target && since >= 250 && since <= 900;
    if (hit) showEffect("coin");
    setStarGame((current) => current.active ? { ...current, lane, score: Math.max(0, current.score + (hit ? 1 : -1)), target: Math.floor(Math.random() * 3), targetId: current.targetId + 1, spawnAt: now } : current);
  };

  const rollGuessRound = () => {
    const secret: "left" | "right" = Math.random() > .5 ? "left" : "right";
    const opposite: "left" | "right" = secret === "left" ? "right" : "left";
    const tell = guessTells[Math.floor(Math.random() * guessTells.length)];
    return { secret, hint: Math.random() < tell.reliability ? secret : opposite, tellLabel: tell.label, tellPhrase: tell.phrase };
  };
  const toggleWager = () => {
    if (!wagerUnlocked) return;
    if (!wagerArmed && game.coins < wagerCost) { pushToast(`להימור צריך ${wagerCost} מטבעות. נשחק ונחזור.`); return; }
    setWagerArmed((current) => !current);
    pushToast(wagerArmed ? "מצב הימור כבוי" : "מצב הימור דלוק — הזכייה מוכפלת");
  };
  const startGuess = () => {
    const betting = wagerArmed && wagerUnlocked;
    if (betting && game.coins < wagerCost) { setWagerArmed(false); pushToast(`חסרים מטבעות להימור — צריך ${wagerCost}`); return; }
    if (betting) { setGame((current) => current.coins < wagerCost ? current : ({ ...current, coins: current.coins - wagerCost })); showEffect("coin"); }
    setGuessGame({ active: true, round: 0, score: 0, wager: betting, answer: null, reveal: `לאן תהיה הקפיצה של ${game.name}?`, ...rollGuessRound() });
  };
  const makeGuess = (choice: "left" | "right") => {
    if (!guessGame.active || guessGame.answer) return;
    const answer = guessGame.secret;
    const hit = answer === choice;
    const nextRound = guessGame.round + 1;
    const nextScore = guessGame.score + (hit ? 1 : 0);
    setGuessGame((current) => ({ ...current, active: nextRound < 5, round: nextRound, score: nextScore, answer, reveal: hit ? "בול!" : "כמעט!" }));
    window.setTimeout(() => {
      if (screenRef.current !== "arcade") return;
      if (nextRound >= 5) {
        const scale = arcadePayoutScale(game.arcadePlays);
        const reward = Math.round(Math.min(60, nextScore * 6) * (guessGame.wager ? 2 : 1) * scale * arcadeRewardBonus(game));
        setGame((current) => { const mood = clamp(current.mood + 10); return recordArcadeRun({ ...current, coins: current.coins + reward, xp: current.xp + nextScore * 5, mood, personality: { ...current.personality, comic: current.personality.comic + 2 } }, "guess", nextScore); });
        showEvent(`${nextScore} מתוך 5! הרווחנו ${reward} מטבעות.${guessGame.wager ? " ההימור הוכפל כמו שהובטח." : ""}${scale < 1 ? " (מנוחה מהמשחקייה — פרס מוקטן)" : ""}`);
      } else setGuessGame((current) => ({ ...current, answer: null, reveal: "הסיבוב הבא…", ...rollGuessRound() }));
    }, 700);
  };

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0]; if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onerror = () => { setIsImporting(false); say("לא הצלחנו לקרוא את הקובץ — נסו תמונה אחרת"); raiseAiError("character", "לא הצלחנו לקרוא את הקובץ — נסו תמונה אחרת"); };
    reader.onload = async () => {
      const compressed = await compressImage(String(reader.result));
      setIsImporting(false);
      const oldKeys = [
        ...characterVisuals.map((visual) => characterStorageKey(game.visualRevision, visual)),
        ...(Object.keys(game.aiScenes) as ThemeId[]).map((theme) => sceneStorageKey(game.visualRevision, theme, game.aiScenes[theme])),
        ...(Object.keys(game.aiStateScenes) as ThemeId[]).flatMap((theme) => game.aiStateScenes[theme]?.sleep ? [stateSceneStorageKey(game.visualRevision, theme, "sleep", game.aiStateScenes[theme]!.sleep)] : []),
        ...(game.aiAssetHistory ?? []).map((item) => item.storageKey),
      ];
      const oldClipKeys = [
        ...(Object.keys(game.animationSlots) as CompanionMotion[]).map((motion) => animationStorageKey(game.visualRevision, motion)),
        ...(Object.entries(game.sceneAnimationSlots) as Array<[ThemeId, Partial<Record<CompanionMotion, boolean>>]>).flatMap(([theme, slots]) => (Object.keys(slots) as CompanionMotion[]).map((motion) => sceneAnimationStorageKey(game.visualRevision, theme, motion))),
      ];
      void removeMedia(oldKeys).catch(() => {});
      void removeClips(oldClipKeys).catch(() => {});
      clearPendingKieJobs();
      setGame((current) => ({ ...current, photo: compressed, sourcePhoto: compressed, visualRevision: current.visualRevision + 1, animationSlots: {}, sceneAnimationSlots: {}, animationAssets: {}, animationSample: undefined, aiAssetHistory: [], aiCharacter: false, characterVariants: {}, aiScenes: {}, aiSceneApprovals: {}, aiStateScenes: {} }));
      setClipUrls({}); setCharacterUrls({}); setSceneUrls({}); setStateSceneUrls({}); setActiveMotion("idle");
      say("התמונה נכנסה. היא כבר השתלטה על התאורה.");
    };
    reader.readAsDataURL(file);
    input.value = "";
  };

  const mockAi = import.meta.env.DEV && new URLSearchParams(location.search).get("mockAi") === "1";
  const aiFetch = async (url: string, init?: RequestInit) => {
    if (!mockAi) return fetch(url, init);
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (url.includes("images/models")) return new Response(JSON.stringify({ data: [{ id: "openai/gpt-image-2", name: "GPT Image 2", architecture: { input_modalities: ["text", "image"], output_modalities: ["image"] } }] }), { status: 200 });
    if (url.includes("output_modalities=speech")) return new Response(JSON.stringify({ data: [{ id: "openai/gpt-4o-mini-tts-2025-12-15", name: "GPT-4o mini TTS", architecture: { output_modalities: ["speech"] } }] }), { status: 200 });
    if (url.includes("videos/models")) return new Response(JSON.stringify({ data: [{ id: "minimax/hailuo-3", name: "MiniMax H3", supported_frame_images: ["first_frame", "last_frame"], supported_aspect_ratios: ["1:1", "9:16"], supported_resolutions: ["768p", "2K"], supported_durations: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] }] }), { status: 200 });
    if (url.endsWith("/models")) return new Response(JSON.stringify({ data: [{ id: "gpt-5.6-luna" }, { id: "gpt-5.6-terra" }, { id: "gpt-image-2" }] }), { status: 200 });
    if (url.endsWith("/images") || url.endsWith("/images/edits")) return new Response(JSON.stringify({ data: [{ b64_json: game.photo?.split(",")[1] || "", media_type: "image/webp" }] }), { status: 200 });
    if (url.endsWith("/responses")) return new Response(JSON.stringify({ output_text: JSON.stringify({ dialogue: "חלמתי שהקערה שלי זכתה בתחרות ריקודים.", emotion: "happy", animation: "bounce", memory: "חלום על קערה רוקדת", bonus: 2 }) }), { status: 200 });
    if (url.includes("/videos")) return new Response(JSON.stringify({ id: "mock-video", status: "completed", unsigned_urls: [] }), { status: 200 });
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ dialogue: "יש לי תחושה שהיום יקרה משהו מצחיק ליד הקערה.", emotion: "curious", animation: "glow", memory: "תחושה ליד הקערה", bonus: 2 }) } }] }), { status: 200 });
  };

  const readJson = async (response: Response) => {
    try { return await response.json(); }
    catch { throw new Error("התקבלה תשובה שאינה JSON מהספק — ייתכן שהרשת חוסמת את החיבור"); }
  };

  const keyFor = (provider: MediaProvider) => provider === "openai" ? ai.openAiKey : provider === "openrouter" ? ai.openRouterKey : provider === "kie" ? ai.kieKey : ai.falKey;
  const headersFor = (provider: MediaProvider, json = true) => ({
    Authorization: `${provider === "fal" ? "Key" : "Bearer"} ${keyFor(provider)}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(provider === "openrouter" ? { "X-Title": "My Companion" } : {}),
  });
  const providerKey = () => keyFor(ai.provider as MediaProvider);
  const providerBase = () => ai.provider === "openai" ? "https://api.openai.com/v1" : "https://openrouter.ai/api/v1";
  const authHeaders = (json = true) => ({
    Authorization: `Bearer ${providerKey()}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(ai.provider === "openrouter" ? { "X-Title": "My Companion" } : {}),
  });

  const changeProvider = (provider: MediaProvider) => {
    const defaults = defaultCapabilityModels[provider];
    setAi((current) => ({
      ...current,
      provider,
      textModel: defaults.text,
    }));
    setAiStatus("idle"); clearAiError();
  };

  const testAi = async () => {
    if (!providerKey() && !mockAi) { raiseAiError("text", `צריך מפתח ${mediaProviderMeta[ai.provider as MediaProvider].title} כדי לבדוק את החיבור.`); setAiStatus("error"); return; }
    setAiStatus("testing"); clearAiError();
    try {
      if (mockAi) {
        // A connection test never spends provider credits in preview mode.
      } else if (ai.provider === "kie") {
        const response = await fetch("https://api.kie.ai/api/v1/chat/credit", { headers: headersFor("kie", false) });
        if (!response.ok || (await readJson(response)).code !== 200) throw new Error("מפתח KIE לא אושר");
      } else if (ai.provider === "fal") {
        if (ai.falKey.trim().length < 12) throw new Error("מפתח fal.ai נראה קצר מדי");
      } else {
        const response = await aiFetch(`${providerBase()}/models`, { headers: authHeaders(false) });
        if (!response.ok) throw new Error(`בדיקת החיבור נכשלה (${response.status})`);
        const data = await readJson(response);
        const allModels = (data.data ?? []) as ImageModel[];
        if (ai.provider === "openai" && !allModels.some((model) => model.id === ai.textModel)) {
        const preferredText = ["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.4-mini", "gpt-5-mini"].find((id) => allModels.some((model) => model.id === id));
        if (preferredText) setAi((current) => ({ ...current, textModel: preferredText }));
      }
      }
      setAiStatus("ready");
    } catch (error) { setAiStatus("error"); raiseAiError("text", error instanceof Error ? error.message : "החיבור נכשל"); }
  };

  const mediaKey = () => keyFor(ai.imageProvider);
  const mediaBase = () => ai.imageProvider === "openai" ? "https://api.openai.com/v1" : "https://openrouter.ai/api/v1";
  const mediaHeaders = (json = true, provider = ai.imageProvider) => ({
    Authorization: `${provider === "fal" ? "Key" : "Bearer"} ${keyFor(provider)}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(provider === "openrouter" ? { "X-Title": "My Companion" } : {}),
  });
  const mediaHasVideo = Boolean(ai.videoModel);

  const changeMediaProvider = (mediaProvider: MediaProvider) => {
    const defaults = defaultCapabilityModels[mediaProvider];
    setAi((current) => ({ ...current, imageProvider: mediaProvider, imageModel: defaults.image }));
    setImageModels([]); setMediaStatus("idle"); clearAiError();
  };

  const testMedia = async () => {
    if (!mediaKey() && !mockAi) { raiseAiError("image", `צריך מפתח ${mediaProviderMeta[ai.imageProvider].title} כדי להפעיל תמונות.`); setMediaStatus("error"); return; }
    setMediaStatus("testing"); clearAiError();
    try {
      if (mockAi) {
        setImageModels([{ id: ai.imageModel, name: ai.imageModel }]);
      } else if (ai.imageProvider === "kie") {
        const response = await fetch("https://api.kie.ai/api/v1/chat/credit", { headers: mediaHeaders(false) });
        if (!response.ok) throw new Error(`בדיקת KIE נכשלה (${response.status})`);
        const data = await response.json();
        if (data.code !== 200) throw new Error(data.msg || "מפתח KIE לא אושר");
        setImageModels([{ id: ai.imageModel, name: ai.imageModel }]);
      } else if (ai.imageProvider === "fal") {
        if (ai.falKey.trim().length < 12) throw new Error("מפתח fal.ai נראה קצר מדי");
        setImageModels([{ id: ai.imageModel, name: ai.imageModel }]);
        setVideoModels([{ id: ai.videoModel, name: ai.videoModel }]);
      } else if (ai.imageProvider === "openai") {
        const response = await fetch(`${mediaBase()}/models`, { headers: mediaHeaders(false) });
        if (!response.ok) throw new Error(`בדיקת OpenAI נכשלה (${response.status})`);
        const data = await response.json();
        const available = (data.data ?? []) as ImageModel[];
        if (!available.some((model) => model.id === ai.imageModel)) throw new Error(`${ai.imageModel} אינו זמין בפרויקט הזה`);
        setImageModels([{ id: ai.imageModel, name: ai.imageModel }]);
      } else {
        const imagesResponse = await fetch(`${mediaBase()}/images/models`, { headers: mediaHeaders(false) });
        if (!imagesResponse.ok) throw new Error(`בדיקת OpenRouter נכשלה (${imagesResponse.status})`);
        const imageData = await imagesResponse.json();
        const capable = ((imageData.data ?? []) as ImageModel[]).filter((model) => model.architecture?.input_modalities?.includes("image") && model.architecture?.output_modalities?.includes("image"));
        setImageModels(capable.slice(0, 30));
        if (capable.length && !capable.some((model) => model.id === ai.imageModel)) setAi((current) => ({ ...current, imageModel: (capable.find((model) => model.id.includes("gpt-image-2")) ?? capable[0]).id }));
      }
      setMediaStatus("ready");
    } catch (error) { setMediaStatus("error"); raiseAiError("image", error instanceof Error ? error.message : "חיבור התמונה נכשל"); }
  };

  const validateProvider = async (provider: MediaProvider) => {
    if (!keyFor(provider) && !mockAi) throw new Error(`צריך מפתח ${mediaProviderMeta[provider].title}`);
    if (mockAi) return;
    if (provider === "kie") {
      const response = await fetch("https://api.kie.ai/api/v1/chat/credit", { headers: headersFor("kie", false) });
      if (!response.ok || (await readJson(response)).code !== 200) throw new Error("מפתח KIE לא אושר");
    } else if (provider === "fal") {
      if (ai.falKey.trim().length < 12) throw new Error("מפתח fal.ai נראה קצר מדי");
    } else {
      const base = provider === "openai" ? "https://api.openai.com/v1" : "https://openrouter.ai/api/v1";
      const response = await fetch(`${base}/models`, { headers: headersFor(provider, false) });
      if (!response.ok) throw new Error(`בדיקת ${mediaProviderMeta[provider].title} נכשלה (${response.status})`);
    }
  };

  const changeVoiceProvider = (voiceProvider: MediaProvider) => {
    setAi((current) => ({ ...current, voiceProvider, voiceModel: defaultCapabilityModels[voiceProvider].voice }));
    setVoiceModels([]); setVoiceStatus("idle"); clearAiError();
  };
  const testVoice = async () => {
    setVoiceStatus("testing"); clearAiError();
    try {
      await validateProvider(ai.voiceProvider);
      if (ai.voiceProvider === "openrouter" && !mockAi) {
        const response = await fetch("https://openrouter.ai/api/v1/models?output_modalities=speech", { headers: headersFor("openrouter", false) });
        if (response.ok) {
          const data = await response.json(); const voices = (data.data ?? []) as VoiceModel[];
          setVoiceModels(voices.slice(0, 30));
        }
      } else setVoiceModels([{ id: ai.voiceModel, name: ai.voiceModel }]);
      setVoiceStatus("ready");
    } catch (error) { setVoiceStatus("error"); raiseAiError("voice", error instanceof Error ? error.message : "חיבור הקול נכשל"); }
  };

  const changeVideoProvider = (videoProvider: MediaProvider) => {
    setAi((current) => ({ ...current, videoProvider, videoModel: defaultCapabilityModels[videoProvider].video }));
    setVideoModels([]); setVideoStatus("idle"); clearAiError();
  };
  const testVideo = async () => {
    setVideoStatus("testing"); clearAiError();
    try {
      await validateProvider(ai.videoProvider);
      if (ai.videoProvider === "openrouter" && !mockAi) {
        const response = await fetch("https://openrouter.ai/api/v1/videos/models", { headers: headersFor("openrouter", false) });
        if (!response.ok) throw new Error(`בדיקת מודלי הווידאו נכשלה (${response.status})`);
        const data = await response.json();
        const videos = ((data.data ?? []) as VideoModel[]).filter((model) => model.supported_frame_images?.includes("first_frame"));
        setVideoModels(videos.slice(0, 30));
        if (videos.length && !videos.some((model) => model.id === ai.videoModel)) setAi((current) => ({ ...current, videoModel: videos[0].id }));
      } else setVideoModels([{ id: ai.videoModel, name: ai.videoModel }]);
      setVideoStatus("ready");
    } catch (error) { setVideoStatus("error"); raiseAiError("video", error instanceof Error ? error.message : "חיבור הווידאו נכשל"); }
  };

  const speak = async (text = reaction) => {
    if (voiceStatus !== "ready") { raiseAiError("voice", "צריך להפעיל ספק קול לפני ההשמעה."); return; }
    setIsSpeaking(true); clearAiError();
    let url = ""; let revoke = false; let released = false;
    const release = () => { if (revoke && url && !released) { released = true; URL.revokeObjectURL(url); } };
    try {
      if (mockAi) return;
      if (ai.voiceProvider === "kie") {
        if (/[֐-׿]/.test(text) && !kieVoiceSupportsHebrew(ai.voiceModel)) throw new Error("המודל ElevenLabs Multilingual v2 אינו תומך בעברית. בחרו ElevenLabs v3 בהגדרות המתקדמות.");
        const resumeKey = `voice:${ai.voiceModel}:${shortTaskKey(text)}`;
        url = await runKieTask(buildKieVoiceTask(ai.voiceModel, text), resumeKey);
        completePendingKieJob(resumeKey);
      } else if (ai.voiceProvider === "fal") {
        url = parseFalAudioUrl(await runFalRawTask(ai.voiceModel, { text, voice: "Rachel", stability: .5, similarity_boost: .75, style: .15, speed: 1, language_code: "he" }));
      } else {
        const base = ai.voiceProvider === "openai" ? "https://api.openai.com/v1" : "https://openrouter.ai/api/v1";
        const response = await fetch(`${base}/audio/speech`, { method: "POST", headers: headersFor(ai.voiceProvider), body: JSON.stringify({ model: ai.voiceModel, voice: "coral", input: text, response_format: "mp3", instructions: "Speak in warm, playful, natural Hebrew as a tiny virtual companion." }) });
        if (!response.ok) throw new Error(`יצירת הקול נכשלה (${response.status})`);
        url = URL.createObjectURL(await response.blob()); revoke = true;
      }
      if (audioRef.current) { audioRef.current.audio.pause(); audioRef.current.release(); audioRef.current = null; }
      const audio = new Audio(url);
      const forget = () => { if (audioRef.current?.audio === audio) audioRef.current = null; };
      audio.onended = () => { release(); forget(); };
      audio.onerror = () => { release(); forget(); raiseAiError("voice", "השמעת הקול נכשלה"); };
      audioRef.current = { audio, release };
      await audio.play();
    } catch (error) { release(); raiseAiError("voice", error instanceof Error ? error.message : "יצירת הקול נכשלה"); }
    finally { setIsSpeaking(false); }
  };

  const askAi = async (message = "צור אירוע קצר שמתאים למצב הנוכחי", snapshot: GameState = game) => {
    if (aiStatus !== "ready") { raiseAiError("text", "צריך לבצע בדיקת חיבור קודם."); return; }
    setIsThinking(true); clearAiError();
    try {
      const snapshotNeeds = { fullness: snapshot.fullness, energy: snapshot.energy, hygiene: snapshot.hygiene, mood: snapshot.mood };
      const snapshotHealth = clamp((snapshot.fullness + snapshot.energy + snapshot.hygiene + snapshot.mood) / 4 - (snapshot.sick ? 18 : 0));
      const snapshotPersonality = (Object.entries(snapshot.personality) as Array<[PersonalityId, number]>).sort((a, b) => b[1] - a[1])[0][0];
      const context = `Name: ${snapshot.name}; subject type: ${snapshot.characterKind || "person"}; day: ${ageDay(snapshot)}; stage: ${currentStage(snapshot)}; health: ${snapshotHealth}; needs: ${JSON.stringify(snapshotNeeds)}; personality: ${snapshotPersonality}; memories: ${snapshot.memories.slice(-4).join(" | ") || "none"}. User says: ${message}`;
      const instruction = "You are the comedy writer and caring game director of a modern Tamagotchi. Return JSON only with one natural Hebrew line (max 18 words), emotion: happy|curious|sleepy|worried, animation: bounce|spin|glow|nap, memory (short Hebrew), and bonus integer 0-5. Be witty, specific to the current need and subject type, and warm. Use one small comic twist; never use canned jokes, shame, fear, sarcasm toward a child, or anything unsafe.";
      let raw = "";
      if (mockAi) {
        raw = JSON.stringify({ dialogue: "מצאתי ענן שנראה כמו חטיף. ערכתי בדיקת איכות.", emotion: "happy", animation: "bounce", memory: "ענן בצורת חטיף", bonus: 2 });
      } else if (ai.provider === "kie") {
        const response = await fetch("https://api.kie.ai/codex/v1/responses", { method: "POST", headers: headersFor("kie"), body: JSON.stringify({ model: ai.textModel, instructions: instruction, input: [{ role: "user", content: [{ type: "input_text", text: context }] }], reasoning: { effort: "low" }, max_output_tokens: 220, stream: false }) });
        if (!response.ok) throw new Error(`יצירת האירוע ב־KIE נכשלה (${response.status})`);
        raw = extractKieResponseText(await response.text());
        if (!raw) throw new Error("KIE סיים את יצירת הטקסט, אך לא החזיר תוכן שניתן לקרוא.");
      } else if (ai.provider === "fal") {
        raw = parseFalText(await runFalRawTask("openrouter/router", { model: ai.textModel, system_prompt: instruction, prompt: context, temperature: .8, max_tokens: 220 }));
      } else {
        const endpoint = ai.provider === "openai" ? `${providerBase()}/responses` : `${providerBase()}/chat/completions`;
        const body = ai.provider === "openai"
          ? { model: ai.textModel, instructions: instruction, input: context, reasoning: { effort: "none" }, max_output_tokens: 220 }
          : { model: ai.textModel, messages: [{ role: "system", content: instruction }, { role: "user", content: context }], response_format: { type: "json_object" }, reasoning: { effort: "none" }, max_tokens: 220 };
        const response = await aiFetch(endpoint, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
        if (!response.ok) throw new Error(`יצירת האירוע נכשלה (${response.status})`);
        raw = extractAiResponseText(ai.provider as AiProvider, await response.json());
      }
      const event = parseAiEvent(String(raw || ""));
      say(event.dialogue);
      setGame((current) => ({ ...current, xp: current.xp + event.bonus, mood: clamp(current.mood + event.bonus), memories: [...current.memories, event.memory].slice(-12) }));
      if (ai.autoVoice) void speak(event.dialogue);
    } catch (error) { raiseAiError("text", error instanceof Error ? error.message : "יצירת האירוע נכשלה"); }
    finally { setIsThinking(false); }
  };

  const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, mockAi ? 80 : milliseconds));

  const waitUntilAppCanPoll = () => new Promise<void>((resolve) => {
    if (document.visibilityState !== "hidden" && navigator.onLine !== false) { resolve(); return; }
    const ready = () => {
      if (document.visibilityState === "hidden" || navigator.onLine === false) return;
      document.removeEventListener("visibilitychange", ready); window.removeEventListener("online", ready); resolve();
    };
    document.addEventListener("visibilitychange", ready); window.addEventListener("online", ready);
  });

  const fetchWithRetry = async (input: RequestInfo | URL, init: RequestInit = {}, maxAttempts = 4) => {
    const method = init.method || "GET";
    const token = jobCancelRef.current;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (token.cancelled) throw new Error("בוטל");
      try {
        const response = await fetch(input, init);
        if (!isRetryableStatus(response.status, method) || attempt === maxAttempts - 1) return response;
        const delay = retryDelayMilliseconds(attempt, response.headers.get("retry-after")) + Math.floor(Math.random() * 250);
        void response.body?.cancel().catch(() => {});
        await wait(delay);
      } catch (error) {
        if (attempt === maxAttempts - 1 || method.toUpperCase() !== "GET") throw error;
        await wait(retryDelayMilliseconds(attempt) + Math.floor(Math.random() * 250));
      }
    }
    throw new Error("הבקשה לא הושלמה לאחר מספר ניסיונות");
  };

  const uploadToKie = async (dataUrl: string, index = 0) => {
    const unique = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const response = await fetchWithRetry("https://kieai.redpandaai.co/api/file-base64-upload", {
      method: "POST", headers: headersFor("kie"),
      body: JSON.stringify({ base64Data: dataUrl, uploadPath: "images/companion", fileName: `companion-${unique}-${index}.webp` }),
    });
    if (!response.ok) throw new Error(`העלאת תמונה ל־KIE נכשלה (${response.status})`);
    const data = await response.json();
    const url = data?.data?.downloadUrl || data?.data?.fileUrl;
    if (!url) throw new Error(data?.msg || "KIE לא החזיר כתובת לתמונה");
    return String(url);
  };

  const runKieTask = async (body: any, resumeKey = `task:${body?.model || "unknown"}`) => {
    const token = jobCancelRef.current;
    let pending = findPendingKieJob(resumeKey);
    if (pending?.resultUrl) return pending.resultUrl;
    if (!pending) {
      const response = await fetchWithRetry("https://api.kie.ai/api/v1/jobs/createTask", { method: "POST", headers: headersFor("kie"), body: JSON.stringify(body) });
      if (!response.ok) throw new Error(`יצירת משימת KIE נכשלה (${response.status})`);
      const taskId = parseKieTaskId(await response.json());
      pending = { resumeKey, taskId, model: String(body?.model || "unknown"), createdAt: Date.now() };
      savePendingKieJob(pending);
    }
    for (let attempt = 0; attempt < 150; attempt += 1) {
      await wait(Math.min(12_000, 2_500 + attempt * 350));
      if (token.cancelled) throw new Error("בוטל");
      await waitUntilAppCanPoll();
      try {
        const poll = await fetchWithRetry(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(pending.taskId)}`, { headers: headersFor("kie", false) });
        if (!poll.ok) {
          if (isRetryableStatus(poll.status)) continue;
          throw new Error(`בדיקת משימת KIE נכשלה (${poll.status})`);
        }
        const task = parseKieTask(await poll.json());
        if (task.state === "success") {
          if (!task.url) throw new Error("משימת KIE הסתיימה בלי קובץ");
          updatePendingKieResult(resumeKey, task.url);
          return task.url;
        }
        if (task.state === "fail") { completePendingKieJob(resumeKey); throw new Error(task.error || "משימת KIE נכשלה"); }
      } catch (error) {
        if (token.cancelled || (error instanceof Error && error.message === "בוטל")) throw error;
        if (error instanceof TypeError || (error instanceof Error && /fetch|network|Failed to fetch/i.test(error.message))) continue;
        throw error;
      }
    }
    throw new KieTaskPendingError();
  };

  const readKieCredits = async () => {
    if (mockAi) return 0;
    const response = await fetchWithRetry("https://api.kie.ai/api/v1/chat/credit", { headers: headersFor("kie", false) });
    if (!response.ok) return null;
    const payload = await readJson(response);
    const credits = Number(payload?.data);
    return Number.isFinite(credits) ? credits : null;
  };

  const runFalRawTask = async (model: string, body: unknown) => {
    const token = jobCancelRef.current;
    const response = await fetchWithRetry(`https://queue.fal.run/${model.replace(/^\/+/, "")}`, { method: "POST", headers: headersFor("fal"), body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`יצירת משימת fal.ai נכשלה (${response.status})`);
    const submission = parseFalSubmission(await response.json());
    for (let attempt = 0; attempt < 90; attempt += 1) {
      await wait(Math.min(10_000, 2_000 + attempt * 250));
      if (token.cancelled) throw new Error("בוטל");
      const statusResponse = await fetchWithRetry(submission.statusUrl, { headers: headersFor("fal", false) });
      if (!statusResponse.ok) throw new Error(`בדיקת משימת fal.ai נכשלה (${statusResponse.status})`);
      const status = await statusResponse.json();
      const state = String(status.status ?? "");
      const failure = () => (typeof status.error === "string" ? status.error : status.error?.message) || `משימת fal.ai נכשלה${state ? ` (${state})` : ""}`;
      if (state === "COMPLETED") {
        if (status.error) throw new Error(failure());
        const resultResponse = await fetchWithRetry(submission.responseUrl, { headers: headersFor("fal", false) });
        if (!resultResponse.ok) throw new Error(`קבלת תוצאת fal.ai נכשלה (${resultResponse.status})`);
        return resultResponse.json();
      }
      if (state !== "IN_QUEUE" && state !== "IN_PROGRESS") throw new Error(failure());
    }
    throw new Error("משימת fal.ai לא הושלמה בזמן");
  };

  const runFalTask = async (model: string, body: unknown) => parseFalMediaUrl(await runFalRawTask(model, body));

  const downloadMedia = async (url: string) => {
    const response = await fetchWithRetry(url);
    if (!response.ok) throw new Error(`הורדת המדיה נכשלה (${response.status})`);
    return response.blob();
  };

  const archiveCurrentAsset = async (input: Omit<AiAssetHistoryItem, "id" | "storageKey" | "createdAt"> & { currentKey: string }) => {
    const media = await loadMedia(input.currentKey);
    if (!media) return null;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const item: AiAssetHistoryItem = { ...input, id, storageKey: `history:${game.visualRevision}:${id}`, createdAt: Date.now() };
    delete (item as AiAssetHistoryItem & { currentKey?: string }).currentKey;
    await saveMedia(item.storageKey, media);
    setGame((current) => current.visualRevision === game.visualRevision ? addAiAssetHistoryItem(current, item) : current);
    return item;
  };

  const archiveMasterAsset = () => archiveCurrentAsset({ kind: "master", currentKey: characterStorageKey(game.visualRevision, "master"), provider: ai.imageProvider, model: ai.imageModel });

  const archiveAnimationAsset = (theme: ThemeId, companionMotion: CompanionMotion) => {
    const record = game.animationAssets[theme]?.[companionMotion];
    return archiveCurrentAsset({ kind: "video", currentKey: sceneAnimationStorageKey(game.visualRevision, theme, companionMotion), theme, motion: companionMotion, roomSet: game.aiScenes[theme], provider: record?.provider ?? ai.videoProvider, model: record?.model ?? ai.videoModel });
  };

  const archiveSceneFamily = async (theme: ThemeId, includeScene = true) => {
    const roomSet = game.aiScenes[theme];
    if (includeScene && roomSet) await archiveCurrentAsset({ kind: "scene", currentKey: sceneStorageKey(game.visualRevision, theme, roomSet), theme, roomSet, provider: ai.imageProvider, model: ai.imageModel });
    for (const companionMotion of Object.keys(game.sceneAnimationSlots[theme] ?? {}) as CompanionMotion[]) await archiveAnimationAsset(theme, companionMotion);
  };

  const requestStyledImage = async (references: string[], prompt: string, opts: { transparent?: boolean; aspectRatio?: "1:1" | "9:16"; openRouterBody?: unknown; measureCredits?: boolean; resumeKey?: string } = {}) => {
    const transparent = opts.transparent ?? true;
    const aspectRatio = opts.aspectRatio ?? "1:1";
    const measureCredits = opts.measureCredits ?? true;
    if (mockAi) return fetch(references[0]).then((result) => result.blob());
    let response: Response;
    if (ai.imageProvider === "kie") {
      const before = measureCredits ? await readKieCredits() : null;
      const uploaded = await Promise.all(references.map((reference, index) => uploadToKie(reference, index)));
      const resumeKey = opts.resumeKey ?? `image:${game.visualRevision}:${ai.imageModel}:${shortTaskKey(prompt)}`;
      const image = await downloadMedia(await runKieTask(buildKieImageTask(ai.imageModel, prompt, uploaded, aspectRatio === "9:16" ? "auto" : aspectRatio), resumeKey));
      completePendingKieJob(resumeKey);
      const after = measureCredits ? await readKieCredits() : null;
      const credits = before !== null && after !== null ? Math.max(0, Math.round((before - after) * 100) / 100) : 0;
      if (credits) setGame((current) => ({ ...current, aiUsage: { ...current.aiUsage, imageCredits: current.aiUsage.imageCredits + credits } }));
      return image;
    }
    if (ai.imageProvider === "fal") {
      return downloadMedia(await runFalTask(ai.imageModel, buildFalImageTask(prompt, references, aspectRatio)));
    }
    if (ai.imageProvider === "openai") {
      const form = new FormData();
      form.append("model", ai.imageModel);
      for (let index = 0; index < references.length; index += 1) {
        const blob = await fetch(references[index]).then((result) => result.blob());
        form.append(references.length > 1 ? "image[]" : "image", blob, `reference-${index + 1}.webp`);
      }
      form.append("prompt", prompt);
      form.append("size", aspectRatio === "9:16" ? "1024x1536" : "1024x1024"); form.append("quality", "medium"); form.append("output_format", "webp");
      if (transparent) form.append("background", "transparent");
      response = await fetchWithRetry(`${mediaBase()}/images/edits`, { method: "POST", headers: mediaHeaders(false), body: form });
    } else {
      const body = opts.openRouterBody ?? { model: ai.imageModel, prompt, input_references: references.map((url) => ({ type: "image_url", image_url: { url } })), n: 1, aspect_ratio: aspectRatio, quality: "medium", output_format: "webp" };
      response = await fetchWithRetry(`${mediaBase()}/images`, { method: "POST", headers: mediaHeaders(), body: JSON.stringify(body) });
    }
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`יצירת התמונה נכשלה (${response.status}) ${detail.slice(0, 120)}`);
    }
    const data = await response.json(); const result = data.data?.[0];
    if (result?.b64_json) return base64ImageBlob(result.b64_json, result.media_type || "image/png");
    if (result?.url) return downloadMedia(result.url);
    throw new Error("המודל לא החזיר תמונה");
  };

  const requestCharacterImage = (references: string[], visual: CharacterVisual, measureCredits = true) => requestStyledImage(
    references,
    buildCharacterPrompt(game.characterKind, game.name, visual, stage),
    { openRouterBody: buildOpenRouterCharacterRequest({ model: ai.imageModel, references, kind: game.characterKind, name: game.name, visual, stage }), measureCredits },
  );

  const requestSceneImage = (roomReference: string, identityReference: string, theme: ThemeId, measureCredits = true) => requestStyledImage(
    [roomReference, identityReference],
    buildSceneCompositePrompt(game.characterKind, game.name, theme, stage),
    {
      transparent: false,
      aspectRatio: "9:16",
      measureCredits,
      openRouterBody: buildOpenRouterSceneRequest({ model: ai.imageModel, roomReference, identityReference, kind: game.characterKind, name: game.name, theme, stage }),
    },
  );

  const requestSleepSceneImage = (sceneReference: string, identityReference: string, theme: ThemeId, measureCredits = true) => requestStyledImage(
    [sceneReference, identityReference],
    buildSleepScenePrompt(game.characterKind, game.name, theme),
    {
      transparent: false,
      aspectRatio: "9:16",
      measureCredits,
      openRouterBody: buildOpenRouterSleepSceneRequest({ model: ai.imageModel, sceneReference, identityReference, kind: game.characterKind, name: game.name, theme }),
    },
  );

  const stylizePhoto = async (fullSet = false) => {
    const revision = game.visualRevision;
    const token = jobCancelRef.current;
    let batchCreditsBefore: number | null = null;
    const sourcePhoto = game.sourcePhoto || game.photo;
    if (!sourcePhoto) { raiseAiError("character", "קודם צריך לבחור תמונה."); return; }
    if (!ai.imageConsent) { raiseAiError("character", "צריך לאשר במפורש את שליחת התמונה לספק ה־AI."); return; }
    if (mediaStatus !== "ready") { raiseAiError("character", "צריך להפעיל קודם את ספק התמונה."); return; }
    if (!imageModels.length) { raiseAiError("character", "החיבור תקין, אבל אין כרגע מודל תמונה תואם בחשבון או אצל הספק שנבחר."); return; }
    if (fullSet && ai.imageProvider === "kie") batchCreditsBefore = await readKieCredits().catch(() => null);
    setIsStyling(true); clearAiError();
    try {
      let master: Blob | null = null;
      if (fullSet && game.aiCharacter) master = await loadMedia(characterStorageKey(revision, "master"));
      if (!master) {
        setCharacterProgress(fullSet ? "1 מתוך 4 · יוצרים דמות מאסטר" : "יוצרים דמות מאסטר");
        master = await requestCharacterImage([sourcePhoto], "master", !fullSet);
        const masterKey = characterStorageKey(revision, "master");
        if (game.aiCharacter) {
          await archiveMasterAsset();
          for (const theme of Object.keys(game.aiScenes) as ThemeId[]) await archiveSceneFamily(theme);
        }
        await saveMedia(masterKey, master);
        if (revisionRef.current !== revision) { void removeMedia([masterKey]).catch(() => {}); return; }
        await removeMedia([
          ...(Object.keys(game.aiScenes) as ThemeId[]).map((theme) => sceneStorageKey(revision, theme, game.aiScenes[theme])),
          ...(Object.keys(game.aiStateScenes) as ThemeId[]).flatMap((theme) => game.aiStateScenes[theme]?.sleep ? [stateSceneStorageKey(revision, theme, "sleep", game.aiStateScenes[theme]!.sleep)] : []),
        ]);
        const oldKeys = (Object.entries(game.sceneAnimationSlots) as Array<[ThemeId, Partial<Record<CompanionMotion, boolean>>]>).flatMap(([theme, slots]) => (Object.keys(slots) as CompanionMotion[]).map((motion) => sceneAnimationStorageKey(revision, theme, motion)));
        void removeClips(oldKeys).catch(() => {});
        setSceneUrls({}); setStateSceneUrls({});
        setGame((current) => current.visualRevision !== revision ? current : ({ ...current, aiCharacter: true, characterVariants: {}, aiScenes: {}, aiSceneApprovals: {}, aiStateScenes: {}, animationSlots: {}, sceneAnimationSlots: {}, animationAssets: {}, animationSample: undefined }));
        setClipUrls({});
      }
      if (fullSet) {
        const identityReference = await blobToDataUrl(master);
        const variants: ThemeId[] = ["sunrise", "midnight", "classic"];
        setCharacterProgress(`0 מתוך 3 חדרים · מתחילים עד ${providerConcurrency[ai.imageProvider].image} במקביל`);
        const results = await runTaskPool(variants, providerConcurrency[ai.imageProvider].image, async (theme) => {
          if (token.cancelled) throw new Error("בוטל");
          const roomReference = await urlToDataUrl(roomUrls[theme] ?? themes.find((item) => item.id === theme)!.image);
          const scene = await requestSceneImage(roomReference, identityReference, theme, false);
          const roomSet = game.aiRooms[theme] ?? "base";
          const sceneKey = sceneStorageKey(revision, theme, roomSet);
          if (game.aiScenes[theme]) await archiveSceneFamily(theme);
          await saveMedia(sceneKey, scene);
          if (revisionRef.current !== revision) { void removeMedia([sceneKey]).catch(() => {}); return; }
          const staleClipKeys = (Object.keys(game.sceneAnimationSlots[theme] ?? {}) as CompanionMotion[]).map((motion) => sceneAnimationStorageKey(revision, theme, motion));
          if (staleClipKeys.length) void removeClips(staleClipKeys).catch(() => {});
          if (theme === game.theme) setClipUrls({});
          setGame((current) => current.visualRevision !== revision ? current : ({ ...current, aiCharacter: true, aiScenes: { ...current.aiScenes, [theme]: roomSet }, aiSceneApprovals: { ...current.aiSceneApprovals, [theme]: false }, aiStateScenes: { ...current.aiStateScenes, [theme]: {} }, sceneAnimationSlots: { ...current.sceneAnimationSlots, [theme]: {} }, animationAssets: { ...current.animationAssets, [theme]: {} }, animationSample: undefined }));
          return theme;
        }, {
          shouldStop: () => token.cancelled,
          onProgress: ({ completed, total, active, failed }) => setCharacterProgress(`${completed} מתוך ${total} חדרים${active ? ` · ${active} נוצרים במקביל` : ""}${failed ? ` · ${failed} נכשלו` : ""}`),
        });
        if (token.cancelled) throw new Error("בוטל");
        const failures = results.filter((result) => result?.status === "rejected").length;
        if (failures) throw new Error(`${variants.length - failures} חדרים נשמרו, ו־${failures} נכשלו. אפשר להפעיל שוב כדי לנסות להשלים.`);
        say("שלושה חדרים, אותה זהות — והפעם אף אחד לא מרחף מעל השטיח.");
      } else say("זאת דמות המאסטר. אותה זהות, הרבה פחות תמונת פספורט.");
      showEffect("heart");
    } catch (error) { raiseAiError("character", error instanceof Error ? error.message : "יצירת הדמות נכשלה"); }
    finally {
      if (batchCreditsBefore !== null) {
        const after = await readKieCredits().catch(() => null);
        const credits = after === null ? 0 : Math.max(0, Math.round((batchCreditsBefore - after) * 100) / 100);
        if (credits) setGame((current) => ({ ...current, aiUsage: { ...current.aiUsage, imageCredits: current.aiUsage.imageCredits + credits } }));
      }
      setIsStyling(false); setCharacterProgress("");
    }
  };

  const regenerateScene = async (theme: ThemeId) => {
    const revision = game.visualRevision;
    if (!game.aiCharacter) { raiseAiError("character", "צריך קודם ליצור דמות מאסטר."); return; }
    if (!ai.imageConsent) { raiseAiError("character", "צריך לאשר את שליחת התמונות לספק לפני יצירה מחדש."); return; }
    if (mediaStatus !== "ready" || !imageModels.length) { raiseAiError("character", "צריך להפעיל קודם ספק תמונה."); return; }
    setIsStyling(true); setCharacterProgress(`יוצרים מחדש את חדר ${themes.find((item) => item.id === theme)?.title}`); clearAiError();
    try {
      const master = await loadMedia(characterStorageKey(revision, "master"));
      if (!master) throw new Error("דמות המאסטר לא נמצאה במכשיר");
      const roomReference = await urlToDataUrl(roomUrls[theme] ?? themes.find((item) => item.id === theme)!.image);
      const scene = await requestSceneImage(roomReference, await blobToDataUrl(master), theme);
      const roomSet = game.aiRooms[theme] ?? "base";
      const sceneKey = sceneStorageKey(revision, theme, roomSet);
      await archiveSceneFamily(theme);
      await saveMedia(sceneKey, scene);
      if (revisionRef.current !== revision) return;
      const sleepSet = game.aiStateScenes[theme]?.sleep;
      const staleClipKeys = (Object.keys(game.sceneAnimationSlots[theme] ?? {}) as CompanionMotion[]).map((motion) => sceneAnimationStorageKey(revision, theme, motion));
      await Promise.all([
        sleepSet ? removeMedia([stateSceneStorageKey(revision, theme, "sleep", sleepSet)]) : Promise.resolve(),
        removeClips(staleClipKeys),
      ]);
      const url = URL.createObjectURL(scene);
      setSceneUrls((current) => { const previous = current[theme]; if (previous) URL.revokeObjectURL(previous); return { ...current, [theme]: url }; });
      setStateSceneUrls((current) => { const previous = current[theme]; if (previous) URL.revokeObjectURL(previous); const next = { ...current }; delete next[theme]; return next; });
      if (theme === game.theme) { Object.values(clipUrls).forEach((value) => value && URL.revokeObjectURL(value)); setClipUrls({}); setActiveMotion("idle"); }
      setGame((current) => {
        if (current.visualRevision !== revision) return current;
        const cleared = removeSceneAssetState(current, theme);
        return { ...cleared, aiScenes: { ...cleared.aiScenes, [theme]: roomSet }, aiSceneApprovals: { ...cleared.aiSceneApprovals, [theme]: false } };
      });
      say(`חדר ${themes.find((item) => item.id === theme)?.title} נוצר מחדש. בודקים ומאשרים לפני וידאו.`);
    } catch (error) { raiseAiError("character", error instanceof Error ? error.message : "יצירת החדר מחדש נכשלה"); }
    finally { setIsStyling(false); setCharacterProgress(""); }
  };

  const deleteSceneAsset = async (theme: ThemeId) => {
    const revision = game.visualRevision;
    const roomSet = game.aiScenes[theme];
    if (!roomSet) return;
    const sleepSet = game.aiStateScenes[theme]?.sleep;
    const clipKeys = (Object.keys(game.sceneAnimationSlots[theme] ?? {}) as CompanionMotion[]).map((motion) => sceneAnimationStorageKey(revision, theme, motion));
    try {
      await archiveSceneFamily(theme);
      await Promise.all([
        removeMedia([sceneStorageKey(revision, theme, roomSet), ...(sleepSet ? [stateSceneStorageKey(revision, theme, "sleep", sleepSet)] : [])]),
        removeClips(clipKeys),
      ]);
      setSceneUrls((current) => { const previous = current[theme]; if (previous) URL.revokeObjectURL(previous); const next = { ...current }; delete next[theme]; return next; });
      setStateSceneUrls((current) => { const previous = current[theme]; if (previous) URL.revokeObjectURL(previous); const next = { ...current }; delete next[theme]; return next; });
      if (theme === game.theme) { Object.values(clipUrls).forEach((value) => value && URL.revokeObjectURL(value)); setClipUrls({}); setActiveMotion("idle"); }
      setGame((current) => current.visualRevision === revision ? removeSceneAssetState(current, theme) : current);
      say(`תמונת חדר ${themes.find((item) => item.id === theme)?.title} והסרטונים הוסרו מהמשחק ונשמרו בהיסטוריה.`);
    } catch (error) { raiseAiError("character", error instanceof Error ? error.message : "מחיקת תמונת החדר נכשלה"); }
  };

  const deleteAnimationAsset = async (theme: ThemeId, companionMotion: CompanionMotion) => {
    const revision = game.visualRevision;
    try {
      await archiveAnimationAsset(theme, companionMotion);
      await removeClips([sceneAnimationStorageKey(revision, theme, companionMotion)]);
      if (theme === game.theme) {
        setClipUrls((current) => { const previous = current[companionMotion]; if (previous) URL.revokeObjectURL(previous); const next = { ...current }; delete next[companionMotion]; return next; });
        if (activeMotion === companionMotion) setActiveMotion("idle");
      }
      setGame((current) => current.visualRevision === revision ? removeAnimationAssetState(current, theme, companionMotion) : current);
      say(`הסרטון ${motionMeta[companionMotion].title} הוסר מהמשחק ונשמר בהיסטוריה.`);
    } catch (error) { raiseAiError("motion", error instanceof Error ? error.message : "מחיקת הסרטון נכשלה"); }
  };

  const restoreHistoryAsset = async (item: AiAssetHistoryItem) => {
    const archived = await loadMedia(item.storageKey);
    if (!archived) { raiseAiError("general", "הקובץ של הגרסה הזו כבר אינו זמין במכשיר."); return; }
    try {
      if (item.kind === "master") {
        if (game.aiCharacter) await archiveMasterAsset();
        for (const theme of Object.keys(game.aiScenes) as ThemeId[]) await archiveSceneFamily(theme);
        await saveMedia(characterStorageKey(game.visualRevision, "master"), archived);
        const sceneKeys = (Object.keys(game.aiScenes) as ThemeId[]).map((theme) => sceneStorageKey(game.visualRevision, theme, game.aiScenes[theme]));
        const clipKeys = (Object.entries(game.sceneAnimationSlots) as Array<[ThemeId, Partial<Record<CompanionMotion, boolean>>]>).flatMap(([theme, slots]) => (Object.keys(slots) as CompanionMotion[]).map((motion) => sceneAnimationStorageKey(game.visualRevision, theme, motion)));
        await Promise.all([removeMedia(sceneKeys), removeClips(clipKeys)]);
        setGame((current) => ({ ...current, aiCharacter: true, aiScenes: {}, aiSceneApprovals: {}, aiStateScenes: {}, sceneAnimationSlots: {}, animationAssets: {}, animationSample: undefined }));
      } else if (item.kind === "scene" && item.theme && item.roomSet) {
        await archiveSceneFamily(item.theme);
        const clipKeys = (Object.keys(game.sceneAnimationSlots[item.theme] ?? {}) as CompanionMotion[]).map((motion) => sceneAnimationStorageKey(game.visualRevision, item.theme!, motion));
        await removeClips(clipKeys);
        await saveMedia(sceneStorageKey(game.visualRevision, item.theme, item.roomSet), archived);
        setGame((current) => {
          const cleared = removeSceneAssetState(current, item.theme!);
          return { ...cleared, aiScenes: { ...cleared.aiScenes, [item.theme!]: item.roomSet }, aiSceneApprovals: { ...cleared.aiSceneApprovals, [item.theme!]: false } };
        });
      } else if (item.kind === "video" && item.theme && item.motion) {
        if (game.sceneAnimationSlots[item.theme]?.[item.motion]) await archiveAnimationAsset(item.theme, item.motion);
        await saveClip(sceneAnimationStorageKey(game.visualRevision, item.theme, item.motion), archived);
        setGame((current) => ({ ...current, sceneAnimationSlots: { ...current.sceneAnimationSlots, [item.theme!]: { ...current.sceneAnimationSlots[item.theme!], [item.motion!]: true } }, animationAssets: { ...current.animationAssets, [item.theme!]: { ...current.animationAssets[item.theme!], [item.motion!]: { status: "ready", provider: item.provider, model: item.model, generatedAt: item.createdAt } } } }));
      }
      say("הגרסה שנבחרה חזרה למשחק. הגרסה הקודמת נשמרה בהיסטוריה.");
    } catch (error) { raiseAiError("general", error instanceof Error ? error.message : "שחזור הגרסה נכשל"); }
  };

  const deleteHistoryAsset = async (item: AiAssetHistoryItem) => {
    try {
      await removeMedia([item.storageKey]);
      setGame((current) => removeAiAssetHistoryItem(current, item.id));
      say("הגרסה נמחקה לצמיתות מההיסטוריה המקומית.");
    } catch (error) { raiseAiError("general", error instanceof Error ? error.message : "מחיקת הגרסה נכשלה"); }
  };

  const clearAllAiAssets = async () => {
    const revision = game.visualRevision;
    const mediaKeys = [
      ...characterVisuals.map((visual) => characterStorageKey(revision, visual)),
      ...(Object.keys(game.aiRooms) as ThemeId[]).map((theme) => roomStorageKey(theme, game.aiRooms[theme] ?? "")),
      ...(Object.keys(game.aiScenes) as ThemeId[]).map((theme) => sceneStorageKey(revision, theme, game.aiScenes[theme])),
      ...(Object.keys(game.aiStateScenes) as ThemeId[]).flatMap((theme) => game.aiStateScenes[theme]?.sleep ? [stateSceneStorageKey(revision, theme, "sleep", game.aiStateScenes[theme]!.sleep)] : []),
    ];
    const clipKeys = [
      ...(Object.keys(game.animationSlots) as CompanionMotion[]).map((motion) => animationStorageKey(revision, motion)),
      ...(Object.entries(game.sceneAnimationSlots) as Array<[ThemeId, Partial<Record<CompanionMotion, boolean>>]>).flatMap(([theme, slots]) => (Object.keys(slots) as CompanionMotion[]).map((motion) => sceneAnimationStorageKey(revision, theme, motion))),
    ];
    try {
      await Promise.all([removeMedia([...mediaKeys, ...(game.aiAssetHistory ?? []).map((item) => item.storageKey)]), removeClips(clipKeys)]);
      clearPendingKieJobs();
      [characterUrls, roomUrls, sceneUrls, stateSceneUrls, clipUrls].forEach((record) => Object.values(record).forEach((value) => value && URL.revokeObjectURL(value)));
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setCharacterUrls({}); setRoomUrls({}); setSceneUrls({}); setStateSceneUrls({}); setClipUrls({}); setVideoUrl(""); setActiveMotion("idle");
      setGame((current) => current.visualRevision === revision ? clearAiAssetState(current) : current);
      say("כל תוצרי ה־AI נמחקו. ההתקדמות, תמונת המקור והמפתחות נשארו במקומם.");
    } catch (error) { raiseAiError("general", error instanceof Error ? error.message : "מחיקת תוצרי ה־AI נכשלה"); }
  };

  const generateRoomUpgrade = async () => {
    const revision = game.visualRevision;
    const set = decorSetKey(game.decorations);
    if (!set) { raiseAiError("room", "עדיין אין קישוטים בבית. קונים בתיק ואז חוזרים לכאן."); return; }
    if (mediaStatus !== "ready") { raiseAiError("room", "צריך להפעיל קודם את ספק התמונה."); return; }
    if (!imageModels.length) { raiseAiError("room", "החיבור תקין, אבל אין כרגע מודל תמונה תואם בחשבון או אצל הספק שנבחר."); return; }
    if (!ai.imageConsent) { raiseAiError("room", "צריך לאשר את שליחת התמונות לספק לפני שמשדרגים את החדר."); return; }
    if (game.aiRooms[game.theme] === set) { say("החדר כבר מעודכן — כל קישוט במקום שלו. בדקתי פעמיים ואפילו זזתי בשביל זה."); return; }
    setIsDecorating(true); clearAiError();
    try {
      const theme = game.theme;
      const previous = game.aiRooms[theme];
      const reference = await urlToDataUrl(themes.find((item) => item.id === theme)!.image);
      const owned = (Object.keys(decorMeta) as DecorKey[]).filter((key) => game.decorations[key]);
      const room = await requestStyledImage([reference], buildRoomUpgradePrompt(theme, owned), { transparent: false });
      const roomKey = roomStorageKey(theme, set);
      await saveMedia(roomKey, room);
      if (revisionRef.current !== revision) { void removeMedia([roomKey]).catch(() => {}); return; }
      if (previous !== undefined && previous !== set) void removeMedia([roomStorageKey(theme, previous)]).catch(() => {});
      const staleClipKeys = (Object.keys(game.sceneAnimationSlots[theme] ?? {}) as CompanionMotion[]).map((motion) => sceneAnimationStorageKey(revision, theme, motion));
      if (staleClipKeys.length) void removeClips(staleClipKeys).catch(() => {});
      const staleSleepSet = game.aiStateScenes[theme]?.sleep;
      if (staleSleepSet) void removeMedia([stateSceneStorageKey(revision, theme, "sleep", staleSleepSet)]).catch(() => {});
      setClipUrls({}); setStateSceneUrls((current) => ({ ...current, [theme]: undefined }));
      setGame((current) => current.visualRevision !== revision ? current : ({ ...current, aiRooms: { ...current.aiRooms, [theme]: set }, aiSceneApprovals: { ...current.aiSceneApprovals, [theme]: false }, aiStateScenes: { ...current.aiStateScenes, [theme]: {} }, sceneAnimationSlots: { ...current.sceneAnimationSlots, [theme]: {} }, animationAssets: { ...current.animationAssets, [theme]: {} }, animationSample: current.animationSample?.theme === theme ? undefined : current.animationSample, memories: [...current.memories, `החדר שופץ עם ${owned.length} קישוטים`].slice(-12) }));
      say("סידרתי הכול בחדר, כולל הפינות שאף אחד לא מסתכל עליהן. אפשר להזמין אורחים.");
      showEffect("heart");
    } catch (error) { raiseAiError("room", error instanceof Error ? error.message : "שילוב הקישוטים בחדר נכשל"); }
    finally { setIsDecorating(false); }
  };

  const requestVideo = async (referenceDataUrl: string, prompt: string, duration = 5, measureCredits = true, resumeKey = `video:${game.visualRevision}:${ai.videoModel}:${shortTaskKey(prompt)}`): Promise<GeneratedVideo | null> => {
    if (mockAi) return null;
    const token = jobCancelRef.current;
    if (ai.videoProvider === "kie") {
      const before = measureCredits ? await readKieCredits() : null;
      const frameUrl = await uploadToKie(referenceDataUrl);
      const blob = await downloadMedia(await runKieTask(buildKieVideoTask(ai.videoModel, prompt, frameUrl, duration), resumeKey));
      completePendingKieJob(resumeKey);
      const after = measureCredits ? await readKieCredits() : null;
      const credits = before !== null && after !== null ? Math.max(0, Math.round((before - after) * 100) / 100) : undefined;
      return { blob, credits };
    }
    if (ai.videoProvider === "fal") return { blob: await downloadMedia(await runFalTask(ai.videoModel, buildFalVideoTask(prompt, referenceDataUrl))) };
    if (ai.videoProvider === "openai") {
      const create = await fetchWithRetry("https://api.openai.com/v1/videos", { method: "POST", headers: headersFor("openai"), body: JSON.stringify({ model: ai.videoModel, prompt, input_reference: { image_url: referenceDataUrl }, seconds: duration <= 4 ? 4 : 8, size: "720x1280" }) });
      if (!create.ok) throw new Error(`יצירת וידאו ב־OpenAI נכשלה (${create.status})`);
      let job = await create.json();
      for (let attempt = 0; attempt < 60 && !["completed", "failed"].includes(job.status); attempt += 1) {
        await wait(7_000);
        if (token.cancelled) throw new Error("בוטל");
        const poll = await fetchWithRetry(`https://api.openai.com/v1/videos/${job.id}`, { headers: headersFor("openai", false) });
        if (!poll.ok) throw new Error(`בדיקת וידאו ב־OpenAI נכשלה (${poll.status})`);
        job = await poll.json();
      }
      if (job.status !== "completed") throw new Error(job.error?.message || "וידאו OpenAI לא הושלם בזמן");
      const content = await fetchWithRetry(`https://api.openai.com/v1/videos/${job.id}/content`, { headers: headersFor("openai", false) });
      if (!content.ok) throw new Error(`הורדת וידאו OpenAI נכשלה (${content.status})`);
      return { blob: await content.blob() };
    }
    const videoCapabilities = videoModels.find((model) => model.id === ai.videoModel);
    const supportedResolutions = videoCapabilities?.supported_resolutions;
    const resolution = ["1K", "768p", "720p", "1080p", "2K", "4K"].find((candidate) => supportedResolutions?.includes(candidate)) || "720p";
    const frameImages: Array<{ type: "image_url"; image_url: { url: string }; frame_type: "first_frame" | "last_frame" }> = [{ type: "image_url", image_url: { url: referenceDataUrl }, frame_type: "first_frame" }];
    const request = { model: ai.videoModel, prompt, duration, aspect_ratio: "9:16", resolution, generate_audio: false, frame_images: frameImages };
    const videoBase = "https://openrouter.ai/api/v1";
    const response = await fetchWithRetry(`${videoBase}/videos`, { method: "POST", headers: headersFor("openrouter"), body: JSON.stringify(request) });
    if (!response.ok) throw new Error(`יצירת הווידאו נכשלה (${response.status}) ${(await response.text()).slice(0, 100)}`);
    let job = await response.json();
    for (let attempt = 0; attempt < 60 && !["completed", "failed", "cancelled", "expired"].includes(job.status); attempt += 1) {
      await wait(7_000);
      if (token.cancelled) throw new Error("בוטל");
      const pollUrl = job.polling_url?.startsWith("http") ? job.polling_url : `${videoBase}/videos/${job.id}`;
      const poll = await fetchWithRetry(pollUrl, { headers: headersFor("openrouter", false) });
      if (!poll.ok) throw new Error(`בדיקת הווידאו נכשלה (${poll.status})`);
      job = await poll.json();
    }
    if (job.status !== "completed") throw new Error(job.error?.message ?? (typeof job.error === "string" ? job.error : "יצירת הווידאו לא הושלמה בזמן"));
    const contentUrl = job.unsigned_urls?.[0] || job.content_url || job.video_url || `${videoBase}/videos/${job.id}/content`;
    const content = await fetchWithRetry(contentUrl, contentUrl.startsWith(videoBase) ? { headers: headersFor("openrouter", false) } : undefined);
    if (!content.ok) throw new Error(`הורדת הווידאו נכשלה (${content.status})`);
    return { blob: await content.blob() };
  };

  const updateAnimationRecord = (theme: ThemeId, motionId: CompanionMotion, revision: number, record: AnimationAssetRecord) => {
    setGame((current) => current.visualRevision !== revision ? current : ({
      ...current,
      animationAssets: { ...current.animationAssets, [theme]: { ...current.animationAssets[theme], [motionId]: record } },
    }));
  };

  const ensureSleepScene = async (theme: ThemeId, revision: number, measureCredits = true) => {
    const roomSet = game.aiScenes[theme];
    if (!roomSet) throw new Error(`חסרה סצנה מאושרת לחדר ${themes.find((item) => item.id === theme)?.title}`);
    const existingSet = game.aiStateScenes[theme]?.sleep;
    if (existingSet === roomSet) {
      const existing = await loadMedia(stateSceneStorageKey(revision, theme, "sleep", roomSet));
      if (existing) return existing;
    }
    const [scene, master] = await Promise.all([
      loadMedia(sceneStorageKey(revision, theme, roomSet)),
      loadMedia(characterStorageKey(revision, "master")),
    ]);
    if (!scene || !master) throw new Error("חסרה תמונת סצנה או דמות מאסטר ליצירת מצב שינה");
    const sleepScene = await requestSleepSceneImage(await blobToDataUrl(scene), await blobToDataUrl(master), theme, measureCredits);
    const key = stateSceneStorageKey(revision, theme, "sleep", roomSet);
    await saveMedia(key, sleepScene);
    if (revisionRef.current !== revision) { void removeMedia([key]).catch(() => {}); throw new Error("בוטל"); }
    if (theme === game.theme) {
      const url = URL.createObjectURL(sleepScene);
      setStateSceneUrls((current) => { const previous = current[theme]; if (previous) URL.revokeObjectURL(previous); return { ...current, [theme]: url }; });
    }
    setGame((current) => current.visualRevision !== revision ? current : ({ ...current, aiStateScenes: { ...current.aiStateScenes, [theme]: { ...current.aiStateScenes[theme], sleep: roomSet } } }));
    return sleepScene;
  };

  const createSceneAnimation = async (theme: ThemeId, companionMotion: CompanionMotion, revision: number, options: { measureVideoCredits?: boolean; sleepScene?: Blob } = {}) => {
    const roomSet = game.aiScenes[theme];
    if (!roomSet || !game.aiSceneApprovals[theme]) throw new Error(`צריך לאשר קודם את חדר ${themes.find((item) => item.id === theme)?.title}`);
    const baseScene = companionMotion === "sleep"
      ? options.sleepScene ?? await ensureSleepScene(theme, revision)
      : await loadMedia(sceneStorageKey(revision, theme, roomSet));
    if (!baseScene) throw new Error(`תמונת חדר ${themes.find((item) => item.id === theme)?.title} לא נמצאה במכשיר`);
    const recordBase = { provider: ai.videoProvider, model: ai.videoModel };
    const previousRecord = game.animationAssets[theme]?.[companionMotion];
    const hadExistingClip = Boolean(game.sceneAnimationSlots[theme]?.[companionMotion]);
    updateAnimationRecord(theme, companionMotion, revision, { ...recordBase, status: "generating" });
    try {
      const referenceDataUrl = await blobToDataUrl(baseScene);
      const capabilities = videoModels.find((model) => model.id === ai.videoModel);
      const request = buildAnimationRequest({ model: ai.videoModel, photoDataUrl: referenceDataUrl, kind: game.characterKind, name: game.name, motion: companionMotion, theme, supportedResolutions: capabilities?.supported_resolutions, supportedFrameImages: capabilities?.supported_frame_images });
      const generated = await requestVideo(referenceDataUrl, request.prompt, motionMeta[companionMotion].duration, options.measureVideoCredits ?? true);
      const clipKey = sceneAnimationStorageKey(revision, theme, companionMotion);
      if (generated) {
        if (hadExistingClip) await archiveAnimationAsset(theme, companionMotion);
        await saveClip(clipKey, generated.blob);
        if (revisionRef.current !== revision) { void removeClips([clipKey]).catch(() => {}); throw new Error("בוטל"); }
        if (theme === game.theme) {
          const url = URL.createObjectURL(generated.blob);
          setClipUrls((current) => { const previous = current[companionMotion]; if (previous) URL.revokeObjectURL(previous); return { ...current, [companionMotion]: url }; });
        }
      }
      const readyRecord: AnimationAssetRecord = { ...recordBase, status: "ready", generatedAt: Date.now(), credits: generated?.credits };
      setGame((current) => current.visualRevision !== revision ? current : ({
        ...current,
        sceneAnimationSlots: { ...current.sceneAnimationSlots, [theme]: { ...current.sceneAnimationSlots[theme], [companionMotion]: true } },
        animationAssets: { ...current.animationAssets, [theme]: { ...current.animationAssets[theme], [companionMotion]: readyRecord } },
        aiUsage: { ...current.aiUsage, videoCredits: current.aiUsage.videoCredits + (generated?.credits ?? 0) },
        memories: [...current.memories, `נוצרה אנימציית ${motionMeta[companionMotion].title} בחדר ${themes.find((item) => item.id === theme)?.title}`].slice(-12),
      }));
      return readyRecord;
    } catch (error) {
      const message = error instanceof Error ? error.message : "יצירת האנימציה נכשלה";
      updateAnimationRecord(theme, companionMotion, revision, error instanceof KieTaskPendingError ? { ...recordBase, status: "queued" } : hadExistingClip ? previousRecord ?? { ...recordBase, status: "ready" } : { ...recordBase, status: "failed", error: message });
      throw error;
    }
  };

  const generateCharacterAnimation = async (companionMotion: CompanionMotion, asSample = false) => {
    const revision = game.visualRevision;
    const theme = game.theme;
    if (!currentSceneUrl) { raiseAiError("motion", "צריך קודם ליצור את הסצנה המשולבת של החדר הנוכחי."); return; }
    if (!game.aiSceneApprovals[theme]) { raiseAiError("motion", "צריך לאשר קודם את תמונת החדר הנוכחי."); return; }
    if (!ai.imageConsent) { raiseAiError("motion", "צריך לאשר את שליחת התמונה לספק לפני יצירת אנימציה."); return; }
    if (videoStatus !== "ready" || !mediaHasVideo) { raiseAiError("motion", "צריך להפעיל ספק וידאו."); return; }
    if (companionMotion === "sleep" && mediaStatus !== "ready") { raiseAiError("motion", "למצב שינה צריך גם ספק תמונה פעיל."); return; }
    setIsAnimating(companionMotion); clearAiError();
    try {
      await createSceneAnimation(theme, companionMotion, revision);
      if (asSample) setGame((current) => ({ ...current, animationSample: { theme, motion: companionMotion, approved: false } }));
      playMotion(companionMotion, 5200, companionMotion === "sleep");
      say(asSample ? "סרטון הניסיון מוכן. צופים ומאשרים לפני יצירת כל החבילה." : `${motionMeta[companionMotion].title} מוכנה בחדר הזה.`);
      showEffect("heart");
    } catch (error) { raiseAiError("motion", error instanceof Error ? error.message : "יצירת האנימציה נכשלה"); }
    finally { setIsAnimating(null); }
  };

  const generateAnimationPack = async () => {
    if (!allScenesApproved) { raiseAiError("motion", "צריך לאשר את כל שלוש תמונות החדרים."); return; }
    if (!game.animationSample?.approved) { raiseAiError("motion", "צריך ליצור ולאשר סרטון ניסיון לפני החבילה המלאה."); return; }
    if (!ai.imageConsent || videoStatus !== "ready" || !mediaHasVideo) { raiseAiError("motion", videoBlock || consentBlock); return; }
    const revision = game.visualRevision;
    const pending = themes.flatMap((theme) => animationPackMotions.filter((motion) => !game.sceneAnimationSlots[theme.id]?.[motion]).map((motion) => ({ theme: theme.id, motion })));
    if (!pending.length) { say("כל חבילת האנימציות כבר מוכנה."); return; }
    const token = jobCancelRef.current;
    const videoConcurrency = providerConcurrency[ai.videoProvider].video;
    const preparedSleepScenes = new Map<ThemeId, Blob>();
    const sleepThemes = themes.map((theme) => theme.id).filter((theme) => pending.some((item) => item.theme === theme && item.motion === "sleep"));
    if (sleepThemes.length && (mediaStatus !== "ready" || !imageModels.length)) { raiseAiError("motion", "להשלמת מצב השינה צריך להפעיל גם ספק תמונה."); return; }
    setIsAnimating("idle");
    setPackProgress({ completed: 0, total: pending.length, active: 0, failed: 0, label: "מכינים חבילת אנימציות" }); clearAiError();
    try {
      if (sleepThemes.length) {
        const imageCreditsBefore = ai.imageProvider === "kie" ? await readKieCredits().catch(() => null) : null;
        try {
          await runTaskPool(sleepThemes, providerConcurrency[ai.imageProvider].image, async (theme) => {
            const scene = await ensureSleepScene(theme, revision, ai.imageProvider !== "kie");
            preparedSleepScenes.set(theme, scene);
            return theme;
          }, {
            shouldStop: () => token.cancelled,
            onProgress: ({ completed, total, active, failed }) => setPackProgress({ completed, total, active, failed, label: "מכינים תמונות שינה" }),
          });
        } finally {
          if (imageCreditsBefore !== null) {
            const after = await readKieCredits().catch(() => null);
            const credits = after === null ? 0 : Math.max(0, Math.round((imageCreditsBefore - after) * 100) / 100);
            if (credits) setGame((current) => ({ ...current, aiUsage: { ...current.aiUsage, imageCredits: current.aiUsage.imageCredits + credits } }));
          }
        }
      }
      if (token.cancelled) throw new Error("בוטל");
      const videoCreditsBefore = ai.videoProvider === "kie" ? await readKieCredits().catch(() => null) : null;
      let results: Array<PromiseSettledResult<AnimationAssetRecord>> = [];
      try {
        results = await runTaskPool(pending, videoConcurrency, async (item) => {
          if (item.motion === "sleep" && !preparedSleepScenes.has(item.theme)) {
            const message = `הכנת תמונת השינה בחדר ${themes.find((theme) => theme.id === item.theme)?.title} נכשלה`;
            updateAnimationRecord(item.theme, item.motion, revision, { provider: ai.videoProvider, model: ai.videoModel, status: "failed", error: message });
            throw new Error(message);
          }
          return createSceneAnimation(item.theme, item.motion, revision, { measureVideoCredits: ai.videoProvider !== "kie", sleepScene: preparedSleepScenes.get(item.theme) });
        }, {
          shouldStop: () => token.cancelled,
          onProgress: ({ completed, total, active, failed }) => setPackProgress({ completed, total, active, failed, label: `יוצרים סרטונים · עד ${videoConcurrency} במקביל` }),
        });
      } finally {
        if (videoCreditsBefore !== null) {
          const after = await readKieCredits().catch(() => null);
          const credits = after === null ? 0 : Math.max(0, Math.round((videoCreditsBefore - after) * 100) / 100);
          if (credits) setGame((current) => ({ ...current, aiUsage: { ...current.aiUsage, videoCredits: current.aiUsage.videoCredits + credits } }));
        }
      }
      if (token.cancelled) throw new Error("בוטל");
      const failures = results.filter((result) => result?.status === "rejected").length;
      const completed = results.filter((result) => result?.status === "fulfilled").length;
      if (failures) raiseAiError("motion", `${completed} סרטונים נשמרו, ו־${failures} נכשלו. הפעלה נוספת תנסה רק את החסרים.`);
      else { say("שלושה חדרים וחבילת תנועות מלאה מוכנים במכשיר."); showEffect("heart"); }
    } catch (error) { raiseAiError("motion", error instanceof Error ? error.message : "יצירת החבילה נעצרה"); }
    finally { setIsAnimating(null); setPackProgress(null); }
  };

  const generateDream = async () => {
    if (videoStatus !== "ready" || !mediaHasVideo) { raiseAiError("dream", "צריך להפעיל ספק וידאו."); return; }
    if (!ai.imageConsent) { raiseAiError("dream", "צריך לאשר את שליחת תמונת הדמות לפני יצירת חלום וידאו."); return; }
    const dreamVisual = currentSceneUrl ?? characterUrls.master ?? currentCharacterUrl;
    if (!dreamVisual) { raiseAiError("dream", "צריך קודם לבחור או ליצור דמות."); return; }
    setIsDreaming(true); setVideoUrl(""); clearAiError();
    try {
      const referenceDataUrl = await urlToDataUrl(dreamVisual);
      const dreamPrompt = `A single-shot cinematic dream featuring the exact same ${game.characterKind || "person"} virtual companion ${game.name} from the reference image. Preserve identity, exact age, face, species, clothing, colors, proportions, and art style. The companion discovers a tiny floating door in a magical cozy room, peeks through, reacts with one warm comic surprise, and gently closes it. Family-friendly. Smooth motion. No identity drift, aging, species change, morphing, extra limbs, duplicate subject, dialogue, text, logo, UI, or watermark.`;
      const generated = await requestVideo(referenceDataUrl, dreamPrompt, 5);
      if (generated) setVideoUrl(URL.createObjectURL(generated.blob));
      setGame((current) => ({ ...current, aiUsage: { ...current.aiUsage, videoCredits: current.aiUsage.videoCredits + (generated?.credits ?? 0) }, xp: current.xp + 10, memories: [...current.memories, "נוצר חלום וידאו"].slice(-12) }));
    } catch (error) { raiseAiError("dream", error instanceof Error ? error.message : "יצירת החלום נכשלה"); }
    finally { setIsDreaming(false); }
  };

  const resetGame = () => {
    const mediaKeys = [
      ...characterVisuals.map((visual) => characterStorageKey(game.visualRevision, visual)),
      ...(Object.keys(game.aiRooms) as ThemeId[]).map((theme) => roomStorageKey(theme, game.aiRooms[theme] ?? "")),
      ...(Object.keys(game.aiScenes) as ThemeId[]).map((theme) => sceneStorageKey(game.visualRevision, theme, game.aiScenes[theme])),
      ...(Object.keys(game.aiStateScenes) as ThemeId[]).flatMap((theme) => game.aiStateScenes[theme]?.sleep ? [stateSceneStorageKey(game.visualRevision, theme, "sleep", game.aiStateScenes[theme]!.sleep)] : []),
      ...(game.aiAssetHistory ?? []).map((item) => item.storageKey),
    ];
    const clipKeys = [
      ...(Object.keys(game.animationSlots) as CompanionMotion[]).map((motion) => animationStorageKey(game.visualRevision, motion)),
      ...(Object.entries(game.sceneAnimationSlots) as Array<[ThemeId, Partial<Record<CompanionMotion, boolean>>]>).flatMap(([theme, slots]) => (Object.keys(slots) as CompanionMotion[]).map((motion) => sceneAnimationStorageKey(game.visualRevision, theme, motion))),
    ];
    jobCancelRef.current.cancelled = true; jobCancelRef.current = { cancelled: false };
    clearPendingKieJobs();
    void removeMedia(mediaKeys).catch(() => {});
    void removeClips(clipKeys).catch(() => {});
    setClipUrls({}); setCharacterUrls({}); setSceneUrls({}); setStateSceneUrls({}); setRoomUrls({}); setActiveMotion("idle");
    const revision = Date.now();
    revisionRef.current = revision;
    setGame({ ...createDefaultState(revision), visualRevision: revision });
    closeAllOverlays(); setScreen("home");
  };

  const clearSavedAiKeys = () => {
    void clearEncryptedAiSettings();
    for (const key of [AI_KEY, "little-friend-ai-v5", "little-friend-ai-v4", "little-friend-ai-v3", "little-friend-ai-v2"]) sessionStorage.removeItem(key);
    setAi((current) => ({ ...current, openAiKey: "", openRouterKey: "", kieKey: "", falKey: "" }));
    setAiStatus("idle"); setVoiceStatus("idle"); setMediaStatus("idle"); setVideoStatus("idle");
    clearAiError();
    say("המפתחות נמחקו מהמכשיר.");
  };

  const goToBag = () => { closeAllOverlays(); setScreen("bag"); };
  const overlayOpen = Boolean(overlay);
  const photoBlock = !game.photo ? "צריך תמונה אמיתית של הדמות" : "";
  const providerBlock = mediaStatus !== "ready" ? "צריך להפעיל ספק תמונה בשלב 2" : !imageModels.length ? "אין מודל תמונה תואם אצל הספק שנבחר" : "";
  const consentBlock = !ai.imageConsent ? "צריך לסמן את אישור שליחת התמונה" : "";
  const characterBlock = photoBlock || providerBlock || consentBlock;
  const roomBlock = (!decorSet ? "צריך לקנות קישוטים בתיק" : "") || providerBlock || consentBlock;
  const videoBlock = videoStatus !== "ready" || !mediaHasVideo ? "צריך להפעיל ספק וידאו" : "";
  const motionBlock = (!currentSceneUrl ? "צריך קודם ליצור סצנה משולבת לחדר הנוכחי" : "") || videoBlock || consentBlock;
  const dreamBlock = videoBlock || consentBlock || (!currentCharacterUrl ? "צריך תמונה אמיתית של הדמות" : "");

  return (
    <div className={`companion-app theme-${game.theme}`} dir="rtl">
      <MobileScroll key={screen} className="app-screen"><main className={`game-page screen-${screen}`} inert={overlayOpen} aria-hidden={overlayOpen || undefined}>
        {screen === "home" ? <HomeScreen game={game} characterUrl={currentCharacterUrl} sceneUrl={game.sleeping ? currentSleepSceneUrl ?? currentSceneUrl : currentSceneUrl} health={health} stage={stage} evolution={evolution} day={day} needs={needs} lowestNeed={lowestNeed[0]} callNeed={callNeed} currentRoom={currentRoom} roomUrl={currentRoomUrl} bakedDecor={bakedDecor} reaction={reaction} reactionId={reactionId} wanderX={wanderX} effect={effect} isNight={isNight} aiReady={voiceStatus === "ready"} aiStatus={aiStatus} isSpeaking={isSpeaking} activeMotion={activeMotion} clipUrl={clipUrls[activeMotion] || clipUrls.idle} persistFailed={persistFailed} reduceMotion={Boolean(reduceMotion)} onSettings={() => pushOverlay("settings")} onAi={() => pushOverlay("ai")} onSpeak={() => void speak()} onAction={performAction} onPet={() => say(affectionLines[Math.floor(Math.random() * affectionLines.length)])} onPickPhoto={() => fileRef.current?.click()} onUseMedicine={() => useItem("medicine")} /> : null}
        {screen === "arcade" ? <ArcadeScreen coins={game.coins} starGame={starGame} guessGame={guessGame} wagerUnlocked={wagerUnlocked} wagerArmed={wagerArmed} onToggleWager={toggleWager} onStartStars={startStarGame} onCatch={catchLane} onStartGuess={startGuess} onGuess={makeGuess} onExitStars={exitStarGame} onExitGuess={exitGuessGame} /> : null}
        {screen === "journey" ? <JourneyScreen game={game} stage={stage} evolution={evolution} day={day} personality={personality} careGrade={careGrade} dailyQuestIds={dailyQuestIds} buildReady={buildReady} onOpenBuild={() => pushOverlay("build")} onClaim={claimQuest} onClaimWeekly={claimWeeklyQuest} onClaimMilestone={claimMilestone} /> : null}
        {screen === "bag" ? <BagScreen game={game} onUse={useItem} onBuy={buyItem} onBuyDecor={buyDecor} onArcade={() => setScreen("arcade")} /> : null}
      </main></MobileScroll>

      {game.onboarded ? <nav className="bottom-nav" aria-label="ניווט ראשי" inert={overlayOpen} aria-hidden={overlayOpen || undefined}>
        {([{ id: "home", label: "בית", hint: "החדר והטיפול", icon: HomeIcon }, { id: "arcade", label: "משחקים", hint: "שמחה ומטבעות", icon: RocketIcon }, { id: "journey", label: "מטרות", hint: "התקדמות ופרסים", icon: SewingPinIcon }, { id: "bag", label: "תיק", hint: "פריטים והחנות", icon: BackpackIcon }] as const).map((item) => { const Icon = item.icon; return <button key={item.id} className={screen === item.id ? "active" : ""} aria-current={screen === item.id ? "page" : undefined} aria-label={`${item.label} — ${item.hint}${item.id === "journey" && pendingClaims ? ` · ${pendingClaims} פרסים לאיסוף` : ""}`} title={item.hint} onClick={() => setScreen(item.id)}><Icon /><span>{item.label}</span>{item.id === "journey" && pendingClaims > 0 ? <i>{pendingClaims}</i> : null}</button>; })}
      </nav> : null}
      <input ref={fileRef} className="file-input" type="file" accept="image/*" tabIndex={-1} aria-hidden="true" onChange={handlePhoto} />

      <div className="toast-stack" aria-live="polite">
        <AnimatePresence>{toasts.map((toast) => <motion.div className="toast" key={toast.id} initial={{ opacity: 0, y: 14, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: .97 }}>{toast.text}</motion.div>)}</AnimatePresence>
      </div>

      <AnimatePresence>
        {overlay === "settings" ? <FullPage title="הגדרות" subtitle="זהות, חדר ויכולות — הכול נשמר במכשיר" onBack={popOverlay}><div className="form-stack">
          <label htmlFor="friend-name">שם הדמות</label><KeyboardInput id="friend-name" className="text-field" value={game.name} onChange={(event) => setGame((current) => ({ ...current, name: event.target.value.slice(0, 18) }))} />
          <div className="section-title">מי הדמות?</div><div className="compact-kind-row">{(Object.entries(kindLabels) as Array<[Exclude<CharacterKind, "">, (typeof kindLabels)[Exclude<CharacterKind, "">]]>).map(([kind, meta]) => { const Icon = meta.icon; return <button key={kind} className={game.characterKind === kind ? "selected" : ""} onClick={() => setGame((current) => ({ ...current, characterKind: kind }))}><Icon /><span>{meta.title}</span></button>; })}</div>
          <div className="section-title">סגנון החדר</div><Carousel ariaLabel="בחירת סגנון" className="theme-carousel" contentClassName="theme-track">{themes.map((theme) => <button className={`theme-card ${game.theme === theme.id ? "selected" : ""}`} key={theme.id} onClick={() => setGame((current) => ({ ...current, theme: theme.id }))}><img src={theme.image} alt="" draggable={false} /><span><strong>{theme.title}</strong><small>{theme.note}</small></span>{game.theme === theme.id ? <i><CheckIcon /></i> : null}</button>)}</Carousel>
          <button className="wide-button" disabled={isImporting} onClick={() => fileRef.current?.click()}><CameraIcon />{isImporting ? "מעבדים את התמונה…" : "החלפת תמונת הדמות"}{game.photo && !isImporting ? <img className="photo-thumb" src={game.photo} alt="" draggable={false} /> : null}</button>
          <button className="wide-button" onClick={() => void toggleNotifications()}><BellIcon />{game.notificationsEnabled ? "התראות פעילות" : "הפעלת התראות טיפול"}</button>
          <div className="small-note">תזכורות המערכת תלויות במכשיר שמשאיר את האפליקציה חיה ברקע, ואנדרואיד אוהב לכבות דברים בשקט — אז לפעמים הן פשוט לא יגיעו. בלי קשר: בכל חזרה למשחק מחכה סיכום מלא של מה שקרה בזמן שלא הייתם.</div>
          <button className="wide-button" onClick={() => pushOverlay("guide")}><InfoCircledIcon />איך המשחק עובד</button>
          <button className="wide-button accent" onClick={() => { mobileKeyboard.hide(); pushOverlay("ai"); }}><MagicWandIcon />AI ואנימציות</button>
          <ConfirmAction className="wide-button danger" icon={<TrashIcon />} label="יצירת דמות חדשה" question="למחוק הכול ולהתחיל מחדש?" confirmLabel="מחיקה" onConfirm={resetGame} />
        </div></FullPage> : null}
        {overlay === "guide" ? <FullPage title="איך משחקים" subtitle="לולאה אחת פשוטה; כל מסך עושה דבר אחד" onBack={() => { setGame((current) => ({ ...current, guideSeen: true })); popOverlay(); }}><div className="game-guide">
          <div className="guide-loop"><strong>מטפלים</strong><ChevronLeftIcon /><strong>משחקים</strong><ChevronLeftIcon /><strong>מתקדמים</strong><ChevronLeftIcon /><strong>משתמשים</strong></div>
          <article><HomeIcon /><div><strong>בית</strong><span>זה החדר. רואים את הדמות ומטפלים רק במה שצריך עכשיו.</span></div></article>
          <article><RocketIcon /><div><strong>משחקים</strong><span>המשחקייה: מעלים שמחה ומרוויחים מטבעות.</span></div></article>
          <article><SewingPinIcon /><div><strong>מטרות</strong><span>עוקבים אחר ימים, ניסיון, שלבים ומשימות.</span></div></article>
          <article><BackpackIcon /><div><strong>תיק</strong><span>קונים ומשתמשים באוכל, צעצועים, טיפול וקישוטים לחדר.</span></div></article>
          <article><MagicWandIcon /><div><strong>סטודיו ה־AI</strong><span>מחברים מפתח, הדמות קמה לחיים, קישוטים נכנסים לתמונת החדר.</span></div></article>
          <div className="time-explainer"><ClockIcon /><span><strong>גם כשסוגרים את המשחק הזמן ממשיך.</strong> המדדים ודירוג הטיפול יורדים בהדרגה, אבל הדמות לא מתה ותמיד אפשר להתאושש.</span></div>
        </div></FullPage> : null}
        {overlay === "ai" ? <FullPage title="AI" subtitle="בוחרים ספק ומודל נפרד לכל יכולת" onBack={popOverlay}><div className="form-stack ai-panel">
          <div className="ai-step-title"><span>1</span><div><strong>המוח של הדמות</strong><small>טקסט, הומור, זיכרונות וקול.</small></div></div>
          <div className="media-provider-grid" role="group" aria-label="בחירת ספק שפה">{(Object.entries(mediaProviderMeta) as Array<[MediaProvider,(typeof mediaProviderMeta)[MediaProvider]]>).map(([provider, meta]) => <button key={provider} className={ai.provider === provider ? "active" : ""} onClick={() => changeProvider(provider)}><span>{meta.short}</span><strong>{meta.title}</strong><small>שפה</small></button>)}</div>
          <div className={`connection-card ${aiStatus}`}><div className={`or-logo ${ai.provider}`}>{mediaProviderMeta[ai.provider as MediaProvider].short}</div><div><strong>{mediaProviderMeta[ai.provider as MediaProvider].title}</strong><span>{aiStatus === "ready" ? "מסלול השפה מוכן" : aiStatus === "testing" ? "בודקים חיבור…" : encryptedAiStorage ? "מפתח אישי · נשמר מוצפן במכשיר" : "מפתח אישי · נשמר עד סגירת האפליקציה"}</span></div><i /></div>
          {ai.provider === "openai" ? <div className="subscription-note"><LockClosedIcon /><div><strong>נדרש OpenAI API key</strong><span>מנוי ChatGPT וה־API הם מוצרים נפרדים.</span></div></div> : null}
          <label htmlFor="api-key">מפתח {mediaProviderMeta[ai.provider as MediaProvider].title}</label>
          <KeyboardInput id="api-key" className="text-field ltr" type="password" placeholder="API key" value={keyFor(ai.provider as MediaProvider)} onChange={(event) => { const value = event.target.value; setAi((current) => ai.provider === "openai" ? ({ ...current, openAiKey: value }) : ai.provider === "openrouter" ? ({ ...current, openRouterKey: value }) : ai.provider === "kie" ? ({ ...current, kieKey: value }) : ({ ...current, falKey: value })); setAiStatus("idle"); }} />
          <div className="small-note">{encryptedAiStorage ? "המפתחות מוצפנים באמצעות AES-GCM ונשמרים גם לאחר סגירת האפליקציה. מפתח ההצפנה אינו ניתן לייצוא ונשמר בנפרד במסד הנתונים הפרטי של האפליקציה." : "המכשיר אינו תומך באחסון המוצפן; המפתחות יישמרו רק עד סגירת האפליקציה."}</div>
          <button className="wide-button accent" disabled={aiStatus === "testing"} onClick={testAi}>{aiStatus === "testing" ? <ClockIcon /> : <LightningBoltIcon />}{aiStatus === "testing" ? "בודקים…" : "בדיקת חיבור המוח"}</button>
          {aiErrorFor("text", aiStatus === "error")}
          <div className="ai-step-title"><span>2</span><div><strong>ניתוב לפי יכולת</strong><small>כל פעולה יכולה להשתמש בספק אחר.</small></div></div>
          <article className="route-card"><div><SpeakerLoudIcon /><span><strong>קול</strong><small>טקסט לדיבור בעברית</small></span></div><div className="media-provider-grid compact">{(Object.entries(mediaProviderMeta) as Array<[MediaProvider,(typeof mediaProviderMeta)[MediaProvider]]>).map(([provider, meta]) => <button key={provider} className={ai.voiceProvider === provider ? "active" : ""} onClick={() => changeVoiceProvider(provider)}><span>{meta.short}</span><strong>{meta.title}</strong></button>)}</div><button className="mini-connect" disabled={voiceStatus === "testing"} onClick={testVoice}>{voiceStatus === "ready" ? <CheckIcon /> : <LightningBoltIcon />}{voiceStatus === "ready" ? "קול מוכן" : "בדיקת קול"}</button>{aiErrorFor("voice", voiceStatus === "error")}</article>
          <article className="route-card"><div><CameraIcon /><span><strong>תמונה</strong><small>דמות מאסטר וגרסאות חדר</small></span></div><div className="media-provider-grid compact">{(Object.entries(mediaProviderMeta) as Array<[MediaProvider,(typeof mediaProviderMeta)[MediaProvider]]>).map(([provider, meta]) => <button key={provider} className={ai.imageProvider === provider ? "active" : ""} onClick={() => changeMediaProvider(provider)}><span>{meta.short}</span><strong>{meta.title}</strong></button>)}</div><button className="mini-connect" disabled={mediaStatus === "testing"} onClick={testMedia}>{mediaStatus === "ready" ? <CheckIcon /> : <LightningBoltIcon />}{mediaStatus === "ready" ? "תמונה מוכנה" : "בדיקת תמונה"}</button>{aiErrorFor("image")}</article>
          <article className="route-card"><div><PlayIcon /><span><strong>וידאו</strong><small>תמונה לווידאו עבור זהות עקבית</small></span></div><div className="media-provider-grid compact">{(Object.entries(mediaProviderMeta) as Array<[MediaProvider,(typeof mediaProviderMeta)[MediaProvider]]>).map(([provider, meta]) => <button key={provider} className={ai.videoProvider === provider ? "active" : ""} onClick={() => changeVideoProvider(provider)}><span>{meta.short}</span><strong>{meta.title}</strong></button>)}</div><button className="mini-connect" disabled={videoStatus === "testing"} onClick={testVideo}>{videoStatus === "ready" ? <CheckIcon /> : <LightningBoltIcon />}{videoStatus === "ready" ? "וידאו מוכן" : "בדיקת וידאו"}</button>{ai.videoProvider === "openai" ? <small className="legacy-warning">Sora 2 API מסומן כ־Legacy וצפוי להיסגר ב־24.9.2026; עדיף לבחור OpenRouter, KIE או fal.ai.</small> : null}{aiErrorFor("video")}</article>
          <details className="provider-keys"><summary>מפתחות לכל הספקים</summary><div>{(["openai","openrouter","kie","fal"] as MediaProvider[]).map((provider) => <label key={provider}><span>{mediaProviderMeta[provider].title}</span><KeyboardInput className="text-field ltr" type="password" placeholder="API key" value={keyFor(provider)} onChange={(event) => { const value = event.target.value; setAi((current) => provider === "openai" ? ({ ...current, openAiKey: value }) : provider === "openrouter" ? ({ ...current, openRouterKey: value }) : provider === "kie" ? ({ ...current, kieKey: value }) : ({ ...current, falKey: value })); setAiStatus("idle"); setVoiceStatus("idle"); setMediaStatus("idle"); setVideoStatus("idle"); }} /></label>)}</div></details>
          <div className="privacy-note"><LockClosedIcon />אין מפתח שמוטמע ב־APK. {encryptedAiStorage ? "המפתחות שהזנת נשמרים מוצפנים במכשיר ואינם יוצאים ממנו מלבד הקריאות לספק שבחרת." : "המפתח קיים רק בסשן הנוכחי."} התמונות והסרטונים מורדים ונשמרים במכשיר.</div>
          {encryptedAiStorage ? <ConfirmAction className="wide-button danger" icon={<TrashIcon />} label="מחיקת מפתחות ה־AI מהמכשיר" question="למחוק את כל מפתחות הספקים השמורים במכשיר?" confirmLabel="מחיקת מפתחות" onConfirm={clearSavedAiKeys} /> : null}
          <div className="ai-step-title"><span>3</span><div><strong>בוחרים מה להפעיל</strong><small>המוח והמדיה עצמאיים; אין צורך להפעיל הכול.</small></div></div>
          <article className="ai-feature-card"><div className="ai-section-title"><FaceIcon /><div><strong>אופי וקול</strong><span>בדיחות, זיכרונות וקול שמתאימים למצב הנוכחי.</span></div></div>
          <div className="ai-chat-row"><KeyboardInput aria-label="דבר עם הדמות" className="text-field" placeholder={`מה להגיד ל${game.name}?`} value={chatInput} onChange={(event) => setChatInput(event.target.value.slice(0, 160))} /><button aria-label="שליחה" disabled={aiStatus !== "ready" || isThinking} onClick={() => { mobileKeyboard.hide(); void askAi(chatInput || undefined); setChatInput(""); }}><PaperPlaneIcon /></button></div>
          <div className="ai-buttons"><button className="wide-button" disabled={aiStatus !== "ready" || isThinking} onClick={() => void askAi()}><MagicWandIcon />{isThinking ? "חושבים…" : "הפתעה עכשיו"}</button><button className="wide-button" disabled={voiceStatus !== "ready" || isSpeaking} onClick={() => void speak()}><SpeakerLoudIcon />{isSpeaking ? "משמיעים…" : "השמעת קול"}</button></div>
          {ai.voiceProvider === "kie" ? <div className="small-note">עברית ב־KIE משתמשת ב־ElevenLabs v3. ‏Multilingual v2 נשאר זמין לשפות הנתמכות בו, אך לא יישלח אליו טקסט עברי.</div> : null}
          {aiErrorFor("text", aiStatus !== "error")}{aiErrorFor("voice", voiceStatus !== "error")}
          <div className="toggle-pair"><label className="consent-row"><input type="checkbox" checked={ai.autoEvents} onChange={(event) => setAi((current) => ({ ...current, autoEvents: event.target.checked }))} /><span>הפתעות אוטומטיות</span></label><label className="consent-row"><input type="checkbox" checked={ai.autoVoice} onChange={(event) => setAi((current) => ({ ...current, autoVoice: event.target.checked }))} /><span>קול אוטומטי</span></label></div></article>
          <article className="ai-feature-card character-kit"><div className="ai-section-title"><CameraIcon /><div><strong>זהות וסצנות</strong><span>זהות מאסטר אחת, משולבת פיזית בתוך כל חדר.</span></div></div>
          <div className="character-pipeline"><span className={game.photo ? "done" : ""}>צילום</span><ChevronLeftIcon /><span className={game.aiCharacter ? "done" : ""}>מאסטר</span><ChevronLeftIcon /><span className={Object.keys(game.aiScenes).length === 3 ? "done" : ""}>3 סצנות</span><ChevronLeftIcon /><span className={allScenesApproved ? "done" : ""}>אישור {approvedSceneCount}/3</span></div>
          <div className="character-variant-grid">
            {([{ id: "master", title: "מאסטר", image: game.sourcePhoto || game.photo }, ...themes.map((theme) => ({ id: theme.id, title: theme.title, image: theme.image }))] as Array<{ id: CharacterVisual; title: string; image?: string }>).map((item) => {
              const ready = item.id === "master" ? game.aiCharacter : Boolean(game.aiScenes[item.id as ThemeId]);
              const preview = item.id === "master" ? characterUrls.master || item.image : sceneUrls[item.id as ThemeId] || item.image;
              const approved = item.id !== "master" && Boolean(game.aiSceneApprovals[item.id as ThemeId]);
              const theme = item.id as ThemeId;
              return <div className={`character-variant ${ready ? "ready" : ""} ${approved ? "approved" : ""}`} key={item.id}>
                <div style={item.id === "master" ? undefined : { backgroundImage: `url(${item.image})` }}>{preview ? <img src={preview} alt={`תצוגת ${item.title}`} draggable={false} /> : <FaceIcon />}{ready ? <i><CheckIcon /></i> : null}</div>
                <strong>{item.title}</strong>
                {item.id !== "master" && ready ? <>
                  <button type="button" onClick={() => setGame((current) => ({ ...current, aiSceneApprovals: { ...current.aiSceneApprovals, [theme]: !current.aiSceneApprovals[theme] }, animationSample: undefined }))}>{approved ? "אושר" : "לאישור"}</button>
                  <div className="variant-asset-actions">
                    <ConfirmAction className="asset-mini-button" icon={<ReloadIcon />} label="חדש" question="בקשת תמונה אחת בתשלום. התמונה הקיימת תישמר עד שהחדשה מוכנה." confirmLabel="ליצור מחדש" disabled={isStyling || Boolean(characterBlock)} onConfirm={() => void regenerateScene(theme)} />
                    <ConfirmAction className="asset-mini-button danger" icon={<TrashIcon />} label="הסר" question="התמונה וסרטוני הפעולות יוסרו מהמשחק, אך יישמרו בהיסטוריה ויהיה אפשר לשחזר אותם." confirmLabel="להעביר להיסטוריה" disabled={isStyling || Boolean(isAnimating)} onConfirm={() => void deleteSceneAsset(theme)} />
                  </div>
                </> : <small>{ready ? "מוכן" : item.id === "master" ? "זהות בסיס" : "טרם נוצר"}</small>}
              </div>;
            })}
          </div>
          {progressRow(isStyling)}
          <div className="small-note">מאסטר: בקשת תמונה אחת. ערכה מלאה: {game.aiCharacter ? "3" : "4"} בקשות בתשלום. אחרי המאסטר, חדרי הסצנה נוצרים עד {providerConcurrency[ai.imageProvider].image} במקביל ונשמרים אחד־אחד.</div>
          <div className="small-note">הדמות נוצרת עם האנרגיה של השלב הנוכחי ({stageMeta[stage].title}) — אחרי אבולוציה אפשר לרענן.</div>
          {game.aiCharacter ? <ConfirmAction className="wide-button" icon={<ReloadIcon />} label={isStyling ? "יוצרים…" : "יצירת מאסטר מחדש"} question="בקשת תמונה אחת בתשלום. המאסטר הקיים יישמר עד שהחדש מוכן; לאחר ההחלפה יהיה צורך ליצור מחדש את תמונות החדרים." confirmLabel="ליצור מחדש" disabled={Boolean(characterBlock) || isStyling} onConfirm={() => void stylizePhoto(false)} /> : <button className="wide-button" disabled={Boolean(characterBlock) || isStyling} onClick={() => void stylizePhoto(false)}><FaceIcon />{isStyling ? "יוצרים…" : "יצירת דמות מאסטר"}</button>}
          <ConfirmAction className="wide-button accent" icon={<MagicWandIcon />} label={isStyling ? "מכינים ערכה…" : "התאמה לכל החדרים"} question={`${game.aiCharacter ? "3" : "4"} בקשות בתשלום. אחרי יצירת המאסטר, עד ${providerConcurrency[ai.imageProvider].image} חדרים ייווצרו במקביל. להמשיך?`} confirmLabel="ליצור" disabled={Boolean(characterBlock) || isStyling} onConfirm={() => void stylizePhoto(true)} />
          {characterBlock ? <div className="blocked-note">{characterBlock}</div> : null}
          {aiErrorFor("character")}
          <label className="consent-row"><input type="checkbox" checked={ai.imageConsent} onChange={(event) => setAi((current) => ({ ...current, imageConsent: event.target.checked }))} /><span>אישור שליחת התמונה לספק התמונה ({mediaProviderMeta[ai.imageProvider].title}) או לספק הווידאו ({mediaProviderMeta[ai.videoProvider].title}) רק בזמן יצירה.</span></label></article>
          <article className="ai-feature-card compact-feature"><div className="ai-section-title"><HomeIcon /><div><strong>החדר עצמו</strong><span>לוקחים את הקישוטים שקניתם וצובעים אותם ישר לתוך ציור החדר, כל אחד במקום ההגיוני שלו.</span></div></div>
          <div className="room-bake-status"><span><HomeIcon />{currentRoom.title}</span><strong>{ownedDecorCount} קישוטים בבית</strong><em className={bakedRoomSet === decorSet && decorSet ? "ready" : ""}>{roomBakeStatus}</em></div>
          {progressRow(isDecorating)}
          <button className="wide-button accent" disabled={Boolean(roomBlock) || isDecorating} onClick={() => void generateRoomUpgrade()}><MagicWandIcon />{isDecorating ? "משלבים…" : "לשלב את הקישוטים בחדר"}</button>
          {roomBlock ? <div className="blocked-note">{roomBlock}</div> : null}
          {aiErrorFor("room")}
          {decorSet ? <div className="small-note">בקשת תמונה אחת לכל חדר. התמונה שנוצרת נשמרת רק במכשיר ומחליפה את רקע החדר; קישוט שנקנה אחר כך ימשיך להופיע מעל החדר עד השילוב הבא.</div> : <><div className="small-note">קונים קישוטים בתיק ואז משלבים אותם כאן.</div><button className="ghost-button" onClick={goToBag}><BackpackIcon />לחנות הקישוטים בתיק</button></>}</article>
          <article className="ai-feature-card animation-pack"><div className="ai-section-title"><PlayIcon /><div><strong>חבילת תנועה לשלושת החדרים</strong><span>מאשרים תמונות, יוצרים סרטון ניסיון, ורק אחר כך משלימים את החבילה.</span></div></div>
          {mediaHasVideo ? <>
            <div className="pack-room-status">{themes.map((theme) => { const ready = animationPackMotions.filter((motion) => game.sceneAnimationSlots[theme.id]?.[motion]).length; return <div key={theme.id}><span>{theme.title}</span><strong>{ready}/{animationPackMotions.length}</strong><i><b style={{ width: `${ready / animationPackMotions.length * 100}%` }} /></i></div>; })}</div>
            <div className="motion-grid">{(Object.entries(motionMeta) as Array<[CompanionMotion,(typeof motionMeta)[CompanionMotion]]>).map(([motion, meta]) => { const ready = Boolean(game.sceneAnimationSlots[game.theme]?.[motion]); const status = game.animationAssets[game.theme]?.[motion]?.status; const failed = status === "failed"; const queued = status === "queued"; return <button key={motion} className={`${selectedMotion === motion ? "selected" : ""} ${ready ? "ready" : ""} ${failed ? "failed" : ""}`} onClick={() => { setSelectedMotion(motion); if (clipUrls[motion]) playMotion(motion, 5200, motion === "sleep"); }}><span>{ready ? <CheckIcon /> : <PlayIcon />}</span><strong>{meta.title}</strong><small>{queued ? "ממתין ב־KIE · לחצו לחידוש" : failed ? "נכשל · אפשר לנסות שוב" : ready ? "מוכן בחדר הזה" : meta.note}</small></button>; })}</div>
            {clipUrls[selectedMotion] ? <video className="motion-preview" controls muted playsInline loop={selectedMotion === "idle" || selectedMotion === "sleep"} src={clipUrls[selectedMotion]} /> : null}
            {progressRow(Boolean(isAnimating) || Boolean(packProgress))}
            {!game.animationSample ? <ConfirmAction className="wide-button accent" icon={<PlayIcon />} label={`יצירת סרטון ניסיון · ${motionMeta[selectedMotion].title}`} question={`סרטון אחד בתשלום${estimatedClipCredits === null ? "" : ` · אומדן ${estimatedClipCredits} קרדיטים`}. יוצרים רק את הניסיון לפני החבילה.`} confirmLabel="ליצור ניסיון" disabled={Boolean(motionBlock) || !!isAnimating || !allScenesApproved} onConfirm={() => void generateCharacterAnimation(selectedMotion, true)} /> : !game.animationSample.approved ? <div className="sample-review-actions">
              <button className="wide-button accent" disabled={!clipUrls[game.animationSample.motion] && !mockAi} onClick={() => setGame((current) => ({ ...current, animationSample: current.animationSample ? { ...current.animationSample, approved: true } : undefined }))}><CheckIcon />אישור סרטון הניסיון</button>
              <ConfirmAction className="wide-button" icon={<ReloadIcon />} label="לא מתאים — ליצור מחדש" question={`סרטון נוסף בתשלום${estimatedClipCredits === null ? "" : ` · אומדן ${estimatedClipCredits} קרדיטים`}. הסרטון הקיים יישאר עד שהחדש מוכן.`} confirmLabel="ליצור מחדש" disabled={!!isAnimating || Boolean(motionBlock)} onConfirm={() => void generateCharacterAnimation(game.animationSample!.motion, true)} />
              <ConfirmAction className="wide-button danger" icon={<TrashIcon />} label="הסרת סרטון הניסיון" question="הסרטון יוסר מהמשחק ויישמר בהיסטוריה המקומית." confirmLabel="להעביר להיסטוריה" disabled={!!isAnimating} onConfirm={() => void deleteAnimationAsset(game.animationSample!.theme, game.animationSample!.motion)} />
            </div> : <div className="sample-approved"><CheckIcon /><span>סרטון הניסיון אושר · אפשר להשלים את החבילה</span></div>}
            {game.animationSample?.approved ? <ConfirmAction className="wide-button accent" icon={<StackIcon />} label={remainingAnimationCount ? `יצירת יתר החבילה · ${remainingAnimationCount} סרטונים` : "כל החבילה מוכנה"} question={`${remainingAnimationCount} סרטונים${estimatedRemainingCredits === null ? "" : ` · אומדן ${estimatedRemainingCredits} קרדיטים`}. עד ${Math.min(remainingAnimationCount, providerConcurrency[ai.videoProvider].video)} ייווצרו במקביל; הצלחות נשמרות גם אם פריט אחר נכשל.`} confirmLabel="להתחיל" disabled={!remainingAnimationCount || !!isAnimating || Boolean(motionBlock)} onConfirm={() => void generateAnimationPack()} /> : null}
            {game.animationSample?.approved ? <div className="asset-control-row"><ConfirmAction className="wide-button" icon={game.sceneAnimationSlots[game.theme]?.[selectedMotion] ? <ReloadIcon /> : <PlayIcon />} label={game.sceneAnimationSlots[game.theme]?.[selectedMotion] ? `יצירה מחדש: ${motionMeta[selectedMotion].title}` : `יצירת ${motionMeta[selectedMotion].title} בחדר הזה`} question={`סרטון אחד בתשלום${estimatedClipCredits === null ? "" : ` · אומדן ${estimatedClipCredits} קרדיטים`}.${game.sceneAnimationSlots[game.theme]?.[selectedMotion] ? " הסרטון הקיים יישמר בהיסטוריה אחרי שהחדש יהיה מוכן." : ""}`} confirmLabel="ליצור" disabled={Boolean(motionBlock) || !!isAnimating} onConfirm={() => void generateCharacterAnimation(selectedMotion)} />{game.sceneAnimationSlots[game.theme]?.[selectedMotion] ? <ConfirmAction className="wide-button danger" icon={<TrashIcon />} label={`הסרת ${motionMeta[selectedMotion].title}`} question="הסרטון יוסר מהמשחק ויישמר בהיסטוריה. תמונת החדר תישאר." confirmLabel="להעביר להיסטוריה" disabled={!!isAnimating} onConfirm={() => void deleteAnimationAsset(game.theme, selectedMotion)} /> : null}</div> : null}
            {!allScenesApproved ? <div className="blocked-note">צריך לבדוק ולאשר את כל שלוש תמונות החדרים לפני חיוב על וידאו ({approvedSceneCount}/3 אושרו).</div> : motionBlock ? <div className="blocked-note">{motionBlock}</div> : null}
            {aiErrorFor("motion")}
            <div className="usage-card"><span>נכסים מוכנים</span><strong>{readyAnimationCount}/{totalAnimationCount}</strong><small>{game.aiUsage.imageCredits || game.aiUsage.videoCredits ? `נמדדו ב־KIE: תמונות ${game.aiUsage.imageCredits.toFixed(2)} · וידאו ${game.aiUsage.videoCredits.toFixed(2)} קרדיטים` : estimatedClipCredits === null ? "הספק לא חושף אומדן קרדיטים אחיד" : `אומדן לסרטון: ${estimatedClipCredits} קרדיטים`}</small></div>
            <div className="small-note">כל פעולה היא וידאו מלא של החדר באיכות החסכונית של המודל. ב־KIE ברירת המחדל היא MiniMax H3 ב־768p. תמונות השינה מוכנות תחילה במקביל, ואז הסרטונים רצים בתור מוגבל לפי הספק.</div>
          </> : null}</article>
          {mediaHasVideo ? <article className="ai-feature-card compact-feature"><div className="ai-section-title"><MoonIcon /><div><strong>חלום וידאו</strong><span>קטע חגיגי לצפייה, בנפרד מלולאות הטיפול.</span></div></div>{progressRow(isDreaming)}<button className="wide-button" disabled={Boolean(dreamBlock) || isDreaming} onClick={() => void generateDream()}><MoonIcon />{isDreaming ? "יוצרים חלום…" : "יצירת חלום"}</button>{dreamBlock ? <div className="blocked-note">{dreamBlock}</div> : null}{aiErrorFor("dream")}{videoUrl ? <video className="dream-video" controls playsInline src={videoUrl} /> : null}</article> : null}
          {(game.aiAssetHistory ?? []).length ? <article className="ai-feature-card compact-feature asset-history"><div className="ai-section-title"><StackIcon /><div><strong>היסטוריית ניסיונות</strong><span>{game.aiAssetHistory.length} גרסאות קודמות נשמרו במכשיר. שחזור אינו עולה קרדיטים.</span></div></div><Carousel ariaLabel="גרסאות קודמות של תמונות וסרטונים" className="asset-history-carousel" contentClassName="asset-history-track">{game.aiAssetHistory.map((item) => { const title = item.kind === "master" ? "דמות מאסטר" : item.kind === "scene" ? `תמונה · ${themes.find((theme) => theme.id === item.theme)?.title ?? "חדר"}` : `וידאו · ${motionMeta[item.motion ?? "idle"].title} · ${themes.find((theme) => theme.id === item.theme)?.title ?? "חדר"}`; const url = historyUrls[item.id]; return <div className="asset-history-card" key={item.id}>{url ? item.kind === "video" ? <video src={url} muted playsInline controls /> : <img src={url} alt={title} /> : <div className="asset-history-placeholder"><ClockIcon /></div>}<strong>{title}</strong><small>{new Date(item.createdAt).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}</small><div className="asset-history-actions"><button className="wide-button" disabled={!url} onClick={() => void restoreHistoryAsset(item)}><ReloadIcon />שחזור</button><ConfirmAction className="wide-button danger" icon={<TrashIcon />} label="מחיקה" question="הגרסה תימחק לצמיתות מהמכשיר." confirmLabel="מחיקה סופית" onConfirm={() => void deleteHistoryAsset(item)} /></div></div>; })}</Carousel></article> : null}
          <article className="ai-feature-card compact-feature asset-library"><div className="ai-section-title"><TrashIcon /><div><strong>ניהול התוצרים המקומיים</strong><span>מחיקה כוללת גם את היסטוריית הניסיונות, אך לא מאפסת משחק, תמונת מקור או מפתחות.</span></div></div><ConfirmAction className="wide-button danger" icon={<TrashIcon />} label="מחיקת כל תוצרי ה־AI וההיסטוריה" question="למחוק לצמיתות את המאסטר, תמונות החדרים, השדרוגים, הסרטונים וכל הגרסאות הקודמות?" confirmLabel="מחיקת הכול" disabled={isStyling || isDecorating || isDreaming || Boolean(isAnimating)} onConfirm={() => void clearAllAiAssets()} /></article>
          <details className="advanced-ai"><summary>מודלים והגדרות מתקדמות</summary><div><label>מודל שפה · {mediaProviderMeta[ai.provider as MediaProvider].title}</label><KeyboardInput id="text-model" className="text-field ltr" value={ai.textModel} onChange={(event) => setAi((current) => ({ ...current, textModel: event.target.value }))} /><label>מודל קול · {mediaProviderMeta[ai.voiceProvider].title}</label>{voiceModels.length > 1 ? <select aria-label="מודל קול" className="text-field ltr" value={ai.voiceModel} onChange={(event) => setAi((current) => ({ ...current, voiceModel: event.target.value }))}>{voiceModels.map((model) => <option key={model.id} value={model.id}>{model.name || model.id}</option>)}</select> : <KeyboardInput aria-label="מודל קול" className="text-field ltr" value={ai.voiceModel} onChange={(event) => setAi((current) => ({ ...current, voiceModel: event.target.value }))} />}<label>מודל תמונה · {mediaProviderMeta[ai.imageProvider].title}</label>{imageModels.length > 1 ? <select aria-label="מודל תמונה" className="text-field ltr" value={ai.imageModel} onChange={(event) => setAi((current) => ({ ...current, imageModel: event.target.value }))}>{imageModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select> : <KeyboardInput aria-label="מודל תמונה" className="text-field ltr" value={ai.imageModel} onChange={(event) => setAi((current) => ({ ...current, imageModel: event.target.value }))} />}<label>מודל וידאו · {mediaProviderMeta[ai.videoProvider].title}</label>{videoModels.length > 1 ? <select aria-label="מודל וידאו" className="text-field ltr" value={ai.videoModel} onChange={(event) => setAi((current) => ({ ...current, videoModel: event.target.value }))}>{videoModels.map((model) => <option value={model.id} key={model.id}>{model.name || model.id}</option>)}</select> : <KeyboardInput aria-label="מודל וידאו" className="text-field ltr" value={ai.videoModel} onChange={(event) => setAi((current) => ({ ...current, videoModel: event.target.value }))} />}<small className="small-note">מזהי ברירת המחדל נבחרו לפי תיעוד הספקים. שינוי ידני מיועד למודל בעל אותה סכמת API.</small></div></details>
          {aiErrorFor("general")}
        </div></FullPage> : null}
        {overlay === "event" ? <EventCard text={eventText} variant={eventVariant} reduceMotion={Boolean(reduceMotion)} onClose={popOverlay} /> : null}
        {overlay === "build" ? <BuildChoiceCard name={game.name} personality={game.personality} reduceMotion={Boolean(reduceMotion)} onChoose={chooseBuildOption} onLater={popOverlay} /> : null}
      </AnimatePresence>

      {!game.onboarded ? <Onboarding game={game} isImporting={isImporting} onKind={(characterKind: CharacterKind) => setGame((current) => ({ ...current, characterKind }))} onName={(name: string) => setGame((current) => ({ ...current, name }))} onTheme={(theme: ThemeId) => setGame((current) => ({ ...current, theme }))} onPhoto={() => fileRef.current?.click()} onDone={() => { setGame((current) => ({ ...current, onboarded: true, birthAt: current.xp ? current.birthAt : Date.now(), lastSeen: Date.now() })); say("החדר מוכן. החוקים פשוטים: מטפלים, משחקים ולא מאמינים לכל מה שנאמר כאן."); window.requestAnimationFrame(() => { const scroll = document.querySelector<HTMLElement>(".app-screen .mobile-scroll"); if (scroll) scroll.scrollTop = 0; }); }} /> : null}
    </div>
  );
}

function HomeScreen({ game, characterUrl, sceneUrl, health, stage, evolution, day, needs, lowestNeed, callNeed, currentRoom, roomUrl, bakedDecor, reaction, reactionId, wanderX, effect, isNight, aiReady, aiStatus, isSpeaking, activeMotion, clipUrl, persistFailed, reduceMotion, onSettings, onAi, onSpeak, onAction, onPet, onPickPhoto, onUseMedicine }: any) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [speechOpen, setSpeechOpen] = useState(true);
  const [petted, setPetted] = useState(false);
  const statusPopoverRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!detailsOpen) return;
    const timeout = window.setTimeout(() => setDetailsOpen(false), 4_800);
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !statusPopoverRef.current?.contains(event.target)) setDetailsOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [detailsOpen]);
  useEffect(() => {
    setSpeechOpen(true);
    const timer = window.setTimeout(() => setSpeechOpen(false), 5200);
    return () => window.clearTimeout(timer);
  }, [reactionId]);
  useEffect(() => {
    if (!petted) return;
    const timer = window.setTimeout(() => setPetted(false), 460);
    return () => window.clearTimeout(timer);
  }, [petted]);
  const [napTick, setNapTick] = useState(0);
  useEffect(() => {
    if (!game.sleeping) return;
    const timer = window.setInterval(() => setNapTick((tick) => tick + 1), 30_000);
    return () => window.clearInterval(timer);
  }, [game.sleeping]);
  const napMinutes = useMemo(() => Math.max(0, Math.ceil((game.sleepingUntil - Date.now()) / 60_000)), [game.sleepingUntil, game.sleeping, napTick]);
  const nextStageInfo = stageMeta[evolution.id as StageId];
  const labels: Record<Exclude<CharacterKind, "">, Record<ActionKey, string>> = {
    person: { feed: "ארוחה", sleep: "מנוחה", clean: "להתרענן", play: "כיף" },
    baby: { feed: "אוכל", sleep: "תנומה", clean: "החלפה", play: "משחק" },
    pet: { feed: "אוכל", sleep: "שינה", clean: "רחצה", play: "משחק" },
  };
  const kind = (game.characterKind || "person") as Exclude<CharacterKind, "">;
  const DefaultArt = defaultCompanionArt[kind];
  const callLines: Record<ActionKey, { state: string; quip: string }> = {
    feed: { state: "זמן לאכול", quip: "הבטן פתחה קבוצת מחאה" },
    sleep: { state: "זמן למנוחה", quip: "האנרגיה פועלת על כבוד בלבד" },
    clean: { state: "זמן לניקיון", quip: "הראיות מצטברות" },
    play: { state: "זמן למשחק", quip: "הוראה מקצועית: לשחק" },
  };
  const callAria: Record<ActionKey, string> = { feed: "להאכיל עכשיו", sleep: "להשכיב לישון", clean: "לנקות עכשיו", play: "לשחק עכשיו" };
  const statusState = game.sick ? "זמן לתרופה" : callNeed ? callLines[callNeed as ActionKey].state : "הכול טוב";
  const statusQuip = game.sick ? "משהו לא מסתדר היום" : callNeed ? callLines[callNeed as ActionKey].quip : "חשוד, אבל טוב";
  const StatusIcon = game.sick ? ExclamationTriangleIcon : callNeed && callNeed !== "medicine" ? actionsMeta[callNeed as ActionKey].icon : FaceIcon;
  const restX = game.sleeping ? 0 : wanderX;
  const staticMotion = activeMotion === "play" ? { y: [0,-18,0,-8,0], rotate: [0,-4,5,0], scale: [1,1.04,1] } : activeMotion === "eat" ? { y: [0,3,0], rotate: [0,-2,2,0], scale: [1,1.05,1] } : activeMotion === "celebrate" ? { y: [0,-14,0], rotate: [0,8,-8,0], scale: [1,1.08,1] } : { y: game.sleeping ? 18 : [0,-6,0], rotate: game.sleeping ? 0 : [-1,1,-1], scale: 1 };
  const petScene = () => { setSpeechOpen(true); onPet(); if (!reduceMotion) setPetted(true); };
  return <section className="home-screen">
    {sceneUrl && clipUrl ? <video className="room-background scene-background-video" key={`${activeMotion}-${clipUrl}`} src={clipUrl} autoPlay muted playsInline loop={activeMotion === "idle" || activeMotion === "sleep"} /> : <img className="room-background" src={sceneUrl ?? roomUrl ?? currentRoom.image} alt="" draggable={false} />}<div className={`room-vignette ${isNight ? "night" : ""}`} /><div className="header-scrim" />
    <header className="game-header"><button className="round-button" aria-label="הגדרות" onClick={onSettings}><GearIcon /></button><div className="friend-title"><strong>{game.name}</strong><span>{stageMeta[stage as StageId].title} · יום {day}</span></div><div className="header-pills"><button className={`ai-pill ${aiStatus === "ready" ? "on" : ""}`} aria-label={aiStatus === "ready" ? "AI פעיל — פתיחת עמוד ה־AI" : "AI כבוי — פתיחת עמוד ה־AI"} onClick={onAi}><i />{aiStatus === "ready" ? "AI פעיל" : "AI כבוי"}</button><div className="coin-pill"><TokensIcon /><strong>{game.coins}</strong></div></div></header>
    {persistFailed ? <div className="care-alert" role="status"><ExclamationTriangleIcon /><span><strong>המכשיר לא מצליח לשמור את ההתקדמות</strong><small>המשחק ימשיך מהזיכרון עד לסגירת האפליקציה</small></span></div> : null}
    <div className="status-popover" ref={statusPopoverRef}>
      <button className={`vital-summary ${callNeed ? "needs-care" : ""}`} aria-expanded={detailsOpen} aria-label={`${statusState} · טיפול ${whole(health)}% · לחצו למדדים`} onClick={() => setDetailsOpen((open) => !open)}><span><StatusIcon /></span><div><strong>{statusState}</strong><small>טיפול {whole(health)}% · {statusQuip}</small></div><ChevronLeftIcon aria-hidden /></button>
      <AnimatePresence>{detailsOpen ? <motion.div className="status-panel" initial={{ opacity: 0, y: -8, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -7, scale: .98 }}>
        <div className="needs-strip" role="group" aria-label="מדדי הדמות">{(Object.entries(needs) as Array<[NeedKey, number]>).map(([key, value]) => { const MetaIcon = needsMeta[key].icon; return <div className={`need-chip ${key === lowestNeed ? "low" : ""}`} key={key} aria-label={`${needsMeta[key].label} ${whole(value)} מתוך 100`}><div><MetaIcon /><span>{needsMeta[key].label}</span></div><strong>{whole(value)}</strong><i role="progressbar" aria-valuenow={whole(value)} aria-valuemin={0} aria-valuemax={100}><b style={{ width: `${value}%` }} /></i></div>; })}</div>
        <div className="time-progress"><span><ClockIcon />יום {day}</span><span><StarFilledIcon />רצף {game.streak}</span><div className="stage-progress"><span>{stage === "legend" ? "החברות ממשיכה לגדול" : `לקראת ${nextStageInfo.title} · יום ${nextStageInfo.minDay}`}</span><strong>{whole(evolution.progress)}%</strong><i role="progressbar" aria-valuenow={whole(evolution.progress)} aria-valuemin={0} aria-valuemax={100}><b style={{ width: `${evolution.progress}%` }} /></i></div></div>
      </motion.div> : null}</AnimatePresence>
    </div>
    <div className="room-scene">
      <AnimatePresence mode="wait">{speechOpen ? <motion.div className="speech-bubble" key={reactionId} initial={{ opacity: 0, y: 8, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5 }}><span>{reaction}</span>{aiReady ? <button aria-label="השמעת תגובת הדמות" disabled={isSpeaking} onClick={onSpeak}><SpeakerLoudIcon /></button> : null}</motion.div> : null}</AnimatePresence>
      {callNeed ? <motion.button className="care-call" aria-label={callNeed === "medicine" ? "לתת תרופה עכשיו" : callAria[callNeed as ActionKey]} onClick={() => callNeed === "medicine" ? onUseMedicine() : onAction(callNeed)} initial={{ scale: 0 }} animate={{ scale: reduceMotion ? 1 : [1,1.08,1] }} transition={{ repeat: reduceMotion ? 0 : Infinity, duration: 1.4 }}>{game.sick ? <ExclamationTriangleIcon /> : game.poop ? <StinkIcon /> : (() => { const I = actionsMeta[callNeed as ActionKey].icon; return <I />; })()}</motion.button> : null}
      {sceneUrl ? <button className={`scene-character-hitbox ${petted ? "petted" : ""}`} aria-label={`ללטף את ${game.name}`} onClick={petScene} /> : <motion.button className={`moving-character photo-character motion-${activeMotion} ${game.aiCharacter ? "ai-character" : ""} ${game.sleeping ? "sleeping" : ""} ${game.sick ? "sick" : ""} ${petted ? "petted" : ""}`} aria-label={!characterUrl && !game.photo ? "בחירת תמונה לדמות" : `ללטף את ${game.name}`} onClick={() => { if (!characterUrl && !game.photo) { onPickPhoto(); return; } petScene(); }} animate={{ x: reduceMotion ? 0 : restX, ...staticMotion }} transition={{ x: { type: "spring", stiffness: 65, damping: 16 }, y: { repeat: reduceMotion || activeMotion !== "idle" ? 0 : Infinity, duration: activeMotion === "idle" ? 2.2 : .8 }, rotate: { repeat: reduceMotion || activeMotion !== "idle" ? 0 : Infinity, duration: activeMotion === "idle" ? 3.2 : .8 }, scale: { duration: .8 } }} whileTap={{ scale: .92 }}>{characterUrl ? <img src={characterUrl} alt={game.name} draggable={false} /> : <span className="default-art" role="img" aria-label={game.name}><DefaultArt /></span>}</motion.button>}
      {game.poop > 0 ? <div className="mess-row" role="img" aria-label={`${game.poop} לכלוכים`}>{Array.from({ length: game.poop }).map((_, index) => <motion.span key={index} initial={{ y: -20 }} animate={{ y: 0 }}><StinkIcon /></motion.span>)}</div> : null}
      {game.sleeping ? <div className="sleep-cloud"><MoonIcon /><span>ששש…</span></div> : null}
      {game.sleeping ? <div className="nap-chip" role="status"><ClockIcon /><span>{napMinutes > 0 ? `תנומה מושלמת בעוד ${napMinutes} דק׳` : "התנומה הושלמה — עוד רגע מתעוררים"}</span>{game.napBonus > 0 ? <em>+{game.napBonus} בהתעוררות</em> : null}</div> : null}
      {(Object.keys(decorMeta) as DecorKey[]).filter((key) => game.decorations[key] && !bakedDecor.includes(key)).map((key, index) => <motion.div className={`room-decor decor-${key}`} key={key} aria-hidden initial={{ opacity: 0, scale: .5, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: index * .07, type: "spring", stiffness: 220, damping: 17 }}><Suspense fallback={null}><DecorVisual decorKey={key} /></Suspense></motion.div>)}
      <AnimatePresence>{effect && !reduceMotion ? <EffectBurst key={effect.id} kind={effect.kind} offset={restX} /> : null}</AnimatePresence>
    </div>
    {game.sick ? <button className="care-alert" onClick={onUseMedicine}><ExclamationTriangleIcon /><span><strong>משהו לא מרגיש טוב אצל {game.name}</strong><small>השתמשו בתרופה מהתיק</small></span><ChevronLeftIcon /></button> : null}
    <div className="care-dock">{(Object.entries(actionsMeta) as Array<[ActionKey, (typeof actionsMeta)[ActionKey]]>).map(([key, meta]) => { const Icon = meta.icon; const urgent = callNeed === key; return <button key={key} className={urgent ? "urgent" : ""} onClick={() => onAction(key)}><span><Icon /></span><strong>{key === "sleep" && game.sleeping ? "להעיר" : labels[kind][key]}</strong>{urgent ? <i /> : null}</button>; })}</div>
  </section>;
}

function EffectBurst({ kind, offset = 0 }: { kind: EffectKind; offset?: number }) {
  const Icon = kind === "food" ? CookieIcon : kind === "heart" ? HeartFilledIcon : kind === "moon" ? MoonIcon : kind === "coin" ? TokensIcon : kind === "medicine" ? PlusCircledIcon : SunIcon;
  return <div className={`effect-burst effect-${kind}`} style={{ left: `calc(50% + ${offset}px)` }}>{Array.from({ length: 9 }).map((_, index) => { const angle = index * 40; const radius = 72 + (index % 3) * 15; return <motion.i key={index} initial={{ x: 0, y: 0, scale: .4, opacity: 1 }} animate={{ x: Math.cos(angle * Math.PI / 180) * radius, y: Math.sin(angle * Math.PI / 180) * radius, scale: 1.15, opacity: 0 }} transition={{ duration: 1.1, ease: "easeOut" }}><Icon /></motion.i>; })}</div>;
}

function ArcadeScreen({ coins, starGame, guessGame, wagerUnlocked, wagerArmed, onToggleWager, onStartStars, onCatch, onStartGuess, onGuess, onExitStars, onExitGuess }: any) {
  return <section className="content-screen arcade-screen"><ScreenHeader eyebrow="מרוויחים מטבעות" title="המשחקייה" trailing={<div className="coin-pill"><TokensIcon /><strong>{coins}</strong></div>} />
    <div className="arcade-hero"><StarFilledIcon /><div><strong>משחקים קצרים, תגמול אמיתי</strong><span>המטבעות פותחים אוכל, צעצועים וטיפול.</span></div></div>
    <article className="game-card star-card"><div className="game-card-head"><span><StarFilledIcon /></span><div><h2>תופסי הכוכבים</h2><p>20 שניות · לחצו על המסלול הנכון</p></div>{!starGame.active ? <button onClick={onStartStars}>שחק</button> : null}</div>{starGame.active ? <div className="star-arena"><div className="scorebar"><strong>{starGame.score} כוכבים</strong><span>{starGame.time} שנ׳</span><button className="exit-run" onClick={onExitStars}>יציאה</button></div><div className="lanes">{[0,1,2].map((lane) => <button key={lane} aria-label={`מסלול ${lane + 1}`} onClick={() => onCatch(lane)}>{starGame.target === lane ? <motion.i key={starGame.targetId} initial={{ y: -110, rotate: 0 }} animate={{ y: 82, rotate: 180 }} transition={{ duration: .85, ease: "linear" }}><StarFilledIcon /></motion.i> : null}<span className={starGame.lane === lane ? "player active" : "player"}><FaceIcon /></span></button>)}</div></div> : <div className="game-preview stars-preview"><StarFilledIcon /><StarFilledIcon /><StarFilledIcon /></div>}</article>
    <article className="game-card guess-card"><div className="game-card-head"><span><ChevronLeftIcon /></span><div><h2>לאן קופצים?</h2><p>בהשראת משחק הכיוון הקלאסי · 5 סיבובים</p></div>{!guessGame.active && guessGame.round === 0 ? <button onClick={onStartGuess}>שחק</button> : null}</div>
      {!guessGame.active ? <div className="wager-row">{wagerUnlocked
        ? <><button className={`wager-toggle ${wagerArmed ? "on" : ""}`} role="switch" aria-checked={wagerArmed} aria-label="מצב הימור" onClick={onToggleWager}><i /><strong>מצב הימור</strong></button><small>כניסה: {wagerCost} מטבעות · הזכייה מוכפלת</small></>
        : <div className="wager-locked"><LockClosedIcon /><strong>מצב הימור</strong><small>נפתח בשלב פורח</small></div>}</div> : null}
      {guessGame.active || guessGame.round > 0 ? <div className="guess-arena">{guessGame.active && guessGame.wager ? <div className="wager-chip"><TokensIcon />הימור פעיל · זכייה כפולה</div> : null}{guessGame.active ? <div className="guess-tell-label"><FaceIcon />{guessGame.tellLabel} · {guessGame.tellPhrase}</div> : null}<strong>{guessGame.reveal || "לאן תהיה הקפיצה?"}</strong><motion.div className="guess-pet" animate={{ x: guessGame.answer === "left" ? -70 : guessGame.answer === "right" ? 70 : 0 }}><motion.span className="guess-tell" key={guessGame.round} animate={{ x: guessGame.answer ? 0 : [0, guessGame.hint === "left" ? -16 : 16, 0] }} transition={{ duration: .6, ease: "easeInOut" }}><FaceIcon /></motion.span></motion.div><div><button disabled={!guessGame.active || !!guessGame.answer} onClick={() => onGuess("right")}><ChevronRightIcon />ימינה</button><span>{guessGame.score}/{guessGame.round}</span><button disabled={!guessGame.active || !!guessGame.answer} onClick={() => onGuess("left")}>שמאלה<ChevronLeftIcon /></button></div><small className="guess-tip">{guessGame.active ? "הרמז מציץ לכיוון הקפיצה… בדרך כלל." : "טיפ: הדמות מציצה לכיוון שבא לה לקפוץ… בדרך כלל."}</small>{guessGame.active ? <button className="exit-run" onClick={onExitGuess}>יציאה</button> : null}{!guessGame.active && guessGame.round >= 5 ? <button className="again-button" onClick={onStartGuess}>עוד משחק</button> : null}</div> : <div className="game-preview direction-preview"><ChevronRightIcon /><FaceIcon /><ChevronLeftIcon /></div>}</article>
  </section>;
}

function JourneyScreen({ game, stage, evolution, day, personality, careGrade, dailyQuestIds, buildReady, onOpenBuild, onClaim, onClaimWeekly, onClaimMilestone }: any) {
  const personalityNames: Record<PersonalityId,string> = { curious: "סקרן", cozy: "רגוע", comic: "מצחיקן" };
  const weeklyDone = Math.min(weeklyQuest.target, game.weeklyProgress);
  const weeklyPercent = Math.min(100, Math.round(weeklyDone / weeklyQuest.target * 100));
  const weeklyClaimable = weeklyDone >= weeklyQuest.target && !game.weeklyClaimed;
  return <section className="content-screen"><ScreenHeader eyebrow="הטיפול שלך משנה הכול" title="מטרות והתקדמות" trailing={<div className="grade-pill">דירוג {careGrade}</div>} />
    <article className="evolution-card"><div className="evolution-title"><div><small>יום {day} ביחד · רצף {game.streak}</small><h2>{stageMeta[stage as StageId].title}</h2></div><div className="personality-badge"><FaceIcon />{personalityNames[personality as PersonalityId]}</div></div>
      {game.personaBuild ? <div className="build-chip"><StarFilledIcon /><div><strong>{personaBuildMeta[game.personaBuild as PersonalityId].title}</strong><small>{personaBuildMeta[game.personaBuild as PersonalityId].note}</small></div></div>
        : buildReady ? <button className="build-chip open" onClick={onOpenBuild}><MagicWandIcon /><div><strong>מתגבשת פה אישיות…</strong><small>אפשר לבחור את הכיוון עכשיו</small></div><ChevronLeftIcon /></button> : null}
      <div className="evolution-track">{(Object.keys(stageMeta) as StageId[]).map((id,index) => <div className={`${id === stage ? "current" : game.xp >= stageMeta[id].minXp && day >= stageMeta[id].minDay ? "done" : ""}`} key={id}><span>{index + 1}</span><small>{stageMeta[id].title}</small><em>יום {stageMeta[id].minDay}</em></div>)}</div>{stage !== "legend" ? <div className="next-progress"><span>לקראת {stageMeta[evolution.id as StageId].title} · דורש יום {stageMeta[evolution.id as StageId].minDay}</span><strong>{game.xp}/{evolution.target} XP</strong><i role="progressbar" aria-valuenow={whole(evolution.progress)} aria-valuemin={0} aria-valuemax={100}><b style={{ width: `${evolution.progress}%` }} /></i><small>השלב נפתח רק כשגם הזמן וגם הניסיון מוכנים.</small></div> : <div className="grown-note"><StarFilledIcon />הגעתם לשלב האגדי. האופי והזיכרונות ממשיכים להתפתח.</div>}</article>
    <div className="section-heading"><div><small>מתמידים ומרוויחים</small><h2>אבני דרך של רצף</h2></div><StarFilledIcon /></div>
    <div className="milestone-strip">{streakMilestones.map((milestone) => { const claimed = game.claimedMilestones.includes(milestone.days); const ready = game.bestStreak >= milestone.days && !claimed; return <button key={milestone.days} className={`${ready ? "ready" : ""} ${claimed ? "claimed" : ""}`} disabled={!ready} onClick={() => onClaimMilestone(milestone.days)}><span>{claimed ? <CheckIcon /> : ready ? <StarFilledIcon /> : <LockClosedIcon />}</span><strong>רצף {milestone.days}</strong><em>+{milestone.reward}</em><small>{claimed ? "נאסף" : ready ? "לאיסוף" : `${Math.min(game.bestStreak, milestone.days)}/${milestone.days}`}</small></button>; })}</div>
    <div className="section-heading"><div><small>מתחדש בכל יום</small><h2>משימות יומיות</h2></div><ClockIcon /></div>
    <div className="quest-list">{(dailyQuestIds as QuestId[]).map((id) => { const quest = questPool[id]; const progress = Math.min(quest.target, game.questProgress[id] ?? 0); const complete = progress >= quest.target; const claimed = game.claimed.includes(id); const claimable = complete && !claimed; const percent = Math.min(100, Math.round(progress / quest.target * 100)); return <button key={id} className={`${complete ? "complete" : ""} ${claimed ? "claimed" : ""}`} disabled={!claimable} aria-label={claimable ? `לאסוף ${quest.reward} מטבעות · ${quest.title}` : `${quest.title} · ${claimed ? "נאסף" : `${progress} מתוך ${quest.target}`}`} onClick={() => onClaim(id)}><span>{claimed ? <CheckIcon /> : complete ? <StarFilledIcon /> : <ClockIcon />}</span><div><strong>{quest.title}</strong><small>{progress}/{quest.target}</small><i role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`התקדמות ${quest.title}`}><b style={{ width: `${percent}%` }} /></i></div><em>{claimed ? "נאסף" : `+${quest.reward}`}</em></button>; })}
      {dailyQuestIds.length ? null : <div className="small-note">המשימות של היום מתגלגלות ברגע זה — עוד שנייה הן כאן.</div>}</div>
    <article className={`weekly-quest ${weeklyClaimable ? "ready" : ""} ${game.weeklyClaimed ? "claimed" : ""}`}>
      <div className="weekly-head"><span>{game.weeklyClaimed ? <CheckIcon /> : <StarFilledIcon />}</span><div><small>מטרת השבוע</small><strong>{weeklyQuest.title}</strong></div><em><TokensIcon />{weeklyQuest.reward}</em></div>
      <i role="progressbar" aria-valuenow={weeklyPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`התקדמות שבועית ${weeklyDone} מתוך ${weeklyQuest.target}`}><b style={{ width: `${weeklyPercent}%` }} /></i>
      <div className="weekly-foot"><small>{weeklyDone}/{weeklyQuest.target}</small><button disabled={!weeklyClaimable} aria-label={weeklyClaimable ? `לאסוף ${weeklyQuest.reward} מטבעות על מטרת השבוע` : game.weeklyClaimed ? "פרס השבוע כבר נאסף" : `נשארו ${weeklyQuest.target - weeklyDone} פעולות למטרת השבוע`} onClick={onClaimWeekly}>{game.weeklyClaimed ? "נאסף השבוע" : weeklyClaimable ? "לאסוף" : "עוד בדרך"}</button></div>
    </article>
    <div className="stats-grid"><div><strong>{game.actions}</strong><span>פעולות טיפול</span></div><div><strong>{game.bestStreak}</strong><span>שיא רצף</span></div><div><strong>{game.xp}</strong><span>נקודות ניסיון</span></div><div><strong>{game.careMistakes}</strong><span>רגעי מצוקה</span></div></div>
    {game.memories.length ? <><div className="section-heading memory-title"><div><small>נוצר עם AI</small><h2>הזיכרונות שלנו</h2></div><MagicWandIcon /></div><div className="memory-list">{game.memories.slice(-5).reverse().map((memory: string, index: number) => <div key={`${memory}-${index}`}><StarFilledIcon /><span>{memory}</span></div>)}</div></> : null}
  </section>;
}

function BagScreen({ game, onUse, onBuy, onBuyDecor, onArcade }: any) {
  const [tab, setTab] = useState<"items" | "room">("items");
  const empty = (Object.keys(items) as ItemKey[]).every((key) => game.inventory[key] < 1);
  const toShop = () => document.getElementById("bag-shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
  return <section className="content-screen"><ScreenHeader eyebrow="אוספים ומשתמשים" title="התיק והחנות" trailing={<div className="coin-pill"><TokensIcon /><strong>{game.coins}</strong></div>} />
    <div className="chip-tabs" role="tablist" aria-label="תצוגת התיק">
      <button role="tab" aria-selected={tab === "items"} className={tab === "items" ? "active" : ""} onClick={() => setTab("items")}>פריטים</button>
      <button role="tab" aria-selected={tab === "room"} className={tab === "room" ? "active" : ""} onClick={() => setTab("room")}>לחדר</button>
    </div>
    {tab === "items" ? <>
      <div className="section-heading"><div><small>מה שכבר יש לנו</small><h2>בתיק</h2></div><BackpackIcon /></div>
      {empty ? <div className="bag-empty"><strong>התיק ריק לגמרי</strong><p>אפילו הפירורים עזבו. קונים משהו קטן בחנות, או מרוויחים מטבעות במשחקייה.</p><div><button onClick={toShop}>לחנות</button><button onClick={onArcade}>למשחקייה</button></div></div>
        : <div className="inventory-grid">{(Object.entries(items) as Array<[ItemKey,(typeof items)[ItemKey]]>).map(([key,item]) => { const Icon = item.icon; return <button key={key} disabled={game.inventory[key] < 1} aria-label={`${item.title} · ${game.inventory[key]} בתיק`} onClick={() => onUse(key)}><span><Icon /><i>{game.inventory[key]}</i></span><strong>{item.title}</strong><small>{game.inventory[key] ? "שימוש" : "אזל"}</small></button>; })}</div>}
      <div className="section-heading shop-title" id="bag-shop"><div><small>משחקים כדי לקנות</small><h2>החנות</h2></div><TokensIcon /></div>
      <div className="shop-list">{(Object.entries(items) as Array<[ItemKey,(typeof items)[ItemKey]]>).map(([key,item]) => { const Icon = item.icon; return <button key={key} disabled={game.coins < item.price} onClick={() => onBuy(key)}><span><Icon /></span><div><strong>{item.title}</strong><small>{item.note}</small></div><em><TokensIcon />{item.price}</em></button>; })}</div>
    </> : <>
      <div className="section-heading shop-title"><div><small>משדרגים את הבית</small><h2>לחדר</h2></div><HomeIcon /></div>
      {decorShelves.map((shelf, index) => {
        const rows = (Object.entries(decorMeta) as Array<[DecorKey,(typeof decorMeta)[DecorKey]]>).filter(([, decor]) => shelfIndex(decor.unlockStage) === index);
        if (!rows.length) return null;
        const shelfLocked = stageOrder.indexOf(currentStage(game)) < stageOrder.indexOf(shelf.unlockStage);
        return <section className={`decor-shelf ${shelfLocked ? "locked" : ""}`} key={shelf.title}>
          <div className="shelf-head"><div><strong>{shelf.title}</strong><small>{shelf.note}</small></div>{shelfLocked ? <em><LockClosedIcon />{stageMeta[shelf.unlockStage].title}</em> : null}</div>
          <div className="shop-list decor-list">{rows.map(([key,decor]) => { const owned = Boolean(game.decorations[key]); const locked = !isDecorUnlocked(game, key); return <button key={key} className={`${owned ? "owned" : ""} ${locked ? "locked" : ""}`} disabled={owned || locked || game.coins < decor.price} aria-label={locked ? `${decor.title} · נפתח בשלב ${stageMeta[decor.unlockStage].title}` : owned ? `${decor.title} · כבר בבית` : `${decor.title} · ${decor.price} מטבעות`} onClick={() => onBuyDecor(key)}><span><Suspense fallback={<CircleIcon />}><DecorVisual decorKey={key} /></Suspense></span><div><strong>{decor.title}</strong><small>{decor.note}</small></div>{owned ? <em className="owned-tag"><CheckIcon />בבית!</em> : locked ? <em className="locked-tag"><LockClosedIcon />{stageMeta[decor.unlockStage].title}</em> : <em><TokensIcon />{decor.price}</em>}</button>; })}</div>
        </section>;
      })}
      <div className="small-note">הקישוטים מופיעים מיד בחדר, ובעמוד ה־AI אפשר לצבוע אותם ישר לתוך תמונת החדר. מדפים נוספים נפתחים כשגם הזמן וגם נקודות הניסיון מספיקים לשלב הבא.</div>
    </>}
  </section>;
}

function ScreenHeader({ eyebrow, title, trailing }: { eyebrow: string; title: string; trailing: ReactNode }) { return <header className="screen-header"><div><small>{eyebrow}</small><h1>{title}</h1></div>{trailing}</header>; }

function FullPage({ title, subtitle, onBack, children }: { title: string; subtitle: string; onBack: () => void; children: ReactNode }) {
  const keyboard = useKeyboard();
  const reduceMotion = useReducedMotion();
  const backRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { resetScroll(".overlay-scroll .mobile-scroll"); }, [title]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    backRef.current?.focus();
    return () => { if (previous && document.contains(previous)) previous.focus(); };
  }, []);
  const close = () => { keyboard.hide(); onBack(); };
  const transition = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { x: "-100%" }, animate: { x: 0 }, exit: { x: "-100%" } };
  return <motion.section className="full-page" role="dialog" aria-modal="true" aria-label={title} {...transition} transition={{ type: "spring", damping: 28, stiffness: 280 }}><header><button ref={backRef} aria-label="חזרה" onClick={close}><ChevronRightIcon /></button><div><h1>{title}</h1><p>{subtitle}</p></div></header><MobileScroll className="overlay-scroll"><div className="full-page-content">{children}</div></MobileScroll></motion.section>;
}

function EventCard({ text, variant, reduceMotion, onClose }: { text: string; variant: EventVariant; reduceMotion: boolean; onClose: () => void }) {
  const continueRef = useRef<HTMLButtonElement | null>(null);
  const notice = variant === "notice";
  const title = notice ? "הודעה" : "אירוע חדש";
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    continueRef.current?.focus();
    return () => { if (previous && document.contains(previous)) previous.focus(); };
  }, []);
  return <motion.div className="event-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div className={`event-card ${notice ? "notice" : ""}`} role="dialog" aria-modal="true" aria-label={title} initial={reduceMotion ? { opacity: 0 } : { scale: .82, y: 30 }} animate={reduceMotion ? { opacity: 1 } : { scale: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { scale: .9, opacity: 0 }}>
      <div className="event-star">{notice ? <InfoCircledIcon /> : <StarFilledIcon />}</div><small>{title}</small><h2>{text}</h2>
      <button ref={continueRef} className="wide-button accent" onClick={onClose}>ממשיכים</button>
    </motion.div>
  </motion.div>;
}

function BuildChoiceCard({ name, personality, reduceMotion, onChoose, onLater }: { name: string; personality: Record<PersonalityId, number>; reduceMotion: boolean; onChoose: (id: PersonalityId) => void; onLater: () => void }) {
  const firstRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    firstRef.current?.focus();
    return () => { if (previous && document.contains(previous)) previous.focus(); };
  }, []);
  const options = (Object.keys(personaBuildMeta) as PersonalityId[]).sort((a, b) => personality[b] - personality[a]);
  return <motion.div className="event-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div className="event-card build-card" role="dialog" aria-modal="true" aria-label="בחירת אופי" initial={reduceMotion ? { opacity: 0 } : { scale: .82, y: 30 }} animate={reduceMotion ? { opacity: 1 } : { scale: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { scale: .9, opacity: 0 }}>
      <div className="event-star"><MagicWandIcon /></div><small>רגע של אופי</small><h2>מתגבשת פה אישיות…</h2>
      <p className="build-lead">{name || "החבר שלנו"} כבר יודע לאן נמשך. בוחרים כיוון אחד — והוא נשאר.</p>
      <div className="build-options">{options.map((id, index) => { const ready = personality[id] >= 25; return <button key={id} ref={index === 0 ? firstRef : undefined} className={ready ? "ready" : ""} disabled={!ready} aria-label={ready ? `לבחור ${personaBuildMeta[id].title} · ${personaBuildMeta[id].note}` : `${personaBuildMeta[id].title} · עוד ${25 - personality[id]} נקודות אופי`} onClick={() => onChoose(id)}><strong>{personaBuildMeta[id].title}</strong><small>{personaBuildMeta[id].note}</small>{ready ? <i><CheckIcon /></i> : <em><LockClosedIcon />{Math.max(0, 25 - personality[id])}</em>}</button>; })}</div>
      <button className="ghost-button" onClick={onLater}>אולי בהמשך</button>
    </motion.div>
  </motion.div>;
}

function ConfirmAction({ className, icon, label, question, confirmLabel, disabled, onConfirm }: { className: string; icon: ReactNode; label: string; question: string; confirmLabel: string; disabled?: boolean; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 4_000);
    return () => window.clearTimeout(timer);
  }, [armed]);
  if (!armed) return <button className={className} disabled={disabled} onClick={() => setArmed(true)}>{icon}{label}</button>;
  return <><div className="blocked-note">{question}</div><div className="confirm-row"><button className={className.split(/\s+/).includes("danger") ? "danger-solid" : "accent-solid"} onClick={() => { setArmed(false); onConfirm(); }}>{confirmLabel}</button><button className="wide-button" onClick={() => setArmed(false)}>ביטול</button></div></>;
}

function Onboarding({ game, isImporting, onKind, onName, onTheme, onPhoto, onDone }: any) {
  const keyboard = useKeyboard();
  const [step, setStep] = useState(0);
  const blurAnd = (callback: () => void) => { keyboard.hide(); callback(); };
  const selectedKind = game.characterKind ? kindLabels[game.characterKind as Exclude<CharacterKind, "">] : null;
  return <div className={`onboarding onboarding-step-${step}`}><img src="/assets/companion/onboarding-hero-v4.webp" alt="ילד, תינוק וכלבלב סביב חדר קסום" /><div className="onboarding-shade" /><div className="onboarding-brand"><StarFilledIcon /><span>החבר שלי</span></div><motion.div className="onboarding-card" key={step} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
    {step > 0 ? <button className="onboarding-back" aria-label="חזרה" onClick={() => blurAnd(() => setStep((current) => current - 1))}><ChevronRightIcon /></button> : null}
    {step === 0 ? <><small>טמגוצ׳י, אבל אישי</small><h1>מישהו קטן עומד לעבור לגור אצלך.</h1><p>מצלמים אדם, תינוק או חיית מחמד. מטפלים, משחקים וצוחקים בדרך.</p><button className="wide-button accent" onClick={() => setStep(1)}>יוצרים חבר<ChevronLeftIcon /></button></> : null}
    {step === 1 ? <><small>שלב 1 מתוך 3</small><h1>מי יהיה החבר?</h1><p>הבחירה משנה את השפה, פעולות הטיפול והבדיחות.</p><div className="kind-grid">{(Object.entries(kindLabels) as Array<[Exclude<CharacterKind, "">,(typeof kindLabels)[Exclude<CharacterKind, "">]]>).map(([kind, meta]) => { const Icon = meta.icon; return <button key={kind} className={game.characterKind === kind ? "selected" : ""} onClick={() => onKind(kind)}><span><Icon /></span><strong>{meta.title}</strong><small>{meta.note}</small>{game.characterKind === kind ? <i><CheckIcon /></i> : null}</button>; })}</div><button className="wide-button accent" disabled={!game.characterKind} onClick={() => setStep(2)}>ממשיכים<ChevronLeftIcon /></button></> : null}
    {step === 2 ? <><small>שלב 2 מתוך 3</small><h1>שם ופנים</h1><p>תמונה אמיתית פותחת את יכולות ה־AI, אבל אפשר גם להתחיל בלעדיה.</p><div className={`photo-pick ${game.photo ? "has-photo" : ""}`}><button disabled={isImporting} onClick={onPhoto}>{game.photo ? <img src={game.photo} alt="התמונה שנבחרה" /> : <span><CameraIcon /><strong>{isImporting ? "מעבדים את התמונה…" : "צילום או תמונה (לא חובה)"}</strong><small>אדם, תינוק או חיית מחמד</small></span>}</button>{game.photo ? <button className="replace-photo" disabled={isImporting} onClick={onPhoto}>להחליף</button> : null}</div><KeyboardInput aria-label="שם הדמות" className="text-field" placeholder={selectedKind?.namePlaceholder || "איך קוראים לדמות?"} value={game.name} onChange={(event) => onName(event.target.value.slice(0,18))} /><div className="privacy-note"><LockClosedIcon />התמונה נשארת במכשיר. אפשר להמשיך בלי תמונה ולהוסיף אותה אחר כך.</div><button className="wide-button accent" disabled={!game.name.trim()} onClick={() => blurAnd(() => setStep(3))}>החדר הבא<ChevronLeftIcon /></button></> : null}
    {step === 3 ? <><small>שלב 3 מתוך 3</small><h1>איפה גרים?</h1><p>אפשר להחליף חדר אחר כך בלי לאבד התקדמות.</p><div className="onboarding-themes">{themes.map((theme) => <button key={theme.id} className={game.theme === theme.id ? "selected" : ""} onClick={() => onTheme(theme.id)}><img src={theme.image} alt="" /><span>{theme.title}</span></button>)}</div><button className="wide-button accent" disabled={!game.name.trim() || !game.characterKind} onClick={() => blurAnd(onDone)}>פותחים את הדלת<HomeIcon /></button></> : null}
    {step > 0 ? <div className="step-dots">{[1,2,3].map((index) => <i className={index === step ? "active" : ""} key={index} />)}</div> : null}
  </motion.div></div>;
}
