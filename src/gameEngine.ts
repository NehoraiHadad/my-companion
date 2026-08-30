export type ThemeId = "midnight" | "sunrise" | "classic";
export type CharacterKind = "person" | "baby" | "pet" | "";
export type CompanionMotion = "idle" | "eat" | "play" | "sleep" | "celebrate";
export type NeedKey = "fullness" | "energy" | "hygiene" | "mood";
export type StageId = "baby" | "kid" | "teen" | "grown" | "mentor" | "legend";
export type PersonalityId = "curious" | "cozy" | "comic";
export type ItemKey = "apple" | "meal" | "soap" | "medicine" | "ball";
export type ActionKey = "feed" | "sleep" | "clean" | "play";
export type DecorKey = "lamp" | "poster" | "rug" | "plant" | "radio" | "trophy" | "bookshelf" | "aquarium" | "telescope" | "fireplace" | "projector" | "icecream";
export type QuestId = "care4" | "care8" | "arcadeOne" | "arcadeTwo" | "happyPeak" | "fullSet" | "bedtime" | "cleanTwice" | "starAce" | "guessAce" | "shopping" | "brightRoom";

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
  dailyQuests: string[];
  questProgress: Record<string, number>;
  dailyActionKinds: ActionKey[];
  weeklyKey: string;
  weeklyProgress: number;
  weeklyClaimed: boolean;
  arcadePlays: number;
  claimed: string[];
  personality: Record<PersonalityId, number>;
  personaBuild: "" | PersonalityId;
  napBonus: number;
  pendingNapReward: number;
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
  aiRooms: Partial<Record<ThemeId, string>>;
  aiScenes: Partial<Record<ThemeId, string>>;
  sceneAnimationSlots: Partial<Record<ThemeId, Partial<Record<CompanionMotion, boolean>>>>;
  notificationsEnabled: boolean;
  guideSeen: boolean;
  decorations: Partial<Record<DecorKey, boolean>>;
  claimedMilestones: number[];
  sourcePhoto?: string;
  photo?: string;
};

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const stageOrder: StageId[] = ["baby", "kid", "teen", "grown", "mentor", "legend"];
export const localDayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const previousLocalDayKey = (date = new Date()) => localDayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1));
export const localWeekKey = (date = new Date()) => localDayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7)));
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
  if (awayMinutes >= 24 * 60) return `${elapsed}. אצל ${name} היה פה געגוע גדול. גם אצל הרצפה, מסיבות פחות מרגשות.`;
  if (awayMinutes >= 2 * 60) return `${elapsed}. החדר של ${name} נוהל בעצמאות מרשימה. הדוח עדיין חסוי.`;
  return `${elapsed}. אצל ${name} נשמר לך מקום, והגעגוע הוסתר בכישרון בינוני.`;
}

export function createDefaultState(now = Date.now()): GameState {
  const date = new Date(now);
  const dayKey = localDayKey(date);
  return {
    version: 5, onboarded: false, name: "", characterKind: "", theme: "sunrise",
    fullness: 68, energy: 78, hygiene: 74, mood: 72,
    xp: 0, coins: 80, careScore: 82, careMistakes: 0, actions: 0,
    poop: 0, sick: false, sleeping: false,
    birthAt: now, lastSeen: now, dailyKey: dayKey,
    dailyQuests: [], questProgress: {}, dailyActionKinds: [],
    weeklyKey: localWeekKey(date), weeklyProgress: 0, weeklyClaimed: false,
    arcadePlays: 0, claimed: [],
    personality: { curious: 0, cozy: 0, comic: 0 }, personaBuild: "",
    napBonus: 0, pendingNapReward: 0,
    inventory: { apple: 3, meal: 1, soap: 2, medicine: 1, ball: 1 },
    streak: 1, bestStreak: 1, lastVisitKey: dayKey, nextMessAt: now + 5.5 * HOUR,
    sleepingUntil: 0, awayMinutes: 0, memories: [], visualRevision: 1, animationSlots: {},
    aiCharacter: false, characterVariants: {}, aiRooms: {}, aiScenes: {}, sceneAnimationSlots: {},
    notificationsEnabled: false, guideSeen: false,
    decorations: {}, claimedMilestones: [],
  };
}

export const defaultState: GameState = createDefaultState();

