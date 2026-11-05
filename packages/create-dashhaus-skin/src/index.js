#!/usr/bin/env node
/**
 * Scaffold a standalone Dashhaus skin, and add cards to it:
 *
 *   npm create dashhaus-skin@latest my-skin
 *   cd my-skin
 *   npm install
 *   npm run add -- climate   # one more domain's card (create-dashhaus-skin add, from the skin's own copy)
 *   npm test        # the packed conformance preset over this skin's cards
 *   npm run build   # dist/dashhaus-<skin>.js: one file, its CSS included
 *   npx dashhaus-deploy --skip-build
 *
 * `--tarballs <dir>` points the @dashhaus dependencies at release tarballs in <dir> instead of the registry.
 *
 * A skin starts from the same templates as one made inside the Dashhaus repository: the shared core (`templates/skin`)
 * and one card per domain (`templates/card`), written by `card.js` from the domain's description in `domains.json`.
 * What only a standalone skin has (its manifest, build, preview, checks and guide) is `templates/standalone`.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { helpText } from "./help.js";
import { REGISTRY_MARKERS, beforeMarker, cardKind, cardTokens, filler, registryLines, skinNames, skinTokens } from "./card.js";

const templates = (name) => fileURLToPath(new URL(`./templates/${name}/`, import.meta.url));
const domains = JSON.parse(readFileSync(new URL("./domains.json", import.meta.url), "utf8"));
/** The cards a new skin starts with: one control and one reading. */
const STARTERS = ["light", "sensor"];

const HELP = helpText(Object.keys(domains));

const fail = (message) => {
  console.error(`create-dashhaus-skin: ${message}`);
  process.exit(1);
};

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(HELP);
  process.exit(0);
}
/** Take a flag, and its value when it has one, out of the arguments. */
const take = (flag, withValue = false) => {
  const at = args.indexOf(flag);
  if (at === -1) return withValue ? undefined : false;
  const [, value] = args.splice(at, withValue ? 2 : 1);
  if (withValue && !value) fail(`${flag} needs a value`);
  return withValue ? value : true;
};
const dryRun = take("--dry-run");

