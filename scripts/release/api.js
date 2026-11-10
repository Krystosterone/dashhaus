/**
 * The public API, read from the packed type declarations, and what changed between two versions:
 * `npm run release:api [-- --from <version>]` compares the tarballs in `release/` with `<version>` on npm (by default
 * the latest), and `npm run release` uses the same comparison to suggest the next version.
 *
 * Each version's tarballs are unpacked as `node_modules/<name>` side by side under one folder inside the repository's
 * `node_modules/.cache`, so `@dashhaus/core/lovelace`'s declarations resolve the `@dashhaus/core` of the same version
 * through its packed `exports`, and React's types resolve from the repository. Every export of every typed subpath is
 * recorded as its declaration, printed without comments, so a changed signature reads as changed and a reworded doc
 * comment does not. An untyped subpath (a stylesheet, a CLI) is recorded as present.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, realpathSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { publicPackages, tarballName } from "./manifest.js";
import { fetchFromRegistry, publishedAt } from "./registry.js";

/** Unpack each `{ name, file }` tarball to `<into>/node_modules/<name>`. */
export async function unpack(tarballs, into) {
  for (const { name, file } of tarballs) {
    const dir = join(into, "node_modules", name);
    await mkdir(dir, { recursive: true });
    execFileSync("tar", ["-xzf", file, "-C", dir, "--strip-components=1"]);
  }
}

/** The typed and untyped subpaths a packed manifest declares, with wildcard subpaths expanded from the files. */
function subpaths(packageDir, manifest) {
  const result = [];
  for (const [key, target] of Object.entries(manifest.exports ?? {})) {
    const types = typeof target === "object" ? target.types : undefined;
    if (!types) {
      result.push({ subpath: key, typed: false });
      continue;
    }
    if (!key.includes("*")) {
      result.push({ subpath: key, typed: true });
      continue;
    }
    const [before, after] = types.split("*");
    const dir = join(packageDir, before.slice(0, before.lastIndexOf("/")));
    const prefix = before.slice(before.lastIndexOf("/") + 1);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).sort()) {
      if (file.startsWith(prefix) && file.endsWith(after)) result.push({ subpath: key.replace("*", file.slice(prefix.length, file.length - after.length)), typed: true });
    }
  }
  return result;
}

const printer = ts.createPrinter({ removeComments: true });

/**
 * The exported interfaces a consumer passes in, by symbol: a parameter, a prop, a member of an input type, or a generic
 * constraint. Everything else is only handed out, so adding a member to it cannot break code compiled against it.
 * `keyof` is not an input position: `Omit<Props, keyof Handlers>` names `Handlers` to take its keys, never to pass it.
 */
