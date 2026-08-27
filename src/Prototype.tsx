import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  BackpackIcon, BellIcon, BorderAllIcon, CameraIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon,
  ClockIcon, ExclamationTriangleIcon, FaceIcon, GearIcon,
  HeartFilledIcon, HomeIcon, ImageIcon, LightningBoltIcon, LockClosedIcon, MagicWandIcon,
  InfoCircledIcon, MoonIcon, PaperPlaneIcon, PersonIcon, PlayIcon, RocketIcon, SewingPinIcon, SpeakerLoudIcon, StarFilledIcon,
  SunIcon, TokensIcon, TrashIcon, TriangleUpIcon,
} from "@radix-ui/react-icons";
import { AnimatePresence, motion } from "motion/react";
import { extractAiResponseText, parseAiEvent, type AiProvider } from "./aiGame";
import { animationStorageKey, buildAnimationRequest, motionMeta } from "./animationDirector";
import { buildCharacterPrompt, buildOpenRouterCharacterRequest, buildRoomUpgradePrompt, characterStorageKey, characterVisuals, decorSetKey, roomStorageKey, type CharacterVisual } from "./characterDirector";
import { decorArt } from "./decorArt";
import {
  buildFalImageTask, buildFalVideoTask, buildKieImageTask, buildKieVideoTask,
  defaultCapabilityModels, mediaProviderMeta, parseFalAudioUrl, parseFalMediaUrl, parseFalSubmission, parseFalText,
  parseKieTask, parseKieTaskId, type MediaProvider,
} from "./mediaProviders";
import { loadClip, loadMedia, removeClips, removeMedia, saveClip, saveMedia } from "./mediaStore";
import { Carousel, KeyboardInput, MobileScroll, useKeyboard } from "./mobile";
import {
  HOUR, absenceMessage, ageDay, applyElapsed, buyDecoration, claimStreakMilestone, clamp, currentStage, decorMeta, defaultState, localDayKey,
  nextStage, performCareAction, stageMeta, streakMilestones, useInventoryItem, whole,
  type ActionKey, type CharacterKind, type CompanionMotion, type DecorKey, type GameState, type ItemKey, type NeedKey, type PersonalityId, type StageId, type ThemeId,
} from "./gameEngine";
import "./prototype.css";

type ScreenId = "home" | "arcade" | "journey" | "bag";
type EffectKind = "food" | "heart" | "bubble" | "moon" | "coin" | "medicine";

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
};
type ImageModel = { id: string; name: string; architecture?: { input_modalities?: string[]; output_modalities?: string[] } };
type VoiceModel = { id: string; name?: string; architecture?: { output_modalities?: string[] } };
type VideoModel = { id: string; name?: string; generate_audio?: boolean; supported_frame_images?: string[]; supported_aspect_ratios?: string[]; supported_resolutions?: string[]; supported_durations?: number[] };

const STORAGE_KEY = "little-friend-state-v5";
const V4_STORAGE_KEY = "little-friend-state-v4";
const V3_STORAGE_KEY = "little-friend-state-v3";
const V2_STORAGE_KEY = "little-friend-state-v2";
const OLD_STORAGE_KEY = "pocket-companion-state-v1";
const AI_KEY = "little-friend-ai-v5";
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
};

const themes: Array<{ id: ThemeId; title: string; note: string; image: string }> = [
  { id: "midnight", title: "לילה חלומי", note: "תלת־ממד קולנועי", image: "/assets/companion/room-midnight.webp" },
  { id: "sunrise", title: "בוקר שמח", note: "חם, נקי ומודרני", image: "/assets/companion/room-sunrise-v5.webp" },
  { id: "classic", title: "קלאסי", note: "LCD נוסטלגי", image: "/assets/companion/room-classic.webp" },
];

const needsMeta: Record<NeedKey, { label: string; icon: typeof SunIcon }> = {
  fullness: { label: "שובע", icon: BackpackIcon }, energy: { label: "אנרגיה", icon: LightningBoltIcon },
  hygiene: { label: "ניקיון", icon: SunIcon }, mood: { label: "שמחה", icon: HeartFilledIcon },
};

const actionsMeta: Record<ActionKey, { label: string; need: NeedKey; icon: typeof SunIcon; effect: EffectKind }> = {
  feed: { label: "להאכיל", need: "fullness", icon: BackpackIcon, effect: "food" },
  sleep: { label: "לישון", need: "energy", icon: MoonIcon, effect: "moon" },
  clean: { label: "לנקות", need: "hygiene", icon: SunIcon, effect: "bubble" },
  play: { label: "לשחק", need: "mood", icon: RocketIcon, effect: "heart" },
};

const items: Record<ItemKey, { title: string; note: string; price: number; icon: typeof SunIcon }> = {
  apple: { title: "תפוח", note: "+18 שובע", price: 8, icon: BackpackIcon },
  meal: { title: "ארוחה מושקעת", note: "+35 שובע · +5 שמחה", price: 22, icon: BackpackIcon },
  soap: { title: "סבון עננים", note: "ניקיון מלא", price: 14, icon: SunIcon },
  medicine: { title: "תרופה", note: "מרפאת מחלה", price: 26, icon: HeartFilledIcon },
  ball: { title: "כדור קופצני", note: "+28 שמחה", price: 18, icon: RocketIcon },
};

const decorIcons: Record<DecorKey, typeof SunIcon> = {
  lamp: SunIcon, poster: ImageIcon, rug: BorderAllIcon, plant: TriangleUpIcon, radio: SpeakerLoudIcon, trophy: StarFilledIcon,
};

const decorLines: Record<DecorKey, string> = {
  lamp: "המנורה נדלקה והחדר מיד התחיל להתנהג יפה.",
  poster: "תליתי פוסטר. עכשיו יש למי להסביר את הרעיונות שלי.",
  rug: "שטיח. סוף־סוף לרצפה יש דעה נעימה.",
  plant: "עציץ חדש. הבטחתי לו שלא ננהל שיחות ארוכות מדי.",
  radio: "רדיו! מהיום לכל צעד בחדר יש פסקול.",
  trophy: "גביע. לא זכיתי בכלום, אבל הוא נראה משכנע.",
};

const sharedReactions: Record<ActionKey, string[]> = {
  feed: ["זו לא הייתה רעב. זו הייתה מסיבת עיתונאים של הבטן.", "השארתי פירור אחד. הוא אחראי על המשמרת הבאה."],
  sleep: ["אם יש נחירות—זו גרסת הפרימיום של הפסקול.", "רק תנומה קטנה. שלושים דקות או חורף שלם."],
  clean: ["מבריק מספיק כדי לסנוור אחריות הורית.", "נקי. החשדות נשארו, אבל נקי."],
  play: ["זה נחשב ספורט. בדקתי עם עצמי.", "שיא אישי חדש בבלגן עם כוונות טובות."],
};

const kindReactions: Record<Exclude<CharacterKind, "">, Record<ActionKey, string[]>> = {
  person: {
    feed: ["אני ממנה אותך רשמית לשר החטיפים."], sleep: ["הפגישה שלי עם הכרית התחילה מוקדם."],
    clean: ["אמרתי שהמראה הזו טבעית. המים התעקשו."], play: ["הפסדתי בכבוד. כלומר, אני דורש משחק חוזר."],
  },
  baby: {
    feed: ["הבקבוק קיבל חמישה כוכבים. השירות קצת איטי."], sleep: ["אני לא עייף. אני רק עוצם עיניים מקצועית."],
    clean: ["החיתול הגיש מכתב התפטרות."], play: ["מצאתי צעצוע. ועכשיו הוא ראש מחלקת רעש."],
  },
  pet: {
    feed: ["בדקתי: הקערה שוב ריקה. תעלומה."], sleep: ["אני שומר על הספה מבפנים."],
    clean: ["הריח הזה היה חלק מהאישיות שלי."], play: ["הכדור ברח. רדפתי אחריו מטעמי צדק."],
  },
};

const personalityReactions: Record<PersonalityId, Record<ActionKey, string[]>> = {
  curious: {
    feed: ["בדקתי כל ביס מזווית אחרת. זה נקרא מחקר.", "טעם חדש. פתחתי עליו תיק."],
    sleep: ["אני נרדם מיד אחרי שאבין מה הרעש הזה.", "עצמתי עיניים ומיד צצה שאלה טובה."],
    clean: ["גיליתי שיש לי צבע מתחת ללכלוך. מרתק.", "חקרתי את הקצף. הוא סירב לשתף פעולה."],
    play: ["המצאתי חוק חדש באמצע. הוא ניצח אותי.", "כל פינה בחדר קיבלה סיור מודרך."],
  },
  cozy: {
    feed: ["אכלתי לאט. יש כבוד לארוחה.", "הבטן שלי ביקשה שמיכה אחרי זה."],
    sleep: ["הכרית ואני חתמנו על הסכם ארוך טווח.", "חממתי בדיוק את הפינה הזאת. עכשיו אסור לזוז."],
    clean: ["נקי, רך וחמים. אין לי בקשות נוספות היום.", "אני מבריק בקצב שלי, בלי לחץ."],
    play: ["שיחקנו יפה ואז נזכרתי שיש כורסה.", "אחרי כיף כזה מגיעה הפסקה רשמית."],
  },
  comic: {
    feed: ["הבטן מחאה כפיים. היא קהל קל.", "ביקשתי תוספת בשקט, כדי לא לפגוע בצלחת."],
    sleep: ["אני לא ישן, אני עושה חזרות לחלום.", "תנומה קצרה עם קטע מחיאות כפיים בסוף."],
    clean: ["התרחצתי והופעתי מחדש. קהל, כמובן, לא היה.", "נקי, מבריק, ומחפש במה."],
    play: ["הופעתי, נפלתי, קמתי והשתחוויתי.", "המשחק הזה היה גאוני. אני העד היחיד."],
  },
};

const actionMotion: Record<ActionKey, CompanionMotion> = { feed: "eat", sleep: "sleep", clean: "celebrate", play: "play" };

const kindLabels: Record<Exclude<CharacterKind, "">, { title: string; note: string; icon: typeof PersonIcon; namePlaceholder: string }> = {
  person: { title: "אדם", note: "ילד, נער או מבוגר", icon: PersonIcon, namePlaceholder: "איך קוראים לו או לה?" },
  baby: { title: "תינוק", note: "קטן, מצחיק ודעתן", icon: FaceIcon, namePlaceholder: "איך קוראים לתינוק?" },
  pet: { title: "חיית מחמד", note: "כלב, חתול וכל השאר", icon: HeartFilledIcon, namePlaceholder: "איך קוראים לחיית המחמד?" },
};


const questDefinitions = [
  { id: "care", title: "שלוש פעולות טיפול", target: 3, reward: 25 },
  { id: "game", title: "משחק אחד בארקייד", target: 1, reward: 35 },
  { id: "happy", title: "להגיע ל־85 שמחה", target: 1, reward: 20 },
] as const;

function loadState(): GameState {
  try {
    const fresh = new URLSearchParams(location.search).get("fresh") === "1";
    if (!fresh) {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as GameState | null;
      if (saved?.version === 5) {
        return applyElapsed({ ...defaultState, ...saved, memories: saved.memories ?? [], animationSlots: saved.animationSlots ?? {}, aiCharacter: saved.aiCharacter ?? false, characterVariants: saved.characterVariants ?? {}, aiRooms: saved.aiRooms ?? {}, decorations: saved.decorations ?? {}, claimedMilestones: saved.claimedMilestones ?? [], sourcePhoto: saved.sourcePhoto ?? saved.photo });
      }
      const v4 = JSON.parse(localStorage.getItem(V4_STORAGE_KEY) ?? "null") as Partial<GameState> | null;
      const v3 = JSON.parse(localStorage.getItem(V3_STORAGE_KEY) ?? "null") as Partial<GameState> | null;
      const v2 = JSON.parse(localStorage.getItem(V2_STORAGE_KEY) ?? "null") as Partial<GameState> | null;
      const legacy = v4 ?? v3 ?? v2 ?? JSON.parse(localStorage.getItem(OLD_STORAGE_KEY) ?? "null") as Partial<GameState> | null;
      if (legacy) {
        const legacyName = legacy.name === "לולי" ? "" : legacy.name || "";
        return applyElapsed({
          ...defaultState,
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
          personality: legacy.personality ?? defaultState.personality,
          inventory: legacy.inventory ?? defaultState.inventory,
          memories: legacy.memories ?? [],
          photo: legacy.photo,
          birthAt: legacy.birthAt ?? Date.now() - HOUR,
          lastSeen: legacy.lastSeen ?? Date.now(),
          characterKind: legacy.characterKind || "",
          visualRevision: legacy.visualRevision ?? Date.now(),
          animationSlots: legacy.animationSlots ?? {},
          aiCharacter: legacy.aiCharacter ?? false,
          characterVariants: legacy.characterVariants ?? {},
          sourcePhoto: legacy.sourcePhoto ?? legacy.photo,
          notificationsEnabled: false,
          guideSeen: false,
        });
      }
    }
  } catch { /* fall through */ }
  return { ...defaultState, birthAt: Date.now(), lastSeen: Date.now(), visualRevision: Date.now() };
}

