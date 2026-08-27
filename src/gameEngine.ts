export type ThemeId = "midnight" | "sunrise" | "classic";
export type CharacterKind = "person" | "baby" | "pet" | "";
export type CompanionMotion = "idle" | "eat" | "play" | "sleep" | "celebrate";
export type NeedKey = "fullness" | "energy" | "hygiene" | "mood";
export type StageId = "baby" | "kid" | "teen" | "grown";
export type PersonalityId = "curious" | "cozy" | "comic";
export type ItemKey = "apple" | "meal" | "soap" | "medicine" | "ball";
export type ActionKey = "feed" | "sleep" | "clean" | "play";

export type GameState = {
  version: 5;
  onboarded: boolean;
  name: string;
  characterKind: CharacterKind;
  theme: ThemeId;
  fullness: number;
  energy: number;
  hygiene: number;
  mood: number;
  xp: number;
  coins: number;
  careScore: number;
  careMistakes: number;
  actions: number;
  poop: number;
  sick: boolean;
  sleeping: boolean;
  birthAt: number;
  lastSeen: number;
  dailyKey: string;
  questCare: number;
  questGame: number;
  questHappy: number;
  claimed: string[];
  personality: Record<PersonalityId, number>;
  inventory: Record<ItemKey, number>;
  streak: number;
  bestStreak: number;
  lastVisitKey: string;
  nextMessAt: number;
  sleepingUntil: number;
  awayMinutes: number;
  memories: string[];
  visualRevision: number;
  animationSlots: Partial<Record<CompanionMotion, boolean>>;
  aiCharacter: boolean;
  characterVariants: Partial<Record<ThemeId, boolean>>;
  notificationsEnabled: boolean;
  guideSeen: boolean;
  sourcePhoto?: string;
  photo?: string;
};

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const localDayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const previousLocalDayKey = (date = new Date()) => localDayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1));
export const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 100) / 100));
export const whole = (value: number) => Math.round(value);

export function absenceMessage(name: string, awayMinutes: number) {
  const awayHours = Math.floor(awayMinutes / 60);
  const awayDays = Math.floor(awayMinutes / 1440);
  const elapsed = awayHours < 1 ? `עברו ${awayMinutes} דקות`
    : awayHours < 2 ? "עברה שעה"
    : awayHours < 3 ? "עברו שעתיים"
    : awayHours < 48 ? `עברו ${awayHours} שעות`
    : awayDays < 3 ? "עברו יומיים"
    : `עברו ${awayDays} ימים`;
  if (awayMinutes >= 24 * 60) return `${elapsed}. ${name} התגעגע. גם הרצפה, מסיבות פחות מרגשות.`;
  if (awayMinutes >= 2 * 60) return `${elapsed}. ${name} ניהל את החדר לבד. הדוח עדיין חסוי.`;
  return `${elapsed}. ${name} שמר לך מקום והעמיד פנים שזה לא היה געגוע.`;
}

export const defaultState: GameState = {
  version: 5, onboarded: false, name: "", characterKind: "", theme: "sunrise",
  fullness: 68, energy: 78, hygiene: 74, mood: 72,
  xp: 0, coins: 80, careScore: 82, careMistakes: 0, actions: 0,
  poop: 0, sick: false, sleeping: false,
  birthAt: Date.now(), lastSeen: Date.now(), dailyKey: localDayKey(),
  questCare: 0, questGame: 0, questHappy: 0, claimed: [],
  personality: { curious: 0, cozy: 0, comic: 0 },
  inventory: { apple: 3, meal: 1, soap: 2, medicine: 1, ball: 1 },
  streak: 1, bestStreak: 1, lastVisitKey: localDayKey(), nextMessAt: Date.now() + 5.5 * HOUR,
  sleepingUntil: 0, awayMinutes: 0, memories: [], visualRevision: 1, animationSlots: {},
  aiCharacter: false, characterVariants: {},
  notificationsEnabled: false, guideSeen: false,
};

export const stageMeta: Record<StageId, { title: string; minXp: number; minDay: number }> = {
  baby: { title: "חדש פה", minXp: 0, minDay: 1 },
  kid: { title: "מתרגל", minXp: 160, minDay: 2 },
  teen: { title: "פורח", minXp: 420, minDay: 4 },
  grown: { title: "חבר ותיק", minXp: 850, minDay: 7 },
};

export function ageDay(state: GameState, now = Date.now()) {
  return Math.max(1, Math.floor((now - state.birthAt) / DAY) + 1);
}

export function currentStage(state: GameState, now = Date.now()): StageId {
  const day = ageDay(state, now);
  if (state.xp >= 850 && day >= 7) return "grown";
  if (state.xp >= 420 && day >= 4) return "teen";
  if (state.xp >= 160 && day >= 2) return "kid";
  return "baby";
}

export function nextStage(state: GameState, now = Date.now()) {
  const stage = currentStage(state, now);
  if (stage === "grown") return { id: stage, target: 850, progress: 100, xpProgress: 100, dayProgress: 100 };
  const ids: StageId[] = ["baby", "kid", "teen", "grown"];
  const next = ids[ids.indexOf(stage) + 1];
  const start = stageMeta[stage].minXp;
  const target = stageMeta[next].minXp;
  const xpProgress = clamp(((state.xp - start) / (target - start)) * 100);
  const dayStart = stageMeta[stage].minDay;
  const dayProgress = clamp(((ageDay(state, now) - dayStart) / (stageMeta[next].minDay - dayStart)) * 100);
  return { id: next, target, progress: Math.min(xpProgress, dayProgress), xpProgress, dayProgress };
}

