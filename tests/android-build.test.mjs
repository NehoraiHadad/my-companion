import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { prepareNativeHtml } from "../scripts/prepare-android-build.mjs";

test("adds native APK mode to the current Hebrew document", () => {
  const result = prepareNativeHtml('<html lang="he" dir="rtl"><head></head><body></body></html>');

  assert.match(result, /<html lang="he" dir="rtl" class="native-apk">/);
});

test("keeps existing HTML classes and does not duplicate native APK mode", () => {
  const withClass = prepareNativeHtml('<html lang="he" class="theme-dark"><body></body></html>');
  const preparedAgain = prepareNativeHtml(withClass);

  assert.match(preparedAgain, /class="theme-dark native-apk"/);
  assert.equal(preparedAgain.match(/native-apk/g)?.length, 1);
});

test("keeps production asset paths relative for the Android WebView", () => {
  const result = prepareNativeHtml('<html><script src="/assets/app.js"></script><link href="/assets/app.css"></html>');

  assert.match(result, /src="\.\/assets\/app\.js"/);
  assert.match(result, /href="\.\/assets\/app\.css"/);
});

test("fails instead of silently producing simulator mode without an html element", () => {
  assert.throws(() => prepareNativeHtml("<body></body>"), /native-apk class was not applied/);
});

test("persists API settings as AES-GCM ciphertext with a non-extractable key", async () => {
  const source = await readFile(new URL("../src/secureAiStorage.ts", import.meta.url), "utf8");

  assert.match(source, /indexedDB\.open/);
  assert.match(source, /name: "AES-GCM"/);
  assert.match(source, /length: 256/);
  assert.match(source, /generateKey\([^;]+false, \["encrypt", "decrypt"\]\)/s);
  assert.match(source, /crypto\.subtle\.encrypt/);
  assert.match(source, /crypto\.subtle\.decrypt/);
  assert.match(source, /deleteRecord\(SETTINGS_ID\)/);
});