function loadAi(): AiSettings {
  try {
    const current = JSON.parse(sessionStorage.getItem(AI_KEY) ?? "{}") as Partial<AiSettings>;
    const v4 = JSON.parse(sessionStorage.getItem("little-friend-ai-v4") ?? "{}") as Partial<AiSettings>;
    const v3 = JSON.parse(sessionStorage.getItem("little-friend-ai-v3") ?? "{}") as Partial<AiSettings>;
    const previous = JSON.parse(sessionStorage.getItem("little-friend-ai-v2") ?? "{}") as Partial<AiSettings>;
    const merged = { ...previous, ...v3, ...v4, ...current };
    const migratedProvider: MediaProvider = merged.provider ?? (merged.openRouterKey || merged.textModel?.includes("/") ? "openrouter" : "openai");
    const oldTextModel = !merged.textModel || ["gpt-5-mini", "openai/gpt-5-mini"].includes(merged.textModel);
    const legacyMedia = (merged as any).mediaProvider as MediaProvider | undefined;
    return { ...defaultAi, ...merged, provider: migratedProvider, voiceProvider: merged.voiceProvider ?? migratedProvider, imageProvider: merged.imageProvider ?? legacyMedia ?? migratedProvider, videoProvider: merged.videoProvider ?? legacyMedia ?? "openrouter", textModel: oldTextModel ? (migratedProvider === "openai" ? "gpt-5.6-luna" : "openai/gpt-5.6-luna") : merged.textModel! };
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
  const [overlay, setOverlay] = useState<"settings" | "ai" | "guide" | "event" | null>(null);
  const [reaction, setReaction] = useState("חיכיתי לך. ספרתי עד שבע ואז איבדתי ריכוז.");
  const [reactionId, setReactionId] = useState(0);
  const [effect, setEffect] = useState<{ id: number; kind: EffectKind } | null>(null);
  const [wanderX, setWanderX] = useState(0);
  const [eventText, setEventText] = useState("");
  const [ai, setAi] = useState<AiSettings>(loadAi);
  const [aiStatus, setAiStatus] = useState<"idle" | "testing" | "ready" | "error">("idle");
  const [mediaStatus, setMediaStatus] = useState<"idle" | "testing" | "ready" | "error">("idle");
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "testing" | "ready" | "error">("idle");
  const [videoStatus, setVideoStatus] = useState<"idle" | "testing" | "ready" | "error">("idle");
  const [aiError, setAiError] = useState("");
  const [imageModels, setImageModels] = useState<ImageModel[]>([]);
  const [voiceModels, setVoiceModels] = useState<VoiceModel[]>([]);
  const [videoModels, setVideoModels] = useState<VideoModel[]>([]);
  const [characterUrls, setCharacterUrls] = useState<Partial<Record<CharacterVisual, string>>>({});
  const [roomUrls, setRoomUrls] = useState<Partial<Record<ThemeId, string>>>({});
  const [characterProgress, setCharacterProgress] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isStyling, setIsStyling] = useState(false);
  const [isDecorating, setIsDecorating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isDreaming, setIsDreaming] = useState(false);
  const [isAnimating, setIsAnimating] = useState<CompanionMotion | null>(null);
  const [selectedMotion, setSelectedMotion] = useState<CompanionMotion>("idle");
  const [activeMotion, setActiveMotion] = useState<CompanionMotion>("idle");
  const [clipUrls, setClipUrls] = useState<Partial<Record<CompanionMotion, string>>>({});
  const [chatInput, setChatInput] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [starGame, setStarGame] = useState({ active: false, time: 20, score: 0, lane: 1, target: 1, targetId: 0 });
  const [guessGame, setGuessGame] = useState({ active: false, round: 0, score: 0, answer: null as "left" | "right" | null, reveal: "", secret: "left" as "left" | "right", hint: "left" as "left" | "right" });
  const fileRef = useRef<HTMLInputElement | null>(null);
  const motionTimerRef = useRef<number | null>(null);
  const starFinishedRef = useRef(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...game, lastSeen: Date.now(), awayMinutes: 0 })); }
    catch { /* the game keeps running from memory even when the device refuses to store */ }
  }, [game]);
  useEffect(() => { sessionStorage.setItem(AI_KEY, JSON.stringify(ai)); }, [ai]);
  useEffect(() => () => { if (motionTimerRef.current) window.clearTimeout(motionTimerRef.current); }, []);
  useEffect(() => { resetScroll(".app-screen .mobile-scroll"); }, [screen]);
  useEffect(() => {
    if (game.onboarded && !game.guideSeen && !overlay) setOverlay("guide");
  }, [game.onboarded, game.guideSeen, overlay]);
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
      for (const motion of Object.keys(game.animationSlots) as CompanionMotion[]) {
        if (!game.animationSlots[motion]) continue;
        try {
          const clip = await loadClip(animationStorageKey(game.visualRevision, motion));
          if (clip) {
            const url = URL.createObjectURL(clip);
            objectUrls.push(url); restored[motion] = url;
          }
        } catch { /* the game remains playable with local motion */ }
      }
      if (!cancelled) setClipUrls(restored);
    };
    void restore();
    return () => { cancelled = true; objectUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [game.visualRevision, game.animationSlots]);
  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    const restore = async () => {
      const restored: Partial<Record<CharacterVisual, string>> = {};
      const available = characterVisuals.filter((visual) => visual === "master" ? game.aiCharacter : Boolean(game.characterVariants[visual]));
      for (const visual of available) {
        try {
          const image = await loadMedia(characterStorageKey(game.visualRevision, visual));
          if (image) {
            const url = URL.createObjectURL(image);
            objectUrls.push(url); restored[visual] = url;
          }
        } catch { /* the original photo remains available as a fallback */ }
      }
      if (!cancelled) setCharacterUrls(restored);
    };
    void restore();
    return () => { cancelled = true; objectUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [game.visualRevision, game.aiCharacter, game.characterVariants]);
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
    if (!game.onboarded || game.awayMinutes < 15) return;
    setEventText(absenceMessage(game.name, game.awayMinutes));
    setOverlay("event");
    setGame((current) => ({ ...current, awayMinutes: 0 }));
  }, [game.awayMinutes, game.onboarded]);
  useEffect(() => {
    if (!game.onboarded || !game.notificationsEnabled || !("Notification" in window) || Notification.permission !== "granted") return;
    let gentle = 0;
    let urgent = 0;
    const notify = (body: string) => {
      if (document.visibilityState === "hidden") new Notification(`${game.name} מחכה לך`, { body, icon: "/assets/companion/app-icon-v4.png", tag: "companion-care" });
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
    const timer = window.setInterval(() => setWanderX(Math.round((Math.random() - .5) * 110)), 2800);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!starGame.active) return;
    const tick = window.setInterval(() => setStarGame((current) => current.time <= 1 ? { ...current, active: false, time: 0 } : { ...current, time: current.time - 1 }), 1000);
    const drop = window.setInterval(() => setStarGame((current) => current.active ? { ...current, target: Math.floor(Math.random() * 3), targetId: current.targetId + 1 } : current), 900);
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
  const currentCharacterUrl = characterUrls[game.theme] ?? characterUrls.master ?? game.photo;
  const currentRoomUrl = roomUrls[game.theme];
  const decorSet = decorSetKey(game.decorations);
  const ownedDecorCount = decorSet ? decorSet.split(",").length : 0;
  const bakedRoomSet = game.aiRooms[game.theme];
  const bakedDecor = currentRoomUrl ? (bakedRoomSet ?? "").split(",") : [];
  const roomBakeStatus = !decorSet ? "אין עדיין קישוטים" : bakedRoomSet === undefined ? "טרם נוצר" : bakedRoomSet === decorSet ? "מעודכן" : "יש קישוטים חדשים לשילוב";
  const hour = new Date().getHours();
  const isNight = hour < 7 || hour >= 20;

  const say = (text: string) => { setReaction(text); setReactionId((id) => id + 1); };
  const showEffect = (kind: EffectKind) => { setEffect({ id: Date.now(), kind }); window.setTimeout(() => setEffect(null), 1300); };
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
      setEventText("המכשיר לא פתח ערוץ להתראות מערכת. החזרה למשחק עדיין תציג בדיוק מה קרה בזמן שלא היית.");
      setOverlay("event");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setGame((current) => ({ ...current, notificationsEnabled: true }));
      new Notification("ההתראות פעילות", { body: `${game.name} יקרא לך רק כשבאמת צריך.`, tag: "companion-ready" });
    } else {
      setEventText("Android לא אישר התראות. אפשר לנסות שוב מהגדרות האפליקציה במכשיר.");
      setOverlay("event");
    }
  };

  const performAction = (action: ActionKey) => {
    const next = performCareAction(game, action);
    setGame(next);
    const foundCoins = next.coins - game.coins >= 12;
    if (foundCoins) window.setTimeout(() => { setEventText(`${game.name} מצא 12 מטבעות מתחת לשטיח. לא שואלים שאלות.`); setOverlay("event"); showEffect("coin"); }, 400);
    const kind = game.characterKind || "person";
    const lines = [...sharedReactions[action], ...kindReactions[kind][action], ...personalityReactions[personality][action]];
    say(lines[Math.floor(Math.random() * lines.length)]); showEffect(actionsMeta[action].effect);
    const nextMotion = action === "sleep" && game.sleeping ? "idle" : actionMotion[action];
    playMotion(nextMotion, 2600, nextMotion === "sleep");
    if (!foundCoins && next.actions % 9 === 0) window.setTimeout(() => {
      const reports = [
        `${game.name} פתח ועדת חקירה. המסקנה: צריך עוד חטיף.`,
        `דיווח מהחדר: הכול בשליטה, חוץ ממה שלא.`,
        `${game.name} ניסה להיות רציני במשך שבע שניות. כמעט הצליח.`,
      ];
      setEventText(reports[next.actions % reports.length]); setOverlay("event");
    }, 520);
    if (aiStatus === "ready" && ai.autoEvents && next.actions % 4 === 0) window.setTimeout(() => void askAi("ספר על מה שקרה אחרי פעולת הטיפול האחרונה"), 650);
  };

  const useItem = (key: ItemKey) => {
    if (game.inventory[key] < 1) return;
    setGame((current) => useInventoryItem(current, key));
    const itemLines: Record<ItemKey, string> = { apple: "תפוח. קלאסי, פריך, ללא עלילה מיותרת.", meal: "ארוחה מושקעת. הצלחת מבקשת קרדיט.", soap: "סבון עננים: מאה אחוז ניקיון, אפס אחוז ראיות.", medicine: "התרופה עבדה. הדרמה תישאר למטרות אמנותיות.", ball: "כדור קופצני. גם הקירות משתתפים." };
    say(itemLines[key]); showEffect(key === "medicine" ? "medicine" : key === "soap" ? "bubble" : key === "ball" ? "heart" : "food");
    playMotion(key === "ball" ? "play" : key === "medicine" || key === "soap" ? "celebrate" : "eat");
  };

  const buyItem = (key: ItemKey) => {
    if (game.coins < items[key].price) { say("חסרים לנו מטבעות. הארקייד קורא לנו."); return; }
    setGame((current) => ({ ...current, coins: current.coins - items[key].price, inventory: { ...current.inventory, [key]: current.inventory[key] + 1 } }));
    showEffect("coin");
  };

  const buyDecor = (key: DecorKey) => {
    if (buyDecoration(game, key).coins === game.coins) {
      say(game.decorations[key] ? "כבר יש לנו את זה בבית. בדקתי פעמיים." : "חסרים לנו מטבעות. הארקייד קורא לנו.");
      return;
    }
    setGame((current) => buyDecoration(current, key));
    showEffect("coin"); say(decorLines[key]);
  };

  const claimMilestone = (days: number) => {
    const reward = claimStreakMilestone(game, days).coins - game.coins;
    if (!reward) return;
    setGame((current) => claimStreakMilestone(current, days));
    showEffect("coin"); say(`${days} ימים ברצף ו־${reward} מטבעות. אני מתחיל לחשוד שזו אהבה.`);
  };

  const claimQuest = (id: string, reward: number, complete: boolean) => {
    if (!complete || game.claimed.includes(id)) return;
    setGame((current) => ({ ...current, coins: current.coins + reward, xp: current.xp + reward, claimed: [...current.claimed, id] }));
    showEffect("coin"); say(`משימה הושלמה! קיבלנו ${reward} מטבעות.`);
  };

  const finishStarGame = (score: number) => {
    const reward = Math.max(5, score * 3);
    setGame((current) => { const mood = clamp(current.mood + 12); return { ...current, coins: current.coins + reward, xp: current.xp + score * 3, mood, questGame: 1, questHappy: mood >= 85 ? 1 : current.questHappy, personality: { ...current.personality, curious: current.personality.curious + 2 } }; });
    setEventText(`תפסנו ${score} כוכבים וקיבלנו ${reward} מטבעות.`); setOverlay("event"); showEffect("coin");
  };

  const catchLane = (lane: number) => setStarGame((current) => {
    if (!current.active) return current;
    const hit = lane === current.target;
    if (hit) showEffect("coin");
    return { ...current, lane, score: Math.max(0, current.score + (hit ? 1 : -1)), target: Math.floor(Math.random() * 3), targetId: current.targetId + 1 };
  });

  const rollGuessRound = () => {
    const secret: "left" | "right" = Math.random() > .5 ? "left" : "right";
    const opposite: "left" | "right" = secret === "left" ? "right" : "left";
    return { secret, hint: Math.random() < .7 ? secret : opposite };
  };
  const startGuess = () => setGuessGame({ active: true, round: 0, score: 0, answer: null, reveal: `לאן ${game.name} יקפוץ?`, ...rollGuessRound() });
  const makeGuess = (choice: "left" | "right") => {
    if (!guessGame.active || guessGame.answer) return;
    const answer = guessGame.secret;
    const hit = answer === choice;
    const nextRound = guessGame.round + 1;
    const nextScore = guessGame.score + (hit ? 1 : 0);
    setGuessGame((current) => ({ ...current, active: nextRound < 5, round: nextRound, score: nextScore, answer, reveal: hit ? "בול!" : "כמעט!" }));
    window.setTimeout(() => {
      if (nextRound >= 5) {
        const reward = 10 + nextScore * 5;
        setGame((current) => { const mood = clamp(current.mood + 10); return { ...current, coins: current.coins + reward, xp: current.xp + nextScore * 5, questGame: 1, mood, questHappy: mood >= 85 ? 1 : current.questHappy, personality: { ...current.personality, comic: current.personality.comic + 2 } }; });
        setEventText(`${nextScore} מתוך 5! הרווחנו ${reward} מטבעות.`); setOverlay("event");
      } else setGuessGame((current) => ({ ...current, answer: null, reveal: "הסיבוב הבא…", ...rollGuessRound() }));
    }, 700);
  };

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const compressed = await compressImage(String(reader.result));
      const oldKeys = [
        ...(Object.keys(game.animationSlots) as CompanionMotion[]).map((motion) => animationStorageKey(game.visualRevision, motion)),
        ...characterVisuals.map((visual) => characterStorageKey(game.visualRevision, visual)),
      ];
      void removeMedia(oldKeys);
      setGame((current) => ({ ...current, photo: compressed, sourcePhoto: compressed, visualRevision: current.visualRevision + 1, animationSlots: {}, aiCharacter: false, characterVariants: {} }));
      setClipUrls({}); setCharacterUrls({}); setActiveMotion("idle");
      say("התמונה נכנסה. היא כבר השתלטה על התאורה.");
    };
    reader.readAsDataURL(file);
  };

  const mockAi = import.meta.env.DEV && new URLSearchParams(location.search).get("mockAi") === "1";
  const aiFetch = async (url: string, init?: RequestInit) => {
    if (!mockAi) return fetch(url, init);
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (url.includes("images/models")) return new Response(JSON.stringify({ data: [{ id: "openai/gpt-image-2", name: "GPT Image 2", architecture: { input_modalities: ["text", "image"], output_modalities: ["image"] } }] }), { status: 200 });
    if (url.includes("output_modalities=speech")) return new Response(JSON.stringify({ data: [{ id: "openai/gpt-4o-mini-tts-2025-12-15", name: "GPT-4o mini TTS", architecture: { output_modalities: ["speech"] } }] }), { status: 200 });
    if (url.includes("videos/models")) return new Response(JSON.stringify({ data: [{ id: "minimax/hailuo-3", name: "MiniMax H3", supported_frame_images: ["first_frame"], supported_aspect_ratios: ["1:1", "9:16"], supported_resolutions: ["2K"], supported_durations: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] }] }), { status: 200 });
    if (url.endsWith("/models")) return new Response(JSON.stringify({ data: [{ id: "gpt-5.6-luna" }, { id: "gpt-5.6-terra" }, { id: "gpt-image-2" }] }), { status: 200 });
    if (url.endsWith("/images") || url.endsWith("/images/edits")) return new Response(JSON.stringify({ data: [{ b64_json: game.photo?.split(",")[1] || "", media_type: "image/webp" }] }), { status: 200 });
    if (url.endsWith("/responses")) return new Response(JSON.stringify({ output_text: JSON.stringify({ dialogue: "חלמתי שהקערה שלי זכתה בתחרות ריקודים.", emotion: "happy", animation: "bounce", memory: "חלום על קערה רוקדת", bonus: 2 }) }), { status: 200 });
    if (url.includes("/videos")) return new Response(JSON.stringify({ id: "mock-video", status: "completed", unsigned_urls: [] }), { status: 200 });
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ dialogue: "יש לי תחושה שהיום יקרה משהו מצחיק ליד הקערה.", emotion: "curious", animation: "glow", memory: "תחושה ליד הקערה", bonus: 2 }) } }] }), { status: 200 });
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
    setAiStatus("idle"); setAiError("");
  };

  const testAi = async () => {
    if (!providerKey() && !mockAi) { setAiError(`צריך מפתח ${mediaProviderMeta[ai.provider as MediaProvider].title} כדי לבדוק את החיבור.`); setAiStatus("error"); return; }
    setAiStatus("testing"); setAiError("");
    try {
      if (mockAi) {
        // A connection test never spends provider credits in preview mode.
      } else if (ai.provider === "kie") {
        const response = await fetch("https://api.kie.ai/api/v1/chat/credit", { headers: headersFor("kie", false) });
        if (!response.ok || (await response.json()).code !== 200) throw new Error("מפתח KIE לא אושר");
      } else if (ai.provider === "fal") {
        if (ai.falKey.trim().length < 12) throw new Error("מפתח fal.ai נראה קצר מדי");
      } else {
        const response = await aiFetch(`${providerBase()}/models`, { headers: authHeaders(false) });
        if (!response.ok) throw new Error(`בדיקת החיבור נכשלה (${response.status})`);
        const data = await response.json();
        const allModels = (data.data ?? []) as ImageModel[];
        if (ai.provider === "openai" && !allModels.some((model) => model.id === ai.textModel)) {
        const preferredText = ["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.4-mini", "gpt-5-mini"].find((id) => allModels.some((model) => model.id === id));
        if (preferredText) setAi((current) => ({ ...current, textModel: preferredText }));
      }
      }
      setAiStatus("ready");
    } catch (error) { setAiStatus("error"); setAiError(error instanceof Error ? error.message : "החיבור נכשל"); }
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
    setImageModels([]); setMediaStatus("idle"); setAiError("");
  };

  const testMedia = async () => {
    if (!mediaKey() && !mockAi) { setAiError(`צריך מפתח ${mediaProviderMeta[ai.imageProvider].title} כדי להפעיל תמונות.`); setMediaStatus("error"); return; }
    setMediaStatus("testing"); setAiError("");
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
        setImageModels([{ id: ai.imageModel, name: ai.imageModel }]); setVideoModels([]);
      } else {
        const imagesResponse = await fetch(`${mediaBase()}/images/models`, { headers: mediaHeaders(false) });
        if (!imagesResponse.ok) throw new Error(`בדיקת OpenRouter נכשלה (${imagesResponse.status})`);
        const imageData = await imagesResponse.json();
        const capable = ((imageData.data ?? []) as ImageModel[]).filter((model) => model.architecture?.input_modalities?.includes("image") && model.architecture?.output_modalities?.includes("image"));
        setImageModels(capable.slice(0, 30));
        if (capable.length && !capable.some((model) => model.id === ai.imageModel)) setAi((current) => ({ ...current, imageModel: (capable.find((model) => model.id.includes("gpt-image-2")) ?? capable[0]).id }));
      }
      setMediaStatus("ready");
    } catch (error) { setMediaStatus("error"); setAiError(error instanceof Error ? error.message : "חיבור התמונה נכשל"); }
  };

  const validateProvider = async (provider: MediaProvider) => {
    if (!keyFor(provider) && !mockAi) throw new Error(`צריך מפתח ${mediaProviderMeta[provider].title}`);
    if (mockAi) return;
    if (provider === "kie") {
      const response = await fetch("https://api.kie.ai/api/v1/chat/credit", { headers: headersFor("kie", false) });
      if (!response.ok || (await response.json()).code !== 200) throw new Error("מפתח KIE לא אושר");
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
    setVoiceModels([]); setVoiceStatus("idle"); setAiError("");
  };
  const testVoice = async () => {
    setVoiceStatus("testing"); setAiError("");
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
    } catch (error) { setVoiceStatus("error"); setAiError(error instanceof Error ? error.message : "חיבור הקול נכשל"); }
  };

  const changeVideoProvider = (videoProvider: MediaProvider) => {
    setAi((current) => ({ ...current, videoProvider, videoModel: defaultCapabilityModels[videoProvider].video }));
    setVideoModels([]); setVideoStatus("idle"); setAiError("");
  };
  const testVideo = async () => {
    setVideoStatus("testing"); setAiError("");
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
    } catch (error) { setVideoStatus("error"); setAiError(error instanceof Error ? error.message : "חיבור הווידאו נכשל"); }
  };

  const speak = async (text = reaction) => {
    if (voiceStatus !== "ready") { setAiError("צריך להפעיל ספק קול לפני ההשמעה."); return; }
    setIsSpeaking(true); setAiError("");
    try {
      if (mockAi) return;
      let url = ""; let revoke = false;
      if (ai.voiceProvider === "kie") {
        url = await runKieTask({ model: ai.voiceModel, input: { text, voice: "Rachel", stability: .5, similarity_boost: .75, style: .15, speed: 1, timestamps: false, language_code: "he" } });
      } else if (ai.voiceProvider === "fal") {
        url = parseFalAudioUrl(await runFalRawTask(ai.voiceModel, { text, voice: "Rachel", stability: .5, similarity_boost: .75, style: .15, speed: 1, language_code: "he" }));
      } else {
        const base = ai.voiceProvider === "openai" ? "https://api.openai.com/v1" : "https://openrouter.ai/api/v1";
        const response = await fetch(`${base}/audio/speech`, { method: "POST", headers: headersFor(ai.voiceProvider), body: JSON.stringify({ model: ai.voiceModel, voice: "coral", input: text, response_format: "mp3", instructions: "Speak in warm, playful, natural Hebrew as a tiny virtual companion." }) });
        if (!response.ok) throw new Error(`יצירת הקול נכשלה (${response.status})`);
        url = URL.createObjectURL(await response.blob()); revoke = true;
      }
      const audio = new Audio(url);
      if (revoke) audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (error) { setAiError(error instanceof Error ? error.message : "יצירת הקול נכשלה"); }
    finally { setIsSpeaking(false); }
  };

  const askAi = async (message = "צור אירוע קצר שמתאים למצב הנוכחי") => {
    if (aiStatus !== "ready") { setAiError("צריך לבצע בדיקת חיבור קודם."); return; }
    setIsThinking(true); setAiError("");
    try {
      const context = `Name: ${game.name}; subject type: ${game.characterKind || "person"}; day: ${day}; stage: ${stage}; health: ${health}; needs: ${JSON.stringify(needs)}; personality: ${personality}; memories: ${game.memories.slice(-4).join(" | ") || "none"}. User says: ${message}`;
      const instruction = "You are the comedy writer and caring game director of a modern Tamagotchi. Return JSON only with one natural Hebrew line (max 18 words), emotion: happy|curious|sleepy|worried, animation: bounce|spin|glow|nap, memory (short Hebrew), and bonus integer 0-5. Be witty, specific to the current need and subject type, and warm. Use one small comic twist; never use canned jokes, shame, fear, sarcasm toward a child, or anything unsafe.";
      let raw = "";
      if (mockAi) {
        raw = JSON.stringify({ dialogue: "מצאתי ענן שנראה כמו חטיף. ערכתי בדיקת איכות.", emotion: "happy", animation: "bounce", memory: "ענן בצורת חטיף", bonus: 2 });
      } else if (ai.provider === "kie") {
        const response = await fetch("https://api.kie.ai/codex/v1/responses", { method: "POST", headers: headersFor("kie"), body: JSON.stringify({ model: ai.textModel, instructions: instruction, input: context, reasoning: { effort: "low" }, max_output_tokens: 220 }) });
        if (!response.ok) throw new Error(`יצירת האירוע ב־KIE נכשלה (${response.status})`);
        raw = extractAiResponseText("openai", await response.json());
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
    } catch (error) { setAiError(error instanceof Error ? error.message : "יצירת האירוע נכשלה"); }
    finally { setIsThinking(false); }
  };

  const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, mockAi ? 80 : milliseconds));

  const uploadToKie = async (dataUrl: string, index = 0) => {
    const response = await fetch("https://kieai.redpandaai.co/api/file-base64-upload", {
      method: "POST", headers: headersFor("kie"),
      body: JSON.stringify({ base64Data: dataUrl, uploadPath: "images/companion", fileName: `companion-${Date.now()}-${index}.webp` }),
    });
    if (!response.ok) throw new Error(`העלאת תמונה ל־KIE נכשלה (${response.status})`);
    const data = await response.json();
    const url = data?.data?.downloadUrl || data?.data?.fileUrl;
    if (!url) throw new Error(data?.msg || "KIE לא החזיר כתובת לתמונה");
    return String(url);
  };

  const runKieTask = async (body: unknown) => {
    const response = await fetch("https://api.kie.ai/api/v1/jobs/createTask", { method: "POST", headers: headersFor("kie"), body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`יצירת משימת KIE נכשלה (${response.status})`);
    const taskId = parseKieTaskId(await response.json());
    for (let attempt = 0; attempt < 75; attempt += 1) {
      await wait(Math.min(12_000, 2_500 + attempt * 350));
      const poll = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { headers: headersFor("kie", false) });
      if (!poll.ok) throw new Error(`בדיקת משימת KIE נכשלה (${poll.status})`);
      const task = parseKieTask(await poll.json());
      if (task.state === "success") {
        if (!task.url) throw new Error("משימת KIE הסתיימה בלי קובץ");
        return task.url;
      }
      if (task.state === "fail") throw new Error(task.error || "משימת KIE נכשלה");
    }
    throw new Error("משימת KIE לא הושלמה בזמן");
  };

  const runFalRawTask = async (model: string, body: unknown) => {
    const response = await fetch(`https://queue.fal.run/${model.replace(/^\/+/, "")}`, { method: "POST", headers: headersFor("fal"), body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`יצירת משימת fal.ai נכשלה (${response.status})`);
    const submission = parseFalSubmission(await response.json());
    for (let attempt = 0; attempt < 90; attempt += 1) {
      await wait(Math.min(10_000, 2_000 + attempt * 250));
      const statusResponse = await fetch(submission.statusUrl, { headers: headersFor("fal", false) });
      if (!statusResponse.ok) throw new Error(`בדיקת משימת fal.ai נכשלה (${statusResponse.status})`);
      const status = await statusResponse.json();
      if (status.status === "FAILED" || status.status === "ERROR" || (status.status !== "COMPLETED" && status.error)) throw new Error((typeof status.error === "string" ? status.error : status.error?.message) || "משימת fal.ai נכשלה");
      if (status.status === "COMPLETED") {
        if (status.error) throw new Error(status.error);
        const resultResponse = await fetch(submission.responseUrl, { headers: headersFor("fal", false) });
        if (!resultResponse.ok) throw new Error(`קבלת תוצאת fal.ai נכשלה (${resultResponse.status})`);
        return resultResponse.json();
      }
    }
    throw new Error("משימת fal.ai לא הושלמה בזמן");
  };

  const runFalTask = async (model: string, body: unknown) => parseFalMediaUrl(await runFalRawTask(model, body));

  const downloadMedia = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`הורדת המדיה נכשלה (${response.status})`);
    return response.blob();
  };

  const requestStyledImage = async (references: string[], prompt: string, opts: { transparent?: boolean; openRouterBody?: unknown } = {}) => {
    const transparent = opts.transparent ?? true;
    if (mockAi) return fetch(references[0]).then((result) => result.blob());
    let response: Response;
    if (ai.imageProvider === "kie") {
      const uploaded = await Promise.all(references.map((reference, index) => uploadToKie(reference, index)));
      return downloadMedia(await runKieTask(buildKieImageTask(ai.imageModel, prompt, uploaded)));
    }
    if (ai.imageProvider === "fal") {
      return downloadMedia(await runFalTask(ai.imageModel, buildFalImageTask(prompt, references)));
    }
    if (ai.imageProvider === "openai") {
      const form = new FormData();
      form.append("model", ai.imageModel);
      for (let index = 0; index < references.length; index += 1) {
        const blob = await fetch(references[index]).then((result) => result.blob());
        form.append(references.length > 1 ? "image[]" : "image", blob, `reference-${index + 1}.webp`);
      }
      form.append("prompt", prompt);
      form.append("size", "1024x1024"); form.append("quality", "medium"); form.append("output_format", "webp");
      if (transparent) form.append("background", "transparent");
      response = await fetch(`${mediaBase()}/images/edits`, { method: "POST", headers: mediaHeaders(false), body: form });
    } else {
      const body = opts.openRouterBody ?? { model: ai.imageModel, prompt, input_references: references.map((url) => ({ type: "image_url", image_url: { url } })), n: 1, aspect_ratio: "1:1", quality: "medium", output_format: "webp" };
      response = await fetch(`${mediaBase()}/images`, { method: "POST", headers: mediaHeaders(), body: JSON.stringify(body) });
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

  const requestCharacterImage = (references: string[], visual: CharacterVisual) => requestStyledImage(
    references,
    buildCharacterPrompt(game.characterKind, game.name, visual),
    { openRouterBody: buildOpenRouterCharacterRequest({ model: ai.imageModel, references, kind: game.characterKind, name: game.name, visual }) },
  );

  const stylizePhoto = async (fullSet = false) => {
    const sourcePhoto = game.sourcePhoto || game.photo;
    if (!sourcePhoto) { setAiError("קודם צריך לבחור תמונה."); return; }
    if (!ai.imageConsent) { setAiError("צריך לאשר במפורש את שליחת התמונה לספק ה־AI."); return; }
    if (mediaStatus !== "ready") { setAiError("צריך להפעיל קודם את ספק התמונה."); return; }
    if (!imageModels.length) { setAiError("החיבור תקין, אבל אין כרגע מודל תמונה תואם בחשבון או אצל הספק שנבחר."); return; }
    setIsStyling(true); setAiError("");
    try {
      const oldKeys = (Object.keys(game.animationSlots) as CompanionMotion[]).map((motion) => animationStorageKey(game.visualRevision, motion));
      void removeClips(oldKeys);
      let master: Blob | null = null;
      if (fullSet && game.aiCharacter) master = await loadMedia(characterStorageKey(game.visualRevision, "master"));
      if (!master) {
        setCharacterProgress(fullSet ? "1 מתוך 4 · יוצרים דמות מאסטר" : "יוצרים דמות מאסטר");
        master = await requestCharacterImage([sourcePhoto], "master");
        await saveMedia(characterStorageKey(game.visualRevision, "master"), master);
        await removeMedia(["sunrise", "midnight", "classic"].map((theme) => characterStorageKey(game.visualRevision, theme as ThemeId)));
        setGame((current) => ({ ...current, aiCharacter: true, characterVariants: {}, animationSlots: {} }));
      }
      setClipUrls({});
      if (fullSet) {
        const masterReference = await blobToDataUrl(master);
        const variants: ThemeId[] = ["sunrise", "midnight", "classic"];
        for (let index = 0; index < variants.length; index += 1) {
          const theme = variants[index];
          setCharacterProgress(`${index + 2} מתוך 4 · מתאימים לחדר ${themes.find((item) => item.id === theme)?.title}`);
          const roomReference = await urlToDataUrl(themes.find((item) => item.id === theme)!.image);
          const variant = await requestCharacterImage([masterReference, roomReference], theme);
          await saveMedia(characterStorageKey(game.visualRevision, theme), variant);
          setGame((current) => ({ ...current, aiCharacter: true, characterVariants: { ...current.characterVariants, [theme]: true } }));
        }
        say("שלושה חדרים, אותה דמות. סוף־סוף מחלקת התאורה עשתה משהו.");
      } else say("זאת דמות המאסטר. אותה זהות, הרבה פחות תמונת פספורט.");
      showEffect("heart");
    } catch (error) { setAiError(error instanceof Error ? error.message : "יצירת הדמות נכשלה"); }
    finally { setIsStyling(false); setCharacterProgress(""); }
  };

  const generateRoomUpgrade = async () => {
    const set = decorSetKey(game.decorations);
    if (!set) { setAiError("עדיין אין קישוטים בבית. קונים בתיק ואז חוזרים לכאן."); return; }
    if (mediaStatus !== "ready") { setAiError("צריך להפעיל קודם את ספק התמונה."); return; }
    if (!imageModels.length) { setAiError("החיבור תקין, אבל אין כרגע מודל תמונה תואם בחשבון או אצל הספק שנבחר."); return; }
    if (!ai.imageConsent) { setAiError("צריך לאשר את שליחת התמונות לספק לפני שמשדרגים את החדר."); return; }
    if (game.aiRooms[game.theme] === set) { say("החדר כבר מעודכן — כל קישוט במקום שלו. בדקתי פעמיים ואפילו זזתי בשביל זה."); return; }
    setIsDecorating(true); setAiError("");
    try {
      const theme = game.theme;
      const previous = game.aiRooms[theme];
      const reference = await urlToDataUrl(themes.find((item) => item.id === theme)!.image);
      const owned = (Object.keys(decorMeta) as DecorKey[]).filter((key) => game.decorations[key]);
      const room = await requestStyledImage([reference], buildRoomUpgradePrompt(theme, owned), { transparent: false });
      await saveMedia(roomStorageKey(theme, set), room);
      if (previous !== undefined && previous !== set) void removeMedia([roomStorageKey(theme, previous)]);
      setGame((current) => ({ ...current, aiRooms: { ...current.aiRooms, [theme]: set }, memories: [...current.memories, `החדר שופץ עם ${owned.length} קישוטים`].slice(-12) }));
      say("סידרתי הכול בחדר, כולל הפינות שאף אחד לא מסתכל עליהן. אפשר להזמין אורחים.");
      showEffect("heart");
    } catch (error) { setAiError(error instanceof Error ? error.message : "שילוב הקישוטים בחדר נכשל"); }
    finally { setIsDecorating(false); }
  };

  const requestVideo = async (referenceDataUrl: string, prompt: string, duration = 5) => {
    if (mockAi) return null;
    if (ai.videoProvider === "kie") {
      const frameUrl = await uploadToKie(referenceDataUrl);
      return downloadMedia(await runKieTask(buildKieVideoTask(ai.videoModel, prompt, frameUrl, duration)));
    }
    if (ai.videoProvider === "fal") return downloadMedia(await runFalTask(ai.videoModel, buildFalVideoTask(prompt, referenceDataUrl)));
    if (ai.videoProvider === "openai") {
      const create = await fetch("https://api.openai.com/v1/videos", { method: "POST", headers: headersFor("openai"), body: JSON.stringify({ model: ai.videoModel, prompt, input_reference: { image_url: referenceDataUrl }, seconds: duration <= 4 ? 4 : 8, size: "1280x720" }) });
      if (!create.ok) throw new Error(`יצירת וידאו ב־OpenAI נכשלה (${create.status})`);
      let job = await create.json();
      for (let attempt = 0; attempt < 60 && !["completed", "failed"].includes(job.status); attempt += 1) {
        await wait(7_000);
        const poll = await fetch(`https://api.openai.com/v1/videos/${job.id}`, { headers: headersFor("openai", false) });
        if (!poll.ok) throw new Error(`בדיקת וידאו ב־OpenAI נכשלה (${poll.status})`);
        job = await poll.json();
      }
      if (job.status !== "completed") throw new Error(job.error?.message || "וידאו OpenAI לא הושלם בזמן");
      const content = await fetch(`https://api.openai.com/v1/videos/${job.id}/content`, { headers: headersFor("openai", false) });
      if (!content.ok) throw new Error(`הורדת וידאו OpenAI נכשלה (${content.status})`);
      return content.blob();
    }
    const videoCapabilities = videoModels.find((model) => model.id === ai.videoModel);
    const request = {
      model: ai.videoModel, prompt, duration,
      aspect_ratio: "1:1",
      resolution: videoCapabilities?.supported_resolutions?.[0] || (ai.videoModel === "minimax/hailuo-3" ? "2K" : "720p"),
      generate_audio: false,
      frame_images: [{ type: "image_url", image_url: { url: referenceDataUrl }, frame_type: "first_frame" }],
    };
    const videoBase = "https://openrouter.ai/api/v1";
    const response = await fetch(`${videoBase}/videos`, { method: "POST", headers: headersFor("openrouter"), body: JSON.stringify(request) });
    if (!response.ok) throw new Error(`יצירת הווידאו נכשלה (${response.status}) ${(await response.text()).slice(0, 100)}`);
    let job = await response.json();
    for (let attempt = 0; attempt < 60 && !["completed", "failed", "cancelled", "expired"].includes(job.status); attempt += 1) {
      await wait(7_000);
      const pollUrl = job.polling_url?.startsWith("http") ? job.polling_url : `${videoBase}/videos/${job.id}`;
      const poll = await fetch(pollUrl, { headers: headersFor("openrouter", false) });
      if (!poll.ok) throw new Error(`בדיקת הווידאו נכשלה (${poll.status})`);
      job = await poll.json();
    }
    if (job.status !== "completed") throw new Error(job.error || "יצירת הווידאו לא הושלמה בזמן");
    const contentUrl = job.unsigned_urls?.[0] || job.content_url || job.video_url || `${videoBase}/videos/${job.id}/content`;
    const content = await fetch(contentUrl, contentUrl.startsWith(videoBase) ? { headers: headersFor("openrouter", false) } : undefined);
    if (!content.ok) throw new Error(`הורדת הווידאו נכשלה (${content.status})`);
    return content.blob();
  };

  const generateCharacterAnimation = async (companionMotion: CompanionMotion) => {
    const animationVisual = characterUrls.master ?? currentCharacterUrl;
    if (!animationVisual) { setAiError("צריך קודם לבחור או ליצור דמות."); return; }
    if (!ai.imageConsent) { setAiError("צריך לאשר את שליחת התמונה לספק לפני יצירת אנימציה."); return; }
    if (videoStatus !== "ready" || !mediaHasVideo) { setAiError("צריך להפעיל ספק וידאו."); return; }
    setIsAnimating(companionMotion); setAiError("");
    try {
      const referenceDataUrl = await urlToDataUrl(animationVisual);
      const request = buildAnimationRequest({ model: ai.videoModel, photoDataUrl: referenceDataUrl, kind: game.characterKind, name: game.name, motion: companionMotion });
      const clip = await requestVideo(referenceDataUrl, request.prompt, motionMeta[companionMotion].duration);
      if (clip) {
        await saveClip(animationStorageKey(game.visualRevision, companionMotion), clip);
        const url = URL.createObjectURL(clip);
        setClipUrls((current) => { const previous = current[companionMotion]; if (previous) URL.revokeObjectURL(previous); return { ...current, [companionMotion]: url }; });
      }
      setGame((current) => ({ ...current, animationSlots: { ...current.animationSlots, [companionMotion]: true }, memories: [...current.memories, `נוצרה אנימציית ${motionMeta[companionMotion].title}`].slice(-12) }));
      playMotion(companionMotion, 5200); say(`${motionMeta[companionMotion].title} מוכנה. סוף־סוף יש לי כוריאוגרפיה.`); showEffect("heart");
    } catch (error) { setAiError(error instanceof Error ? error.message : "יצירת האנימציה נכשלה"); }
    finally { setIsAnimating(null); }
  };

  const generateDream = async () => {
    if (videoStatus !== "ready" || !mediaHasVideo) { setAiError("צריך להפעיל ספק וידאו."); return; }
    if (!ai.imageConsent) { setAiError("צריך לאשר את שליחת תמונת הדמות לפני יצירת חלום וידאו."); return; }
    const dreamVisual = characterUrls[game.theme] ?? characterUrls.master ?? currentCharacterUrl;
    if (!dreamVisual) { setAiError("צריך קודם לבחור או ליצור דמות."); return; }
    setIsDreaming(true); setVideoUrl(""); setAiError("");
    try {
      const referenceDataUrl = await urlToDataUrl(dreamVisual);
      const dreamPrompt = `A single-shot cinematic dream featuring the exact same ${game.characterKind || "person"} virtual companion ${game.name} from the reference image. Preserve identity, exact age, face, species, clothing, colors, proportions, and art style. The companion discovers a tiny floating door in a magical cozy room, peeks through, reacts with one warm comic surprise, and gently closes it. Family-friendly. Smooth motion. No identity drift, aging, species change, morphing, extra limbs, duplicate subject, dialogue, text, logo, UI, or watermark.`;
      const clip = await requestVideo(referenceDataUrl, dreamPrompt, 5);
      if (clip) setVideoUrl(URL.createObjectURL(clip));
      setGame((current) => ({ ...current, xp: current.xp + 10, memories: [...current.memories, "נוצר חלום וידאו"].slice(-12) }));
    } catch (error) { setAiError(error instanceof Error ? error.message : "יצירת החלום נכשלה"); }
    finally { setIsDreaming(false); }
  };

  const resetGame = () => {
    const keys = [
      ...(Object.keys(game.animationSlots) as CompanionMotion[]).map((motion) => animationStorageKey(game.visualRevision, motion)),
      ...characterVisuals.map((visual) => characterStorageKey(game.visualRevision, visual)),
      ...(Object.keys(game.aiRooms) as ThemeId[]).map((theme) => roomStorageKey(theme, game.aiRooms[theme] ?? "")),
    ];
    void removeMedia(keys);
    setClipUrls({}); setCharacterUrls({}); setRoomUrls({}); setActiveMotion("idle");
    setGame({ ...defaultState, onboarded: false, birthAt: Date.now(), lastSeen: Date.now(), visualRevision: Date.now() });
    setOverlay(null); setScreen("home");
  };

  return (
    <div className={`companion-app theme-${game.theme}`} dir="rtl">
      <MobileScroll key={screen} className="app-screen"><main className="game-page">
        {screen === "home" ? <HomeScreen game={game} characterUrl={currentCharacterUrl} health={health} stage={stage} evolution={evolution} day={day} needs={needs} lowestNeed={lowestNeed[0]} callNeed={callNeed} currentRoom={currentRoom} roomUrl={currentRoomUrl} bakedDecor={bakedDecor} reaction={reaction} reactionId={reactionId} wanderX={wanderX} effect={effect} isNight={isNight} aiReady={voiceStatus === "ready"} isSpeaking={isSpeaking} activeMotion={activeMotion} clipUrl={clipUrls[activeMotion] || clipUrls.idle} onSettings={() => setOverlay("settings")} onSpeak={() => void speak()} onAction={performAction} onUseMedicine={() => useItem("medicine")} /> : null}
        {screen === "arcade" ? <ArcadeScreen coins={game.coins} starGame={starGame} guessGame={guessGame} onStartStars={() => setStarGame({ active: true, time: 20, score: 0, lane: 1, target: 1, targetId: Date.now() })} onCatch={catchLane} onStartGuess={startGuess} onGuess={makeGuess} /> : null}
        {screen === "journey" ? <JourneyScreen game={game} stage={stage} evolution={evolution} day={day} personality={personality} careGrade={careGrade} onClaim={claimQuest} onClaimMilestone={claimMilestone} /> : null}
        {screen === "bag" ? <BagScreen game={game} onUse={useItem} onBuy={buyItem} onBuyDecor={buyDecor} /> : null}
      </main></MobileScroll>

      {game.onboarded ? <nav className="bottom-nav" aria-label="ניווט ראשי">
        {([{ id: "home", label: "בית", hint: "החדר והטיפול", icon: HomeIcon }, { id: "arcade", label: "משחקים", hint: "שמחה ומטבעות", icon: RocketIcon }, { id: "journey", label: "מטרות", hint: "התקדמות ופרסים", icon: SewingPinIcon }, { id: "bag", label: "תיק", hint: "פריטים והחנות", icon: BackpackIcon }] as const).map((item) => { const Icon = item.icon; return <button key={item.id} className={screen === item.id ? "active" : ""} aria-label={`${item.label} — ${item.hint}`} title={item.hint} onClick={() => setScreen(item.id)}><Icon /><span>{item.label}</span>{item.id === "journey" && game.questCare >= 3 && !game.claimed.includes("care") ? <i /> : null}</button>; })}
      </nav> : null}
      <input ref={fileRef} className="file-input" type="file" accept="image/*" onChange={handlePhoto} />

      <AnimatePresence>
        {overlay === "settings" ? <FullPage title="הגדרות" subtitle="זהות, חדר ויכולות — הכול נשמר במכשיר" onBack={() => setOverlay(null)}><div className="form-stack">
          <label htmlFor="friend-name">שם הדמות</label><KeyboardInput id="friend-name" className="text-field" value={game.name} onChange={(event) => setGame((current) => ({ ...current, name: event.target.value.slice(0, 18) }))} />
          <div className="section-title">מי הדמות?</div><div className="compact-kind-row">{(Object.entries(kindLabels) as Array<[Exclude<CharacterKind, "">, (typeof kindLabels)[Exclude<CharacterKind, "">]]>).map(([kind, meta]) => { const Icon = meta.icon; return <button key={kind} className={game.characterKind === kind ? "selected" : ""} onClick={() => setGame((current) => ({ ...current, characterKind: kind }))}><Icon /><span>{meta.title}</span></button>; })}</div>
          <div className="section-title">סגנון החדר</div><Carousel ariaLabel="בחירת סגנון" className="theme-carousel" contentClassName="theme-track">{themes.map((theme) => <button className={`theme-card ${game.theme === theme.id ? "selected" : ""}`} key={theme.id} onClick={() => setGame((current) => ({ ...current, theme: theme.id }))}><img src={theme.image} alt="" draggable={false} /><span><strong>{theme.title}</strong><small>{theme.note}</small></span>{game.theme === theme.id ? <i><CheckIcon /></i> : null}</button>)}</Carousel>
          <button className="wide-button" onClick={() => fileRef.current?.click()}><CameraIcon />החלפת תמונת הדמות</button>
          <button className="wide-button" onClick={() => void toggleNotifications()}><BellIcon />{game.notificationsEnabled ? "התראות פעילות" : "הפעלת התראות טיפול"}</button>
          <div className="small-note">תזכורות המערכת תלויות במכשיר שמשאיר את האפליקציה חיה ברקע, ואנדרואיד אוהב לכבות דברים בשקט — אז לפעמים הן פשוט לא יגיעו. בלי קשר: בכל חזרה למשחק מחכה סיכום מלא של מה שקרה בזמן שלא הייתם.</div>
          <button className="wide-button" onClick={() => setOverlay("guide")}><InfoCircledIcon />איך המשחק עובד</button>
          <button className="wide-button accent" onClick={() => { mobileKeyboard.hide(); setOverlay("ai"); }}><MagicWandIcon />AI ואנימציות</button><button className="wide-button danger" onClick={resetGame}><TrashIcon />יצירת דמות חדשה</button>
        </div></FullPage> : null}
        {overlay === "guide" ? <FullPage title="איך משחקים" subtitle="לולאה אחת פשוטה; כל מסך עושה דבר אחד" onBack={() => { setGame((current) => ({ ...current, guideSeen: true })); setOverlay(null); }}><div className="game-guide">
          <div className="guide-loop"><strong>מטפלים</strong><ChevronLeftIcon /><strong>משחקים</strong><ChevronLeftIcon /><strong>מתקדמים</strong><ChevronLeftIcon /><strong>משתמשים</strong></div>
          <article><HomeIcon /><div><strong>טיפול</strong><span>זה הבית. רואים את הדמות ומטפלים רק במה שצריך עכשיו.</span></div></article>
          <article><RocketIcon /><div><strong>משחקים</strong><span>מעלים שמחה ומרוויחים מטבעות.</span></div></article>
          <article><SewingPinIcon /><div><strong>התקדמות</strong><span>עוקבים אחר ימים, ניסיון, שלבים ומשימות.</span></div></article>
          <article><BackpackIcon /><div><strong>פריטים</strong><span>קונים ומשתמשים באוכל, צעצועים וטיפול.</span></div></article>
          <div className="time-explainer"><ClockIcon /><span><strong>גם כשסוגרים את המשחק הזמן ממשיך.</strong> המדדים ודירוג הטיפול יורדים בהדרגה, אבל הדמות לא מתה ותמיד אפשר להתאושש.</span></div>
        </div></FullPage> : null}
        {overlay === "ai" ? <FullPage title="AI" subtitle="בוחרים ספק ומודל נפרד לכל יכולת" onBack={() => setOverlay(null)}><div className="form-stack ai-panel">
          <div className="ai-step-title"><span>1</span><div><strong>המוח של הדמות</strong><small>טקסט, הומור, זיכרונות וקול.</small></div></div>
          <div className="media-provider-grid" role="group" aria-label="בחירת ספק שפה">{(Object.entries(mediaProviderMeta) as Array<[MediaProvider,(typeof mediaProviderMeta)[MediaProvider]]>).map(([provider, meta]) => <button key={provider} className={ai.provider === provider ? "active" : ""} onClick={() => changeProvider(provider)}><span>{meta.short}</span><strong>{meta.title}</strong><small>שפה</small></button>)}</div>
          <div className={`connection-card ${aiStatus}`}><div className={`or-logo ${ai.provider}`}>{mediaProviderMeta[ai.provider as MediaProvider].short}</div><div><strong>{mediaProviderMeta[ai.provider as MediaProvider].title}</strong><span>{aiStatus === "ready" ? "מסלול השפה מוכן" : aiStatus === "testing" ? "בודק חיבור…" : "מפתח אישי · נשמר עד סגירת האפליקציה"}</span></div><i /></div>
          {ai.provider === "openai" ? <div className="subscription-note"><LockClosedIcon /><div><strong>נדרש OpenAI API key</strong><span>מנוי ChatGPT וה־API הם מוצרים נפרדים.</span></div></div> : null}
          <label htmlFor="api-key">מפתח {mediaProviderMeta[ai.provider as MediaProvider].title}</label>
          <KeyboardInput id="api-key" className="text-field ltr" type="password" placeholder="API key" value={keyFor(ai.provider as MediaProvider)} onChange={(event) => { const value = event.target.value; setAi((current) => ai.provider === "openai" ? ({ ...current, openAiKey: value }) : ai.provider === "openrouter" ? ({ ...current, openRouterKey: value }) : ai.provider === "kie" ? ({ ...current, kieKey: value }) : ({ ...current, falKey: value })); setAiStatus("idle"); }} />
          <button className="wide-button accent" disabled={aiStatus === "testing"} onClick={testAi}>{aiStatus === "testing" ? <ClockIcon /> : <LightningBoltIcon />}{aiStatus === "testing" ? "בודק…" : "בדיקת חיבור המוח"}</button>
          <div className="ai-step-title"><span>2</span><div><strong>ניתוב לפי יכולת</strong><small>כל פעולה יכולה להשתמש בספק אחר.</small></div></div>
          <article className="route-card"><div><SpeakerLoudIcon /><span><strong>קול</strong><small>טקסט לדיבור בעברית</small></span></div><div className="media-provider-grid compact">{(Object.entries(mediaProviderMeta) as Array<[MediaProvider,(typeof mediaProviderMeta)[MediaProvider]]>).map(([provider, meta]) => <button key={provider} className={ai.voiceProvider === provider ? "active" : ""} onClick={() => changeVoiceProvider(provider)}><span>{meta.short}</span><strong>{meta.title}</strong></button>)}</div><button className="mini-connect" disabled={voiceStatus === "testing"} onClick={testVoice}>{voiceStatus === "ready" ? <CheckIcon /> : <LightningBoltIcon />}{voiceStatus === "ready" ? "קול מוכן" : "בדיקת קול"}</button></article>
          <article className="route-card"><div><CameraIcon /><span><strong>תמונה</strong><small>דמות מאסטר וגרסאות חדר</small></span></div><div className="media-provider-grid compact">{(Object.entries(mediaProviderMeta) as Array<[MediaProvider,(typeof mediaProviderMeta)[MediaProvider]]>).map(([provider, meta]) => <button key={provider} className={ai.imageProvider === provider ? "active" : ""} onClick={() => changeMediaProvider(provider)}><span>{meta.short}</span><strong>{meta.title}</strong></button>)}</div><button className="mini-connect" disabled={mediaStatus === "testing"} onClick={testMedia}>{mediaStatus === "ready" ? <CheckIcon /> : <LightningBoltIcon />}{mediaStatus === "ready" ? "תמונה מוכנה" : "בדיקת תמונה"}</button></article>
          <article className="route-card"><div><PlayIcon /><span><strong>וידאו</strong><small>תמונה לווידאו עבור זהות עקבית</small></span></div><div className="media-provider-grid compact">{(Object.entries(mediaProviderMeta) as Array<[MediaProvider,(typeof mediaProviderMeta)[MediaProvider]]>).map(([provider, meta]) => <button key={provider} className={ai.videoProvider === provider ? "active" : ""} onClick={() => changeVideoProvider(provider)}><span>{meta.short}</span><strong>{meta.title}</strong></button>)}</div><button className="mini-connect" disabled={videoStatus === "testing"} onClick={testVideo}>{videoStatus === "ready" ? <CheckIcon /> : <LightningBoltIcon />}{videoStatus === "ready" ? "וידאו מוכן" : "בדיקת וידאו"}</button>{ai.videoProvider === "openai" ? <small className="legacy-warning">Sora 2 API מסומן כ־Legacy וצפוי להיסגר ב־24.9.2026; עדיף לבחור OpenRouter, KIE או fal.ai.</small> : null}</article>
          <details className="provider-keys"><summary>מפתחות לכל הספקים</summary><div>{(["openai","openrouter","kie","fal"] as MediaProvider[]).map((provider) => <label key={provider}><span>{mediaProviderMeta[provider].title}</span><KeyboardInput className="text-field ltr" type="password" placeholder="API key" value={keyFor(provider)} onChange={(event) => { const value = event.target.value; setAi((current) => provider === "openai" ? ({ ...current, openAiKey: value }) : provider === "openrouter" ? ({ ...current, openRouterKey: value }) : provider === "kie" ? ({ ...current, kieKey: value }) : ({ ...current, falKey: value })); setAiStatus("idle"); setVoiceStatus("idle"); setMediaStatus("idle"); setVideoStatus("idle"); }} /></label>)}</div></details>
          <div className="privacy-note"><LockClosedIcon />אין מפתח שמוטמע ב־APK. המפתח קיים רק בסשן הנוכחי; התמונות והסרטונים מורדים ונשמרים במכשיר.</div>
          <div className="ai-step-title"><span>3</span><div><strong>בוחרים מה להפעיל</strong><small>המוח והמדיה עצמאיים; אין צורך להפעיל הכול.</small></div></div>
          <article className="ai-feature-card"><div className="ai-section-title"><FaceIcon /><div><strong>אופי וקול</strong><span>בדיחות, זיכרונות וקול שמתאימים למצב הנוכחי.</span></div></div>
          <div className="ai-chat-row"><KeyboardInput aria-label="דבר עם הדמות" className="text-field" placeholder={`מה להגיד ל${game.name}?`} value={chatInput} onChange={(event) => setChatInput(event.target.value.slice(0, 160))} /><button aria-label="שליחה" disabled={aiStatus !== "ready" || isThinking} onClick={() => { mobileKeyboard.hide(); void askAi(chatInput || undefined); setChatInput(""); }}><PaperPlaneIcon /></button></div>
          <div className="ai-buttons"><button className="wide-button" disabled={aiStatus !== "ready" || isThinking} onClick={() => void askAi()}><MagicWandIcon />{isThinking ? "חושב…" : "הפתעה עכשיו"}</button><button className="wide-button" disabled={voiceStatus !== "ready" || isSpeaking} onClick={() => void speak()}><SpeakerLoudIcon />{isSpeaking ? "מדבר…" : "השמעת קול"}</button></div>
          <div className="toggle-pair"><label className="consent-row"><input type="checkbox" checked={ai.autoEvents} onChange={(event) => setAi((current) => ({ ...current, autoEvents: event.target.checked }))} /><span>הפתעות אוטומטיות</span></label><label className="consent-row"><input type="checkbox" checked={ai.autoVoice} onChange={(event) => setAi((current) => ({ ...current, autoVoice: event.target.checked }))} /><span>קול אוטומטי</span></label></div></article>
          <article className="ai-feature-card character-kit"><div className="ai-section-title"><CameraIcon /><div><strong>ערכת הדמות</strong><span>זהות אחת עקבית, מותאמת לכל חדר ולכל אנימציה.</span></div></div>
          <div className="character-pipeline"><span className={game.photo ? "done" : ""}>צילום</span><ChevronLeftIcon /><span className={game.aiCharacter ? "done" : ""}>מאסטר</span><ChevronLeftIcon /><span className={Object.keys(game.characterVariants).length === 3 ? "done" : ""}>3 חדרים</span></div>
          <div className="character-variant-grid">
            {([{ id: "master", title: "מאסטר", image: game.sourcePhoto || game.photo }, ...themes.map((theme) => ({ id: theme.id, title: theme.title, image: theme.image }))] as Array<{ id: CharacterVisual; title: string; image?: string }>).map((item) => {
              const ready = item.id === "master" ? game.aiCharacter : Boolean(game.characterVariants[item.id as ThemeId]);
              const preview = characterUrls[item.id] || (item.id !== "master" ? characterUrls.master : undefined) || item.image;
              return <div className={`character-variant ${ready ? "ready" : ""}`} key={item.id}><div style={item.id === "master" ? undefined : { backgroundImage: `url(${item.image})` }}>{preview ? <img src={preview} alt={`תצוגת ${item.title}`} draggable={false} /> : <FaceIcon />}{ready ? <i><CheckIcon /></i> : null}</div><strong>{item.title}</strong><small>{ready ? "מוכן" : item.id === "master" ? "זהות בסיס" : "טרם נוצר"}</small></div>;
            })}
          </div>
          {characterProgress ? <div className="generation-progress"><ClockIcon /><span>{characterProgress}</span></div> : null}
          <div className="character-create-actions"><button className="wide-button" disabled={mediaStatus !== "ready" || isStyling || !game.photo || !imageModels.length} onClick={() => void stylizePhoto(false)}><FaceIcon />{isStyling ? "יוצר…" : game.aiCharacter ? "יצירת מאסטר מחדש" : "יצירת דמות מאסטר"}</button><button className="wide-button accent" disabled={mediaStatus !== "ready" || isStyling || !game.photo || !imageModels.length} onClick={() => void stylizePhoto(true)}><MagicWandIcon />{isStyling ? "מכין ערכה…" : "התאמה לכל החדרים"}</button></div>
          <div className="small-note">מאסטר: בקשת תמונה אחת. ערכה מלאה: {game.aiCharacter ? "3" : "4"} בקשות בתשלום. התוצאות נשמרות רק במכשיר ומשמשות אוטומטית בחדר המתאים.</div>
          <label className="consent-row"><input type="checkbox" checked={ai.imageConsent} onChange={(event) => setAi((current) => ({ ...current, imageConsent: event.target.checked }))} /><span>אישור שליחת התמונה לספק התמונה ({mediaProviderMeta[ai.imageProvider].title}) או לספק הווידאו ({mediaProviderMeta[ai.videoProvider].title}) רק בזמן יצירה.</span></label></article>
          <article className="ai-feature-card compact-feature"><div className="ai-section-title"><HomeIcon /><div><strong>החדר עצמו</strong><span>לוקחים את הקישוטים שקניתם וצובעים אותם ישר לתוך ציור החדר, כל אחד במקום ההגיוני שלו.</span></div></div>
          <div className="room-bake-status"><span><HomeIcon />{currentRoom.title}</span><strong>{ownedDecorCount} קישוטים בבית</strong><em className={bakedRoomSet === decorSet && decorSet ? "ready" : ""}>{roomBakeStatus}</em></div>
          <button className="wide-button accent" disabled={!decorSet || mediaStatus !== "ready" || !imageModels.length || !ai.imageConsent || isDecorating} onClick={() => void generateRoomUpgrade()}><MagicWandIcon />{isDecorating ? "משלב…" : "לשלב את הקישוטים בחדר"}</button>
          <div className="small-note">{decorSet ? "בקשת תמונה אחת לכל חדר. התמונה שנוצרת נשמרת רק במכשיר ומחליפה את רקע החדר; קישוט שנקנה אחר כך ימשיך להופיע מעל החדר עד השילוב הבא." : "קונים קישוטים בתיק ⇦ ואז משלבים אותם כאן."}</div></article>
          <article className="ai-feature-card"><div className="ai-section-title"><PlayIcon /><div><strong>תנועה במשחק</strong><span>יוצרים לולאה אחת בכל פעם ושומרים אותה במכשיר.</span></div></div>
          {mediaHasVideo ? <><div className="motion-grid">{(Object.entries(motionMeta) as Array<[CompanionMotion,(typeof motionMeta)[CompanionMotion]]>).map(([motion, meta]) => <button key={motion} className={`${selectedMotion === motion ? "selected" : ""} ${game.animationSlots[motion] ? "ready" : ""}`} onClick={() => { setSelectedMotion(motion); if (clipUrls[motion]) playMotion(motion, 5200); }}><span>{game.animationSlots[motion] ? <CheckIcon /> : <PlayIcon />}</span><strong>{meta.title}</strong><small>{game.animationSlots[motion] ? "מוכן" : meta.note}</small></button>)}</div><button className="wide-button accent" disabled={videoStatus !== "ready" || !!isAnimating || !game.photo} onClick={() => void generateCharacterAnimation(selectedMotion)}><PlayIcon />{isAnimating ? `יוצר ${motionMeta[isAnimating].title}…` : game.animationSlots[selectedMotion] ? `יצירה מחדש: ${motionMeta[selectedMotion].title}` : `יצירת ${motionMeta[selectedMotion].title}`}</button><div className="small-note">היצירה עשויה לקחת כמה דקות ולצרוך קרדיטים אצל {mediaProviderMeta[ai.videoProvider].title}. אחר כך הקליפ נשמר מקומית.</div></> : null}</article>
          {mediaHasVideo ? <article className="ai-feature-card compact-feature"><div className="ai-section-title"><MoonIcon /><div><strong>חלום וידאו</strong><span>קטע חגיגי לצפייה, בנפרד מלולאות הטיפול.</span></div></div><button className="wide-button" disabled={videoStatus !== "ready" || isDreaming || !ai.videoModel} onClick={() => void generateDream()}><MoonIcon />{isDreaming ? "יוצר חלום…" : "יצירת חלום"}</button>{videoUrl ? <video className="dream-video" controls playsInline src={videoUrl} /> : null}</article> : null}
          <details className="advanced-ai"><summary>מודלים והגדרות מתקדמות</summary><div><label>מודל שפה · {mediaProviderMeta[ai.provider as MediaProvider].title}</label><KeyboardInput id="text-model" className="text-field ltr" value={ai.textModel} onChange={(event) => setAi((current) => ({ ...current, textModel: event.target.value }))} /><label>מודל קול · {mediaProviderMeta[ai.voiceProvider].title}</label>{voiceModels.length > 1 ? <select aria-label="מודל קול" className="text-field ltr" value={ai.voiceModel} onChange={(event) => setAi((current) => ({ ...current, voiceModel: event.target.value }))}>{voiceModels.map((model) => <option key={model.id} value={model.id}>{model.name || model.id}</option>)}</select> : <KeyboardInput aria-label="מודל קול" className="text-field ltr" value={ai.voiceModel} onChange={(event) => setAi((current) => ({ ...current, voiceModel: event.target.value }))} />}<label>מודל תמונה · {mediaProviderMeta[ai.imageProvider].title}</label>{imageModels.length > 1 ? <select aria-label="מודל תמונה" className="text-field ltr" value={ai.imageModel} onChange={(event) => setAi((current) => ({ ...current, imageModel: event.target.value }))}>{imageModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select> : <KeyboardInput aria-label="מודל תמונה" className="text-field ltr" value={ai.imageModel} onChange={(event) => setAi((current) => ({ ...current, imageModel: event.target.value }))} />}<label>מודל וידאו · {mediaProviderMeta[ai.videoProvider].title}</label>{videoModels.length > 1 ? <select aria-label="מודל וידאו" className="text-field ltr" value={ai.videoModel} onChange={(event) => setAi((current) => ({ ...current, videoModel: event.target.value }))}>{videoModels.map((model) => <option value={model.id} key={model.id}>{model.name || model.id}</option>)}</select> : <KeyboardInput aria-label="מודל וידאו" className="text-field ltr" value={ai.videoModel} onChange={(event) => setAi((current) => ({ ...current, videoModel: event.target.value }))} />}<small className="small-note">מזהי ברירת המחדל נבחרו לפי תיעוד הספקים. שינוי ידני מיועד למודל בעל אותה סכמת API.</small></div></details>
          {aiError ? <div className="error-card"><ExclamationTriangleIcon />{aiError}</div> : null}
        </div></FullPage> : null}
        {overlay === "event" ? <motion.div className="event-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="event-card" initial={{ scale: .82, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .9, opacity: 0 }}><div className="event-star"><StarFilledIcon /></div><small>אירוע חדש</small><h2>{eventText}</h2><button className="wide-button accent" onClick={() => setOverlay(null)}>ממשיכים</button></motion.div></motion.div> : null}
      </AnimatePresence>

      {!game.onboarded ? <Onboarding game={game} onKind={(characterKind: CharacterKind) => setGame((current) => ({ ...current, characterKind }))} onName={(name: string) => setGame((current) => ({ ...current, name }))} onTheme={(theme: ThemeId) => setGame((current) => ({ ...current, theme }))} onPhoto={() => fileRef.current?.click()} onDone={() => { setGame((current) => ({ ...current, onboarded: true, birthAt: current.xp ? current.birthAt : Date.now(), lastSeen: Date.now() })); say("החדר מוכן. החוקים פשוטים: מטפלים, משחקים ולא מאמינים לכל מה שאני אומר."); window.requestAnimationFrame(() => { const scroll = document.querySelector<HTMLElement>(".app-screen .mobile-scroll"); if (scroll) scroll.scrollTop = 0; }); }} /> : null}
    </div>
  );
}

function HomeScreen({ game, characterUrl, health, stage, evolution, day, needs, lowestNeed, callNeed, currentRoom, roomUrl, bakedDecor, reaction, reactionId, wanderX, effect, isNight, aiReady, isSpeaking, activeMotion, clipUrl, onSettings, onSpeak, onAction, onUseMedicine }: any) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [speechOpen, setSpeechOpen] = useState(true);
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
  const nextStageInfo = stageMeta[evolution.id as StageId];
  const labels: Record<Exclude<CharacterKind, "">, Record<ActionKey, string>> = {
    person: { feed: "ארוחה", sleep: "מנוחה", clean: "להתרענן", play: "כיף" },
    baby: { feed: "אוכל", sleep: "תנומה", clean: "החלפה", play: "משחק" },
    pet: { feed: "אוכל", sleep: "שינה", clean: "רחצה", play: "משחק" },
  };
  const kind = (game.characterKind || "person") as Exclude<CharacterKind, "">;
  const statusLine = game.sick ? "לא מרגיש טוב · צריך תרופה" : needs.fullness < 36 ? "רעב · הבטן פתחה קבוצת מחאה" : needs.energy < 36 ? "עייף · פועל על כבוד בלבד" : needs.hygiene < 36 ? "צריך ניקיון · הראיות מצטברות" : needs.mood < 36 ? "צריך משחק · הוראה מקצועית" : "הכול טוב · חשוד, אבל טוב";
  const StatusIcon = game.sick ? HeartFilledIcon : callNeed && callNeed !== "medicine" ? actionsMeta[callNeed as ActionKey].icon : FaceIcon;
  const staticMotion = activeMotion === "play" ? { y: [0,-18,0,-8,0], rotate: [0,-4,5,0], scale: [1,1.04,1] } : activeMotion === "eat" ? { y: [0,3,0], rotate: [0,-2,2,0], scale: [1,1.05,1] } : activeMotion === "celebrate" ? { y: [0,-14,0], rotate: [0,8,-8,0], scale: [1,1.08,1] } : { y: game.sleeping ? 18 : [0,-6,0], rotate: game.sleeping ? 0 : [-1,1,-1], scale: 1 };
  return <section className="home-screen">
    <img className="room-background" src={roomUrl ?? currentRoom.image} alt="" draggable={false} /><div className={`room-vignette ${isNight ? "night" : ""}`} />
    <header className="game-header"><button className="round-button" aria-label="הגדרות" onClick={onSettings}><GearIcon /></button><div className="friend-title"><strong>{game.name}</strong><span>{stageMeta[stage as StageId].title} · יום {day}</span></div><div className="coin-pill"><TokensIcon /><strong>{game.coins}</strong></div></header>
    <div className="status-popover" ref={statusPopoverRef}>
      <button className={`vital-summary ${callNeed ? "needs-care" : ""}`} aria-expanded={detailsOpen} onClick={() => setDetailsOpen((open) => !open)}><span><StatusIcon /></span><div><strong>{statusLine}</strong><small>טיפול {whole(health)}% · לחצו למדדים</small></div><ChevronLeftIcon /></button>
      <AnimatePresence>{detailsOpen ? <motion.div className="status-panel" initial={{ opacity: 0, y: -8, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -7, scale: .98 }}>
        <div className="needs-strip" aria-label="מדדי הדמות">{(Object.entries(needs) as Array<[NeedKey, number]>).map(([key, value]) => { const MetaIcon = needsMeta[key].icon; return <div className={`need-chip ${key === lowestNeed ? "low" : ""}`} key={key}><div><MetaIcon /><span>{needsMeta[key].label}</span></div><strong>{whole(value)}</strong><i><b style={{ width: `${value}%` }} /></i></div>; })}</div>
        <div className="time-progress"><span><ClockIcon />יום {day}</span><span><StarFilledIcon />רצף {game.streak}</span><div className="stage-progress"><span>{stage === "grown" ? "החברות ממשיכה לגדול" : `לקראת ${nextStageInfo.title} · יום ${nextStageInfo.minDay}`}</span><strong>{whole(evolution.progress)}%</strong><i><b style={{ width: `${evolution.progress}%` }} /></i></div></div>
      </motion.div> : null}</AnimatePresence>
    </div>
    <div className="room-scene">
      <AnimatePresence mode="wait">{speechOpen ? <motion.div className="speech-bubble" key={reactionId} initial={{ opacity: 0, y: 8, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5 }}><span>{reaction}</span>{aiReady ? <button aria-label="השמעת תגובת הדמות" disabled={isSpeaking} onClick={onSpeak}><SpeakerLoudIcon /></button> : null}</motion.div> : null}</AnimatePresence>
      {callNeed ? <motion.div className="care-call" initial={{ scale: 0 }} animate={{ scale: [1,1.08,1] }} transition={{ repeat: Infinity, duration: 1.4 }}>{game.sick ? <HeartFilledIcon /> : game.poop ? <TrashIcon /> : (() => { const I = actionsMeta[callNeed as ActionKey].icon; return <I />; })()}</motion.div> : null}
      <motion.button className={`moving-character photo-character motion-${activeMotion} ${clipUrl ? "video-character" : ""} ${game.aiCharacter ? "ai-character" : ""} ${game.sleeping ? "sleeping" : ""} ${game.sick ? "sick" : ""}`} aria-label={`ללטף את ${game.name}`} onClick={() => { setSpeechOpen(true); onAction("play"); }} animate={{ x: wanderX, ...staticMotion }} transition={{ x: { type: "spring", stiffness: 65, damping: 16 }, y: { repeat: activeMotion === "idle" ? Infinity : 0, duration: activeMotion === "idle" ? 2.2 : .8 }, rotate: { repeat: activeMotion === "idle" ? Infinity : 0, duration: activeMotion === "idle" ? 3.2 : .8 }, scale: { duration: .8 } }} whileTap={{ scale: .92 }}>{clipUrl ? <video key={`${activeMotion}-${clipUrl}`} src={clipUrl} autoPlay muted playsInline loop={activeMotion === "idle" || activeMotion === "sleep"} /> : characterUrl ? <img src={characterUrl} alt={game.name} draggable={false} /> : <span className="missing-character"><CameraIcon />בחירת תמונה</span>}</motion.button>
      {game.poop > 0 ? <div className="mess-row" aria-label={`${game.poop} לכלוכים`}>{Array.from({ length: game.poop }).map((_, index) => <motion.span key={index} initial={{ y: -20 }} animate={{ y: 0 }}><TrashIcon /></motion.span>)}</div> : null}
      {game.sleeping ? <div className="sleep-cloud"><MoonIcon /><span>ששש…</span></div> : null}
      {(Object.keys(decorMeta) as DecorKey[]).filter((key) => game.decorations[key] && !bakedDecor.includes(key)).map((key, index) => { const Art = decorArt[key]; return <motion.div className={`room-decor decor-${key}`} key={key} aria-hidden initial={{ opacity: 0, scale: .5, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: index * .07, type: "spring", stiffness: 220, damping: 17 }}><Art /></motion.div>; })}
      <AnimatePresence>{effect ? <EffectBurst key={effect.id} kind={effect.kind} /> : null}</AnimatePresence>
    </div>
    {game.sick ? <button className="care-alert" onClick={onUseMedicine}><HeartFilledIcon /><span><strong>{game.name} לא מרגיש טוב</strong><small>השתמשו בתרופה מהתיק</small></span><ChevronLeftIcon /></button> : null}
    <div className="care-dock">{(Object.entries(actionsMeta) as Array<[ActionKey, (typeof actionsMeta)[ActionKey]]>).map(([key, meta]) => { const Icon = meta.icon; const urgent = callNeed === key; return <button key={key} className={urgent ? "urgent" : ""} onClick={() => onAction(key)}><span><Icon /></span><strong>{key === "sleep" && game.sleeping ? "להעיר" : labels[kind][key]}</strong>{urgent ? <i /> : null}</button>; })}</div>
  </section>;
}

function EffectBurst({ kind }: { kind: EffectKind }) {
  const Icon = kind === "food" ? BackpackIcon : kind === "heart" ? HeartFilledIcon : kind === "moon" ? MoonIcon : kind === "coin" ? TokensIcon : kind === "medicine" ? HeartFilledIcon : SunIcon;
  return <div className={`effect-burst effect-${kind}`}>{Array.from({ length: 9 }).map((_, index) => { const angle = index * 40; const radius = 72 + (index % 3) * 15; return <motion.i key={index} initial={{ x: 0, y: 0, scale: .4, opacity: 1 }} animate={{ x: Math.cos(angle * Math.PI / 180) * radius, y: Math.sin(angle * Math.PI / 180) * radius, scale: 1.15, opacity: 0 }} transition={{ duration: 1.1, ease: "easeOut" }}><Icon /></motion.i>; })}</div>;
}

function ArcadeScreen({ coins, starGame, guessGame, onStartStars, onCatch, onStartGuess, onGuess }: any) {
  return <section className="content-screen arcade-screen"><ScreenHeader eyebrow="מרוויחים מטבעות" title="המשחקייה" trailing={<div className="coin-pill"><TokensIcon /><strong>{coins}</strong></div>} />
    <div className="arcade-hero"><StarFilledIcon /><div><strong>משחקים קצרים, תגמול אמיתי</strong><span>המטבעות פותחים אוכל, צעצועים וטיפול.</span></div></div>
    <article className="game-card star-card"><div className="game-card-head"><span><StarFilledIcon /></span><div><h2>תופסי הכוכבים</h2><p>20 שניות · לחצו על המסלול הנכון</p></div>{!starGame.active ? <button onClick={onStartStars}>שחק</button> : null}</div>{starGame.active ? <div className="star-arena"><div className="scorebar"><strong>{starGame.score} כוכבים</strong><span>{starGame.time} שנ׳</span></div><div className="lanes">{[0,1,2].map((lane) => <button key={lane} aria-label={`מסלול ${lane + 1}`} onClick={() => onCatch(lane)}>{starGame.target === lane ? <motion.i key={starGame.targetId} initial={{ y: -110, rotate: 0 }} animate={{ y: 82, rotate: 180 }} transition={{ duration: .85, ease: "linear" }}><StarFilledIcon /></motion.i> : null}<span className={starGame.lane === lane ? "player active" : "player"}><FaceIcon /></span></button>)}</div></div> : <div className="game-preview stars-preview"><StarFilledIcon /><StarFilledIcon /><StarFilledIcon /></div>}</article>
    <article className="game-card guess-card"><div className="game-card-head"><span><ChevronLeftIcon /></span><div><h2>לאן קופצים?</h2><p>בהשראת משחק הכיוון הקלאסי · 5 סיבובים</p></div>{!guessGame.active && guessGame.round === 0 ? <button onClick={onStartGuess}>שחק</button> : null}</div>{guessGame.active || guessGame.round > 0 ? <div className="guess-arena"><strong>{guessGame.reveal || "לאן הדמות תקפוץ?"}</strong><motion.div className="guess-pet" animate={{ x: guessGame.answer === "left" ? -70 : guessGame.answer === "right" ? 70 : 0 }}><motion.span className="guess-tell" key={guessGame.round} animate={{ x: guessGame.answer ? 0 : [0, guessGame.hint === "left" ? -16 : 16, 0] }} transition={{ duration: .6, ease: "easeInOut" }}><FaceIcon /></motion.span></motion.div><div><button disabled={!guessGame.active || !!guessGame.answer} onClick={() => onGuess("right")}><ChevronRightIcon />ימינה</button><span>{guessGame.score}/{guessGame.round}</span><button disabled={!guessGame.active || !!guessGame.answer} onClick={() => onGuess("left")}>שמאלה<ChevronLeftIcon /></button></div><small className="guess-tip">טיפ: הדמות מציצה לכיוון שבא לה לקפוץ… בדרך כלל.</small>{!guessGame.active && guessGame.round >= 5 ? <button className="again-button" onClick={onStartGuess}>עוד משחק</button> : null}</div> : <div className="game-preview direction-preview"><ChevronRightIcon /><FaceIcon /><ChevronLeftIcon /></div>}</article>
  </section>;
}

function JourneyScreen({ game, stage, evolution, day, personality, careGrade, onClaim, onClaimMilestone }: any) {
  const personalityNames: Record<PersonalityId,string> = { curious: "סקרן", cozy: "רגוע", comic: "מצחיקן" };
  return <section className="content-screen"><ScreenHeader eyebrow="הטיפול שלך משנה הכול" title="מטרות והתקדמות" trailing={<div className="grade-pill">דירוג {careGrade}</div>} />
    <article className="evolution-card"><div className="evolution-title"><div><small>יום {day} ביחד · רצף {game.streak}</small><h2>{stageMeta[stage as StageId].title}</h2></div><div className="personality-badge"><FaceIcon />{personalityNames[personality as PersonalityId]}</div></div><div className="evolution-track">{(Object.keys(stageMeta) as StageId[]).map((id,index) => <div className={`${id === stage ? "current" : game.xp >= stageMeta[id].minXp && day >= stageMeta[id].minDay ? "done" : ""}`} key={id}><span>{index + 1}</span><small>{stageMeta[id].title}</small><em>יום {stageMeta[id].minDay}</em></div>)}</div>{stage !== "grown" ? <div className="next-progress"><span>לקראת {stageMeta[evolution.id as StageId].title} · דורש יום {stageMeta[evolution.id as StageId].minDay}</span><strong>{game.xp}/{evolution.target} XP</strong><i><b style={{ width: `${evolution.progress}%` }} /></i><small>השלב נפתח רק כשגם הזמן וגם הניסיון מוכנים.</small></div> : <div className="grown-note"><StarFilledIcon />הגעתם לשלב הבוגר. האופי והזיכרונות ממשיכים להתפתח.</div>}</article>
    <div className="section-heading"><div><small>מתמידים ומרוויחים</small><h2>אבני דרך של רצף</h2></div><StarFilledIcon /></div>
    <div className="milestone-strip">{streakMilestones.map((milestone) => { const claimed = game.claimedMilestones.includes(milestone.days); const ready = game.bestStreak >= milestone.days && !claimed; return <button key={milestone.days} className={`${ready ? "ready" : ""} ${claimed ? "claimed" : ""}`} disabled={!ready} onClick={() => onClaimMilestone(milestone.days)}><span>{claimed ? <CheckIcon /> : ready ? <StarFilledIcon /> : <LockClosedIcon />}</span><strong>רצף {milestone.days}</strong><em>+{milestone.reward}</em><small>{claimed ? "נאסף" : ready ? "לאיסוף" : `${Math.min(game.bestStreak, milestone.days)}/${milestone.days}`}</small></button>; })}</div>
    <div className="section-heading"><div><small>מתחדש בכל יום</small><h2>משימות יומיות</h2></div><ClockIcon /></div>
    <div className="quest-list">{questDefinitions.map((quest) => { const progress = quest.id === "care" ? game.questCare : quest.id === "game" ? game.questGame : game.questHappy; const complete = progress >= quest.target; const claimed = game.claimed.includes(quest.id); return <button key={quest.id} className={`${complete ? "complete" : ""} ${claimed ? "claimed" : ""}`} onClick={() => onClaim(quest.id, quest.reward, complete)}><span>{claimed ? <CheckIcon /> : complete ? <StarFilledIcon /> : <ClockIcon />}</span><div><strong>{quest.title}</strong><small>{Math.min(progress, quest.target)}/{quest.target}</small><i><b style={{ width: `${Math.min(100, progress / quest.target * 100)}%` }} /></i></div><em>{claimed ? "נאסף" : `+${quest.reward}`}</em></button>; })}</div>
    <div className="stats-grid"><div><strong>{game.actions}</strong><span>פעולות טיפול</span></div><div><strong>{game.bestStreak}</strong><span>שיא רצף</span></div><div><strong>{game.xp}</strong><span>נקודות ניסיון</span></div><div><strong>{game.careMistakes}</strong><span>רגעי מצוקה</span></div></div>
    {game.memories.length ? <><div className="section-heading memory-title"><div><small>נוצר עם AI</small><h2>הזיכרונות שלנו</h2></div><MagicWandIcon /></div><div className="memory-list">{game.memories.slice(-5).reverse().map((memory: string, index: number) => <div key={`${memory}-${index}`}><StarFilledIcon /><span>{memory}</span></div>)}</div></> : null}
  </section>;
}

function BagScreen({ game, onUse, onBuy, onBuyDecor }: any) {
  return <section className="content-screen"><ScreenHeader eyebrow="אוספים ומשתמשים" title="התיק והחנות" trailing={<div className="coin-pill"><TokensIcon /><strong>{game.coins}</strong></div>} />
    <div className="section-heading"><div><small>מה שכבר יש לנו</small><h2>בתיק</h2></div><BackpackIcon /></div><div className="inventory-grid">{(Object.entries(items) as Array<[ItemKey,(typeof items)[ItemKey]]>).map(([key,item]) => { const Icon = item.icon; return <button key={key} disabled={game.inventory[key] < 1} onClick={() => onUse(key)}><span><Icon /><i>{game.inventory[key]}</i></span><strong>{item.title}</strong><small>{game.inventory[key] ? "שימוש" : "אזל"}</small></button>; })}</div>
    <div className="section-heading shop-title"><div><small>משחקים כדי לקנות</small><h2>החנות</h2></div><TokensIcon /></div><div className="shop-list">{(Object.entries(items) as Array<[ItemKey,(typeof items)[ItemKey]]>).map(([key,item]) => { const Icon = item.icon; return <button key={key} disabled={game.coins < item.price} onClick={() => onBuy(key)}><span><Icon /></span><div><strong>{item.title}</strong><small>{item.note}</small></div><em><TokensIcon />{item.price}</em></button>; })}</div>
    <div className="section-heading shop-title"><div><small>משדרגים את הבית</small><h2>לחדר</h2></div><HomeIcon /></div><div className="shop-list decor-list">{(Object.entries(decorMeta) as Array<[DecorKey,(typeof decorMeta)[DecorKey]]>).map(([key,decor]) => { const Icon = decorIcons[key]; const owned = Boolean(game.decorations[key]); return <button key={key} className={owned ? "owned" : ""} disabled={owned || game.coins < decor.price} onClick={() => onBuyDecor(key)}><span><Icon /></span><div><strong>{decor.title}</strong><small>{decor.note}</small></div>{owned ? <em className="owned-tag"><CheckIcon />בבית!</em> : <em><TokensIcon />{decor.price}</em>}</button>; })}</div>
  </section>;
}

function ScreenHeader({ eyebrow, title, trailing }: { eyebrow: string; title: string; trailing: ReactNode }) { return <header className="screen-header"><div><small>{eyebrow}</small><h1>{title}</h1></div>{trailing}</header>; }

function FullPage({ title, subtitle, onBack, children }: { title: string; subtitle: string; onBack: () => void; children: ReactNode }) {
  const keyboard = useKeyboard();
  useEffect(() => { resetScroll(".overlay-scroll .mobile-scroll"); }, [title]);
  const close = () => { keyboard.hide(); onBack(); };
  return <motion.section className="full-page" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 28, stiffness: 280 }}><header><button aria-label="חזרה" onClick={close}><ChevronRightIcon /></button><div><h1>{title}</h1><p>{subtitle}</p></div></header><MobileScroll className="overlay-scroll"><div className="full-page-content">{children}</div></MobileScroll></motion.section>;
}

