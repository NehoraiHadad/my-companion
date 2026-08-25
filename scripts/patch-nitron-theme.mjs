import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const cliPath = resolve("node_modules/nitron/dist/cli.js");
const source = await readFile(cliPath, "utf8");
const marker = 'android:theme="@android:style/Theme.Material.Light.NoActionBar"';

if (source.includes(marker)) {
  console.log("Nitron Android theme already removes the native title bar.");
  process.exit(0);
}

const target = 'android:hardwareAccelerated="true"';
if (!source.includes(target)) throw new Error("Nitron manifest template changed; title-bar patch was not applied.");

await writeFile(cliPath, source.replace(target, `${marker}\n        ${target}`));
console.log("Patched Nitron Android manifest theme: native title bar removed.");
