/**
 * The public packages as the site lists them, read from what ships: the release manifest's list, each package's
 * `package.json` (its version, description and exports) and the Subpaths table its README carries to npm. The site
 * draws that table rather than keeping a copy; `verify/release-packages.test.ts` holds each README's table to the
 * package's `exports`, so a new or removed subpath fails there and changes the page.
 *
 * Pure (files only): the test imports it too.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { publicPackages } from "../../../scripts/release/manifest.js";

export interface SubpathRow {
  /** The subpaths the row is for, as the README writes them: `.`, `./entities/*`. */
  subpaths: string[];
  /** The row's other cells, as markdown. */
  cells: string[];
}

export interface SubpathTable {
  /** The header's cells after `Subpath`: `What it is`, and any more (`Stability`). */
  columns: string[];
  rows: SubpathRow[];
}

export interface PublicPackage {
  name: string;
  dir: string;
  version: string;
  description: string;
  /** Its `exports` keys: `.`, `./primitives`, `./entities/*`. */
  exports: string[];
  /** The README's Subpaths table, when it has one. */
  subpaths?: SubpathTable;
}

const cellsOf = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());

/** A README's first table whose first column is `Subpath`. */
export function readmeSubpaths(readme: string): SubpathTable | undefined {
  const lines = readme.split("\n");
  const start = lines.findIndex((line) => /^\|\s*Subpath\s*\|/.test(line));
  if (start < 0) return undefined;
  const columns = cellsOf(lines[start]).slice(1);
  const rows: SubpathRow[] = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.trim().startsWith("|")) break;
    const [first, ...cells] = cellsOf(line);
    rows.push({ subpaths: [...first.matchAll(/`([^`]+)`/g)].map((match) => match[1]), cells });
  }
  return { columns, rows };
}

/** The repository root, whether the caller runs there or in `docs/`. */
function rootOf(cwd: string): string {
  if (existsSync(join(cwd, "scripts", "release", "manifest.js"))) return cwd;
  if (existsSync(join(cwd, "..", "scripts", "release", "manifest.js"))) return join(cwd, "..");
  throw new Error(`packages: no scripts/release/manifest.js at or above ${cwd}`);
}

/** Every public package, in the release manifest's order. */
export function publicPackageList(cwd = process.cwd()): PublicPackage[] {
  const root = rootOf(cwd);
  return publicPackages.map(({ name, dir }) => {
    const manifest = JSON.parse(readFileSync(join(root, dir, "package.json"), "utf8"));
    const readme = join(root, dir, "README.md");
    return {
      name,
      dir,
      version: manifest.version,
      description: manifest.description,
      exports: Object.keys(manifest.exports ?? { ".": "" }),
      subpaths: existsSync(readme) ? readmeSubpaths(readFileSync(readme, "utf8")) : undefined,
    };
  });
}

/** A subpath as an import: `@dashhaus/core` and `./primitives` is `@dashhaus/core/primitives`. */
export const specifier = (name: string, subpath: string) => (subpath === "." ? name : `${name}/${subpath.replace(/^\.\//, "")}`);
