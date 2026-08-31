import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("variant preview dimensions do not leak into compact asset actions", async () => {
  const [component, css] = await Promise.all([
    readFile(new URL("../src/Prototype.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/prototype.css", import.meta.url), "utf8"),
  ]);

  assert.match(component, /className="character-variant-preview"/);
  assert.match(css, /\.character-variant-preview\s*\{[^}]*height:\s*124px/s);
  assert.doesNotMatch(css, /\.character-variant>div\s*\{/);
  assert.match(css, /\.variant-asset-actions\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*1fr 1fr/s);
  assert.match(css, /\.variant-asset-actions>\.asset-mini-button\s*\{[^}]*min-height:\s*36px/s);
});
