/**
 * What the repo's conformance tests read the skins' source and docs with, outside every skin; only tests import it.
 * The generic card checks live in `@dashhaus/core/lovelace/conformance`; these are the repo's own readers and the rule
 * that keeps a card's presentation away from the Home Assistant slice.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