export const decorMeta: Record<DecorKey, { title: string; note: string; price: number; unlockStage: StageId }> = {
  lamp: { title: "מנורת כוכבים", note: "אור רך שנדלק בערב", price: 120, unlockStage: "baby" },
  poster: { title: "פוסטר גיבורים", note: "השראה על הקיר", price: 100, unlockStage: "baby" },
  rug: { title: "שטיח עננים", note: "רך מתחת לרגליים", price: 150, unlockStage: "baby" },
  plant: { title: "עציץ שמח", note: "חבר ירוק ושקט", price: 180, unlockStage: "baby" },
  radio: { title: "רדיו רטרו", note: "פסקול קטן לחדר", price: 240, unlockStage: "baby" },
  trophy: { title: "גביע נוצץ", note: "הוכחה שאנחנו אלופים", price: 400, unlockStage: "baby" },
  bookshelf: { title: "ספריית כיס", note: "שמונה ספרים ותירוץ אחד לא לישון", price: 500, unlockStage: "grown" },
  aquarium: { title: "אקווריום זעיר", note: "שני דגים ובועה אחת חשובה מאוד", price: 650, unlockStage: "grown" },
  telescope: { title: "טלסקופ חלון", note: "הכוכבים פתאום במרחק נגיעה", price: 800, unlockStage: "grown" },
  fireplace: { title: "אח מפצפצת", note: "חום קטן ופצפוצים בזמנים אקראיים", price: 1100, unlockStage: "mentor" },
  projector: { title: "מקרן גלקסיות", note: "התקרה הופכת לשמיים, בלחיצה", price: 1400, unlockStage: "mentor" },
  icecream: { title: "מכונת גלידה", note: "שלושה כדורים, בלי שאלות מיותרות", price: 1800, unlockStage: "mentor" },
};

export const streakMilestones: Array<{ days: number; reward: number }> = [
  { days: 3, reward: 30 }, { days: 7, reward: 60 }, { days: 14, reward: 120 }, { days: 30, reward: 300 },
  { days: 60, reward: 600 }, { days: 100, reward: 1200 },
];

export const questPool: Record<QuestId, { title: string; target: number; reward: number }> = {
  care4: { title: "ארבע פעולות טיפול", target: 4, reward: 25 },
  care8: { title: "יום טיפול גדול", target: 8, reward: 45 },
  arcadeOne: { title: "סיבוב אחד במשחקייה", target: 1, reward: 35 },
  arcadeTwo: { title: "פעמיים במשחקייה", target: 2, reward: 50 },
  happyPeak: { title: "שמחה מעל 85", target: 1, reward: 20 },
  fullSet: { title: "כל ארבעת סוגי הטיפול", target: 4, reward: 30 },
  bedtime: { title: "שינה אחרי 20:00", target: 1, reward: 30 },
  cleanTwice: { title: "פעמיים ניקיון", target: 2, reward: 25 },
  starAce: { title: "25 כוכבים בריצה אחת", target: 1, reward: 45 },
  guessAce: { title: "4 ניחושים מתוך 5", target: 1, reward: 45 },
  shopping: { title: "קנייה אחת בחנות", target: 1, reward: 25 },
  brightRoom: { title: "כל המדדים מעל 60", target: 1, reward: 30 },
};

export const weeklyQuest = { title: "20 פעולות טיפול מועילות השבוע", target: 20, reward: 150 };

const questIds = Object.keys(questPool) as QuestId[];
const careQuests: QuestId[] = ["care4", "care8"];
const hashKey = (value: string) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193);
  return (hash ^ (hash >>> 16)) >>> 0;
};

export function rollDailyQuests(dayKey: string, slots: number): QuestId[] {
  const count = Math.max(1, Math.min(questIds.length, Math.floor(slots)));
  const ranked = [...questIds].sort((a, b) => hashKey(`${dayKey}|${a}`) - hashKey(`${dayKey}|${b}`) || (a < b ? -1 : 1));
  const care = ranked.find((id) => careQuests.includes(id)) as QuestId;
  const picked = [care, ...ranked.filter((id) => id !== care).slice(0, count - 1)];
  return ranked.filter((id) => picked.includes(id));
}

export function recordPurchase(state: GameState): GameState {
  return { ...state, questProgress: { ...state.questProgress, shopping: 1 } };
}

