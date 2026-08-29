import assert from "node:assert/strict";
import test from "node:test";
import {
  DAY,
  HOUR,
  absenceMessage,
  applyElapsed,
  arcadePayoutScale,
  arcadeRewardBonus,
  buyDecoration,
  chooseBuild,
  claimDailyQuest,
  claimStreakMilestone,
  claimWeekly,
  createDefaultState,
  currentStage,
  decorMeta,
  defaultState,
  isDecorUnlocked,
  localDayKey,
  localWeekKey,
  nextStage,
  performCareAction,
  personaBuildMeta,
  questPool,
  recordArcadeRun,
  recordPurchase,
  rollDailyQuests,
  stageMeta,
  stageUnlocks,
  useInventoryItem,
  weeklyQuest,
} from "../src/gameEngine.ts";

function stateAt(now, overrides = {}) {
  return {
    ...createDefaultState(now),
    onboarded: true,
    birthAt: now,
    lastSeen: now,
    dailyKey: localDayKey(new Date(now)),
    lastVisitKey: localDayKey(new Date(now)),
    weeklyKey: localWeekKey(new Date(now)),
    nextMessAt: now + 5.5 * HOUR,
    ...overrides,
  };
}

test("a fresh install has no forced name, animal, or completed onboarding", () => {
  assert.equal(defaultState.version, 5);
  assert.equal(defaultState.onboarded, false);
  assert.equal(defaultState.name, "");
  assert.equal(defaultState.characterKind, "");
  assert.equal(defaultState.photo, undefined);
  assert.equal(defaultState.arcadePlays, 0);
  assert.equal(defaultState.personaBuild, "");
  assert.equal(defaultState.napBonus, 0);
  assert.equal(defaultState.pendingNapReward, 0);
  assert.deepEqual(defaultState.dailyQuests, []);
  assert.deepEqual(defaultState.questProgress, {});
  assert.deepEqual(defaultState.dailyActionKinds, []);
  assert.equal(defaultState.weeklyProgress, 0);
  assert.equal(defaultState.weeklyClaimed, false);
  assert.deepEqual(defaultState.aiRooms, {});
});

test("a newly created or reset state receives fresh calendar and mess timestamps", () => {
  const first = new Date(2026, 7, 24, 23, 55).getTime();
  const second = new Date(2026, 7, 25, 8, 10).getTime();
  const state = createDefaultState(second);
  assert.equal(state.birthAt, second);
  assert.equal(state.lastSeen, second);
  assert.equal(state.dailyKey, localDayKey(new Date(second)));
  assert.equal(state.weeklyKey, localWeekKey(new Date(second)));
  assert.equal(state.nextMessAt, second + 5.5 * HOUR);
  assert.notEqual(state.dailyKey, createDefaultState(first).dailyKey);
});

test("care score visibly declines with elapsed time even before a crisis", () => {
  const now = new Date(2026, 7, 24, 10).getTime();
  const result = applyElapsed(stateAt(now, { careScore: 90 }), now + 8 * HOUR);
  assert.ok(result.careScore < 90);
  assert.ok(result.careScore > 0);
});

test("absence recap changes with time and stays warm", () => {
  assert.match(absenceMessage("נועה", 20), /20 דקות/);
  assert.match(absenceMessage("נועה", 180), /3 שעות/);
  assert.match(absenceMessage("נועה", 24 * 60), /געגוע/);
  for (const minutes of [20, 180, 24 * 60]) assert.doesNotMatch(absenceMessage("נועה", minutes), /(^|\s)(התגעגע|ניהל|שמר|העמיד)(\s|$)/);
  assert.doesNotMatch(absenceMessage("נועה", 24 * 60), /אשמתך|נטשת/);
});

