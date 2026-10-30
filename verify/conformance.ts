/**
 * What the repo's conformance tests read the skins' cards with: the generic file helpers the preset owns, and the
 * repo's own text readers. It lives in verify/, outside every skin; only tests import it.
 *
 * The generic card checks and the class/folder scans are `@dashhaus/dashboard/conformance`; they are re-exported here
 * so a generated skin's test (which may only reach a shared helper by relative path) and the repo tests share one
 * implementation.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export { cardFolders, strayClasses } from "@dashhaus/dashboard/conformance";

export const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
export const exists = (path: string) => existsSync(join(process.cwd(), path));
export const uncomment = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/** The body of a top-level `const <name> … = { … };` object in a source file. */
export const object = (source: string, name: string) => source.match(new RegExp(`const ${name}\\b[^{]*\\{([\\s\\S]*?)\\n\\};`))?.[1] ?? "";

/**
 * A card's presentation never reaches the Home Assistant slice: the store entry, its websocket, demo, testing or
 * fixture subpaths, or a skin's connected folder.
 */
export const reachesHa = (specifier: string) =>
  specifier === "@dashhaus/core" ||
  /^@dashhaus\/core\/(?:websocket|demo|testing|fixtures)(?:\/|$)/.test(specifier) ||
  /^(?:\.\.\/)+ha\//.test(specifier);