export function buyDecoration(state: GameState, key: DecorKey, now = Date.now()): GameState {
  if (state.decorations[key]) return state;
  const { price } = decorMeta[key];
  if (state.coins < price || !isDecorUnlocked(state, key, now)) return state;
  return recordPurchase({ ...state, coins: state.coins - price, decorations: { ...state.decorations, [key]: true }, xp: state.xp + 15 });
}

export function isDecorUnlocked(state: GameState, key: DecorKey, now = Date.now()) {
  return stageOrder.indexOf(currentStage(state, now)) >= stageOrder.indexOf(decorMeta[key].unlockStage);
}

export function claimStreakMilestone(state: GameState, days: number): GameState {
  const milestone = streakMilestones.find((entry) => entry.days === days);
  if (!milestone || state.bestStreak < days || state.claimedMilestones.includes(days)) return state;
  return { ...state, coins: state.coins + milestone.reward, xp: state.xp + milestone.reward, claimedMilestones: [...state.claimedMilestones, days] };
}

export function recordArcadeRun(state: GameState, kind: "star" | "guess", score: number): GameState {
  const progress: Record<string, number> = {
    ...state.questProgress,
    arcadeOne: (state.questProgress.arcadeOne ?? 0) + 1,
    arcadeTwo: (state.questProgress.arcadeTwo ?? 0) + 1,
  };
  if (kind === "star" && score >= 25) progress.starAce = 1;
  if (kind === "guess" && score >= 4) progress.guessAce = 1;
  return { ...state, arcadePlays: state.arcadePlays + 1, questProgress: progress };
}

export function claimDailyQuest(state: GameState, id: QuestId): GameState {
  const quest = questPool[id];
  if (!quest || !state.dailyQuests.includes(id) || state.claimed.includes(id)) return state;
  if ((state.questProgress[id] ?? 0) < quest.target) return state;
  return { ...state, coins: state.coins + quest.reward, xp: state.xp + 8, claimed: [...state.claimed, id] };
}

export function claimWeekly(state: GameState): GameState {
  if (state.weeklyClaimed || state.weeklyProgress < weeklyQuest.target) return state;
  return { ...state, coins: state.coins + weeklyQuest.reward, xp: state.xp + 100, weeklyClaimed: true };
}

export const personaBuildMeta: Record<PersonalityId, { title: string; note: string }> = {
  curious: { title: "נפש חוקרת", note: "+10% מטבעות מהמשחקייה" },
  cozy: { title: "נשמה נעימה", note: "דעיכה איטית בשינה ותנומות ארוכות יותר" },
  comic: { title: "קומיקאי הבית", note: "שמחה נוספת מכל משחק ומטבע צחוק כל פעולה רביעית" },
};

export function chooseBuild(state: GameState, id: PersonalityId): GameState {
  if (state.personaBuild !== "" || state.personality[id] < 25) return state;
  return { ...state, personaBuild: id, xp: state.xp + 20 };
}

export const arcadeRewardBonus = (state: GameState) => (state.personaBuild === "curious" ? 1.1 : 1);

export const stageMeta: Record<StageId, { title: string; minXp: number; minDay: number }> = {
  baby: { title: "חדש פה", minXp: 0, minDay: 1 },
  kid: { title: "מתרגל", minXp: 160, minDay: 2 },
  teen: { title: "פורח", minXp: 420, minDay: 4 },
  grown: { title: "חבר ותיק", minXp: 850, minDay: 7 },
  mentor: { title: "מנטור השכונה", minXp: 2600, minDay: 14 },
  legend: { title: "אגדה מקומית", minXp: 6000, minDay: 30 },
};

export const stageUnlocks: Record<StageId, string> = {
  baby: "ארבע פעולות הטיפול, המשחקייה והמשימות היומיות הראשונות",
  kid: "נפתחה משימה יומית רביעית",
  teen: "נפתח מצב הימור במשחק הניחושים",
  grown: "נפתח המדף השני בחנות הקישוטים",
  mentor: "נפתח מדף הקישוטים השלישי",
  legend: "הכול פתוח: החדר מלא, החנות ריקה, והשכונה כבר מספרת על זה סיפורים",
};

export function ageDay(state: GameState, now = Date.now()) {
  return Math.max(1, Math.floor((now - state.birthAt) / DAY) + 1);
}