test("awake needs decay during an open-session-sized interval", () => {
  const now = new Date(2026, 7, 24, 10).getTime();
  const result = applyElapsed(stateAt(now), now + 30 * 60_000);
  assert.ok(result.fullness < defaultState.fullness);
  assert.ok(result.energy < defaultState.energy);
  assert.ok(result.hygiene < defaultState.hygiene);
  assert.ok(result.mood < defaultState.mood);
  assert.equal(result.lastSeen, now + 30 * 60_000);
});

test("sleep restores energy and ends after the scheduled nap", () => {
  const now = new Date(2026, 7, 24, 10).getTime();
  const sleeping = stateAt(now, { energy: 40, sleeping: true, sleepingUntil: now + 30 * 60_000 });
  const result = applyElapsed(sleeping, now + HOUR);
  assert.ok(result.energy > sleeping.energy);
  assert.equal(result.sleeping, false);
  assert.equal(result.sleepingUntil, sleeping.sleepingUntil);
});

test("mess is scheduled by absolute time and does not duplicate every minute", () => {
  const now = new Date(2026, 7, 24, 10).getTime();
  const first = applyElapsed(stateAt(now, { nextMessAt: now + HOUR }), now + 2 * HOUR);
  assert.equal(first.poop, 1);
  const second = applyElapsed(first, now + 2 * HOUR + 60_000);
  assert.equal(second.poop, 1);
});

test("consecutive daily return rolls fresh quests, increments streak, and grants daily coins", () => {
  const yesterday = new Date(2026, 7, 23, 20).getTime();
  const today = new Date(2026, 7, 24, 8).getTime();
  const stale = stateAt(yesterday, {
    streak: 3, bestStreak: 3, coins: 50,
    dailyQuests: ["care8", "shopping"], questProgress: { care4: 3, shopping: 1 }, dailyActionKinds: ["feed", "play"], claimed: ["shopping"],
  });
  const result = applyElapsed(stale, today);
  assert.equal(result.streak, 4);
  assert.equal(result.bestStreak, 4);
  assert.equal(result.coins, 60);
  assert.deepEqual(result.questProgress, {});
  assert.deepEqual(result.dailyActionKinds, []);
  assert.deepEqual(result.claimed, []);
  assert.equal(result.dailyQuests.length, 3);
  assert.deepEqual(result.dailyQuests, rollDailyQuests(localDayKey(new Date(today)), 3));
  const older = applyElapsed(stateAt(yesterday, { xp: 300, birthAt: yesterday - 3 * DAY }), today);
  assert.equal(older.dailyQuests.length, 4);
  assert.deepEqual(older.dailyQuests, rollDailyQuests(localDayKey(new Date(today)), 4));
});

test("daily quests are rolled deterministically, distinctly, and always include care", () => {
  for (const key of ["2026-08-24", "2026-01-01", "2026-12-31", "2027-06-15"]) {
    for (const slots of [3, 4, 5]) {
      const rolled = rollDailyQuests(key, slots);
      assert.equal(rolled.length, slots);
      assert.equal(new Set(rolled).size, slots);
      assert.ok(rolled.some((id) => id === "care4" || id === "care8"));
      assert.deepEqual(rollDailyQuests(key, slots), rolled);
      for (const id of rolled) assert.ok(questPool[id]);
    }
  }
  assert.notDeepEqual(rollDailyQuests("2026-08-24", 4), rollDailyQuests("2026-08-25", 4));
});

test("a daily quest pays out once, and only when rolled and finished", () => {
  const now = new Date(2026, 7, 24, 10).getTime();
  const base = stateAt(now, { coins: 10, xp: 40, dailyQuests: ["care4", "shopping"], questProgress: { care4: 3 } });
  assert.equal(claimDailyQuest(base, "care4"), base);
  const ready = { ...base, questProgress: { ...base.questProgress, care4: 4 } };
  const claimed = claimDailyQuest(ready, "care4");
  assert.equal(claimed.coins, 10 + questPool.care4.reward);
  assert.equal(claimed.xp, 48);
  assert.deepEqual(claimed.claimed, ["care4"]);
  assert.equal(claimDailyQuest(claimed, "care4"), claimed);
  const notRolled = { ...ready, questProgress: { ...ready.questProgress, cleanTwice: 5 } };
  assert.equal(claimDailyQuest(notRolled, "cleanTwice"), notRolled);
});

