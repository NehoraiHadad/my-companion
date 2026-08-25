import assert from "node:assert/strict";
import test from "node:test";
import {
  DAY,
  HOUR,
  absenceMessage,
  applyElapsed,
  currentStage,
  defaultState,
  localDayKey,
  nextStage,
  performCareAction,
  useInventoryItem,
} from "../src/gameEngine.ts";

function stateAt(now, overrides = {}) {
  return {
    ...structuredClone(defaultState),
    onboarded: true,
    birthAt: now,
    lastSeen: now,
    dailyKey: localDayKey(new Date(now)),
    lastVisitKey: localDayKey(new Date(now)),
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
  assert.match(absenceMessage("נועה", 24 * 60), /התגעגע/);
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

test("consecutive daily return resets quests, increments streak, and grants daily coins", () => {
  const yesterday = new Date(2026, 7, 23, 20).getTime();
  const today = new Date(2026, 7, 24, 8).getTime();
  const result = applyElapsed(stateAt(yesterday, { streak: 3, bestStreak: 3, questCare: 3, questGame: 1, questHappy: 1, claimed: ["care"], coins: 50 }), today);
  assert.equal(result.streak, 4);
  assert.equal(result.bestStreak, 4);
  assert.equal(result.coins, 60);
  assert.equal(result.questCare, 0);
  assert.deepEqual(result.claimed, []);
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
  assert.equal(currentStage(highXpDayOne), "baby");
  assert.equal(currentStage({ ...highXpDayOne, birthAt: now - DAY }), "kid");
  assert.equal(currentStage({ ...highXpDayOne, birthAt: now - 3 * DAY }), "teen");
  assert.equal(currentStage({ ...highXpDayOne, birthAt: now - 6 * DAY }), "grown");
});

test("next-stage progress is gated by the slower of time and XP", () => {
  const now = Date.now();
  const dayOne = stateAt(now, { xp: 160 });
  const progress = nextStage(dayOne);
  assert.equal(progress.id, "kid");
  assert.equal(progress.xpProgress, 100);
  assert.equal(progress.dayProgress, 50);
  assert.equal(progress.progress, 50);
});

test("long absence is capped and remains recoverable", () => {
  const now = Date.now();
  const result = applyElapsed(stateAt(now), now + 30 * DAY);
  assert.equal(result.lastSeen, now + 30 * DAY);
  assert.ok(result.fullness >= 0 && result.energy >= 0 && result.hygiene >= 0 && result.mood >= 0);
  assert.equal("dead" in result, false);
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

test("care reward has diminishing returns but never becomes zero", () => {
  const now = Date.now();
  const urgent = performCareAction(stateAt(now, { fullness: 5 }), "feed", now);
  const alreadyFull = performCareAction(stateAt(now, { fullness: 100 }), "feed", now);
  assert.ok(urgent.xp > alreadyFull.xp);
  assert.ok(alreadyFull.xp >= 3);
});

test("every sixth care action grants the room discovery bonus", () => {
  const now = Date.now();
  const result = performCareAction(stateAt(now, { actions: 5, coins: 10 }), "play", now);
  assert.equal(result.actions, 6);
  assert.equal(result.coins, 22);
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
    // One good arcade run plus the three daily quest claims.
    game = { ...game, xp: game.xp + 110, coins: game.coins + 80, questCare: 3, questGame: 1, questHappy: 1 };
    reached.add(currentStage(game, sessionTime));
  }
  assert.deepEqual([...reached], ["baby", "kid", "teen", "grown"]);
  assert.ok(game.xp >= 850);
  assert.equal(game.streak, 7);
});