export function currentStage(state: GameState, now = Date.now()): StageId {
  const day = ageDay(state, now);
  if (state.xp >= 6000 && day >= 30) return "legend";
  if (state.xp >= 2600 && day >= 14) return "mentor";
  if (state.xp >= 850 && day >= 7) return "grown";
  if (state.xp >= 420 && day >= 4) return "teen";
  if (state.xp >= 160 && day >= 2) return "kid";
  return "baby";
}

export function nextStage(state: GameState, now = Date.now()) {
  const stage = currentStage(state, now);
  const last = stageOrder[stageOrder.length - 1];
  if (stage === last) return { id: stage, target: stageMeta[last].minXp, progress: 100, xpProgress: 100, dayProgress: 100 };
  const next = stageOrder[stageOrder.indexOf(stage) + 1];
  const start = stageMeta[stage].minXp;
  const target = stageMeta[next].minXp;
  const xpProgress = clamp(((state.xp - start) / (target - start)) * 100);
  const dayStart = stageMeta[stage].minDay;
  const dayProgress = clamp(((ageDay(state, now) - dayStart) / (stageMeta[next].minDay - dayStart)) * 100);
  return { id: next, target, progress: Math.min(xpProgress, dayProgress), xpProgress, dayProgress };
}

export const arcadePayoutScale = (plays: number) => (plays < 3 ? 1 : 0.25);

export function applyElapsed(state: GameState, now = Date.now()): GameState {
  const elapsedHours = Math.max(0, now - state.lastSeen) / HOUR;
  const hours = Math.min(72, elapsedHours);
  if (now < state.lastSeen) return { ...state, lastSeen: now };
  if (hours <= 0) return state;
  const wasSleeping = state.sleeping && state.sleepingUntil > state.lastSeen;
  const sleepHours = wasSleeping ? Math.max(0, Math.min(now, state.sleepingUntil) - state.lastSeen) / HOUR : 0;
  const awakeHours = Math.max(0, hours - sleepHours);
  const illnessDrag = state.sick ? 1.4 : 1;
  const restfulness = state.personaBuild === "cozy" ? .9 : 1;
  const fullness = clamp(state.fullness - sleepHours * 1.3 * restfulness - awakeHours * 3.1);
  const energy = clamp(state.energy + sleepHours * 24 - awakeHours * 2.1 * illnessDrag);
  const hygiene = clamp(state.hygiene - hours * 1.45);
  const mood = clamp(state.mood - sleepHours * .45 * restfulness - awakeHours * 1.65 * illnessDrag);
  const extraPoop = now >= state.nextMessAt ? Math.min(3, 1 + Math.floor((now - state.nextMessAt) / (5.5 * HOUR))) : 0;
  const poop = Math.min(3, state.poop + extraPoop);
  const values = [fullness, energy, hygiene, mood];
  const dangerCount = values.filter((value) => value < 18).length;
  const carePressure = values.reduce((sum, value) => sum + Math.max(0, 65 - value) / 65, 0);
  const currentKey = localDayKey(new Date(now));
  const dayChanged = currentKey !== state.dailyKey;
  const consecutive = state.lastVisitKey === previousLocalDayKey(new Date(now));
  const streak = dayChanged ? (consecutive ? state.streak + 1 : 1) : state.streak;
  const rolling = dayChanged || !state.dailyQuests.length;
  const weekKey = localWeekKey(new Date(now));
  const weekChanged = weekKey !== state.weeklyKey;
  const napDone = wasSleeping && now >= state.sleepingUntil && state.napBonus > 0;
  return {
    ...state, fullness, energy, hygiene, mood, poop,
    sick: state.sick || hygiene < 12 || poop >= 3,
    sleeping: wasSleeping && now < state.sleepingUntil,
    careScore: clamp(state.careScore - hours * (.18 + carePressure * .3 + dangerCount * .7)),
    careMistakes: state.careMistakes + (hours >= 1 ? dangerCount : 0),
    nextMessAt: extraPoop ? state.nextMessAt + extraPoop * 5.5 * HOUR : state.nextMessAt,
    dailyKey: currentKey,
    lastVisitKey: currentKey,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    dailyQuests: rolling ? rollDailyQuests(currentKey, currentStage(state, now) === "baby" ? 3 : 4) : state.dailyQuests,
    questProgress: rolling ? {} : state.questProgress,
    dailyActionKinds: rolling ? [] : state.dailyActionKinds,
    claimed: rolling ? [] : state.claimed,
    weeklyKey: weekKey,
    weeklyProgress: weekChanged ? 0 : state.weeklyProgress,
    weeklyClaimed: weekChanged ? false : state.weeklyClaimed,
    arcadePlays: dayChanged ? 0 : state.arcadePlays,
    coins: (dayChanged ? state.coins + 10 + 2 * Object.values(state.decorations).filter(Boolean).length : state.coins) + (napDone ? state.napBonus : 0),
    napBonus: napDone ? 0 : state.napBonus,
    pendingNapReward: napDone ? state.napBonus : state.pendingNapReward,
    awayMinutes: hours >= .25 ? Math.round(elapsedHours * 60) : state.awayMinutes,
    lastSeen: now,
  };
}