function inputInterfaces(program, checker, modules, packageRoots) {
  const input = new Set();
  const seen = new Map();
  const localFiles = new Map();
  const localFile = (file) => {
    let ours = localFiles.get(file.fileName);
    if (ours === undefined) {
      const path = realpathSync(file.fileName);
      ours = packageRoots.some((root) => path === root || path.startsWith(`${root}/`));
      localFiles.set(file.fileName, ours);
    }
    return ours;
  };
  const declaredHere = (symbol) => (symbol?.declarations ?? []).some((declaration) => localFile(declaration.getSourceFile()));
  const visitSignature = (signature, mode) => {
    for (const parameter of signature.getTypeParameters() ?? []) {
      const constraint = parameter.getConstraint();
      if (constraint) visit(constraint, "input");
    }
    // A function the package hands out is called by the consumer, so its parameters are passed in. A function the
    // consumer hands in (a callback, a prop) is implemented by them, so the package passes its parameters and they are
    // read, not built: a render prop's `live` is a `HaMediaPlayerResult` no consumer ever constructs.
    const parameters = mode === "input" ? "output" : "input";
    for (const parameter of signature.getParameters()) visit(checker.getTypeOfSymbol(parameter), parameters);
    visit(signature.getReturnType(), mode);
  };
  const visit = (type, mode) => {
    if (!type) return;
    let modes = seen.get(type);
    if (!modes) seen.set(type, (modes = new Set()));
    if (modes.has(mode)) return;
    modes.add(mode);
    const { flags } = type;
    if (flags & (ts.TypeFlags.TypeParameter)) {
      const constraint = type.getConstraint();
      if (constraint) visit(constraint, "input");
      return;
    }
    if (flags & ts.TypeFlags.Index) return;
    if (type.isUnion() || type.isIntersection()) {
      for (const part of type.types) visit(part, mode);
      return;
    }
    if (!(flags & ts.TypeFlags.Object)) return;
    const symbol = type.symbol;
    const library = symbol?.declarations?.length > 0 && symbol.declarations.every((declaration) => program.isSourceFileDefaultLibrary(declaration.getSourceFile()));
    const declared = [type.symbol, type.aliasSymbol].filter(Boolean);
    const external = declared.length > 0 && declared.every((symbol) => (symbol.declarations?.length ?? 0) > 0 && !declaredHere(symbol));
    if (mode === "input" && symbol && symbol.flags & ts.SymbolFlags.Interface) input.add(symbol);
    for (const signature of type.getCallSignatures()) visitSignature(signature, mode);
    for (const signature of type.getConstructSignatures()) visitSignature(signature, mode);
    for (const info of checker.getIndexInfosOfType(type)) {
      visit(info.keyType, "input");
      visit(info.type, mode);
    }
    if (type.objectFlags & ts.ObjectFlags.Reference && type.typeArguments) {
      for (const argument of type.typeArguments) visit(argument, mode);
    }
    for (const argument of type.aliasTypeArguments ?? []) visit(argument, mode);
    // A type from React or another dependency is not the API read here; its type arguments are (a component's
    // `FC<Props>` carries `Props`), but walking its whole graph would visit thousands of types to find nothing.
    if (library || external) return;
    if (type.objectFlags & ts.ObjectFlags.Interface) for (const base of checker.getBaseTypes(type)) visit(base, mode);
    for (const property of checker.getPropertiesOfType(type)) visit(checker.getTypeOfSymbol(property), mode);
  };
  for (const module of modules) {
    for (const exported of checker.getExportsOfModule(module)) {
      const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      // An exported interface or type alias is a type only; it is in an input position when a value the package exports
      // takes it, not because the module exports it. Seeding it as a value would read its callback props backwards.
      if (target.flags & ts.SymbolFlags.Value) visit(checker.getTypeOfSymbol(target), "output");
    }
  }
  return input;
}

/**
 * The API of the packages unpacked under `dir`:
 * `{ "<name><subpath>": { typed, exports: { <export>: <declaration> }, inputs: { <interface>: <appears in an input position> } } }`.
 * `names` are the packages to read, in `publicPackages` order.
 */
export async function readApi(dir, names = publicPackages.map(({ name }) => name)) {
  const entries = [];
  for (const name of names) {
    const packageDir = join(dir, "node_modules", name);
    if (!existsSync(packageDir)) continue;
    const manifest = JSON.parse(await readFile(join(packageDir, "package.json"), "utf8"));
    for (const { subpath, typed } of subpaths(packageDir, manifest)) {
      entries.push({ key: `${name}${subpath.slice(1)}`, typed });
    }
  }
  const typed = entries.filter((entry) => entry.typed);
  const entry = join(dir, "api-entry.ts");
  await writeFile(entry, typed.map(({ key }, i) => `import * as m${i} from ${JSON.stringify(key)};\nvoid m${i};\n`).join(""));
  const program = ts.createProgram([entry], {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(entry);
  const imports = source.statements.filter(ts.isImportDeclaration);
  const api = {};
  for (const { key, typed: isTyped } of entries) api[key] = isTyped ? { typed: true, exports: {}, inputs: {} } : { typed: false, exports: {} };
  const modules = typed.map(({ key }, i) => {
    const moduleSymbol = checker.getSymbolAtLocation(imports[i].moduleSpecifier);
    if (!moduleSymbol) throw new Error(`${key}: its declarations did not resolve from the packed tarballs`);
    return { key, moduleSymbol };
  });
  const packageRoots = names.map((name) => join(dir, "node_modules", name)).filter((path) => existsSync(path)).map((path) => realpathSync(path));
  const input = inputInterfaces(program, checker, modules.map(({ moduleSymbol }) => moduleSymbol), packageRoots);
  for (const { key, moduleSymbol } of modules) {
    for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
      const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      const text = (target.declarations ?? [])
        .map((node) => printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile()))
        .join("\n")
        .replace(/\s+/g, " ")
        .trim();
      api[key].exports[symbol.name] = text || checker.typeToString(checker.getTypeOfSymbol(target));
      if (target.flags & ts.SymbolFlags.Interface) api[key].inputs[symbol.name] = input.has(target);
    }
  }
  return api;
}