test("care actions feed the quest counters the UI reads", () => {
  const now = new Date(2026, 7, 24, 21).getTime();
  const base = stateAt(now, { fullness: 70, energy: 70, hygiene: 70, mood: 70 });
  const one = performCareAction(base, "clean", now);
  const two = performCareAction({ ...one, hygiene: 70, poop: 1 }, "clean", now);
  assert.equal(two.questProgress.care4, 2);
  assert.equal(two.questProgress.care8, 2);
  assert.equal(two.questProgress.cleanTwice, 2);
  assert.equal(two.questProgress.fullSet, 1);
  assert.equal(two.weeklyProgress, 2);
  const bed = performCareAction(two, "sleep", now);
  assert.equal(bed.questProgress.bedtime, 1);
  const full = ["feed", "play"].reduce((game, action) => performCareAction(game, action, now), bed);
  assert.equal(full.questProgress.fullSet, 4);
  assert.equal(full.questProgress.happyPeak, 1);
  assert.equal(full.questProgress.brightRoom, 1);
  assert.equal(performCareAction(stateAt(now, { mood: 20, fullness: 10 }), "clean", now).questProgress.brightRoom, undefined);
});

test("the weekly quest rolls over on Monday and pays out once", () => {
  const monday = new Date(2026, 7, 24, 9).getTime();
  const nextMonday = new Date(2026, 7, 31, 9).getTime();
  assert.equal(localWeekKey(new Date(2026, 7, 30, 23)), localWeekKey(new Date(monday)));
  assert.notEqual(localWeekKey(new Date(nextMonday)), localWeekKey(new Date(monday)));
  const busy = stateAt(monday, { weeklyProgress: 25, weeklyClaimed: true });
  const sameWeek = applyElapsed(busy, monday + 6 * DAY);
  assert.equal(sameWeek.weeklyProgress, 25);
  assert.equal(sameWeek.weeklyClaimed, true);
  const fresh = applyElapsed(busy, nextMonday);
  assert.equal(fresh.weeklyProgress, 0);
  assert.equal(fresh.weeklyClaimed, false);
  assert.equal(fresh.weeklyKey, localWeekKey(new Date(nextMonday)));
  const ready = stateAt(monday, { coins: 5, xp: 10, weeklyProgress: weeklyQuest.target });
  const paid = claimWeekly(ready);
  assert.equal(paid.coins, 5 + weeklyQuest.reward);
  assert.equal(paid.xp, 110);
  assert.equal(paid.weeklyClaimed, true);
  assert.equal(claimWeekly(paid), paid);
  const short = stateAt(monday, { weeklyProgress: weeklyQuest.target - 1 });
  assert.equal(claimWeekly(short), short);
});

test("arcade runs are recorded in the engine with their ace thresholds", () => {
  const now = new Date(2026, 7, 24, 10).getTime();
  const base = stateAt(now, { arcadePlays: 1 });
  const once = recordArcadeRun(base, "star", 24);
  assert.equal(once.arcadePlays, 2);
  assert.equal(once.questProgress.arcadeOne, 1);
  assert.equal(once.questProgress.arcadeTwo, 1);
  assert.equal(once.questProgress.starAce, undefined);
  const twice = recordArcadeRun(once, "star", 25);
  assert.equal(twice.arcadePlays, 3);
  assert.equal(twice.questProgress.arcadeTwo, 2);
  assert.equal(twice.questProgress.starAce, 1);
  assert.equal(recordArcadeRun(base, "guess", 3).questProgress.guessAce, undefined);
  assert.equal(recordArcadeRun(base, "guess", 4).questProgress.guessAce, 1);
  assert.equal(recordPurchase(base).questProgress.shopping, 1);
});