export function applyElapsed(state: GameState, now = Date.now()): GameState {
  const elapsedHours = Math.max(0, now - state.lastSeen) / HOUR;
  const hours = Math.min(72, elapsedHours);
  if (hours <= 0) return state;
  const wasSleeping = state.sleeping && state.sleepingUntil > state.lastSeen;
  const sleepHours = wasSleeping ? Math.max(0, Math.min(now, state.sleepingUntil) - state.lastSeen) / HOUR : 0;
  const awakeHours = Math.max(0, hours - sleepHours);
  const fullness = clamp(state.fullness - sleepHours * 1.3 - awakeHours * 3.1);
  const energy = clamp(state.energy + sleepHours * 24 - awakeHours * 2.1);
  const hygiene = clamp(state.hygiene - hours * 1.45);
  const mood = clamp(state.mood - sleepHours * .45 - awakeHours * 1.65);
  const extraPoop = now >= state.nextMessAt ? Math.min(3, 1 + Math.floor((now - state.nextMessAt) / (5.5 * HOUR))) : 0;
  const poop = Math.min(3, state.poop + extraPoop);
  const values = [fullness, energy, hygiene, mood];
  const dangerCount = values.filter((value) => value < 18).length;
  const carePressure = values.reduce((sum, value) => sum + Math.max(0, 65 - value) / 65, 0);
  const currentKey = localDayKey(new Date(now));
  const dayChanged = currentKey !== state.dailyKey;
  const consecutive = state.lastVisitKey === previousLocalDayKey(new Date(now));
  const streak = dayChanged ? (consecutive ? state.streak + 1 : 1) : state.streak;
  return {
    ...state, fullness, energy, hygiene, mood, poop,
    sick: state.sick || hygiene < 12 || poop >= 3,
    sleeping: wasSleeping && now < state.sleepingUntil,
    careScore: clamp(state.careScore - hours * (.18 + carePressure * .52 + dangerCount * 1.35)),
    careMistakes: state.careMistakes + (hours >= 1 ? dangerCount : 0),
    nextMessAt: extraPoop ? state.nextMessAt + extraPoop * 5.5 * HOUR : state.nextMessAt,
    dailyKey: currentKey,
    lastVisitKey: currentKey,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    questCare: dayChanged ? 0 : state.questCare,
    questGame: dayChanged ? 0 : state.questGame,
    questHappy: dayChanged ? 0 : state.questHappy,
    claimed: dayChanged ? [] : state.claimed,
    coins: dayChanged ? state.coins + 10 : state.coins,
    awayMinutes: hours >= .25 ? Math.round(elapsedHours * 60) : state.awayMinutes,
    lastSeen: now,
  };
}

const actionNeed: Record<ActionKey, NeedKey> = { feed: "fullness", sleep: "energy", clean: "hygiene", play: "mood" };

export function performCareAction(state: GameState, action: ActionKey, now = Date.now()): GameState {
  const need = state[actionNeed[action]];
  const usefulCare = Math.max(3, Math.min(14, Math.round((105 - need) / 8)));
  const next: GameState = {
    ...state,
    xp: state.xp + usefulCare,
    actions: state.actions + 1,
    careScore: clamp(state.careScore + Math.max(1, usefulCare / 4)),
    lastSeen: now,
    sleeping: action === "sleep" ? !state.sleeping : false,
    sleepingUntil: action === "sleep" && !state.sleeping ? now + 30 * 60_000 : 0,
    questCare: Math.min(3, state.questCare + 1),
    personality: { ...state.personality },
  };
  if (action === "feed") {
    next.fullness = clamp(state.fullness + 24); next.energy = clamp(state.energy + 3);
    next.personality.cozy += 1;
  }
  if (action === "sleep") {
    next.energy = clamp(state.energy + (state.sleeping ? 0 : 5));
    next.fullness = clamp(state.fullness - (state.sleeping ? 0 : 2));
    next.personality.cozy += 2;
  }
  if (action === "clean") {
    next.hygiene = 100; next.poop = 0; next.nextMessAt = now + 5.5 * HOUR;
    next.sick = state.sick && state.hygiene < 20;
    next.personality.curious += 1;
  }
  if (action === "play") {
    next.mood = clamp(state.mood + 25); next.energy = clamp(state.energy - 6); next.fullness = clamp(state.fullness - 3);
    next.personality.comic += 2;
  }
  next.questHappy = next.mood >= 85 ? 1 : state.questHappy;
  if (usefulCare > 3 && next.actions % 6 === 0) next.coins += 12;
  return next;
}

export function useInventoryItem(state: GameState, key: ItemKey, now = Date.now()): GameState {
  if (state.inventory[key] < 1) return state;
  const next: GameState = { ...state, inventory: { ...state.inventory, [key]: state.inventory[key] - 1 }, xp: state.xp + 8 };
  if (key === "apple") next.fullness = clamp(state.fullness + 18);
  if (key === "meal") { next.fullness = clamp(state.fullness + 35); next.mood = clamp(state.mood + 5); }
  if (key === "soap") { next.hygiene = 100; next.poop = 0; next.nextMessAt = now + 5.5 * HOUR; }
  if (key === "medicine") next.sick = false;
  if (key === "ball") { next.mood = clamp(state.mood + 28); next.energy = clamp(state.energy - 5); }
  return next;
}
