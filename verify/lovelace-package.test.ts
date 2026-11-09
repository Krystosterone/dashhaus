/**
 * @dashhaus/core's `./lovelace` subpaths are the Lovelace framework's interface: each entry is browser code with no Node
 * builtins, no CSS and no skin, and everything it reaches outside `src/lovelace/` is React or one of core's own declared
 * subpaths (reached relatively, inside the package). This walks the real import graph
 * from every entry, the way a bundler would, rather than trusting folder names; it also holds the Lovelace entry to
 * its one caller, a skin's lovelace/ card.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { cardShape } from "@dashhaus/core/lovelace/card";
import * as conformance from "@dashhaus/core/lovelace/conformance";
import * as layout from "@dashhaus/core/lovelace/layout";
import * as schema from "@dashhaus/core/lovelace/schema";

const root = process.cwd();
const PACKAGE = "packages/core";
const SOURCE = `${PACKAGE}/src/lovelace`;
const packageJson = JSON.parse(readFileSync(join(root, PACKAGE, "package.json"), "utf8"));

const read = (path: string) => readFileSync(join(root, path), "utf8");

const JS_SPECS = [
  /\bfrom\s+["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /^\s*import\s+["']([^"']+)["']/gm,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
];
/** Type-only imports and re-exports do not exist at runtime, so they are not graph edges. */
const runtime = (path: string) => read(path)
  .replace(/^\s*import\s+type\b[^;]*?;?\s*$/gm, "")
  .replace(/^\s*export\s+type\b[^;]*?;?\s*$/gm, "");
const specs = (path: string) => JS_SPECS.flatMap((pattern) => [...runtime(path).matchAll(pattern)].map((match) => match[1]));
/** The stylesheet imports of a source file; a string that merely names a `.css` file is not an import. */
const stylesheets = (path: string) => specs(path).filter((spec) => /\.(css|scss|less)$/.test(spec));