test("return after a missed day resets current streak", () => {
  const old = new Date(2026, 7, 20, 20).getTime();
  const now = new Date(2026, 7, 24, 8).getTime();
  const result = applyElapsed(stateAt(old, { streak: 5, bestStreak: 5 }), now);
  assert.equal(result.streak, 1);
  assert.equal(result.bestStreak, 5);
});

test("evolution requires both XP and elapsed days", () => {
  const now = new Date(2026, 7, 24, 10).getTime();
  const highXpDayOne = stateAt(now, { xp: 900 });
  assert.equal(currentStage(highXpDayOne, now), "baby");
  assert.equal(currentStage({ ...highXpDayOne, birthAt: now - DAY }, now), "kid");
  assert.equal(currentStage({ ...highXpDayOne, birthAt: now - 3 * DAY }, now), "teen");
  assert.equal(currentStage({ ...highXpDayOne, birthAt: now - 6 * DAY }, now), "grown");
});

test("the late stages need both the long XP climb and the calendar", () => {
  const now = new Date(2026, 7, 24, 10).getTime();
  assert.equal(stageMeta.mentor.minXp, 2600);
  assert.equal(stageMeta.mentor.minDay, 14);
  assert.equal(stageMeta.legend.minXp, 6000);
  assert.equal(stageMeta.legend.minDay, 30);
  assert.equal(currentStage(stateAt(now, { xp: 6000, birthAt: now - 6 * DAY }), now), "grown");
  assert.equal(currentStage(stateAt(now, { xp: 2599, birthAt: now - 13 * DAY }), now), "grown");
  assert.equal(currentStage(stateAt(now, { xp: 2600, birthAt: now - 13 * DAY }), now), "mentor");
  assert.equal(currentStage(stateAt(now, { xp: 6000, birthAt: now - 20 * DAY }), now), "mentor");
  assert.equal(currentStage(stateAt(now, { xp: 6000, birthAt: now - 29 * DAY }), now), "legend");
  for (const id of ["baby", "kid", "teen", "grown", "mentor", "legend"]) {
    assert.ok(stageMeta[id].title.length > 2);
    assert.ok(stageUnlocks[id].length > 8);
  }
});

test("next-stage progress is gated by the slower of time and XP", () => {
  const now = Date.now();
  const dayOne = stateAt(now, { xp: 160 });
  const progress = nextStage(dayOne, now);
  assert.equal(progress.id, "kid");
  assert.equal(progress.xpProgress, 100);
  assert.equal(progress.dayProgress, 0);
  assert.equal(progress.progress, 0);
  const midTeen = stateAt(now, { xp: 420, birthAt: now - 4 * DAY });
  const teenProgress = nextStage(midTeen, now);
  assert.equal(teenProgress.id, "grown");
  assert.equal(teenProgress.dayProgress, 33.33);
  assert.equal(teenProgress.xpProgress, 0);
  assert.equal(teenProgress.progress, 0);
});

test("progress keeps climbing past grown and only legend is capped", () => {
  const now = Date.now();
  const grown = nextStage(stateAt(now, { xp: 850, birthAt: now - 6 * DAY }), now);
  assert.equal(grown.id, "mentor");
  assert.equal(grown.target, 2600);
  assert.equal(grown.progress, 0);
  const mentor = nextStage(stateAt(now, { xp: 4300, birthAt: now - 20 * DAY }), now);
  assert.equal(mentor.id, "legend");
  assert.equal(mentor.target, 6000);
  assert.equal(mentor.xpProgress, 50);
  assert.ok(mentor.dayProgress > 0 && mentor.dayProgress < 100);
  const legend = nextStage(stateAt(now, { xp: 7000, birthAt: now - 40 * DAY }), now);
  assert.deepEqual(legend, { id: "legend", target: 6000, progress: 100, xpProgress: 100, dayProgress: 100 });
});