function Onboarding({ game, onKind, onName, onTheme, onPhoto, onDone }: any) {
  const keyboard = useKeyboard();
  const [step, setStep] = useState(0);
  const blurAnd = (callback: () => void) => { keyboard.hide(); callback(); };
  const selectedKind = game.characterKind ? kindLabels[game.characterKind as Exclude<CharacterKind, "">] : null;
  return <div className={`onboarding onboarding-step-${step}`}><img src="/assets/companion/onboarding-hero-v4.webp" alt="ילד, תינוק וכלבלב סביב חדר קסום" /><div className="onboarding-shade" /><div className="onboarding-brand"><StarFilledIcon /><span>החבר שלי</span></div><motion.div className="onboarding-card" key={step} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
    {step > 0 ? <button className="onboarding-back" aria-label="חזרה" onClick={() => blurAnd(() => setStep((current) => current - 1))}><ChevronRightIcon /></button> : null}
    {step === 0 ? <><small>טמגוצ׳י, אבל אישי</small><h1>מישהו קטן עומד לעבור לגור אצלך.</h1><p>מצלמים אדם, תינוק או חיית מחמד. מטפלים, משחקים וצוחקים בדרך.</p><button className="wide-button accent" onClick={() => setStep(1)}>יוצרים חבר<ChevronLeftIcon /></button></> : null}
    {step === 1 ? <><small>שלב 1 מתוך 3</small><h1>מי יהיה החבר?</h1><p>הבחירה משנה את השפה, פעולות הטיפול והבדיחות.</p><div className="kind-grid">{(Object.entries(kindLabels) as Array<[Exclude<CharacterKind, "">,(typeof kindLabels)[Exclude<CharacterKind, "">]]>).map(([kind, meta]) => { const Icon = meta.icon; return <button key={kind} className={game.characterKind === kind ? "selected" : ""} onClick={() => onKind(kind)}><span><Icon /></span><strong>{meta.title}</strong><small>{meta.note}</small>{game.characterKind === kind ? <i><CheckIcon /></i> : null}</button>; })}</div><button className="wide-button accent" disabled={!game.characterKind} onClick={() => setStep(2)}>ממשיכים<ChevronLeftIcon /></button></> : null}
    {step === 2 ? <><small>שלב 2 מתוך 3</small><h1>שם ופנים</h1><p>אין דמות אקראית: בוחרים תמונה ורק אז נכנסים למשחק.</p><div className={`photo-pick ${game.photo ? "has-photo" : ""}`}><button onClick={onPhoto}>{game.photo ? <img src={game.photo} alt="התמונה שנבחרה" /> : <span><CameraIcon /><strong>צילום או תמונה</strong><small>אדם, תינוק או חיית מחמד</small></span>}</button>{game.photo ? <button className="replace-photo" onClick={onPhoto}>להחליף</button> : null}</div><KeyboardInput aria-label="שם הדמות" className="text-field" placeholder={selectedKind?.namePlaceholder || "איך קוראים לדמות?"} value={game.name} onChange={(event) => onName(event.target.value.slice(0,18))} /><div className="privacy-note"><LockClosedIcon />התמונה נשארת במכשיר. שליחה ל־AI מתבצעת רק באישור נפרד.</div><button className="wide-button accent" disabled={!game.photo || !game.name.trim()} onClick={() => blurAnd(() => setStep(3))}>החדר הבא<ChevronLeftIcon /></button></> : null}
    {step === 3 ? <><small>שלב 3 מתוך 3</small><h1>איפה גרים?</h1><p>אפשר להחליף חדר אחר כך בלי לאבד התקדמות.</p><div className="onboarding-themes">{themes.map((theme) => <button key={theme.id} className={game.theme === theme.id ? "selected" : ""} onClick={() => onTheme(theme.id)}><img src={theme.image} alt="" /><span>{theme.title}</span></button>)}</div><button className="wide-button accent" disabled={!game.photo || !game.name.trim() || !game.characterKind} onClick={() => blurAnd(onDone)}>פותחים את הדלת<HomeIcon /></button></> : null}
    <div className="step-dots">{[0,1,2,3].map((index) => <i className={index === step ? "active" : ""} key={index} />)}</div>
  </motion.div></div>;
}
