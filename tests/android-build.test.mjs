import assert from "node:assert/strict";
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
