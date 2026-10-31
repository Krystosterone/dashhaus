#!/usr/bin/env node
/**
 * Scaffold a standalone Dashhaus skin:
 *
 *   npm create dashhaus-skin@latest my-skin
 *   cd my-skin
 *   npm install
 *   npm test        # the packed conformance preset over this skin's cards
 *   npm run build   # dist/dashhaus.js: one file, its CSS included
 *   npx dashhaus-deploy --skip-build
 *
 * The output has no Storybook, no workspace and no repo script: one control card (light), one reading card
 * (sensor), the shared hooks behind them, a YAML reader, the custom element and a deploy config.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HELP = `usage: create-dashhaus-skin <directory> [--dry-run]

  <directory>   a new, empty folder, or "." for the current one
  --dry-run     print the files that would be written
  --help        this message`;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(HELP);
  process.exit(0);
}
const dryRun = args.includes("--dry-run");
const positional = args.filter((arg) => arg !== "--dry-run");
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
  const output = fill(file);
  const body = fill(readFileSync(join(templateRoot, file), "utf8"));
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
  npm test
  npm run build
  npx dashhaus-deploy --skip-build
`);