/** Every file of a template folder, as a path from its root. */
function walk(dir, base = "") {
  return readdirSync(join(dir, base), { withFileTypes: true }).flatMap((entry) => {
    const path = base ? `${base}/${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(dir, path) : [path];
  });
}

/** npm drops dotfiles like .gitignore from a package, so the templates carry them as _name. */
const DOTFILES = { _gitignore: ".gitignore", "_env.example": ".env.example" };

/** The writes one domain's card makes in a skin: its files, and its two lines in the registry. */
function cardWrites(names, name, askedKind, readRegistry) {
  const domain = domains[name];
  if (!domain) fail(`no shared card for "${name}". Domains: ${Object.keys(domains).join(", ")}`);
  let drawn;
  try {
    drawn = cardKind(domain, askedKind);
  } catch (error) {
    fail(error.message);
  }
  const fill = filler(cardTokens(domain, names, drawn));
  const files = ["card", "standalone-card"].flatMap((folder) => walk(templates(folder)).map((file) => [fill(file), fill(readFileSync(join(templates(folder), file), "utf8"))]));
  const lines = registryLines(domain, names);
  const source = readRegistry();
  // Without its markers the card would be written but never drawn; say so rather than report it registered.
  for (const marker of Object.values(REGISTRY_MARKERS)) {
    if (!source.includes(marker)) fail(`lovelace/registry.tsx has lost its "${marker}" line; put it back where the registry's ${marker.includes("import") ? "imports" : "entries"} go, then run add again`);
  }
  const registry = beforeMarker(REGISTRY_MARKERS.entries, lines.entry)(beforeMarker(REGISTRY_MARKERS.imports, lines.import)(source));
  return { domain, kind: drawn.kind, leftOut: drawn.leftOut, files: [...files, ["lovelace/registry.tsx", registry]] };
}

function write(root, files) {
  for (const [path, body] of files) {
    const full = join(root, path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, body);
  }
}

if (args[0] === "add") {
  const kind = take("--kind", true);
  const [, name, ...extra] = args;
  if (!name || extra.length) fail(HELP);
  const root = process.cwd();
  const registryPath = join(root, "lovelace/registry.tsx");
  const manifestPath = join(root, "package.json");
  if (!existsSync(registryPath) || !existsSync(manifestPath)) fail("run add inside a skin's folder: it has no lovelace/registry.tsx");
  const skin = /^dashhaus-skin-(.+)$/.exec(JSON.parse(readFileSync(manifestPath, "utf8")).name ?? "")?.[1];
  if (!skin) fail(`package.json's name must be dashhaus-skin-<skin>, as create-dashhaus-skin wrote it`);
  if (existsSync(join(root, "cards", name))) fail(`cards/${name} already exists`);
  const names = skinNames(skin);
  const { domain, kind: drawn, leftOut, files } = cardWrites(names, name, kind, () => readFileSync(registryPath, "utf8"));
  if (dryRun) {
    console.log(`Would add the ${domain.words} card (${drawn}):`);
    for (const [path] of files) console.log(`  ${path === "lovelace/registry.tsx" ? "edit  " : "create"} ${path}`);
    process.exit(0);
  }
  write(root, files);
  console.log(`Added the ${domain.words} card as a ${drawn}: ${files.length - 1} files, registered in lovelace/registry.tsx for ${domain.domains.join(", ")}.${leftOut.length ? `
Left out ${leftOut.join(", ")}: ${leftOut.length > 1 ? "they take" : "it takes"} a value a press can't give, so draw ${leftOut.length > 1 ? "them" : "it"} with your own control.` : ""}

Next:
  npm run snapshot     # it is on the sample house, in the Living room
  npm test
Then give it its own drawing in cards/${name}/; its facts are in node_modules/@dashhaus/core/dist/entities/${name}/types.d.ts.
`);
  process.exit(0);
}

const tarballDir = take("--tarballs", true);
if (args.length !== 1) fail(HELP);
const target = resolve(args[0]);
let names;
try {
  names = skinNames(basename(target));
} catch (error) {
  fail(error.message);
}

try {
  const allowed = new Set(["node_modules", "package-lock.json", ".git"]);
  const blockers = readdirSync(target).filter((entry) => !allowed.has(entry));
  if (blockers.length) fail(`${target} is not empty (${blockers.slice(0, 3).join(", ")}${blockers.length > 3 ? ", …" : ""})`);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  // The folder does not exist yet; opening it is the first write.
}

/** `@dashhaus/core` → the newest `dashhaus-core-<version>.tgz` in the tarball folder, as a `file:` path from the skin. */
function tarballSpecifiers() {
  if (!tarballDir) return {};
  const dir = resolve(tarballDir);
  if (!existsSync(dir)) fail(`--tarballs ${tarballDir} does not exist`);
  const files = readdirSync(dir).filter((file) => file.endsWith(".tgz")).sort();
  const found = {};
  const packages = { "@dashhaus/core": "dashhaus-core-", "@dashhaus/dashboard": "dashhaus-dashboard-", "@dashhaus/deploy": "dashhaus-deploy-", "create-dashhaus-skin": "create-dashhaus-skin-" };
  for (const [name, prefix] of Object.entries(packages)) {
    const file = files.filter((candidate) => candidate.startsWith(prefix)).at(-1);
    if (!file) fail(`no ${prefix}<version>.tgz in ${dir}`);
    const path = relative(target, join(dir, file)).split("\\").join("/");
    found[name] = `file:${path.startsWith(".") ? path : `./${path}`}`;
  }
  return found;
}

/** Point the manifest's @dashhaus ranges at the tarballs, when there are some. */
function withTarballs(body) {
  const specifiers = tarballSpecifiers();
  if (!Object.keys(specifiers).length) return body;
  const manifest = JSON.parse(body);
  for (const field of ["dependencies", "devDependencies"]) {
    for (const name of Object.keys(manifest[field] ?? {})) if (specifiers[name]) manifest[field][name] = specifiers[name];
  }
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

const fill = filler(skinTokens(names));
const files = new Map();
for (const folder of ["skin", "standalone"]) {
  for (const file of walk(templates(folder))) {
    const output = fill(DOTFILES[file] ?? file);
    const filled = fill(readFileSync(join(templates(folder), file), "utf8"));
    files.set(output, output === "package.json" ? withTarballs(filled) : filled);
  }
}
for (const name of STARTERS) {
  for (const [path, body] of cardWrites(names, name, undefined, () => files.get("lovelace/registry.tsx")).files) files.set(path, body);
}

if (dryRun) {
  console.log(`Would create ${files.size} files in ${target}:`);
  for (const file of files.keys()) console.log(`  ${file}`);
  process.exit(0);
}
write(target, files);

console.log(`Created the ${names.Section} skin in ${target}: ${files.size} files.

Next:
  cd ${args[0]}
  npm install
  npm run preview      # the skin on a sample house, in the browser; npm run snapshot saves PNGs
  npm test             # the card and CSS rules
  npm run build        # dist/dashhaus-${names.skin}.js
  npm run deploy       # after filling .env (see .env.example)
  npm run add -- climate   # another domain's card

AGENTS.md says where the colours, type, parts and rules live, and how to restyle the skin from a picture.
`);