test("long absence is capped and remains recoverable", () => {
  const now = Date.now();
  const result = applyElapsed(stateAt(now), now + 30 * DAY);
  assert.equal(result.lastSeen, now + 30 * DAY);
  assert.ok(result.fullness >= 0 && result.energy >= 0 && result.hygiene >= 0 && result.mood >= 0);
  assert.equal("dead" in result, false);
});

test("a long absence reports the real elapsed time, not the decay cap", () => {
  const now = Date.now();
  const result = applyElapsed(stateAt(now), now + 30 * DAY);
  assert.equal(result.awayMinutes, 30 * 24 * 60);
  assert.match(absenceMessage("נועה", result.awayMinutes), /30 ימים/);
});

test("all four care actions change the intended needs and personality", () => {
  const now = Date.now();
  const base = stateAt(now, { fullness: 30, energy: 30, hygiene: 20, mood: 30, poop: 2 });
  const fed = performCareAction(base, "feed", now);
  const sleeping = performCareAction(base, "sleep", now);
  const clean = performCareAction(base, "clean", now);
  const played = performCareAction(base, "play", now);
  assert.ok(fed.fullness > base.fullness && fed.personality.cozy > 0);
  assert.ok(sleeping.energy > base.energy && sleeping.sleeping && sleeping.sleepingUntil > now);
  assert.equal(clean.hygiene, 100); assert.equal(clean.poop, 0);
  assert.ok(played.mood > base.mood && played.energy < base.energy && played.personality.comic > 0);
  for (const result of [fed, sleeping, clean, played]) assert.ok(result.xp > base.xp);
});

test("care rewards stop when a need is already full", () => {
  const now = Date.now();
  const urgent = performCareAction(stateAt(now, { fullness: 5 }), "feed", now);
  const alreadyFull = performCareAction(stateAt(now, { fullness: 100 }), "feed", now);
  assert.ok(urgent.xp > alreadyFull.xp);
  assert.equal(alreadyFull.xp, 0);
  assert.equal(alreadyFull.actions, 0);
  assert.equal(alreadyFull.weeklyProgress, 0);
  assert.equal(alreadyFull.questProgress.care4, undefined);
});

test("every sixth care action grants the room discovery bonus", () => {
  const now = Date.now();
  const result = performCareAction(stateAt(now, { actions: 5, coins: 10, mood: 30 }), "play", now);
  assert.equal(result.actions, 6);
  assert.equal(result.coins, 22);
});

test("the discovery bonus is not farmable by repeating a filled need", () => {
  const now = Date.now();
  const result = performCareAction(stateAt(now, { actions: 5, coins: 10, mood: 100 }), "play", now);
  assert.equal(result.actions, 5);
  assert.equal(result.coins, 10);
});

test("interrupting sleep wakes the companion without farming progress", () => {
  const now = Date.now();
  const napping = performCareAction(stateAt(now, { energy: 40 }), "sleep", now);
  const woken = performCareAction(napping, "sleep", now + 1000);
  assert.equal(woken.sleeping, false);
  assert.equal(woken.actions, napping.actions);
  assert.equal(woken.xp, napping.xp);
  assert.equal(woken.weeklyProgress, napping.weeklyProgress);
});