/**
 * How many members an interface declaration gained, when gaining members is the whole change: the same name, type
 * parameters and heritage, and every member of the old declaration still there, unchanged and in order. `undefined`
 * for any other change, which stays breaking.
 */
function addedInterfaceMembers(before, after) {
  const parse = (text) => {
    const source = ts.createSourceFile("api.d.ts", text, ts.ScriptTarget.Latest, true);
    const node = source.statements[0];
    return source.statements.length === 1 && ts.isInterfaceDeclaration(node) ? { node, source } : undefined;
  };
  const first = parse(before);
  const last = parse(after);
  if (!first || !last) return undefined;
  const header = ({ node, source }) => [
    ...(node.modifiers ?? []).map((modifier) => printer.printNode(ts.EmitHint.Unspecified, modifier, source)),
    node.name.getText(source),
    ...(node.typeParameters ?? []).map((parameter) => printer.printNode(ts.EmitHint.Unspecified, parameter, source)),
    ...(node.heritageClauses ?? []).map((clause) => printer.printNode(ts.EmitHint.Unspecified, clause, source)),
  ].join(" ").replace(/\s+/g, " ").trim();
  if (header(first) !== header(last)) return undefined;
  const members = ({ node, source }) => node.members.map((member) => printer.printNode(ts.EmitHint.Unspecified, member, source).replace(/\s+/g, " ").trim());
  const previous = members(first);
  const next = members(last);
  let seen = 0;
  let gained = 0;
  for (const member of next) {
    if (seen < previous.length && member === previous[seen]) seen++;
    else gained++;
  }
  return seen === previous.length && gained > 0 ? gained : undefined;
}

/** What changed from `before` to `after`, and whether any of it can break a consumer. */
export function diffApi(before, after) {
  const removedSubpaths = Object.keys(before).filter((key) => !(key in after));
  const addedSubpaths = Object.keys(after).filter((key) => !(key in before));
  const removed = [];
  const changed = [];
  const added = [];
  for (const [key, { exports: next }] of Object.entries(after)) {
    const previous = before[key]?.exports;
    if (!previous) continue;
    for (const name of Object.keys(previous)) {
      if (!(name in next)) removed.push({ subpath: key, name });
      else if (previous[name] !== next[name]) {
        // A member added to an interface the package only hands out still compiles for every consumer; added to one
        // consumers pass in, build or implement, it breaks them. `inputs` is absent on an API written before it was
        // recorded, and a missing record is read as "passed in": never call a break safe by accident.
        const gained = addedInterfaceMembers(previous[name], next[name]);
        const passedIn = before[key]?.inputs?.[name] === true || after[key].inputs?.[name] === true;
        changed.push({ subpath: key, name, before: previous[name], after: next[name], breaking: gained === undefined || passedIn });
      }
    }
    for (const name of Object.keys(next)) if (!(name in previous)) added.push({ subpath: key, name });
  }
  const breaking = removedSubpaths.length > 0 || removed.length > 0 || changed.some((entry) => entry.breaking);
  const additive = addedSubpaths.length > 0 || added.length > 0 || changed.some((entry) => !entry.breaking);
  return { removedSubpaths, addedSubpaths, removed, changed, added, breaking, additive };
}

