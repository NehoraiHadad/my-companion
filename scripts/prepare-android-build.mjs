import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const client = path.join(root, "dist", "client");
const target = path.join(root, "android-dist");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(client, target, { recursive: true });

const indexPath = path.join(target, "index.html");
const source = await readFile(indexPath, "utf8");
const nativeHtml = source
  .replace('<html lang="en">', '<html lang="he" dir="rtl" class="native-apk">')
  .replace("<title>Pocket Companion</title>", '<meta name="theme-color" content="#071123" />\n    <title>החבר שלי</title>')
  .replaceAll('src="/assets/', 'src="./assets/')
  .replaceAll('href="/assets/', 'href="./assets/');

await writeFile(indexPath, nativeHtml);
console.log("Prepared android-dist from the current production client build.");