test("a personality build is picked once, at 25 points, and changes the day", () => {
  const now = new Date(2026, 7, 24, 12).getTime();
  const shy = stateAt(now, { personality: { curious: 24, cozy: 0, comic: 0 } });
  assert.equal(chooseBuild(shy, "curious"), shy);
  const ready = stateAt(now, { xp: 100, personality: { curious: 25, cozy: 30, comic: 26 } });
  const curious = chooseBuild(ready, "curious");
  assert.equal(curious.personaBuild, "curious");
  assert.equal(curious.xp, 120);
  assert.equal(chooseBuild(curious, "cozy"), curious);
  assert.equal(arcadeRewardBonus(ready), 1);
  assert.equal(arcadeRewardBonus(curious), 1.1);
  const cozyNap = performCareAction(chooseBuild(ready, "cozy"), "sleep", now);
  assert.equal(cozyNap.sleepingUntil, now + 45 * 60_000);
  assert.equal(performCareAction(ready, "sleep", now).sleepingUntil, now + 30 * 60_000);
  const comic = chooseBuild({ ...ready, actions: 3, coins: 10, mood: 40 }, "comic");
  const laugh = performCareAction(comic, "play", now);
  assert.equal(laugh.actions, 4);
  assert.equal(laugh.coins, 15);
  assert.ok(performCareAction({ ...comic, mood: 40 }, "play", now).mood > performCareAction({ ...ready, mood: 40 }, "play", now).mood);
  for (const id of ["curious", "cozy", "comic"]) assert.ok(personaBuildMeta[id].title.length > 2 && personaBuildMeta[id].note.length > 4);
});

test("a completed nap pays a bonus, and an interrupted one pays nothing", () => {
  const now = new Date(2026, 7, 24, 12).getTime();
  const napping = performCareAction(stateAt(now, { coins: 10, energy: 40 }), "sleep", now);
  assert.equal(napping.napBonus, 15);
  const rested = applyElapsed(napping, now + 40 * 60_000);
  assert.equal(rested.coins, 25);
  assert.equal(rested.pendingNapReward, 15);
  assert.equal(rested.napBonus, 0);
  assert.equal(applyElapsed(rested, now + 80 * 60_000).pendingNapReward, 15);
  const night = new Date(2026, 7, 24, 22).getTime();
  assert.equal(performCareAction(stateAt(night), "sleep", night).napBonus, 30);
  const woken = performCareAction(napping, "feed", now + 60_000);
  assert.equal(woken.napBonus, 0);
  assert.equal(applyElapsed(woken, now + 40 * 60_000).coins, 10);
  const cancelled = performCareAction(napping, "sleep", now + 60_000);
  assert.equal(cancelled.napBonus, 0);
  assert.equal(cancelled.sleeping, false);
});

test("cozy sleep loses less fullness and mood over a long nap", () => {
  const now = new Date(2026, 7, 24, 12).getTime();
  const base = { sleeping: true, sleepingUntil: now + 6 * HOUR };
  const plain = applyElapsed(stateAt(now, base), now + 6 * HOUR);
  const cozy = applyElapsed(stateAt(now, { ...base, personaBuild: "cozy" }), now + 6 * HOUR);
  assert.ok(cozy.fullness > plain.fullness);
  assert.ok(cozy.mood > plain.mood);
});

test("inventory use consumes exactly one item and applies its effect", () => {
  const now = Date.now();
  const base = stateAt(now, { fullness: 20, sick: true, inventory: { ...defaultState.inventory, apple: 1, medicine: 1 } });
  const apple = useInventoryItem(base, "apple", now);
  const medicine = useInventoryItem(base, "medicine", now);
  assert.equal(apple.inventory.apple, 0); assert.ok(apple.fullness > base.fullness);
  assert.equal(medicine.inventory.medicine, 0); assert.equal(medicine.sick, false);
});

test("a seven-day active playthrough reaches every evolution stage", () => {
  const start = new Date(2026, 7, 24, 9).getTime();
  let game = stateAt(start);
  const reached = new Set([currentStage(game)]);
  for (let day = 0; day < 7; day += 1) {
    const sessionTime = start + day * DAY;
    if (day > 0) game = applyElapsed(game, sessionTime);
    for (const action of ["feed", "sleep", "clean", "play", "feed", "clean", "play", "sleep"]) {
      game = performCareAction(game, action, sessionTime + game.actions * 1000);
    }
    // One good arcade run plus the daily quest claims.
    game = { ...game, xp: game.xp + 110, coins: game.coins + 80 };
    reached.add(currentStage(game, sessionTime));
  }
  assert.deepEqual([...reached], ["baby", "kid", "teen", "grown"]);
  assert.ok(game.xp >= 850);
  assert.equal(game.streak, 7);
});

