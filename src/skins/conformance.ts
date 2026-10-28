/**
 * What every skin's conformance test reads its cards with: files and source text, and the classes a card folder
 * uses. Only tests import this (src/skins/boundaries.test.ts); it is not code a skin shares.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
export const exists = (path: string) => existsSync(join(process.cwd(), path));
export const uncomment = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/** The body of a top-level `const <name> … = { … };` object in a source file. */
export const object = (source: string, name: string) => source.match(new RegExp(`const ${name}\\b[^{]*\\{([\\s\\S]*?)\\n\\};`))?.[1] ?? "";

/** The folders in a skin's cards/, one per card. */
export const cardFolders = (skin: string) =>
  readdirSync(join(process.cwd(), skin, "cards"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

/** Every class a card folder's CSS defines or its TSX sets that `allowed` refuses, as `<file>: .<class>`. */
export function strayClasses(dir: string, allowed: (cls: string) => boolean) {
  const bad: string[] = [];
  for (const file of readdirSync(join(process.cwd(), dir), { recursive: true, encoding: "utf8" }).filter((f) => /\.(css|tsx)$/.test(f))) {
    const body = uncomment(read(`${dir}/${file}`));
    const classes = file.endsWith(".css")
      ? [...body.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1])
      : [...body.matchAll(/className="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean);
    for (const cls of classes) if (!allowed(cls)) bad.push(`${dir}/${file}: .${cls}`);
  }
  return bad;
}
