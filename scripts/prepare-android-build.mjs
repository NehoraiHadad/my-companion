import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function prepareNativeHtml(source) {
  let foundHtml = false;
  const nativeHtml = source
    .replace(/<html\b([^>]*)>/i, (tag, attributes) => {
      foundHtml = true;
      const classAttribute = attributes.match(/\bclass=(['"])(.*?)\1/i);

      if (!classAttribute) return `<html${attributes} class="native-apk">`;
      if (classAttribute[2].split(/\s+/).includes("native-apk")) return tag;

      const nextClass = `${classAttribute[2]} native-apk`.trim();
      return tag.replace(classAttribute[0], `class=${classAttribute[1]}${nextClass}${classAttribute[1]}`);
    })
    .replace("<title>Pocket Companion</title>", '<meta name="theme-color" content="#071123" />\n    <title>החבר שלי</title>')
    .replaceAll('src="/assets/', 'src="./assets/')
    .replaceAll('href="/assets/', 'href="./assets/');

  if (!foundHtml || !/<html\b[^>]*\bclass=(['"])[^'"]*\bnative-apk\b[^'"]*\1/i.test(nativeHtml)) {
    throw new Error("Android HTML preparation failed: native-apk class was not applied.");
  }

  return nativeHtml;
}

async function main() {
  const root = process.cwd();
  const client = path.join(root, "dist", "client");
  const target = path.join(root, "android-dist");

  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(client, target, { recursive: true });

  const indexPath = path.join(target, "index.html");
  const source = await readFile(indexPath, "utf8");
  await writeFile(indexPath, prepareNativeHtml(source));
  console.log("Prepared android-dist with native-apk mode enabled.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