test("buying a decoration costs coins once and rewards the room upgrade", () => {
  const now = new Date(2026, 7, 24, 10).getTime();
  const base = stateAt(now, { coins: 300, xp: 40 });
  const bought = buyDecoration(base, "rug", now);
  assert.equal(bought.coins, 300 - decorMeta.rug.price);
  assert.equal(bought.decorations.rug, true);
  assert.equal(bought.xp, 55);
  assert.equal(bought.questProgress.shopping, 1);
  assert.equal(buyDecoration(bought, "rug", now), bought);
  assert.equal(buyDecoration(stateAt(now, { coins: 30 }), "trophy", now).coins, 30);
  assert.equal(buyDecoration(stateAt(now, { coins: 30 }), "trophy", now).decorations.trophy, undefined);
});

test("the later shop shelves require the matching XP-and-time stage", () => {
  const now = new Date(2026, 7, 24, 10).getTime();
  const rich = stateAt(now, { coins: 5000 });
  assert.equal(decorMeta.bookshelf.unlockStage, "grown");
  assert.equal(decorMeta.fireplace.unlockStage, "mentor");
  assert.equal(buyDecoration(rich, "bookshelf", now), rich);
  assert.equal(buyDecoration(rich, "fireplace", now), rich);
  const oldWithoutXp = { ...rich, birthAt: now - 30 * DAY };
  assert.equal(isDecorUnlocked(oldWithoutXp, "bookshelf", now), false);
  const grown = { ...rich, xp: 850, birthAt: now - 6 * DAY };
  assert.equal(isDecorUnlocked(grown, "bookshelf", now), true);
  const shelf = buyDecoration(grown, "bookshelf", now);
  assert.equal(shelf.decorations.bookshelf, true);
  assert.equal(shelf.coins, 5000 - decorMeta.bookshelf.price);
  assert.equal(buyDecoration(grown, "projector", now), grown);
  const mentor = { ...rich, xp: 2600, birthAt: now - 13 * DAY };
  assert.equal(buyDecoration(mentor, "projector", now).decorations.projector, true);
});

test("the daily coin grant grows with a furnished room", () => {
  const yesterday = new Date(2026, 7, 23, 20).getTime();
  const today = new Date(2026, 7, 24, 8).getTime();
  const furnished = stateAt(yesterday, { coins: 50, decorations: { lamp: true, poster: true, rug: true } });
  assert.equal(applyElapsed(furnished, today).coins, 66);
});

test("streak milestones pay out once and only when reached", () => {
  const now = new Date(2026, 7, 24, 10).getTime();
  const base = stateAt(now, { coins: 20, xp: 100, streak: 7, bestStreak: 7 });
  const claimed = claimStreakMilestone(base, 7);
  assert.equal(claimed.coins, 80);
  assert.equal(claimed.xp, 160);
  assert.deepEqual(claimed.claimedMilestones, [7]);
  assert.equal(claimStreakMilestone(base, 14), base);
  assert.equal(claimStreakMilestone(claimed, 7), claimed);
  assert.equal(claimStreakMilestone(base, 9), base);
});

test("the long-haul milestones are reachable and pay their bigger rewards", () => {
  const now = new Date(2026, 7, 24, 10).getTime();
  const veteran = stateAt(now, { coins: 0, xp: 0, streak: 100, bestStreak: 100 });
  const sixty = claimStreakMilestone(veteran, 60);
  assert.equal(sixty.coins, 600);
  assert.equal(sixty.xp, 600);
  const hundred = claimStreakMilestone(sixty, 100);
  assert.equal(hundred.coins, 1800);
  assert.deepEqual(hundred.claimedMilestones, [60, 100]);
  const rookie = stateAt(now, { streak: 30, bestStreak: 59 });
  assert.equal(claimStreakMilestone(rookie, 60), rookie);
});

