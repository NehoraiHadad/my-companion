import assert from "node:assert/strict";
import test from "node:test";
import { extractAiResponseText, parseAiEvent } from "../src/aiGame.ts";

test("OpenAI Responses output is extracted and validated", () => {
  const raw = extractAiResponseText("openai", { output_text: JSON.stringify({ dialogue: "מצאתי כוכב בכיס!", emotion: "happy", animation: "glow", memory: "כוכב בכיס", bonus: 3 }) });
  const event = parseAiEvent(raw);
  assert.equal(event.dialogue, "מצאתי כוכב בכיס!");
  assert.equal(event.emotion, "happy");
  assert.equal(event.animation, "glow");
  assert.equal(event.bonus, 3);
});

test("OpenRouter chat output is extracted and validated", () => {
  const raw = extractAiResponseText("openrouter", { choices: [{ message: { content: '{"dialogue":"בוא נשחק","emotion":"curious","animation":"bounce","memory":"הצעה למשחק","bonus":1}' } }] });
  const event = parseAiEvent(raw);
  assert.equal(event.dialogue, "בוא נשחק");
  assert.equal(event.memory, "הצעה למשחק");
});

test("untrusted AI fields are bounded before entering game state", () => {
  const event = parseAiEvent(JSON.stringify({ dialogue: "א".repeat(300), emotion: "angry", animation: "explode", memory: "ב".repeat(200), bonus: 999 }));
  assert.equal(event.dialogue.length, 120);
  assert.equal(event.memory.length, 80);
  assert.equal(event.emotion, "curious");
  assert.equal(event.animation, "bounce");
  assert.equal(event.bonus, 5);
});

test("plain-text model fallback remains safe and playable", () => {
  const event = parseAiEvent("רוצה חטיף קטן?");
  assert.equal(event.dialogue, "רוצה חטיף קטן?");
  assert.equal(event.bonus, 0);
});