/**
 * The next version after `latest`. Before 1.0 a caret range keeps the minor, so a breaking change moves the minor and
 * anything else the patch; from 1.0, semver's major, minor and patch.
 */
export function suggestVersion(latest, { breaking, feature }) {
  const [major, minor, patch] = latest.split("-")[0].split(".").map(Number);
  if (major === 0) return breaking ? `0.${minor + 1}.0` : `0.${minor}.${patch + 1}`;
  if (breaking) return `${major + 1}.0.0`;
  return feature ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
}

/** `-1`, `0` or `1` for two versions, prerelease below its release. */
export function compareVersions(a, b) {
  const parse = (v) => {
    const [core, pre] = v.split("-");
    return { parts: core.split(".").map(Number), pre };
  };
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < 3; i++) if (x.parts[i] !== y.parts[i]) return x.parts[i] < y.parts[i] ? -1 : 1;
  if (x.pre === y.pre) return 0;
  if (!x.pre) return 1;
  if (!y.pre) return -1;
  return x.pre < y.pre ? -1 : 1;
}

/** The comparison as markdown, for the release record. */
export function apiMarkdown(diff, from) {
  const lines = [];
  for (const key of diff.removedSubpaths) lines.push(`- **Removed entry** \`${key}\``);
  for (const { subpath, name } of diff.removed) lines.push(`- **Removed** \`${name}\` from \`${subpath}\``);
  for (const { subpath, name, breaking } of diff.changed) lines.push(`- **Changed** \`${name}\` in \`${subpath}\`${breaking ? "" : " (members added; consumers only read it, so not breaking)"}`);
  for (const key of diff.addedSubpaths) lines.push(`- Added entry \`${key}\``);
  for (const { subpath, name } of diff.added) lines.push(`- Added \`${name}\` to \`${subpath}\``);
  return lines.length ? lines.join("\n") : `None: every entry and export of ${from} is still there, with the same declaration.`;
}

/**
 * The API of the tarballs at `version` in `tarballsDir`. A package with no tarball there (one new since that version)
 * is left out, so the comparison reads its whole API as added.
 */
export async function apiOfTarballs(tarballsDir, version, work) {
  const dir = await mkdtemp(join(work, `${version}-`));
  const tarballs = publicPackages.map(({ name }) => ({ name, file: join(tarballsDir, tarballName(name, version)) }));
  await unpack(tarballs.filter(({ file }) => existsSync(file)), dir);
  return readApi(dir);
}

/** Fetch `version` of every public package npm has at that version into `<work>/registry`, and return its API. */
export async function apiOfRegistry(version, work) {
  const names = [];
  for (const { name } of publicPackages) if (await publishedAt(name, version)) names.push(name);
  const problems = await fetchFromRegistry(version, join(work, "registry"), undefined, names);
  if (problems.length) throw new Error(problems.join("\n"));
  return apiOfTarballs(join(work, "registry"), version, work);
}

/** A scratch folder inside the repository, so unpacked declarations resolve React's types from its node_modules. */
export async function apiWorkDir(root) {
  const work = join(root, "node_modules/.cache/dashhaus-api");
  await rm(work, { recursive: true, force: true });
  await mkdir(work, { recursive: true });
  return work;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { root, readManifest } = await import("./manifest.js");
  const args = process.argv.slice(2);
  const from = args.includes("--from")
    ? args[args.indexOf("--from") + 1]
    : execFileSync("npm", ["view", "@dashhaus/core", "version"], { cwd: root, encoding: "utf8" }).trim();
  const current = (await readManifest("packages/core")).version;
  const work = await apiWorkDir(root);
  const diff = diffApi(await apiOfRegistry(from, work), await apiOfTarballs(join(root, "release"), current, work));
  console.log(`API of release/ (${current}) against ${from} on npm:\n\n${apiMarkdown(diff, from)}`);
  for (const { subpath, name, before, after } of diff.changed) console.log(`\n${subpath} ${name}\n  - ${before}\n  + ${after}`);
}