test("sickness deepens awake decay of energy and mood only", () => {
  const now = new Date(2026, 7, 24, 10).getTime();
  const healthy = applyElapsed(stateAt(now, { hygiene: 90 }), now + 6 * HOUR);
  const ill = applyElapsed(stateAt(now, { hygiene: 90, sick: true }), now + 6 * HOUR);
  assert.ok(ill.energy < healthy.energy);
  assert.ok(ill.mood < healthy.mood);
  assert.equal(ill.fullness, healthy.fullness);
  assert.equal(ill.hygiene, healthy.hygiene);
});

test("a clock set back only rewinds lastSeen and never freezes the game", () => {
  const now = new Date(2026, 7, 24, 10).getTime();
  const base = stateAt(now);
  const rewound = applyElapsed(base, base.lastSeen - HOUR);
  assert.equal(rewound.lastSeen, now - HOUR);
  assert.equal(rewound.fullness, base.fullness);
  assert.equal(rewound.energy, base.energy);
  assert.equal(rewound.hygiene, base.hygiene);
  assert.equal(rewound.mood, base.mood);
  assert.equal(rewound.streak, base.streak);
  const resumed = applyElapsed(rewound, now + HOUR);
  assert.equal(resumed.lastSeen, now + HOUR);
  assert.ok(resumed.fullness < base.fullness);
});

test("cleaning never cures sickness and medicine is the only cure", () => {
  const now = new Date(2026, 7, 24, 10).getTime();
  const ill = stateAt(now, { sick: true, hygiene: 8, poop: 3 });
  const once = performCareAction(ill, "clean", now);
  const twice = performCareAction(once, "clean", now);
  assert.equal(once.sick, true);
  assert.equal(twice.sick, true);
  assert.equal(useInventoryItem(twice, "medicine", now).sick, false);
  assert.equal(useInventoryItem(twice, "soap", now).sick, true);
});

test("arcade payouts shrink after three daily runs and reset with the day", () => {
  const yesterday = new Date(2026, 7, 23, 20).getTime();
  const today = new Date(2026, 7, 24, 8).getTime();
  assert.equal(arcadePayoutScale(0), 1);
  assert.equal(arcadePayoutScale(2), 1);
  assert.equal(arcadePayoutScale(3), 0.25);
  assert.equal(arcadePayoutScale(9), 0.25);
  assert.equal(applyElapsed(stateAt(yesterday, { arcadePlays: 5 }), today).arcadePlays, 0);
  assert.equal(applyElapsed(stateAt(today, { arcadePlays: 5 }), today + HOUR).arcadePlays, 5);
});

test("a diligent daily session keeps care score in the top grade", () => {
  const yesterday = new Date(2026, 7, 23, 9).getTime();
  const today = new Date(2026, 7, 24, 9).getTime();
  let game = applyElapsed(stateAt(yesterday, { fullness: 88, energy: 90, hygiene: 85, mood: 80 }), today);
  for (const action of ["feed", "clean", "play", "sleep", "feed", "play", "clean", "feed"]) {
    game = performCareAction(game, action, today + game.actions * 1000);
  }
  assert.ok(game.careScore >= 60);
});

test("naps follow the day and night rhythm", () => {
  const night = new Date(2026, 7, 24, 23).getTime();
  const day = new Date(2026, 7, 24, 12).getTime();
  const nightNap = performCareAction(stateAt(night, { energy: 40 }), "sleep", night);
  const dayNap = performCareAction(stateAt(day, { energy: 40 }), "sleep", day);
  assert.equal(nightNap.sleepingUntil, night + 60 * 60_000);
  assert.equal(nightNap.energy, 50);
  assert.equal(dayNap.sleepingUntil, day + 30 * 60_000);
  assert.equal(dayNap.energy, 45);
});
