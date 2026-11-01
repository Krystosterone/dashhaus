#!/usr/bin/env node
/**
 * Scaffold a standalone Dashhaus skin:
 *
 *   npm create dashhaus-skin@latest my-skin
 *   cd my-skin
 *   npm install
 *   npm test        # the packed conformance preset over this skin's cards
 *   npm run build   # dist/dashhaus-<skin>.js: one file, its CSS included
 *   npx dashhaus-deploy --skip-build
 *
 * `--tarballs <dir>` points the @dashhaus dependencies at release tarballs in <dir> instead of the registry.
 *
 * The output has no Storybook, no workspace and no repo script: one control card (light), one reading card
 * (sensor), the shared hooks behind them, a YAML reader, the custom element and a deploy config.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HELP = `usage: create-dashhaus-skin <directory> [--tarballs <dir>] [--dry-run]

  <directory>        a new, empty folder, or "." for the current one; its name is the skin's name
  --tarballs <dir>   install @dashhaus packages from the release tarballs in <dir>, not the registry
  --dry-run          print the files that would be written
  --help             this message

It writes a working skin (two cards, a preview, checks, a one-file build and a deploy config) and an AGENTS.md
that says where its colours, type, parts and rules live.`;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(HELP);
  process.exit(0);
}
const dryRun = args.includes("--dry-run");
const tarballFlag = args.indexOf("--tarballs");
const tarballDir = tarballFlag === -1 ? undefined : args[tarballFlag + 1];
if (tarballFlag !== -1 && !tarballDir) {
  console.error("create-dashhaus-skin: --tarballs needs the folder holding the .tgz files");
  process.exit(1);
}
const positional = args.filter((arg, index) => arg !== "--dry-run" && index !== tarballFlag && index !== tarballFlag + 1);
if (positional.length !== 1) {
  console.error(HELP);
  process.exit(1);
}

const target = resolve(positional[0]);
const slug = basename(target);
if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error(`create-dashhaus-skin: "${slug}" must be lower-case kebab-case, like "my-skin"`);
  process.exit(1);
}

const parts = slug.split("-");
const Skin = parts.map((part) => part[0].toUpperCase() + part.slice(1)).join("");
const Section = parts.map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
const SKIN_CONST = parts.join("_").toUpperCase();
const tokens = {
  __skin__: slug,
  __Skin__: Skin,
  __Section__: Section,
  __SKIN_CONST__: SKIN_CONST,
  __card_type__: `dashhaus-${slug}`,
};

try {
  const existing = readdirSync(target);
  const allowed = new Set(["node_modules", "package-lock.json", ".git"]);
  const blockers = existing.filter((entry) => !allowed.has(entry));
  if (blockers.length) {
    console.error(`create-dashhaus-skin: ${target} is not empty (${blockers.slice(0, 3).join(", ")}${blockers.length > 3 ? ", …" : ""})`);
    process.exit(1);
  }
} catch {
  // The folder does not exist yet; opening it is the first write.
}

/** `@dashhaus/core` → the newest `dashhaus-core-<version>.tgz` in the tarball folder, as a `file:` path from the skin. */
function tarballSpecifiers() {
  if (!tarballDir) return {};
  const dir = resolve(tarballDir);
  if (!existsSync(dir)) {
    console.error(`create-dashhaus-skin: --tarballs ${tarballDir} does not exist`);
    process.exit(1);
  }
  const files = readdirSync(dir).filter((file) => file.endsWith(".tgz")).sort();
  const found = {};
  for (const name of ["core", "dashboard", "deploy"]) {
    const file = files.filter((candidate) => candidate.startsWith(`dashhaus-${name}-`)).at(-1);
    if (!file) {
      console.error(`create-dashhaus-skin: no dashhaus-${name}-<version>.tgz in ${dir}`);
      process.exit(1);
    }
    const path = relative(target, join(dir, file)).split("\\").join("/");
    found[`@dashhaus/${name}`] = `file:${path.startsWith(".") ? path : `./${path}`}`;
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

/** npm drops dotfiles like .gitignore from a package, so the templates carry them as _name. */
const DOTFILES = { _gitignore: ".gitignore", "_env.example": ".env.example" };

const templateRoot = fileURLToPath(new URL("./templates/", import.meta.url));
const fill = (text) => Object.entries(tokens).reduce((source, [token, value]) => source.replaceAll(token, value), text);

function walk(dir, base = "") {
  return readdirSync(join(dir, base), { withFileTypes: true }).flatMap((entry) => {
    const path = base ? `${base}/${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(dir, path) : [path];
  });
}

const written = [];
for (const file of walk(templateRoot)) {
  const output = fill(DOTFILES[file] ?? file);
  const filled = fill(readFileSync(join(templateRoot, file), "utf8"));
  const body = output === "package.json" ? withTarballs(filled) : filled;
  written.push(output);
  if (dryRun) continue;
  const full = join(target, output);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, body);
}
if (dryRun) {
  console.log(`Would create ${written.length} files in ${target}:`);
  for (const file of written) console.log(`  ${file}`);
  process.exit(0);
}

console.log(`Created the ${Section} skin in ${target}: ${written.length} files.

Next:
  cd ${positional[0]}
  npm install
  npm run preview      # the skin on a sample house, in the browser; npm run snapshot saves PNGs
  npm test             # the card and CSS rules
  npm run build        # dist/dashhaus-${slug}.js
  npm run deploy       # after filling .env (see .env.example)

AGENTS.md says where the colours, type, parts and rules live, and how to restyle the skin from a picture.
`);