function resolveSpecifier(spec: string, from: string): string | undefined {
  if (!spec.startsWith(".")) return undefined;
  const base = posix.normalize(posix.join(posix.dirname(from), spec));
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.json`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (existsSync(join(root, candidate)) && statSync(join(root, candidate)).isFile()) return candidate;
  }
  return undefined;
}

/** Every file reachable from the entries, every bare package those files import, and any relative import that leaves. */
/** Core's own subpaths by their source file: a relative import of one is an edge to that declared subpath. */
const coreSubpaths = () => new Map(Object.entries(packageJson.exports as Record<string, { source?: string }>)
  .filter(([subpath, target]) => !subpath.startsWith("./lovelace") && typeof target?.source === "string" && !target.source.includes("*"))
  .map(([subpath, target]) => [`${PACKAGE}/${target.source!.replace(/^\.\//, "")}`, subpath === "." ? "@dashhaus/core" : `@dashhaus/core/${subpath.slice(2)}`]));

function graph(entries: string[]) {
  const core = coreSubpaths();
  const files = new Set<string>();
  const packages = new Set<string>();
  const outside: string[] = [];
  const visit = (path: string) => {
    if (files.has(path)) return;
    files.add(path);
    if (!/\.(ts|tsx)$/.test(path)) return;
    for (const spec of specs(path)) {
      const target = resolveSpecifier(spec, path);
      if (target?.startsWith(`${SOURCE}/`)) visit(target);
      else if (target && core.has(target)) packages.add(core.get(target)!);
      else if (target) outside.push(`${path} → ${spec} (${target})`);
      else if (!spec.startsWith(".")) packages.add(spec);
    }
  };
  for (const entry of entries) visit(entry);
  return { files: [...files], packages: [...packages], outside };
}

const NODE_BUILTINS = /^(node:|assert$|buffer$|child_process$|crypto$|events$|fs$|http$|https$|module$|net$|os$|path$|process$|stream$|tls$|url$|util$|zlib$)/;
/** The browser packages the entry may reach directly; everything else must be a declared @dashhaus subpath. */
const BROWSER = ["react", "react-dom/client"];

/** The workspace resolves source through the export's `source` condition; the graph walks those files. */
/** The framework's subpaths, named as before the fusion: `.` is `@dashhaus/core/lovelace`, `./skin` its `/skin`. */
const exported = (subpath: string) => (subpath === "." ? "./lovelace" : `./lovelace/${subpath.slice(2)}`);
const SUBPATHS = [".", "./skin", "./card", "./schema", "./layout", "./conformance"];
const sourceTarget = (subpath: string) => {
  const target = packageJson.exports[exported(subpath)];
  if (typeof target !== "object" || typeof target.source !== "string") {
    throw new Error(`@dashhaus/core has no source export for ${exported(subpath)}`);
  }
  return target.source;
};

const entries = () => SUBPATHS.map((subpath) => `${PACKAGE}/${sourceTarget(subpath).replace(/^\.\//, "")}`);
/** The entries a browser may load. `./conformance` reads a skin's files, so it is Node- and test-only. */
const BROWSER_ENTRIES = [".", "./skin", "./card", "./schema", "./layout"];
const browserEntries = () => BROWSER_ENTRIES.map((subpath) => `${PACKAGE}/${sourceTarget(subpath).replace(/^\.\//, "")}`);

/** The members an interface declares in a source file, with those of the interfaces it extends there. */
function members(path: string, name: string): string[] {
  const file = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, false, path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found = file.statements.find((statement): statement is ts.InterfaceDeclaration => ts.isInterfaceDeclaration(statement) && statement.name.text === name);
  if (!found) throw new Error(`${path} declares no interface ${name}`);
  const own = found.members.flatMap((member) => (member.name && ts.isIdentifier(member.name) ? [member.name.text] : []));
  const inherited = (found.heritageClauses ?? []).flatMap((clause) => clause.types)
    .flatMap((type) => (ts.isIdentifier(type.expression) && file.statements.some((s) => ts.isInterfaceDeclaration(s) && s.name.text === (type.expression as ts.Identifier).text)
      ? members(path, type.expression.text) : []));
  return [...new Set([...own, ...inherited])];
}

/** Whether a bare specifier names a subpath its package declares, wildcard exports included. */
function declared(spec: string): boolean {
  const [scope, name, ...rest] = spec.split("/");
  if (scope !== "@dashhaus" || !name) return false;
  const manifest = `packages/${name}/package.json`;
  if (!existsSync(join(root, manifest))) return false;
  const subpath = rest.length ? `./${rest.join("/")}` : ".";
  const exports: unknown = JSON.parse(read(manifest)).exports;
  if (typeof exports !== "object" || exports === null) return false;
  return Object.keys(exports).some((key) => key === subpath || (key.endsWith("/*") && subpath.startsWith(key.slice(0, -1))));
}

describe("@dashhaus/core/lovelace", () => {
  it("declares its six entries in @dashhaus/core, with react-dom an optional peer", () => {
    expect(packageJson.name).toBe("@dashhaus/core");
    expect(packageJson.sideEffects).toBe(false);
    expect(Object.keys(packageJson.exports).filter((subpath) => subpath.startsWith("./lovelace"))).toEqual(SUBPATHS.map(exported));
    expect(packageJson.peerDependencies["react-dom"]).toBe("^18.3.1 || ^19.0.0");
    expect(packageJson.peerDependenciesMeta["react-dom"].optional, "a developer using only the hooks needs no react-dom").toBe(true);
    expect(packageJson.dependencies ?? {}, "the framework is inside core, not a package beside it").toEqual({});
  });

  it("exposes the skin runtime, the card frame, the card schema, the layout and the conformance preset on subpaths of their own", () => {
    const subpaths = ["./skin", "./card", "./schema", "./layout", "./conformance"];
    for (const subpath of subpaths) {
      expect(sourceTarget(subpath)).toMatch(new RegExp(`^\\./src/lovelace/.+\\.tsx?$`));
      expect(sourceTarget(subpath)).not.toBe(sourceTarget("."));
      expect(packageJson.exports[exported(subpath)].types).toMatch(new RegExp(`^\\./dist/.+\\.d\\.ts$`));
      expect(packageJson.exports[exported(subpath)].import).toMatch(new RegExp(`^\\./dist/.+\\.js$`));
      expect(packageJson.exports[exported(subpath)].default).toBe(packageJson.exports[exported(subpath)].import);
    }
    expect(new Set([".", ...subpaths].map(sourceTarget)).size).toBe(subpaths.length + 1);
    expect(new Set([".", ...subpaths].map((subpath) => packageJson.exports[exported(subpath)].import)).size).toBe(subpaths.length + 1);
  });

  it("exposes exactly the schema's public words", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "ALIGNS",
      "BODY_KEYS",
      "DYSON_COMPANION_KEYS",
      "DashboardConfigError",
      "FLOWS",
      "LOVELACE_KEYS",
      "MAIN_PAGE",
      "PAGE_KEYS",
      "PLACEMENT_KEYS",
      "ROW_KEYS",
      "Reader",
      "cardKindOrder",
      "cardKinds",
      "isRaw",
      "mapRowItems",
      "oneOf",
      "readAlarmOptions",
      "readBody",
      "readCalendarOptions",
      "readCameraOptions",
      "readCard",
      "readCards",
      "readColor",
      "readDysonOptions",
      "readNumericOptions",
      "readOwletOptions",
      "readRow",
      "readSensorOptions",
      "readUnit",
      "readWeatherOptions",
      "renderCard",
      "rowItems",
      "rowTitles",
      "suggest",
    ]);
  });

  it("exposes exactly the layout's public words", () => {
    expect(Object.keys(layout).sort()).toEqual([
      "AUTO_LAYOUTS",
      "NUMERIC_CLASSES",
      "SAFETY_CLASSES",
      "WALL_BANDS",
      "areaId",
      "areaName",
      "byName",
      "columnAreas",
      "deviceClass",
      "deviceCompanion",
      "domainOf",
      "dysonFans",
      "energySensors",
      "friendlyName",
      "groupByArea",
      "numericSensors",
      "outsideArea",
      "placeColumns",
      "placeRow",
      "placeSection",
      "readAutoLayout",
      "roomSensors",
      "safetySensors",
      "sortByName",
      "spanWidth",
      "trackCount",
      "visibleEntities",
      "wallAreas",
      "wallBand",
      "wallFootprint",
    ]);
    // "Place" is placement only (placeRow, placeColumns); a wall's columns are areas, Home Assistant's word.
    expect(Object.keys(layout).filter((name) => /place/i.test(name) && !/^place[A-Z]/.test(name))).toEqual([]);
  });

  // "Place" is placement only (placeRow, placeColumns, Field's `Place` cell); a wall's columns are areas, Home Assistant's
  // word (`wallAreas`, `AreaHeading`). Every name the Lovelace framework, and each reference skin's page, Lovelace card and
  // parts, export, types included, that holds "place" is a placement word: a verb `place…`, a placement, or one of these.
  it("says place only for placement, in every name the framework and the skins' pages export", () => {
    const PLACEMENT = ["Place", "PlaceEntry", "Placed", "PlacedCell"];
    const folders = [SOURCE, ...["orb", "field"].flatMap((skin) => ["dashboards", "lovelace", "shared"].map((dir) => `src/skins/${skin}/${dir}`))];
    const sources = folders.flatMap((dir) => readdirSync(join(process.cwd(), dir), { recursive: true, encoding: "utf8" })
      .filter((file) => /\.tsx?$/.test(file) && !/\.(test|stories)\.tsx?$/.test(file)).map((file) => posix.join(dir, file)));
    const named = sources.flatMap((path) => {
      const text = readFileSync(join(process.cwd(), path), "utf8");
      const declared = [...text.matchAll(/^export (?:declare )?(?:async )?(?:function\*?|const|let|class|interface|type|enum) (\w+)/gm)].map((m) => m[1]);
      const listed = [...text.matchAll(/^export (?:type )?\{([^}]*)\}/gm)].flatMap((m) => m[1].split(",").map((n) => n.trim().split(/\s+as\s+/).at(-1)!).filter(Boolean));
      return [...declared, ...listed].map((name) => ({ path, name }));
    });
    expect(named.length).toBeGreaterThan(100);
    expect(named.filter(({ name }) => /place/i.test(name) && !/^place[A-Z]/.test(name) && !/placement/i.test(name) && !PLACEMENT.includes(name)).map(({ path, name }) => `${path}: ${name}`)).toEqual([]);
  });

  it("exposes exactly the conformance preset's public words", () => {
    expect(Object.keys(conformance).sort()).toEqual(["cardFolders", "checkCards", "strayClasses"]);
  });

  // One contract name, one meaning (spec/contract.md): a skin's card holds the card its YAML read (`./schema`'s
  // `CardShape`, from `readCard`) and the frame's flags (`./card`'s `cardShape`, `useCardFrame`) side by side, so a
  // field of the one never takes a name the other already gives a meaning (`bare`, the compact row with no control).
  it("never gives a read card's field a name the card frame already uses", () => {
    const CARD = `${SOURCE}/card.tsx`;
    const SCHEMA = `${SOURCE}/schema.ts`;
    expect(Object.keys(cardShape()).sort(), "cardShape returns what its interface declares").toEqual(members(CARD, "CardShape").sort());
    const frame = new Set([...members(CARD, "CardProps"), ...members(CARD, "CardFrame")]);
    const card = members(SCHEMA, "CardShape");
    const reader = new schema.Reader();
    const kinds = { own: { domains: ["switch"] }, other: { domains: ["switch"] } };
    const read = schema.readCard(reader, { noun: "card", common: ["entity"], kinds, base: () => ({}) }, "switch.a", "cards[0]");
    expect(reader.problems).toEqual([]);
    expect(read, "readCard sets what CardShape declares and nothing else of its own").toEqual({ entity: "switch.a", kind: "own", defaulted: true });
    expect(Object.keys(read!).filter((key) => !card.includes(key))).toEqual([]);
    expect(card.filter((key) => frame.has(key)), "a read card's fields and the frame's flags share no name").toEqual([]);
  });

  it("keeps the schema and layout pure, so a Node config can import them", () => {
    for (const subpath of ["./schema", "./layout"]) {
      const { files, packages, outside } = graph([`${PACKAGE}/${sourceTarget(subpath).replace(/^\.\//, "")}`]);
      expect(outside, `${subpath} has no relative import that leaves the package`).toEqual([]);
      expect(packages, `${subpath} reaches no React, DOM or Home Assistant package`).toEqual([]);
      expect(files.filter((file) => file.includes("/skins/")), `${subpath} is skin-free`).toEqual([]);
      expect(files.filter((file) => stylesheets(file).length > 0), `${subpath} imports no stylesheet`).toEqual([]);
    }
  });

  it("keeps every reachable file inside the package, with no CSS and no skin", () => {
    const { files, outside } = graph(entries());
    expect(files.length).toBeGreaterThan(0);
    expect(outside, "no relative import leaves @dashhaus/core/lovelace").toEqual([]);
    expect(files.filter((file) => file.includes("/skins/")), "the framework is skin-free").toEqual([]);
    expect(files.filter((file) => stylesheets(file).length > 0), "the entries import no stylesheet").toEqual([]);
  });

  it("keeps the browser entries free of Node builtins", () => {
    const { packages } = graph(browserEntries());
    expect(packages.filter((spec) => NODE_BUILTINS.test(spec)), "the browser entries are browser code").toEqual([]);
  });

  it("keeps conformance Node-only and self-contained", () => {
    const { files, packages, outside } = graph([`${PACKAGE}/${sourceTarget("./conformance").replace(/^\.\//, "")}`]);
    expect(outside, "conformance has no relative import that leaves the package").toEqual([]);
    expect(files.filter((file) => file.includes("/skins/")), "conformance is skin-free").toEqual([]);
    expect(files.filter((file) => stylesheets(file).length > 0), "conformance imports no stylesheet").toEqual([]);
    expect(packages.filter((spec) => !NODE_BUILTINS.test(spec)), "conformance reaches only Node builtins").toEqual([]);
  });

  it("reaches only React and declared @dashhaus subpaths, never the websocket client", () => {
    const { packages } = graph(browserEntries());
    expect(packages.filter((spec) => !BROWSER.includes(spec) && !declared(spec)), "a package specifier is a declared subpath").toEqual([]);
    expect(packages, "the entry reaches the client through @dashhaus/core/websocket").not.toContain("home-assistant-js-websocket");
  });

  it("is imported only by a skin's lovelace/ card", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
        const path = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(path);
        else if (/\.tsx?$/.test(entry.name)) files.push(path);
      }
    };
    walk("src/skins");
    expect(files.filter((file) => !file.includes("/lovelace/") && specs(file).includes("@dashhaus/core/lovelace"))).toEqual([]);
  });
});