const actionNeed: Record<ActionKey, NeedKey> = { feed: "fullness", sleep: "energy", clean: "hygiene", play: "mood" };

export function performCareAction(state: GameState, action: ActionKey, now = Date.now()): GameState {
  const need = state[actionNeed[action]];
  const usefulCare = Math.max(4, Math.min(10, Math.round((95 - need) / 9)));
  const hour = new Date(now).getHours();
  const night = hour < 7 || hour >= 20;
  const cozy = state.personaBuild === "cozy";
  const comic = state.personaBuild === "comic";
  const napStart = action === "sleep" && !state.sleeping;
  const meaningful = action === "feed" ? state.fullness < 90
    : action === "sleep" ? !state.sleeping && state.energy < 90
    : action === "clean" ? state.hygiene < 90 || state.poop > 0
    : state.mood < 90;
  const kinds = !meaningful || state.dailyActionKinds.includes(action) ? state.dailyActionKinds : [...state.dailyActionKinds, action];
  const actionCount = state.actions + (meaningful ? 1 : 0);
  const next: GameState = {
    ...state,
    xp: state.xp + (meaningful ? usefulCare : 0),
    actions: actionCount,
    careScore: meaningful ? clamp(state.careScore + Math.max(3, usefulCare / 2)) : state.careScore,
    lastSeen: now,
    sleeping: action === "sleep" ? !state.sleeping : false,
    sleepingUntil: napStart ? now + (night ? 60 : 30) * (cozy ? 1.5 : 1) * 60_000 : 0,
    napBonus: napStart ? (night ? 30 : 15) : action === "sleep" || state.sleeping ? 0 : state.napBonus,
    dailyActionKinds: kinds,
    weeklyProgress: state.weeklyProgress + (meaningful ? 1 : 0),
    personality: { ...state.personality },
    questProgress: { ...state.questProgress },
  };
  if (action === "feed") {
    next.fullness = clamp(state.fullness + 24); next.energy = clamp(state.energy + 3);
    if (meaningful) next.personality.cozy += 1;
  }
  if (action === "sleep") {
    next.energy = clamp(state.energy + (state.sleeping ? 0 : night ? 10 : 5));
    next.fullness = clamp(state.fullness - (state.sleeping ? 0 : 2));
    if (meaningful) next.personality.cozy += 2;
  }
  if (action === "clean") {
    next.hygiene = 100; next.poop = 0; next.nextMessAt = now + 5.5 * HOUR;
    next.sick = state.sick;
    if (meaningful) next.personality.curious += 1;
  }
  if (action === "play") {
    next.mood = clamp(state.mood + 25 + (comic ? 6 : 0)); next.energy = clamp(state.energy - 6); next.fullness = clamp(state.fullness - 3);
    if (meaningful) next.personality.comic += 2;
  }
  if (meaningful) {
    next.questProgress.care4 = (state.questProgress.care4 ?? 0) + 1;
    next.questProgress.care8 = (state.questProgress.care8 ?? 0) + 1;
    next.questProgress.fullSet = kinds.length;
    if (action === "clean") next.questProgress.cleanTwice = (state.questProgress.cleanTwice ?? 0) + 1;
    if (napStart && hour >= 20) next.questProgress.bedtime = 1;
    if (next.mood >= 85) next.questProgress.happyPeak = 1;
    if (next.fullness >= 60 && next.energy >= 60 && next.hygiene >= 60 && next.mood >= 60) next.questProgress.brightRoom = 1;
    if (usefulCare > 4 && next.actions % 6 === 0) next.coins += 12;
    if (comic && next.actions % 4 === 0) next.coins += 5;
  }
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
